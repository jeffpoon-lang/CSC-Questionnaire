import { getDb } from "@/db/client";
import { getFormWithCurrentVersion } from "@/db/queries/forms";
import { iterateSubmissions, type SubmissionFilters } from "@/db/queries/submissions";
import type { Question } from "@/engine/types";
import { requireAdminApi, UnauthorizedError } from "@/server/auth/require-admin";
import { csvHeader, csvRow } from "@/server/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminApi();
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("unauthorized", { status: 401 });
    throw e;
  }
  const u = new URL(request.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  const f: SubmissionFilters = { form: g("form"), status: g("status"), owner: g("owner"), source: g("source"), from: g("from"), to: g("to"), q: g("q"), tag: g("tag"), notion: g("notion"), entry: g("entry"), includeTest: g("test") === "1" };
  const db = await getDb();

  // Question columns only when a single form is selected (its current version).
  let questions: Question[] = [];
  if (f.form) {
    const loaded = await getFormWithCurrentVersion(db, f.form);
    questions = loaded?.version.definitionJson.questions ?? [];
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("﻿" + csvHeader(questions)));
      for await (const chunk of iterateSubmissions(db, f)) {
        for (const s of chunk) controller.enqueue(encoder.encode(csvRow(s, questions)));
      }
      controller.close();
    },
  });
  const name = `csc-submissions-${f.form ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(stream, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
