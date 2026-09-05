import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getFormBySlug, listFormVersions } from "@/db/queries/forms";
import { Badge, Card, FORM_LABELS, btnCls, fmtDate } from "@/components/admin/ui";
import { DefinitionEditor } from "@/components/admin/DefinitionEditor";
import { createDraftAction, saveFormDraftAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function FormEditorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> }) {
  const { slug } = await params;
  const { v: viewId } = await searchParams;
  const db = await getDb();
  const form = await getFormBySlug(db, slug);
  if (!form) notFound();
  const versions = await listFormVersions(db, form.id);
  const draft = versions.find((x) => x.status === "draft");
  const viewing = viewId ? versions.find((x) => x.id === viewId) : undefined;
  const editing = viewing ?? draft ?? versions.find((x) => x.id === form.currentVersionId) ?? versions[0];
  const isDraft = editing?.status === "draft";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/forms" className="text-sm underline">← 表單</Link>
        <h1 className="text-xl font-semibold">{FORM_LABELS[slug] ?? slug}</h1>
        <span className="text-sm text-stone-500">{form.title}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card
            title={editing ? `${isDraft ? "編輯草稿" : "檢視"} v${editing.version}` : "沒有版本"}
            actions={!draft && <form action={createDraftAction}><input type="hidden" name="slug" value={slug} /><button type="submit" className={btnCls}>由目前版本建立草稿</button></form>}
          >
            <p className="mb-3 text-xs text-stone-500">
              題目 ID 一經發布不可改類型或重用；新增題目請用新 ID。選項 value 改變會令舊標籤篩選不一致，請盡量只改 label。<br />
              consent key <code>application</code>（必填）與 <code>marketing</code>（預設不勾選）會對應 consent 欄位。成功頁 CTA href 可用 <code>{"{ \"setting\": \"whatsapp_invite_url\" }"}</code>。
            </p>
            {editing && (
              <DefinitionEditor
                key={editing.id}
                action={saveFormDraftAction}
                hidden={{ slug, versionId: editing.id }}
                initialJson={JSON.stringify(editing.definitionJson, null, 2)}
                previewHref={`/admin/forms/${slug}/preview?v=${editing.id}`}
                canPublish
                readOnly={!isDraft}
              />
            )}
          </Card>
        </div>
        <div>
          <Card title="版本歷史">
            <ul className="space-y-2 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-col">
                  <span>
                    <Link className="underline" href={`/admin/forms/${slug}?v=${v.id}`}>v{v.version}</Link>{" "}
                    <Badge value={v.status === "published" ? "qualified" : v.status === "draft" ? "pending" : "closed"} labels={{ qualified: "使用中", pending: "草稿", closed: "已封存" }} />
                  </span>
                  <span className="text-xs text-stone-500">{fmtDate(v.publishedAt ?? v.createdAt)} · {v.createdBy ?? "—"}</span>
                  {v.changeNote && <span className="text-xs text-stone-600">{v.changeNote}</span>}
                  <a className="text-xs underline" href={`/admin/forms/${slug}/preview?v=${v.id}`} target="_blank" rel="noopener">預覽</a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
