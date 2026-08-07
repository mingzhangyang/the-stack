/**
 * Generates every raster brand asset from the vector mark defined below.
 *
 * The rasterizer is NOT a permanent dependency — icons change approximately
 * never, and the outputs are committed. To regenerate:
 *
 *   npm i -D @resvg/resvg-js && node scripts/generate-icons.mjs && npm un @resvg/resvg-js
 */
import {Resvg} from '@resvg/resvg-js';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

// Palette lifted from src/components/Game.tsx
const CREAM = '#F2F0E9';
const INK = '#2D2926';
const SAGE = '#8E9775';
const TAN = '#C19A6B';
const CORAL = '#EE8877';

const FONT_SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf';
const FONT_SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

/**
 * Three crossed sticks in a 64x64 box. Each upper stick carries a cream halo
 * so the crossings read as depth rather than mud at 16px.
 */
function mark({background = true} = {}) {
  // Crossings are deliberately spread across the box rather than piled at the
  // centre: overlapping them all in one place turns the halos into a smudge.
  const stick = (d, color, halo) =>
    `${halo ? `<path d="${d}" stroke="${CREAM}" stroke-width="11"/>` : ''}` +
    `<path d="${d}" stroke="${color}" stroke-width="7.5"/>`;

  return `
    ${background ? `<rect width="64" height="64" rx="13" fill="${CREAM}"/>` : ''}
    <g fill="none" stroke-linecap="round">
      ${stick('M9 27 L55 37', SAGE, false)}
      ${stick('M13 48 L51 17', TAN, true)}
      ${stick('M21 55 L41 9', CORAL, true)}
    </g>`;
}

const iconSvg = (opts) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${mark(opts)}</svg>`;

/** 1200x630 social card. */
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${INK}" opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="${CREAM}"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="${INK}" stroke-opacity="0.12"/>

  <g transform="translate(96 168) scale(4.6)">${mark({background: false})}</g>

  <text x="472" y="300" font-family="DejaVu Serif" font-size="112" fill="${INK}" letter-spacing="-3">THE STACK</text>
  <line x1="474" y1="338" x2="1064" y2="338" stroke="${INK}" stroke-opacity="0.15"/>
  <text x="474" y="386" font-family="DejaVu Sans" font-size="23" fill="${INK}" fill-opacity="0.62" letter-spacing="5.5">STEADY HAND / HIGH PRECISION</text>
  <text x="474" y="452" font-family="DejaVu Sans" font-size="21" fill="${INK}" fill-opacity="0.45" letter-spacing="3">30 STICKS &#183; 3 LIVES &#183; ONE PILE</text>
</svg>`;
}

function render(svg, width) {
  return new Resvg(svg, {
    fitTo: {mode: 'width', value: width},
    font: {fontFiles: [FONT_SERIF, FONT_SANS], loadSystemFonts: false},
  })
    .render()
    .asPng();
}

/** Minimal ICO container wrapping PNG frames (valid for 32bpp PNG entries). */
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const entries = [];
  for (const {size, png} of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

mkdirSync(publicDir, {recursive: true});

// Vector favicon — preferred by every modern browser, stays crisp at any size.
writeFileSync(
  join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>\n`,
);

const pngTargets = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, size] of pngTargets) {
  writeFileSync(join(publicDir, name), render(iconSvg(), size));
  console.log(`✓ ${name} (${size}x${size})`);
}

const icoFrames = [16, 32, 48].map((size) => ({size, png: render(iconSvg(), size)}));
writeFileSync(join(publicDir, 'favicon.ico'), buildIco(icoFrames));
console.log('✓ favicon.ico (16, 32, 48)');

writeFileSync(join(publicDir, 'og-image.png'), render(ogSvg(), 1200));
console.log('✓ og-image.png (1200x630)');
console.log('✓ favicon.svg');
