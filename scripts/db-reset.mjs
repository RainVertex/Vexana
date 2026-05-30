// Reset the platform Postgres DB via prisma migrate reset --force. Disposable
// dev DB convention, no backfill or migration preservation.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function run(cmd, args, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });
    child.on("exit", (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
    child.on("error", rejectP);
  });
}

async function main() {
  console.log("[db-reset] Resetting platform Postgres DB...");
  await run("yarn", ["workspace", "@internal/db", "prisma", "migrate", "reset", "--force"]);
  console.log("[db-reset] Done.");
}

main().catch((err) => {
  console.error("[db-reset] Failed:", err.message);
  process.exit(1);
});
