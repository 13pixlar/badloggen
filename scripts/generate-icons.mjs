import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../public/icons");
const appDir = join(__dirname, "../src/app");

const iconSvg = readFileSync(join(iconsDir, "icon.svg"));
const maskableSvg = readFileSync(join(iconsDir, "icon-maskable.svg"));

async function renderPng(svg, size, output) {
  await sharp(svg).resize(size, size).png().toFile(output);
}

async function renderIco(svg, output) {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
  );

  const headerSize = 6 + sizes.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const images = [];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const png = pngBuffers[i];
    const entryOffset = 6 + i * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
    images.push(png);
  }

  await writeFile(output, Buffer.concat([header, ...images]));
}

await Promise.all([
  renderPng(iconSvg, 192, join(iconsDir, "icon-192.png")),
  renderPng(iconSvg, 512, join(iconsDir, "icon-512.png")),
  renderPng(maskableSvg, 512, join(iconsDir, "icon-512-maskable.png")),
  renderIco(iconSvg, join(appDir, "favicon.ico")),
]);

console.log("Generated PWA icon assets");
