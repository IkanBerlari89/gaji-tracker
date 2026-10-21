/* Tiny static server for local testing: node test/serve.js [port] */
var http = require('http'), fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..'), port = +(process.argv[2] || 8765);
var types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  var f = path.normalize(path.join(root, p)); if (f.indexOf(root) !== 0) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
}).listen(port, function () { console.log('Gaji Tracker at http://localhost:' + port + '/'); });
