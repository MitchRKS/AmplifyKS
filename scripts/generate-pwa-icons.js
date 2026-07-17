#!/usr/bin/env node

/**
 * Generates the PWA home-screen icons: a white "A" on the brand-navy
 * background. Pure Node (zlib only), no image dependencies — the glyph is
 * drawn geometrically (two legs + crossbar as round-capped strokes) with
 * 3x3 supersampling for antialiasing.
 *
 * Usage: node scripts/generate-pwa-icons.js
 * Writes public/icons/amplify-a-{512,192,180}.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY = [0x1c, 0x35, 0x5e];
const WHITE = [0xff, 0xff, 0xff];

// ── PNG writer ──
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const writePng = (filePath, size, pixels /* RGB triples, row-major */) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  // compression/filter/interlace all 0
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
};

// ── Glyph geometry (unit square) ──
const distToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
};

const APEX = [0.5, 0.2];
const LEFT_FOOT = [0.22, 0.8];
const RIGHT_FOOT = [0.78, 0.8];
const STROKE = 0.075; // half-width of each stroke
// Crossbar endpoints sit on the legs at y = 0.62.
const barT = (0.62 - APEX[1]) / (LEFT_FOOT[1] - APEX[1]);
const BAR_L = [APEX[0] + (LEFT_FOOT[0] - APEX[0]) * barT, 0.62];
const BAR_R = [APEX[0] + (RIGHT_FOOT[0] - APEX[0]) * barT, 0.62];

const insideA = (x, y) =>
  distToSegment(x, y, APEX[0], APEX[1], LEFT_FOOT[0], LEFT_FOOT[1]) <= STROKE ||
  distToSegment(x, y, APEX[0], APEX[1], RIGHT_FOOT[0], RIGHT_FOOT[1]) <= STROKE ||
  distToSegment(x, y, BAR_L[0], BAR_L[1], BAR_R[0], BAR_R[1]) <= STROKE;

const render = (size) => {
  const pixels = Buffer.alloc(size * size * 3);
  const SS = 3; // supersampling grid
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (insideA(u, v)) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) {
        pixels[o + c] = Math.round(NAVY[c] + (WHITE[c] - NAVY[c]) * a);
      }
    }
  }
  return pixels;
};

const outDir = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [512, 192, 180]) {
  const file = path.join(outDir, `amplify-a-${size}.png`);
  writePng(file, size, render(size));
  console.log(`Wrote ${file}`);
}
