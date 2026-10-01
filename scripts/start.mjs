// npm start → runs the production build (much faster than `npm run dev`). Run `npm run build` first.
// Uses ./data for the board (or DATA_DIR), and settings from .env if present.
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("No production build found — run `npm run build` first.");
  process.exit(1);
}

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // no .env file — that's fine
}

// The standalone server doesn't ship static files; put them next to it.
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });

// The server runs from .next/standalone, so pass the data folder as an absolute path.
const child = spawn(process.execPath, [path.join(standalone, "server.js")], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATA_DIR: path.resolve(root, process.env.DATA_DIR || "data"),
    PORT: process.env.PORT || "3000",
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
