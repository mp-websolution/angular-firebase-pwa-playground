// Renders the app icons from the SVGs beside this file: `npm run icons`.
//
// - `icon.svg` → `public/icons/icon-<size>.png` (manifest `purpose: any`) and `public/favicon.ico`
// - `icon-maskable.svg` → `public/icons/icon-maskable-<size>.png` (manifest `purpose: maskable`)
//
// Rendering uses headless Chrome (set CHROME if it isn't `google-chrome` on the PATH). The file
// names match `public/manifest.webmanifest`, so swapping the SVGs and re-running is enough.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chrome = process.env.CHROME ?? 'google-chrome';
const source = import.meta.dirname;
const icons = join(import.meta.dirname, '../../public/icons');
const temp = mkdtempSync(join(tmpdir(), 'icons-'));

function render(svg, size, out) {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      join(source, svg),
    ],
    { stdio: 'ignore' },
  );
}

for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  render('icon.svg', size, join(icons, `icon-${size}x${size}.png`));
}
for (const size of [192, 512]) {
  render('icon-maskable.svg', size, join(icons, `icon-maskable-${size}x${size}.png`));
}

// An ICO file may hold PNGs as they are: a header, one directory entry per image, then the images.
const faviconPngs = [16, 32, 48].map((size) => {
  const out = join(temp, `favicon-${size}.png`);
  render('icon.svg', size, out);
  return { size, data: readFileSync(out) };
});
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(faviconPngs.length, 4);
let offset = header.length + 16 * faviconPngs.length;
const entries = faviconPngs.map(({ size, data }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width
  entry.writeUInt8(size, 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});
writeFileSync(
  join(icons, '../favicon.ico'),
  Buffer.concat([header, ...entries, ...faviconPngs.map(({ data }) => data)]),
);

rmSync(temp, { recursive: true });
