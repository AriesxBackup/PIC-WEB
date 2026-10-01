// Runs automatically before `npm run build`. On Windows, a running `npm start` server keeps
// .next/standalone locked, and the build then fails with a cryptic EBUSY error — explain it instead.
import { existsSync, renameSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".next", "standalone");
if (existsSync(dir)) {
  const probe = `${dir}-lock-check`;
  try {
    // A folder that's in use can't be renamed, so this tells us whether the server is still running.
    renameSync(dir, probe);
    renameSync(probe, dir);
  } catch {
    console.error(
      "\nThe site is still running from the previous build (npm start).\n" +
        "Stop it first (Ctrl+C in its window), then run `npm run build` again.\n",
    );
    process.exit(1);
  }
}
