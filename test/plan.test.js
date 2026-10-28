/* Assumed days (Home forecast) and plan overlay. Run: node test/plan.test.js */
var assert = require('assert');
var Gaji = require('./load')(['util.js', 'rules.js']);
var R = Gaji.R;
var fails = 0, n = 0;
function t(name, fn) { n++; try { fn(); console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + '\n     ' + e.message); } }
function near(a, b, eps) { assert.ok(Math.abs(a - b) < (eps || 0.006), 'expected ' + b + ' got ' + a); }
function state() { var s = { settings: { basic: 3900, basicBefore: 3000, raiseFrom: '2026-08', skbbk: true, baseMode: 'day', alQuota: 8, alAsOf: '2026-10-19', alLeft: 0, tg: R.DEFAULT_TG }, months: {}, records: {}, targets: {}, plans: { days: {} } }; R.bind(s); return s; }

t('assumed days: empty future working days get the assumed clock-out (Jan 2027: 5 Saturdays at 13:00 = 7.5h)', function () {
  state(); var days = R.assumedDays('2027-01', { wk: '17:30', sa: '13:00' });
  assert.equal(days['02'].out, '13:00'); assert.equal(days['04'].out, '17:30'); assert.ok(!days['03'], 'Sunday stays empty');
  near(R.assumedMoney('2027-01', { wk: '17:30', sa: '13:00' }).ot, 7.5);
});
t('assumed days never touch real entries or the past', function () {
  var s = state(); s.months['2027-01'] = { '04': { k: 'AL' } }; var days = R.assumedDays('2027-01', { wk: '18:30', sa: '13:00' });
  assert.equal(days['04'].k, 'AL'); assert.ok(!R.assumedDays('2026-01', { wk: '18:30', sa: '13:00' })['05'], 'past month untouched');
});
t('plan days: real wins, planned counts only after today', function () {
  var s = state(); s.months['2027-02'] = { '01': { k: 'AL' } }; s.plans = { days: { '2027-02': { '01': { k: 'W', out: '19:00', plan: 1 }, '02': { k: 'W', out: '18:30', plan: 1 } } } };
  var d = R.planDays('2027-02'); assert.equal(d['01'].k, 'AL'); assert.equal(d['02'].out, '18:30');
  s.plans = { days: { '2026-01': { '05': { k: 'W', out: '19:00', plan: 1 } } } }; assert.ok(!R.planDays('2026-01')['05'], 'past plan ignored');
});
t('forecastMonth uses the plan overlay and fills only empty future days', function () {
  var s = state(); s.plans = { days: { '2027-03': { '01': { k: 'W', out: '20:00', plan: 1 } } } };
  var M = R.forecastMonth('2027-03', { mt: '17:30', fr: '17:30', sa: 'off', ph: 'rest' }); near(M.ot, 2.5);
});
t('suggest with a plan base skips real days', function () {
  var s = state(); s.months['2027-04'] = { '05': { k: 'W', out: '17:30', real: 1 } };
  var res = R.suggest('2027-04', 4000, Object.assign({}, R.DEFAULT_TG, { from: 'month', extend: true }), R.planDays('2027-04'));
  assert.ok(!res.sugg['05'], 'real day not extended'); assert.ok(res.reached);
});
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
