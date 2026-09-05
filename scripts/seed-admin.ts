/**
 * Seeds (or resets the password of) an admin user.
 *
 *   ADMIN_SEED_EMAIL=owner@example.com ADMIN_SEED_NAME="Carey" PASSWORD=... \
 *     pnpm seed:admin -- --local | --env staging --remote
 *
 * The generated SQL is written to a temp file (never committed) and applied
 * with `wrangler d1 execute`. Extra CLI args are passed through to wrangler.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPassword, validatePasswordStrength } from "../src/server/auth/password";

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_SEED_NAME ?? "Owner").trim();
  const password = process.env.PASSWORD ?? "";
  const role = process.env.ADMIN_SEED_ROLE === "admin" ? "admin" : "owner";
  if (!email || !password) throw new Error("ADMIN_SEED_EMAIL and PASSWORD are required");
  const weak = validatePasswordStrength(password);
  if (weak) throw new Error(weak);

  const hash = await hashPassword(password);
  const id = `admin_${email.replace(/[^a-z0-9]/g, "_")}`;
  const now = Date.now();
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const sql = [
    `INSERT INTO admin_users (id, email, password_hash, display_name, role, failed_attempts, locked_until, created_at, last_login_at)`,
    `VALUES (${q(id)}, ${q(email)}, ${q(hash)}, ${q(name)}, ${q(role)}, 0, NULL, ${now}, NULL)`,
    `ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, display_name = excluded.display_name, failed_attempts = 0, locked_until = NULL;`,
  ].join("\n");

  const dir = mkdtempSync(join(tmpdir(), "csc-admin-seed-"));
  const file = join(dir, "admin.sql");
  writeFileSync(file, sql + "\n");

  const extra = process.argv.slice(2).filter((a) => a !== "--");
  const args = ["wrangler", "d1", "execute", "DB", "--file", file, ...extra];
  console.log(`> pnpm exec ${args.join(" ")}`);
  execFileSync("pnpm", ["exec", ...args], { stdio: "inherit" });
  console.log(`Admin user ${email} (${role}) seeded.`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
