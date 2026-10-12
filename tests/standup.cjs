// Unit checks for the stand-up's spacing: what comes back, and when a case retires.
// Usage: node tests/standup.cjs
const assert = require('assert');
global.window = {};
require('../js/standup.js');
const S = window.Standup, DAY = 864e5;
const card = id => ({ id, stakeholder: { name: 'X' }, surfaceAsk: 'a', realProblem: 'r', learningIsTheAnswer: 'no', questionHint: 'h' });
const cards = ['a', 'b', 'c'].map(card);
const hist = recall => ({ recall, weeks: [{ id: 'w1', started: 1, requests: [{ card: 'a', total: 70 }, { card: 'b', total: 40 }, { card: 'c', total: 55 }] }] });
const t0 = 100 * DAY;

// Lowest score first, and one review a day at most.
assert.deepStrictEqual(S.pick(hist({}), cards, 'w2', 2, t0).map(i => i.card), ['b', 'c']);
const rec = {};
S.record(rec, { card: 'b', rated: 'got' }, t0);
assert.deepStrictEqual(S.pick(hist(rec), cards, 'w2', 3, t0 + 3600e3).map(i => i.card), ['c', 'a']);
// Never-got cases come before ones you got once.
assert.deepStrictEqual(S.pick(hist(rec), cards, 'w2', 3, t0 + DAY).map(i => i.card), ['c', 'a', 'b']);
// A second "got" in the same week does not retire it; one a week later does.
S.record(rec, { card: 'b', rated: 'got' }, t0 + 2 * DAY);
assert.strictEqual(S.retired(rec.b), false);
S.record(rec, { card: 'b', rated: 'got' }, t0 + 9 * DAY);
assert.strictEqual(S.retired(rec.b), true);
assert.ok(!S.pick(hist(rec), cards, 'w2', 3, t0 + 20 * DAY).some(i => i.card === 'b'));
// A miss resets the streak.
S.record(rec, { card: 'c', rated: 'got' }, t0);
S.record(rec, { card: 'c', rated: 'partly' }, t0 + 8 * DAY);
assert.strictEqual(rec.c.streak, 0);
// Older saves stored a plain rating.
assert.strictEqual(S.retired('got'), false);
assert.deepStrictEqual(S.pick(hist({ a: 'got', b: 'missed' }), cards, 'w2', 3, t0).map(i => i.card), ['b', 'c', 'a']);
console.log('standup ok');
