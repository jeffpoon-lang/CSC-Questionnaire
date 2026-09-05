"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { inviteLinks } from "@/db/schema";
import { getFormBySlug, listModules } from "@/db/queries/forms";
import { requireAdmin } from "@/server/auth/require-admin";
import { newId, randomToken } from "@/server/ids";

export async function createInviteAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const moduleIds = formData.getAll("module_ids").map(String).filter(Boolean);
  const order = String(formData.get("module_order") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const expiresDays = Number(formData.get("expires_days") ?? 0);
  const maxUses = Number(formData.get("max_uses") ?? 0);
  const leadHintName = String(formData.get("lead_hint_name") ?? "").trim() || null;
  const leadHintEmail = String(formData.get("lead_hint_email") ?? "").trim().toLowerCase() || null;
  if (!label) return;
  const db = await getDb();
  const form = await getFormBySlug(db, "high_ticket");
  if (!form) return;
  const known = new Set((await listModules(db)).map((m) => m.id));
  const chosen = moduleIds.filter((m) => known.has(m));
  // Optional explicit order (comma-separated slugs) — otherwise checkbox order.
  const all = await listModules(db);
  const ordered = order.length
    ? [...order.map((slug) => all.find((m) => m.slug === slug)?.id).filter((x): x is string => Boolean(x) && chosen.includes(x!)), ...chosen.filter((c) => !order.includes(all.find((m) => m.id === c)?.slug ?? ""))]
    : chosen;
  const prefill: Record<string, string> = {};
  if (leadHintName) prefill.Q01 = leadHintName;
  if (leadHintEmail) prefill.Q28 = leadHintEmail;
  await db.insert(inviteLinks).values({
    id: newId(),
    token: randomToken(24),
    formId: form.id,
    moduleIds: ordered,
    label,
    leadHintName,
    leadHintEmail,
    prefillJson: prefill,
    expiresAt: expiresDays > 0 ? new Date(Date.now() + expiresDays * 86_400_000) : null,
    maxUses: maxUses > 0 ? maxUses : null,
    useCount: 0,
    status: "active",
    createdBy: user.email,
    createdAt: new Date(),
  });
  revalidatePath("/admin/invites");
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await getDb();
  await db.update(inviteLinks).set({ status: "revoked" }).where(eq(inviteLinks.id, id));
  revalidatePath("/admin/invites");
}
