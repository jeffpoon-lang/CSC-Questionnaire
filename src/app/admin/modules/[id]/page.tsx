import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getModuleById, listModuleVersions } from "@/db/queries/forms";
import { Badge, Card, btnCls, fmtDate } from "@/components/admin/ui";
import { DefinitionEditor } from "@/components/admin/DefinitionEditor";
import { createModuleDraftAction, saveModuleDraftAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ModuleEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v: viewId } = await searchParams;
  const db = await getDb();
  const mod = await getModuleById(db, id);
  if (!mod) notFound();
  const versions = await listModuleVersions(db, id);
  const draft = versions.find((x) => x.status === "draft");
  const viewing = viewId ? versions.find((x) => x.id === viewId) : undefined;
  const editing = viewing ?? draft ?? versions.find((x) => x.id === mod.currentVersionId) ?? versions[0];
  const isDraft = editing?.status === "draft";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/modules" className="text-sm underline">← 模組</Link>
        <h1 className="text-xl font-semibold">{mod.name}</h1>
        <span className="font-mono text-sm text-stone-500">{mod.slug}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card
            title={editing ? `${isDraft ? "編輯草稿" : "檢視"} v${editing.version}` : "沒有版本"}
            actions={!draft && <form action={createModuleDraftAction}><input type="hidden" name="id" value={id} /><button type="submit" className={btnCls}>建立新草稿</button></form>}
          >
            <p className="mb-3 text-xs text-stone-500">模組不可包含 consent 題目；題目會排在 Q31 之後、同意題之前。切勿在題目文字內放入客戶姓名或個案資料——一般公開 URL 雖不會顯示模組，但邀請連結可被轉發。</p>
            {editing && (
              <DefinitionEditor
                key={editing.id}
                action={saveModuleDraftAction}
                hidden={{ moduleId: id, versionId: editing.id }}
                initialJson={JSON.stringify(editing.definitionJson, null, 2)}
                previewHref={`/admin/modules/${id}/preview?v=${editing.id}`}
                canPublish
                readOnly={!isDraft}
              />
            )}
          </Card>
        </div>
        <Card title="版本歷史">
          <ul className="space-y-2 text-sm">
            {versions.map((v) => (
              <li key={v.id}>
                <Link className="underline" href={`/admin/modules/${id}?v=${v.id}`}>v{v.version}</Link>{" "}
                <Badge value={v.status === "published" ? "qualified" : v.status === "draft" ? "pending" : "closed"} labels={{ qualified: "使用中", pending: "草稿", closed: "已封存" }} />
                <span className="block text-xs text-stone-500">{fmtDate(v.publishedAt ?? v.createdAt)} · {v.createdBy ?? "—"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
