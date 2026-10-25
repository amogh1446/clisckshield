/**
 * ClickShield Extension Icon Generator
 * Generates PNG icons for Chrome Manifest V3 in required sizes: 16x16, 32x32, 48x48, 128x128.
 * Brand aesthetic: Deep purple shield with vivid purple and cyan accents.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function makePng(width, height, pixelFn) {
  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([lenBuf, combined, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter none
  ihdr[12] = 0; // Non-interlaced

  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter byte 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  const end = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', end)
  ]);
}

function renderPixel(x, y, width, height) {
  // Normalize coordinates to [-1, 1]
  const nx = (x + 0.5 - width / 2) / (width / 2);
  const ny = (y + 0.5 - height / 2) / (height / 2);

  // Background rounded rect / circular backdrop
  const distCenter = Math.sqrt(nx * nx + ny * ny);

  // Shield boundary equations
  const absX = Math.abs(nx);
  const topY = -0.85 + 0.12 * (absX * absX);
  const bottomCurve = 0.15 + (1 - (absX / 0.82)) * 0.80;

  const inShield = ny >= topY && absX <= 0.82 && (ny <= 0.15 || ny <= bottomCurve);

  // Inner shield for dual-tone border
  const inInnerShield = ny >= (topY + 0.12) && absX <= 0.70 && (ny <= 0.15 || ny <= (bottomCurve - 0.12));

  // Center emblem checkmark / sword shape
  // Checkmark points: (-0.35, 0.05) -> (-0.1, 0.35) -> (0.42, -0.32)
  let inCheckmark = false;
  // Segment 1: from (-0.35, 0.05) to (-0.1, 0.35)
  if (nx >= -0.38 && nx <= -0.05 && ny >= 0.0 && ny <= 0.40) {
    const lineY = 0.05 + ((nx - -0.35) / 0.25) * 0.30;
    if (Math.abs(ny - lineY) <= 0.12) inCheckmark = true;
  }
  // Segment 2: from (-0.1, 0.35) to (0.42, -0.32)
  if (nx >= -0.12 && nx <= 0.45 && ny >= -0.35 && ny <= 0.40) {
    const lineY = 0.35 + ((nx - -0.1) / 0.52) * -0.67;
    if (Math.abs(ny - lineY) <= 0.12) inCheckmark = true;
  }

  if (inCheckmark) {
    // Bright cyan/white checkmark (#38bdf8 / #ffffff)
    return [56, 189, 248, 255];
  }

  if (inInnerShield) {
    // Deep vibrant purple fill (#7c3aed to #4c1d95 gradient)
    const grad = Math.max(0, Math.min(1, (ny + 0.8) / 1.6));
    const r = Math.round(124 * (1 - grad * 0.4));
    const g = Math.round(58 * (1 - grad * 0.5));
    const b = Math.round(237 * (1 - grad * 0.35));
    return [r, g, b, 255];
  }

  if (inShield) {
    // Outer shield rim / border: bright violet / purple accent (#a855f7)
    return [168, 85, 247, 255];
  }

  // Soft subtle rounded squircle background for high contrast
  if (Math.pow(absX, 3.5) + Math.pow(Math.abs(ny), 3.5) <= 0.95) {
    // Dark matte background (#0f172a)
    return [15, 23, 42, 240];
  }

  // Transparent outside
  return [0, 0, 0, 0];
}

const iconsDir = path.resolve(__dirname);
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const pngBuf = makePng(size, size, renderPixel);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Created icon: ${outPath} (${pngBuf.length} bytes, ${size}x${size})`);
}
