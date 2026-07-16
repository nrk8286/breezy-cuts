import { mkdir } from "node:fs/promises";
import sharp from "sharp";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0B1F33"/><path d="M95 343c95-79 166-139 322-174" fill="none" stroke="#21B8B5" stroke-width="25" stroke-linecap="round"/><path d="M103 391c93-75 188-127 304-146" fill="none" stroke="#DDF6F5" stroke-width="14" stroke-linecap="round"/><text x="256" y="286" text-anchor="middle" font-family="Arial,sans-serif" font-size="164" font-weight="800" fill="#fff">BC</text></svg>`;
await mkdir("public/icons", { recursive: true });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}`);
