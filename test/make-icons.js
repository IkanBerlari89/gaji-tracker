/* Generates icons/icon-192.png and icons/icon-512.png with no dependencies: teal rounded tile, white bar-chart glyph. */
var fs = require('fs'), zlib = require('zlib'), path = require('path');
function crc32(buf) { var c, crc = 0xffffffff; for (var n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pixel) {
  var raw = Buffer.alloc((size * 4 + 1) * size);
  for (var y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; for (var x = 0; x < size; x++) { var p = pixel(x, y), o = y * (size * 4 + 1) + 1 + x * 4; raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = p[3]; } }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function make(size) {
  var bg = [12, 95, 110], fg = [255, 255, 255], r = size * 0.22;
  // three bars rising left→right inside the safe zone (maskable: keep content within the centre 80%)
  var bars = [[0.26, 0.58], [0.44, 0.44], [0.62, 0.30]], bw = 0.12;
  return png(size, function (x, y) {
    var u = x / size, v = y / size;
    // rounded square
    var dx = Math.max(Math.abs(x - size / 2) - (size / 2 - r), 0), dy = Math.max(Math.abs(y - size / 2) - (size / 2 - r), 0);
    if (Math.sqrt(dx * dx + dy * dy) > r) return [0, 0, 0, 0];
    for (var i = 0; i < bars.length; i++) { var b = bars[i]; if (u >= b[0] && u <= b[0] + bw && v >= b[1] && v <= 0.74) return fg.concat([255]); }
    if (v >= 0.76 && v <= 0.785 && u >= 0.24 && u <= 0.76) return fg.concat([200]);
    return bg.concat([255]);
  });
}
var dir = path.join(__dirname, '..', 'icons');
[192, 512].forEach(function (s) { fs.writeFileSync(path.join(dir, 'icon-' + s + '.png'), make(s)); console.log('wrote icon-' + s + '.png'); });
