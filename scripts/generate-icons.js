import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createSolidPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // Truecolor (RGB)
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter method 0
  ihdr[12] = 0; // No interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // CRC calculation
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Pre-generate CRC table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // Create image raw scanlines
  // Indigo brand base: #4f46e5 -> (79, 70, 229)
  const lineSize = 1 + width * 3;
  const raw = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    raw[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      
      // Calculate distance from center for emblem circle
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.38;

      if (dist < radius) {
        // Center shield/badge circle
        const borderDist = Math.abs(dist - radius);
        if (borderDist < 3) {
          // White border
          raw[pxOffset] = 255;
          raw[pxOffset + 1] = 255;
          raw[pxOffset + 2] = 255;
        } else if (dist < radius * 0.65) {
          // Inner icon contrast: Gold/White
          raw[pxOffset] = 251;
          raw[pxOffset + 1] = 191;
          raw[pxOffset + 2] = 36;
        } else {
          // Light indigo shield body
          raw[pxOffset] = 224;
          raw[pxOffset + 1] = 231;
          raw[pxOffset + 2] = 255;
        }
      } else {
        // Deep Indigo brand background with subtle gradient
        const gradFactor = (x + y) / (width + height);
        raw[pxOffset] = Math.round(79 - gradFactor * 24);
        raw[pxOffset + 1] = Math.round(70 - gradFactor * 22);
        raw[pxOffset + 2] = Math.round(229 - gradFactor * 65);
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// 1. apple-touch-icon.png (180x180) - iOS Requirement
fs.writeFileSync(path.resolve(publicDir, 'apple-touch-icon.png'), createSolidPNG(180, 180));

// 2. pwa-192x192.png - Standard PWA
fs.writeFileSync(path.resolve(publicDir, 'pwa-192x192.png'), createSolidPNG(192, 192));

// 3. pwa-512x512.png - High-res PWA
fs.writeFileSync(path.resolve(publicDir, 'pwa-512x512.png'), createSolidPNG(512, 512));

// 4. pwa-maskable-512x512.png - Maskable Android
fs.writeFileSync(path.resolve(publicDir, 'pwa-maskable-512x512.png'), createSolidPNG(512, 512));

console.log('Successfully generated iOS Apple Touch Icon and PWA 192/512 icons!');
