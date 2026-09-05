import { NextResponse } from "next/server";
import { getDb, getEnv, getExecutionContext } from "@/db/client";
import { isFormSlug } from "@/forms/canonical";
import { sendSummaryEmail } from "@/server/email/resend";
import { syncToNotion } from "@/server/notion/sync";
import { processSubmission, submitBodySchema } from "@/server/submit";

export const dynamic = "force-dynamic";

type Secrets = CloudflareEnv & { RESEND_API_KEY?: string; RESEND_FROM?: string; NOTION_TOKEN?: string; TURNSTILE_SECRET_KEY?: string };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isFormSlug(slug)) return NextResponse.json({ ok: false, code: "not_found", message: "表單不存在。" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_json", message: "請求格式錯誤。" }, { status: 400 });
  }
  const parsed = submitBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "bad_request", message: "請求格式錯誤。" }, { status: 400 });

  const db = await getDb();
  const env = (await getEnv()) as Secrets;
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const { result } = await processSubmission(db, slug, parsed.data, {
    appEnv: env.APP_ENV,
    turnstileSecret: env.TURNSTILE_SECRET_KEY,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message, errors: result.errors }, { status: result.status });
  }

  if (result.submissionId) {
    const ctx = await getExecutionContext();
    const work = Promise.allSettled([
      sendSummaryEmail(db, env, result.submissionId),
      syncToNotion(db, env, result.submissionId, "auto"),
    ]).then(() => undefined);
    try {
      ctx.waitUntil(work);
    } catch {
      // ctx unavailable (e.g. unusual dev context): fall back to awaiting.
      await work;
    }
  }
  return NextResponse.json({ ok: true, redirect: result.redirect });
}
