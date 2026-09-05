import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormRenderer } from "@/components/form/FormRenderer";
import { getDb, getEnv } from "@/db/client";
import { getFormWithCurrentVersion, getInviteByToken, inviteIsUsable, resolveModules } from "@/db/queries/forms";
import { mergeQuestions } from "@/engine/merge";
import type { Answers } from "@/engine/types";
import { isFormSlug } from "@/forms/canonical";
import { loadSettings, settingBool, settingString } from "@/server/settings";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (!isFormSlug(slug)) return { title: "表單" };
  const db = await getDb();
  const loaded = await getFormWithCurrentVersion(db, slug);
  return { title: loaded?.version.definitionJson.title ?? "表單", robots: { index: false, follow: false } };
}

export default async function FormPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!isFormSlug(slug)) notFound();

  const db = await getDb();
  const env = await getEnv();
  const loaded = await getFormWithCurrentVersion(db, slug);
  if (!loaded || loaded.form.status !== "enabled") redirect(`/f/${slug}/closed`);
  const { form, version } = loaded;
  const def = version.definitionJson;

  const inviteToken = typeof sp.i === "string" ? sp.i : undefined;
  let invite = null as Awaited<ReturnType<typeof getInviteByToken>>;
  if (inviteToken) {
    invite = await getInviteByToken(db, inviteToken);
    if (!invite || invite.formId !== form.id || !inviteIsUsable(invite).ok) redirect(`/f/${slug}/closed?reason=invite`);
  } else if (form.access === "invite_only") {
    redirect(`/f/${slug}/closed?reason=invite_required`);
  }
  const modules = invite ? await resolveModules(db, invite.moduleIds) : [];
  const questions = mergeQuestions(def, modules.map((m) => m.version.definitionJson));

  // Prefill: invite prefill first, then URL query params declared via prefillFromQuery.
  const prefill: Answers = { ...(invite?.prefillJson ?? {}) };
  for (const q of questions) {
    if (!q.prefillFromQuery) continue;
    const raw = sp[q.prefillFromQuery];
    const val = typeof raw === "string" ? raw : undefined;
    if (!val) continue;
    if ((q.type === "single_select" || q.type === "multi_select") && q.options && !q.options.some((o) => o.value === val)) continue;
    prefill[q.id] = q.type === "multi_select" ? [val] : val;
  }

  const st = await loadSettings(db, ["turnstile_enabled", "turnstile_site_key"]);
  const turnstileSiteKey = def.settings.turnstile || settingBool(st, "turnstile_enabled") ? settingString(st, "turnstile_site_key") : null;

  return (
    <main className="flex-1">
      {modules.length > 0 && (
        <p className="mx-auto max-w-2xl px-5 pt-6 text-xs text-stone-500 sm:px-8">此連結為專屬邀請版本{invite?.label ? `（${invite.label}）` : ""}，包含額外題目。</p>
      )}
      <FormRenderer
        slug={slug}
        formVersionId={version.id}
        title={def.title}
        intro={def.intro}
        submitLabel={def.submitLabel}
        estimatedMinutes={def.settings.estimatedMinutes}
        questions={questions}
        piiHintText={def.settings.piiHintText}
        honeypot={def.settings.honeypot}
        inviteToken={inviteToken}
        prefill={prefill}
        turnstileSiteKey={turnstileSiteKey}
        isTestEnv={env.APP_ENV !== "production"}
      />
    </main>
  );
}
