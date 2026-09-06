/** Usage: pnpm hash-password  (reads password from PASSWORD env or prompts) */
import { createInterface } from "node:readline/promises";
import { hashPassword, validatePasswordStrength } from "../src/server/auth/password";

async function main() {
  let pw = process.env.PASSWORD ?? "";
  if (!pw) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    pw = await rl.question("Password: ");
    rl.close();
  }
  const err = validatePasswordStrength(pw);
  if (err) throw new Error(err);
  console.log(await hashPassword(pw));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
