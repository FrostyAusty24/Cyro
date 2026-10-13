import { randomInt } from 'node:crypto';
import { deflateSync } from 'node:zlib';

// Small bitmap alphabet avoids native graphics dependencies on bot hosting panels.
const GLYPHS: Record<string, string[]> = {
  '2': ['01110','10001','00001','00010','00100','01000','11111'], '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'], '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'], '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'], '9': ['01110','10001','10001','01111','00001','00001','01110'],
  A: ['01110','10001','10001','11111','10001','10001','10001'], B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'], D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'], F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'], H: ['10001','10001','10001','11111','10001','10001','10001'],
  J: ['00111','00010','00010','00010','10010','10010','01100'], K: ['10001','10010','10100','11000','10100','10010','10001'],
  M: ['10001','11011','10101','10101','10001','10001','10001'], N: ['10001','11001','10101','10011','10001','10001','10001'],
  P: ['11110','10001','10001','11110','10000','10000','10000'], Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'], S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'], U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'], W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'], Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
};
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}

/** A lightweight image CAPTCHA, not an advanced anti-raid or identity verification service. */
export function renderVerificationImage(code: string): Buffer {
  if (code.length !== 6 || [...code].some(character => !GLYPHS[character])) throw new Error('Unsupported verification image code.');
  const width = 300, height = 96, stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  const pixel = (x: number, y: number, color: readonly number[]) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * stride + 1 + x * 3;
    raw[index] = color[0]!; raw[index + 1] = color[1]!; raw[index + 2] = color[2]!;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixel(x, y, [12, 25, 42]);
  for (let line = 0; line < 8; line++) {
    const start = randomInt(height), slope = (randomInt(70) - 35) / width;
    for (let x = 0; x < width; x++) pixel(x, start + x * slope + Math.sin(x / 19) * 5, [36, 83, 111]);
  }
  for (const [index, character] of [...code].entries()) {
    const x0 = 17 + index * 46, y0 = randomInt(21, 36), slant = (randomInt(9) - 4) / 16;
    const color = [randomInt(142, 205), randomInt(212, 245), 255];
    const glyph = GLYPHS[character]!;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (glyph[y]![x] === '1') {
      for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 5; dx++) pixel(x0 + x * 5 + dx + (y * 5 + dy) * slant, y0 + y * 5 + dy, color);
    }
  }
  for (let dot = 0; dot < 180; dot++) pixel(randomInt(width), randomInt(height), [50, 117, 155]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
