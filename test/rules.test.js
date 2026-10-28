/* Tie-outs from GAJI_HANDOFF.md. Run: node test/rules.test.js */
var assert = require('assert');
var Gaji = require('./load')();
var R = Gaji.R, U = Gaji.U;
var fails = 0, n = 0;
function t(name, fn) { n++; try { fn(); console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + '\n     ' + e.message); } }
function near(a, b, eps) { assert.ok(Math.abs(a - b) < (eps || 0.006), 'expected ' + b + ' got ' + a); }

function state(over) {
  var s = { settings: Object.assign({ basic: 3900, basicBefore: 3000, raiseFrom: '2026-08', skbbk: true, baseMode: 'day', alQuota: 8, alAsOf: '2026-10-19', alLeft: 0, tg: R.DEFAULT_TG }, over || {}), months: {}, records: {}, targets: {} };
  R.bind(s); return s;
}

t('rates at RM3,900', function () {
  state(); var r = R.rates('2026-10');
  near(r.hour, 18.75); near(r.r15, 28.13); near(r.r20, 37.50); near(r.day, 150); near(r.unpaid, 125.81, 0.01);
  near(R.rates('2026-09').unpaid, 130);
});
t('probation rates at RM3,000', function () {
  state(); var r = R.rates('2026-07'); near(r.hour, 14.42); near(r.r15, 21.63); near(r.r20, 28.85);
});
t('weekday ladder', function () {
  state();
  var cases = { '17:29': [0, 7.75], '17:30': [0, 8.5], '18:00': [0.5, 9.25], '18:29': [0.5, 9.25], '18:30': [1.0, 10], '18:59': [1.0, 10], '19:00': [1.5, 10.75], '19:30': [2, 11.5], '20:00': [2.5, 12.25], '20:30': [3, 13] };
  Object.keys(cases).forEach(function (o) { var c = R.fromOut('MT', o); near(c.ot, cases[o][0]); near(c.paid, cases[o][1]); });
  assert.ok(R.fromOut('MT', '19:00').nr && !R.fromOut('MT', '18:30').nr, 'NR from 19:00');
  near(R.fromOut('FR', '18:30').paid, 9);
  assert.ok(R.fromOut('MT', '13:00').half, 'half day');
  near(R.fromOut('MT', '13:00').paid, 4.5);
});
t('saturday ladder', function () {
  state();
  var cases = { '11:30': 0, '12:30': 1, '13:00': 1.5, '15:00': 3, '16:30': 4.5, '17:00': 5, '17:30': 5.5 };
  Object.keys(cases).forEach(function (o) { near(R.fromOut('SA', o).ot, cases[o]); });
  near(R.fromOut('SA', '17:00').paid, 11);
});
t('EPF band', function () { near(R.epfFor(3900), 429); near(R.epfFor(3770), 416); near(R.epfFor(3000), 330); near(R.bandMid(3900), 3850); });
t('worked example: RM3,900, no OT, no unpaid = 3,414.80', function () {
  state(); var M = R.money('2026-11', R.halves('2026-11', {}));
  near(M.gross, 3900); near(M.epf, 429); near(M.socso, 19.25); near(M.eis, 7.70); near(M.skbbk, 29.25); near(M.ded, 485.20);
  near(M.half1, 1950); near(M.half2, 1464.80); near(M.net, 3414.80);
});
t('Jul 2026 tie-out at RM3,000 (H1 1,716.30 · H2 1,283.63)', function () {
  state();
  var H = [null, { ot: 10, ot2: 0, up: 0, paid: 0, nr: 0, days: 0 }, { ot: 7.5, ot2: 0, up: 0, paid: 0, nr: 0, days: 0 }];
  var M = R.money('2026-07', H);
  near(M.half1, 1716.30); near(M.o2, 162.23); near(M.epf, 330); near(M.socso, 16.75); near(M.eis, 6.70);
  // SKBBK on the Jul payslip was 25.15; 0.75% of gross gives 25.34 (handoff marks SKBBK as unknown), so allow 25 sen here.
  near(M.half2, 1283.63, 0.25);
});
t('Sep 2026: unpaid 1.0 + 2.5 days at RM130, OT 8.0 + 5.5', function () {
  var s = state();
  s.months['2026-09'] = { '07': { k: 'UPL' }, '21': { k: 'UPL' }, '22': { k: 'UPL' }, '23': { k: 'UPH' } };
  var H = R.halves('2026-09'); near(H[1].up, 1); near(H[2].up, 2.5);
  var M = R.money('2026-09', H); near(M.u1, 130); near(M.u2, 325); near(M.epf, R.epfFor(3900 - 455));
});
t('PH worked = 8h at 2× = RM300; empty PH = normal day', function () {
  state(); var c = R.dayCalc('2026-06', 1, { k: 'W', out: '17:30' }); near(c.ot2, 8); near(c.x2Amt, 8 * 28.85);
  var e = R.dayCalc('2026-09', 16, null); assert.equal(e.label, 'PH'); near(e.total, 150);
});
t('AL ledger: balance 0 from 19 Oct → AL counts as unpaid', function () {
  var s = state(); s.months['2026-10'] = { '05': { k: 'AL' }, '20': { k: 'AL' }, '21': { k: 'AL' } }; R.computeAL();
  assert.ok(!R.AL().over['2026-10-05'], 'before balance date untouched');
  assert.ok(R.AL().over['2026-10-20'] && R.AL().over['2026-10-21']);
  near(R.dayCalc('2026-10', 20, s.months['2026-10']['20']).up, 1);
  assert.equal(R.alLeft(2027), 8);
});
t('month reference Nov 2026: 18:30 weekdays + Sat 17:00 = 41.0h → RM4,551.08', function () {
  state(); var M = R.planMonth('2026-11', { mt: '18:30', fr: '18:30', sa: '17:00', ph: 'rest' });
  near(M.ot, 41); near(M.net, 4551.08);
  var M2 = R.planMonth('2026-11', { mt: '19:00', fr: '19:00', sa: '17:00', ph: 'rest' }); near(M2.ot, 51.5); near(M2.net, 4842.13);
});
t('normalize: ABSENT → UPL, PH off skipped, swapped OT fixed', function () {
  state();
  var o = { type: 'akef-timecard', year: 2026, month: 9, half: 2, days: [
    { date: '2026-09-16', status: 'PH', in: null, out: null },
    { date: '2026-09-17', status: 'work', in: '07:41', out: '18:32', paid_hours: 10, remark: null },
    { date: '2026-09-18', status: 'ABSENT' },
    { date: '2026-09-20', status: 'OFF' },
    { date: '2026-09-21', status: 'AL', remark: 'CUTI' }
  ], payslip: { ot15_rate: 5.5, ot15_hours: 28.13, net: 1300 }, notes: ['x'] };
  var P = R.normalize(o);
  assert.ok(!P.days['16'] && !P.days['20']); assert.equal(P.days['17'].k, 'W'); assert.equal(P.days['18'].k, 'UPL'); assert.equal(P.days['21'].k, 'AL');
  near(P.payslip.ot15_hours, 5.5); near(P.payslip.ot15_rate, 28.13); assert.equal(P.warn.length, 3);
});
t('suggest reaches target within rules', function () {
  var s = state(); var res = R.suggest('2026-12', 4500, Object.assign({}, R.DEFAULT_TG, { from: 'month' }));
  assert.ok(res.reached, 'reached'); assert.ok(res.net >= 4500); assert.ok(res.count > 0);
});
t('Sep 2026 tie-out from the real time cards: H1 2,045.04 · H2 1,371.77 (SKBBK off, AL balance 0 from 1 Sep)', function () {
  var s = state({ skbbk: false, alAsOf: '2026-09-01', alLeft: 0 });
  s.months['2026-09'] = { '01': { k: 'W', out: '18:32' }, '02': { k: 'W', out: '18:01' }, '03': { k: 'W', out: '18:01' }, '04': { k: 'W', out: '18:00' }, '05': { k: 'W', out: '13:00' },
    '07': { k: 'W', out: '18:00' }, '08': { k: 'W', out: '18:04' }, '09': { k: 'W', out: '18:01' }, '10': { k: 'W', out: '18:00' }, '11': { k: 'W', out: '18:02' }, '12': { k: 'W', out: '13:01' }, '14': { k: 'W', out: '17:30' }, '15': { k: 'UPL' },
    '17': { k: 'W', out: '18:00' }, '18': { k: 'W', out: '18:00' }, '19': { k: 'W', out: '13:01' }, '21': { k: 'W', out: '18:01' }, '22': { k: 'W', out: '18:01' }, '23': { k: 'W', out: '18:02' }, '24': { k: 'W', out: '18:01' }, '25': { k: 'W', out: '17:47' },
    '26': { k: 'AL' }, '27': { k: 'AL' }, '28': { k: 'AL' }, '29': { k: 'AL' }, '30': { k: 'W', out: '18:30' } };
  R.computeAL(); var H = R.halves('2026-09'), M = R.money('2026-09', H);
  near(H[1].ot, 8); near(H[2].ot, 5.5); near(H[1].up, 1); near(H[2].up, 2.5);
  near(M.u1, 130); near(M.u2, 325); near(M.epf, 381); near(M.socso, 19.25); near(M.eis, 7.70); near(M.skbbk, 0);
  near(M.half1, 2045.04); near(M.half2, 1371.77);
});
t('unpaid weights: weekday 1, Saturday ½, Sunday 0', function () {
  state(); near(R.dayCalc('2026-09', 26, { k: 'UPL' }).up, 0.5); near(R.dayCalc('2026-09', 27, { k: 'UPL' }).up, 0); near(R.dayCalc('2026-09', 28, { k: 'UPL' }).up, 1);
});
console.log('\n' + (n - fails) + '/' + n + ' passed');
process.exit(fails ? 1 : 0);
