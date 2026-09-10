/**
 * Remove TEST data (`is_test = 1`) from a D1 database.
 *
 * The plan's section 10 requires test data to be cleared or isolated before
 * production, and this is the one operation in the repo that deletes rows, so
 * it refuses to do anything until asked twice:
 *
 *   pnpm purge:test -- --env staging            # dry run, prints what it would delete
 *   pnpm purge:test -- --env staging --confirm  # actually deletes
 *
 * Leads are only removed once they have no submissions left at all, so a lead
 * that also has a real submission survives.
 *
 * Notion pages created from test submissions are NOT touched — Notion is a
 * separate system and deleting there is a manual, deliberate act. The dry run
 * prints how many pages that is.
 */

import { execFileSync } from "node:child_process";

interface Args {
  env: string;
  confirm: boolean;
  local: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { env: "", confirm: false, local: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--env") out.env = argv[i + 1] ?? "";
    else if (a === "--confirm") out.confirm = true;
    else if (a === "--local") out.local = true;
  }
  return out;
}

function d1(args: Args, sql: string): unknown {
  const argv = ["wrangler", "d1", "execute", "DB"];
  if (args.env) argv.push("--env", args.env);
  argv.push(args.local ? "--local" : "--remote", "--json", "--command", sql);
  let raw: string;
  try {
    raw = execFileSync("pnpm", ["exec", ...argv], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    const text = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    if (/9109|Invalid access token|Unauthorized/.test(text)) {
      console.error("Cloudflare 未登入或 token 無效。先執行：pnpm exec wrangler login");
    } else {
      console.error("wrangler 執行失敗：");
      console.error(text.trim().split("\n").slice(-12).join("\n"));
    }
    process.exit(1);
  }
  const start = raw.indexOf("[");
  if (start < 0) {
    console.error(`看不懂 wrangler 的輸出：\n${raw}`);
    process.exit(1);
  }
  return JSON.parse(raw.slice(start));
}

function rows(result: unknown): Record<string, unknown>[] {
  const first = Array.isArray(result) ? result[0] : null;
  if (first && typeof first === "object" && "results" in first) {
    const r = (first as { results: unknown }).results;
    return Array.isArray(r) ? (r as Record<string, unknown>[]) : [];
  }
  return [];
}

const COUNTS = `
SELECT
  (SELECT count(*) FROM submissions WHERE is_test = 1) AS test_submissions,
  (SELECT count(*) FROM submissions WHERE is_test = 0) AS live_submissions,
  (SELECT count(*) FROM submissions WHERE is_test = 1 AND notion_page_id IS NOT NULL) AS notion_pages,
  (SELECT count(*) FROM submission_tags WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)) AS tags,
  (SELECT count(*) FROM notion_sync_log WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)) AS notion_logs,
  (SELECT count(*) FROM email_log WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)) AS email_logs,
  (SELECT count(*) FROM leads WHERE id NOT IN (SELECT lead_id FROM submissions WHERE is_test = 0 AND lead_id IS NOT NULL)) AS orphan_leads
`;

// Order matters: children before submissions, submissions before leads.
const DELETES = [
  "DELETE FROM submission_tags WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)",
  "DELETE FROM notion_sync_log WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)",
  "DELETE FROM email_log WHERE submission_id IN (SELECT id FROM submissions WHERE is_test = 1)",
  "DELETE FROM submissions WHERE is_test = 1",
  "DELETE FROM leads WHERE id NOT IN (SELECT lead_id FROM submissions WHERE lead_id IS NOT NULL)",
];

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.env && !args.local) {
    console.error("Refusing to run without --env <name> (or --local).");
    console.error("  pnpm purge:test -- --env staging");
    process.exit(1);
  }

  const target = args.local ? "local" : `${args.env} (remote)`;
  const before = rows(d1(args, COUNTS))[0] ?? {};

  console.log(`目標：${target}`);
  console.log("");
  console.log(`  TEST 提交            ${before.test_submissions}`);
  console.log(`  正式提交（不受影響）  ${before.live_submissions}`);
  console.log(`  標籤                 ${before.tags}`);
  console.log(`  Notion 同步 log      ${before.notion_logs}`);
  console.log(`  Email log            ${before.email_logs}`);
  console.log(`  將失去所有提交的 lead ${before.orphan_leads}`);
  console.log("");

  if (Number(before.notion_pages) > 0) {
    console.log(`⚠ 其中 ${before.notion_pages} 筆已同步到 Notion。本腳本不會刪 Notion page —— 請自行在 Notion 刪除或封存。`);
    console.log("");
  }

  if (Number(before.test_submissions) === 0) {
    console.log("沒有 TEST 資料，毋須處理。");
    return;
  }

  if (!args.confirm) {
    console.log("這是 dry run，未刪除任何資料。確認無誤後加上 --confirm 重跑。");
    return;
  }

  for (const sql of DELETES) {
    d1(args, sql);
    console.log(`✓ ${sql.slice(0, 72)}…`);
  }

  const after = rows(d1(args, COUNTS))[0] ?? {};
  console.log("");
  console.log(`完成。剩餘 TEST 提交 ${after.test_submissions}，正式提交 ${after.live_submissions}（應與刪除前相同）。`);
}

main();
