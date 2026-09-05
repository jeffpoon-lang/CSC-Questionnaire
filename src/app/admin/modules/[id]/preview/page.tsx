import { notFound } from "next/navigation";
import { FormRenderer } from "@/components/form/FormRenderer";
import { getDb } from "@/db/client";
import { getFormWithCurrentVersion, getModuleById, getModuleVersionById } from "@/db/queries/forms";
import { parseModuleDefinition } from "@/engine/definition-schema";
import { mergeQuestions } from "@/engine/merge";
import { requireAdmin } from "@/server/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function ModulePreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { v } = await searchParams;
  const db = await getDb();
  const mod = await getModuleById(db, id);
  const version = v ? await getModuleVersionById(db, v) : null;
  if (!mod || !version || version.moduleId !== id) notFound();
  const parsed = parseModuleDefinition(version.definitionJson);
  if (!parsed.value) return <div className="p-8 text-sm text-red-600">模組定義無法解析：{parsed.issues.map((i) => `${i.path} ${i.message}`).join("；")}</div>;
  const core = await getFormWithCurrentVersion(db, mod.formSlug);
  if (!core) notFound();
  const def = core.version.definitionJson;
  return (
    <main className="flex-1">
      <FormRenderer
        slug={mod.formSlug}
        formVersionId={core.version.id}
        title={`${def.title}（模組預覽：${mod.name} v${version.version}）`}
        intro={def.intro}
        submitLabel={def.submitLabel}
        questions={mergeQuestions(def, [parsed.value])}
        piiHintText={def.settings.piiHintText}
        honeypot={false}
        isTestEnv
        previewOnly
      />
    </main>
  );
}
