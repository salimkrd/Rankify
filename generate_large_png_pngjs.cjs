const fs = require('fs');
const { PNG } = require('pngjs');
const width = 5000;
const height = 2812;
const png = new PNG({ width, height });
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    png.data[idx] = 200;
    png.data[idx + 1] = 120;
    png.data[idx + 2] = 60;
    png.data[idx + 3] = 255;
  }
}
png.pack().pipe(fs.createWriteStream('large-test-5000x2812.png')).on('finish', () => console.log('wrote large-test-5000x2812.png'));