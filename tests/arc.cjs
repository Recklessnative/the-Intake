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
assert.ok(A.HINTS.every(h => h.week >= 1 && h.week <= 7 && h.day >= 0 && h.day <= 4), 'hints sit in weeks 1 to 7, Monday to Friday');
// From week 5 every week is a team week: only Monday and Thursday are played.
assert.ok(A.HINTS.filter(h => h.week >= 5).every(h => h.day === 0 || h.day === 3), 'an act 2 hint on a day nobody plays');
// Mieke deflects only in act 2, and never in hard mode.
assert.strictEqual(A.lore({ week: 4, day: 0 }), null);
assert.ok(A.lore({ week: 6, day: 0 }).length > 5);
assert.strictEqual(A.lore({ week: 6, day: 0, off: true }), null);
require('../js/prompts.js');
const sys = window.Prompts.colleague({}, A.lore({ week: 6, day: 0 })).system;
assert.ok(sys.includes('Facilities. Do not get me started') && !/\[\w+\]/.test(sys), 'lore missing from Mieke, or it looks like a hidden fact');
assert.ok(!window.Prompts.colleague({}, null).system.includes('odd things in the office'));

// Not before its slot; then it lands and stays.
reset();
assert.strictEqual(A.offer('floor5', { week: 1, day: 4 }), false);
assert.strictEqual(A.offer('floor5', { week: 2, day: 0 }), true);
assert.strictEqual(A.offer('floor5', { week: 5, day: 3 }), true, 'a hint that landed stays');
assert.strictEqual(A.landed('floor5'), 2);
assert.strictEqual(A.landed('lehman'), 0);
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

// Doesn't add up: note things, pin two with a guess; pairs we wrote become leads.
reset();
assert.strictEqual(A.note('tape'), true);
assert.strictEqual(A.note('tape'), false, 'noted twice');
assert.strictEqual(A.note('nonsense'), false, 'a hint without notebook text');
A.note('darren:umbrella', { who: 'Darren', label: 'Umbrella', text: 'x' });
A.note('rain');
assert.ok(A.noted('rain') && A.noted('darren:umbrella'));
assert.strictEqual(A.connect('rain', 'darren:umbrella', '').ok, false, 'a pair without a guess');
assert.match(A.connect('rain', 'tape', 'they are both about mornings').line, /coincidence/);
const r = A.connect('darren:umbrella', 'rain', 'the rain is on a timer');
assert.ok(r.ok && /08:56/.test(r.line));
assert.strictEqual(A.connect('rain', 'darren:umbrella', 'again, the other way').ok, false, 'the same lead twice');
assert.deepStrictEqual(A.notes().leads.map(l => l.guess), ['the rain is on a timer']);
// Every pair names things that exist: arc hints with notebook text, or floor things marked odd.
const app0 = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
A.PAIRS.forEach(p => [p.a, p.b].forEach(id => {
  if (id.startsWith('town:')) { const town = fs.readFileSync(path.join(__dirname, '..', 'js', 'town.js'), 'utf8'); assert.ok(new RegExp('\\n    ' + id.slice(5) + ': \\{ who:').test(town), id + ' is not a seam in town'); }
  else if (id.includes(':')) { const [, thing] = id.split(':'); assert.ok(new RegExp("id: '" + thing + "'(?:(?!\\{ id:)[\\s\\S])*odd: true").test(app0), id + ' is not an odd thing on the floor'); }
  else assert.ok(A.NOTES[id], id + ' has no notebook text');
}));

// Act 1 must stand alone: no hint text names AI, 2041 or the operator.
const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
['BADGE', 'FLICKER', 'COFFEE_2024'].forEach(k => {
  const m = app.match(new RegExp('const ' + k + " = '([^\\n]*)';"));
  assert.ok(m, k + ' text not found');
  assert.ok(!/\b(AI|2041|operator|simulation|archive)\b/i.test(m[1]), k + ' gives the twist away');
});
console.log('arc: all fine');
