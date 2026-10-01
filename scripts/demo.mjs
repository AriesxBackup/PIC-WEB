// npm run demo → fills demo-data/ with a sample team + 20 real reels (first run only) and starts
// the site on http://localhost:3000 using that demo database. Your real data/ is not touched.
import { spawn } from "node:child_process";
import path from "node:path";
import { printDemoLogins, seedDemo } from "./seed-demo.mjs";

const dataDir = path.resolve("demo-data");
const { created } = await seedDemo(dataDir);
console.log(created ? "✨ Demo board created in demo-data/" : "Using the existing demo board in demo-data/ (delete it to start over)");
printDemoLogins();

// Bound to this computer only — the demo passwords are public in this repo.
const next = path.resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [next, "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DATA_DIR: dataDir, APP_NAME: process.env.APP_NAME || "Reel Board · Demo" },
});
child.on("exit", (code) => process.exit(code ?? 0));
