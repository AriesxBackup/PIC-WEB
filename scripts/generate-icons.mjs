// Regenerates the PNG app icons from app/icon.svg. Run with: node scripts/generate-icons.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const svg = readFileSync(path("../app/icon.svg"), "utf8");

// Full-bleed square version (no rounded corners) for maskable / Apple icons:
// the OS applies its own mask, so the glyph is shrunk to stay inside the safe zone.
const fullBleed = svg
  .replace('rx="128"', 'rx="0"')
  .replace(/(<rect x="120"[\s\S]*?)<\/svg>/, '<g transform="translate(256 256) scale(0.8) translate(-256 -256)">$1</g></svg>');

mkdirSync(path("../public/icons/"), { recursive: true });

const outputs = [
  { file: "../public/icons/icon-192.png", source: svg, size: 192 },
  { file: "../public/icons/icon-512.png", source: svg, size: 512 },
  { file: "../public/icons/maskable-512.png", source: fullBleed, size: 512 },
  { file: "../app/apple-icon.png", source: fullBleed, size: 180 },
];

for (const { file, source, size } of outputs) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(path(file));
  console.log(`wrote ${file.replace("../", "")}`);
}
