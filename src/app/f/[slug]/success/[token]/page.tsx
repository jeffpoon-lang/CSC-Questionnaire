import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { formVersions, submissions } from "@/db/schema";
import { resolveSuccess } from "@/engine/success";
import { isFormSlug } from "@/forms/canonical";
import { loadSettings, settingsLookup } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "已收到", robots: { index: false, follow: false } };

export default async function SuccessPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!isFormSlug(slug)) notFound();
  const db = await getDb();
  const [s] = await db.select().from(submissions).where(eq(submissions.publicToken, token)).limit(1);
  if (!s || s.formSlug !== slug) notFound();
  const [v] = await db.select().from(formVersions).where(eq(formVersions.id, s.formVersionId)).limit(1);
  if (!v) notFound();

  const st = await loadSettings(db, ["whatsapp_invite_url", "csc_info_url", "privacy_url"]);
  const r = resolveSuccess(v.definitionJson.success, s.answersJson, settingsLookup(st));

  const btn = "inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-base font-medium shadow-sm transition sm:w-auto";
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{v.definitionJson.title}</p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">{r.headline}</h1>
      {r.body && <p className="mt-4 text-base leading-relaxed text-stone-600">{r.body}</p>}
      {r.notes.map((n) => (
        <p key={n} className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{n}</p>
      ))}
      {r.primary && (
        <div className="mt-8">
          <a href={r.primary.href} className={`${btn} bg-stone-900 text-white hover:bg-stone-800`} rel="noopener noreferrer">
            {r.primary.label}
          </a>
        </div>
      )}
      {r.secondary.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {r.secondary.map((c) =>
            c.href.startsWith("/") ? (
              <Link key={c.label} href={c.href} className={`${btn} border border-stone-300 bg-white text-stone-900 hover:border-stone-500`}>{c.label}</Link>
            ) : (
              <a key={c.label} href={c.href} className={`${btn} border border-stone-300 bg-white text-stone-900 hover:border-stone-500`} rel="noopener noreferrer">{c.label}</a>
            ),
          )}
        </div>
      )}
      {!r.primary && !v.definitionJson.success.primaryCta && (
        <p className="mt-8 text-sm text-stone-500">你可以關閉此頁面。我們會以你提供的聯絡方式與你聯絡。</p>
      )}
      {!r.primary && v.definitionJson.success.primaryCta && (
        <p className="mt-8 text-sm text-stone-500">加入連結稍後會由團隊提供。</p>
      )}
    </main>
  );
}
