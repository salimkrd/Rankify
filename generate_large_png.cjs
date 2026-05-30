const fs = require('fs');
const zlib = require('zlib');
const width = 5000;
const height = 2812;
const bytesPerPixel = 3;
const rowBytes = width * bytesPerPixel + 1;
const data = Buffer.alloc(rowBytes * height);
for (let y = 0; y < height; y++) {
  const rowStart = y * rowBytes;
  data[rowStart] = 0;
  for (let x = 0; x < width; x++) {
    const px = rowStart + 1 + x * 3;
    data[px] = 200;
    data[px + 1] = 120;
    data[px + 2] = 60;
  }
}
const idat = zlib.deflateSync(data);
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const buf = Buffer.alloc(8 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 'ascii');
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return buf;
}
const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = chunk('IHDR', Buffer.from([
  (width >> 24) & 255,
  (width >> 16) & 255,
  (width >> 8) & 255,
  width & 255,
  8,
  2,
  0,
  0,
  0,
]));
const idatChunk = chunk('IDAT', idat);
const iend = chunk('IEND', Buffer.alloc(0));
fs.writeFileSync('large-test-5000x2812.png', Buffer.concat([header, ihdr, idatChunk, iend]));
console.log('created large-test-5000x2812.png');
