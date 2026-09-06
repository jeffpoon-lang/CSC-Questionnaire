import { notFound } from "next/navigation";
import { FormRenderer } from "@/components/form/FormRenderer";
import { getDb } from "@/db/client";
import { getFormBySlug, getFormVersionById } from "@/db/queries/forms";
import { parseFormDefinition } from "@/engine/definition-schema";
import { requireAdmin } from "@/server/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function FormPreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const { v } = await searchParams;
  const db = await getDb();
  const form = await getFormBySlug(db, slug);
  const version = v ? await getFormVersionById(db, v) : null;
  if (!form || !version || version.formId !== form.id) notFound();
  const parsed = parseFormDefinition(version.definitionJson);
  if (!parsed.value) {
    return <div className="p-8 text-sm text-red-600">此版本定義無法解析，請先在編輯器修正。<ul className="mt-2 list-disc pl-5">{parsed.issues.map((i, k) => <li key={k}>{i.path} {i.message}</li>)}</ul></div>;
  }
  const def = parsed.value;
  return (
    <main className="flex-1">
      <FormRenderer
        slug={slug}
        formVersionId={version.id}
        title={`${def.title}（預覽 v${version.version}）`}
        intro={def.intro}
        submitLabel={def.submitLabel}
        estimatedMinutes={def.settings.estimatedMinutes}
        questions={def.questions}
        piiHintText={def.settings.piiHintText}
        honeypot={false}
        isTestEnv
        previewOnly
      />
    </main>
  );
}
