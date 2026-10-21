/* Loads the classic-script modules into a fresh context for Node tests. */
var fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(files) {
  var ctx = { console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, parseFloat: parseFloat, isFinite: isFinite, setTimeout: setTimeout, clearTimeout: clearTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  (files || ['util.js', 'rules.js']).forEach(function (f) {
    var p = path.join(__dirname, '..', 'js', f);
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  });
  return ctx.Gaji;
};
