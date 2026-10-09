import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chrome = process.env.CHROME ?? 'google-chrome';
const source = import.meta.dirname;
const publicDir = join(source, '../../public');
const icons = join(publicDir, 'icons');
const icoHeaderSize = 6;
const icoEntrySize = 16;

renderManifestIcons();
writeFaviconFromPngs(renderFaviconPngs());

function renderManifestIcons() {
  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
    render('icon.svg', size, join(icons, `icon-${size}x${size}.png`));
  }
  for (const size of [192, 512]) {
    render('icon-maskable.svg', size, join(icons, `icon-maskable-${size}x${size}.png`));
  }
}

function renderFaviconPngs() {
  const temp = mkdtempSync(join(tmpdir(), 'icons-'));
  const pngs = [16, 32, 48].map((size) => {
    const out = join(temp, `favicon-${size}.png`);
    render('icon.svg', size, out);
    return { size, data: readFileSync(out) };
  });
  rmSync(temp, { recursive: true });
  return pngs;
}

function writeFaviconFromPngs(pngs) {
  writeFileSync(join(publicDir, 'favicon.ico'), icoHoldingPngsAsTheyAre(pngs));
}

function icoHoldingPngsAsTheyAre(pngs) {
  let offset = icoHeaderSize + icoEntrySize * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = icoDirectoryEntry(size, data.length, offset);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([icoHeader(pngs.length), ...entries, ...pngs.map(({ data }) => data)]);
}

function icoHeader(imageCount) {
  const iconType = 1;
  const header = Buffer.alloc(icoHeaderSize);
  header.writeUInt16LE(iconType, 2);
  header.writeUInt16LE(imageCount, 4);
  return header;
}

function icoDirectoryEntry(size, byteLength, offset) {
  const colourPlanes = 1;
  const bitsPerPixel = 32;
  const [width, height] = [size, size];
  const entry = Buffer.alloc(icoEntrySize);
  entry.writeUInt8(width, 0);
  entry.writeUInt8(height, 1);
  entry.writeUInt16LE(colourPlanes, 4);
  entry.writeUInt16LE(bitsPerPixel, 6);
  entry.writeUInt32LE(byteLength, 8);
  entry.writeUInt32LE(offset, 12);
  return entry;
}

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
