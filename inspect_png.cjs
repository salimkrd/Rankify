const fs = require('fs');
const zlib = require('zlib');
const data = fs.readFileSync('large-test-5000x2812.png');
console.log('sig', data.slice(0,8).toString('hex'));
let pos = 8;
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
while (pos < data.length) {
  const len = data.readUInt32BE(pos);
  const type = data.toString('ascii', pos + 4, pos + 8);
  const chunk = data.slice(pos + 8, pos + 8 + len);
  const crc = data.readUInt32BE(pos + 8 + len);
  const calc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), chunk]));
  console.log(type, len, crc.toString(16), calc.toString(16), crc === calc);
  if (type === 'IDAT') {
    try {
      const un = zlib.inflateSync(chunk);
      console.log('IDAT inflate len', un.length, 'firstbytes', un.slice(0,16).toString('hex'));
    } catch (err) {
      console.log('inflate err', err.message);
    }
  }
  pos += 12 + len;
}
console.log('done pos', pos, 'total', data.length);
