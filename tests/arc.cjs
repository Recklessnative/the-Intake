// Unit checks for the 2041 arc's hint ladder: one new hint a day at most, nothing before its slot,
// nothing in hard mode or Try one case, and act 1 text that never names the twist.
// Usage: node tests/arc.cjs
const assert = require('assert'), fs = require('fs'), path = require('path');
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.window = {};
require('../js/arc.js');
const A = window.Arc, reset = () => { for (const k in store) delete store[k]; };

// One slot per day in the schedule.
const slots = A.HINTS.map(h => h.week * 7 + h.day);
assert.strictEqual(new Set(slots).size, slots.length, 'two hints share a day');
assert.ok(A.HINTS.every(h => h.week >= 1 && h.week <= 4 && h.day >= 0 && h.day <= 4), 'act 1 hints sit in weeks 1 to 4, Monday to Friday');

// Not before its slot; then it lands and stays.
reset();
assert.strictEqual(A.offer('floor5', { week: 1, day: 4 }), false);
assert.strictEqual(A.offer('floor5', { week: 2, day: 0 }), true);
assert.strictEqual(A.offer('floor5', { week: 5, day: 3 }), true, 'a hint that landed stays');
// once(): a moment, true only when it lands.
assert.strictEqual(A.once('rain', { week: 3, day: 1 }), true);
assert.strictEqual(A.once('rain', { week: 3, day: 2 }), false);

// Never two new hints on one day: a late one waits for the next free day.
reset();
assert.strictEqual(A.offer('morning', { week: 3, day: 3 }), true);
assert.strictEqual(A.once('rain', { week: 3, day: 3 }), false, 'second hint on the same day');
assert.strictEqual(A.once('flicker', { week: 3, day: 3 }), false, 'third hint on the same day');
assert.strictEqual(A.once('rain', { week: 4, day: 0 }), true, 'waits for a free day');
assert.deepStrictEqual(A.shown().sort(), ['morning', 'rain']);

// Hard mode and Try one case never show or move anything.
reset();
assert.strictEqual(A.offer('badge', { week: 9, day: 0, off: true }), false);
assert.strictEqual(A.once('tape', { week: 9, day: 1, off: true }), false);
assert.deepStrictEqual(A.shown(), []);

// Act 1 must stand alone: no hint text names AI, 2041 or the operator.
const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
['BADGE', 'FLICKER'].forEach(k => {
  const m = app.match(new RegExp('const ' + k + " = '([^\\n]*)';"));
  assert.ok(m, k + ' text not found');
  assert.ok(!/\b(AI|2041|operator|simulation|archive)\b/i.test(m[1]), k + ' gives the twist away');
});
console.log('arc: all fine');
