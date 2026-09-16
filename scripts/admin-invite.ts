/**
 * Issues a one-time link that lets an admin set their own password.
 *
 *   APP_ORIGIN=https://forms.example.com ADMIN_EMAIL=carey@example.com \
 *     ADMIN_NAME="Carey" ADMIN_ROLE=owner \
 *     pnpm admin:invite -- --env production --remote
 *
 * Creates the account if it does not exist yet. An existing account keeps its
 * current password until the link is used, so this doubles as a reset.
 *
 * The token is printed once and never stored — only its SHA-256 goes to the
 * database, so a copy of the database is not enough to claim the link.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomToken, sha256Hex } from "../src/server/ids";
import { SETUP_TOKEN_TTL_MS } from "../src/server/auth/setup-token";

const PENDING_HASH = "!pending-setup";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "Owner").trim();
  const role = process.env.ADMIN_ROLE === "admin" ? "admin" : "owner";
  const origin = (process.env.APP_ORIGIN ?? "").trim().replace(/\/+$/, "");
  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (!origin) throw new Error("APP_ORIGIN is required (the site the link should point at)");

  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const now = Date.now();
  const expires = now + SETUP_TOKEN_TTL_MS;
  const id = `admin_${email.replace(/[^a-z0-9]/g, "_")}`;
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

  // password_hash is deliberately absent from the conflict update: an existing
  // account keeps working until whoever holds the link chooses a new password.
  const sql = [
    `INSERT INTO admin_users (id, email, password_hash, display_name, role, failed_attempts, locked_until, created_at, last_login_at, setup_token_hash, setup_token_expires_at)`,
    `VALUES (${q(id)}, ${q(email)}, ${q(PENDING_HASH)}, ${q(name)}, ${q(role)}, 0, NULL, ${now}, NULL, ${q(hash)}, ${expires})`,
    `ON CONFLICT(email) DO UPDATE SET`,
    `  display_name = excluded.display_name,`,
    `  role = excluded.role,`,
    `  setup_token_hash = excluded.setup_token_hash,`,
    `  setup_token_expires_at = excluded.setup_token_expires_at,`,
    `  failed_attempts = 0,`,
    `  locked_until = NULL;`,
  ].join("\n");

  const dir = mkdtempSync(join(tmpdir(), "csc-admin-invite-"));
  const file = join(dir, "invite.sql");
  writeFileSync(file, sql + "\n");

  const extra = process.argv.slice(2).filter((a) => a !== "--");
  const args = ["wrangler", "d1", "execute", "DB", "--file", file, ...extra];
  console.log(`> pnpm exec ${args.join(" ")}`);
  execFileSync("pnpm", ["exec", ...args], { stdio: "inherit" });

  const days = Math.round(SETUP_TOKEN_TTL_MS / 86_400_000);
  console.log(`\n${email}（${role}）的設定連結，${days} 日內有效、只可用一次：\n`);
  console.log(`  ${origin}/admin/setup/${token}\n`);
  console.log("這條連結只會顯示這一次。收件人設定的密碼不會回傳給任何人。");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
