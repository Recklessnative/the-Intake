// Checks Coffee with Mieke against the real cards: what a round holds, how it follows the weak
// spot and the misses, that recall shares the stand-up's spacing, and what My scores gets.
// Usage: node tests/coffee.cjs
const assert = require('assert');
const fs = require('fs');
const path = require('path');
global.window = {};
for (const f of ['cards', 'standup', 'drill', 'team', 'academy', 'coffee']) require('../js/' + f + '.js');
Object.assign(global, window);
const C = window.Coffee, DAY = 864e5, t0 = Date.UTC(2026, 9, 20, 9);
const dir = path.join(__dirname, '..', 'scenarios');
const pool = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'))).map(id => Cards.normalise(JSON.parse(fs.readFileSync(path.join(dir, id + '.json')))));

const req = (card, at, pts) => ({ card, at, total: 50, pts: Object.assign({ diagnosis: 20, measurement: 16, fit: 16, nextLevel: 12, risks: 8, pitch: 8 }, pts) });
const hist = (requests, extra) => Object.assign({ weeks: [{ id: 'w1', started: 1, requests }] }, extra);
const check = R => {
  assert.strictEqual(R.items.length, 5);
  R.items.forEach((it, i) => { if (i) assert.notStrictEqual(it.type, R.items[i - 1].type, 'two of a kind in a row: ' + R.items.map(x => x.type)); });
  const cards = R.items.filter(i => i.type !== 'quiz').map(i => i.card);
  assert.strictEqual(new Set(cards).size, cards.length, 'a case twice in one round');
};

// A new player: five different kinds, no recall, no repeats.
for (let n = 0; n < 50; n++) {
  const R = C.build({ weeks: [] }, pool, t0);
  check(R);
  assert.ok(!R.items.some(i => i.type === 'recall'));
  assert.strictEqual(new Set(R.items.map(i => i.type)).size, 5);
  R.items.filter(i => i.type === 'lever').forEach(i => { assert.strictEqual(i.facts.length, 4); assert.ok(i.facts.some(f => f.key)); });
  R.items.filter(i => i.type === 'flaw').forEach(i => { assert.ok(i.flaw >= 0 && i.flaw < 5); assert.ok(i.why); });
  R.items.filter(i => i.type === 'quiz').forEach(i => assert.strictEqual(i.order.length, Academy.MODULES.find(m => i.card.startsWith(m.id + ':')).questions[+i.card.split(':')[1]].options.length));
}

// Weak on measurement: two stop rules, never back to back. Played yesterday: one recall, first.
const weakM = hist([req('hotel-upgrades', t0 - 2 * DAY, { measurement: 4 }), req('pharma-read-and-sign', t0 - 2 * DAY, { measurement: 6 })]);
assert.strictEqual(C.weakest(weakM), 'measurement');
for (let n = 0; n < 50; n++) {
  const R = C.build(weakM, pool, t0);
  check(R);
  assert.strictEqual(R.items[0].type, 'recall');
  assert.strictEqual(R.items.filter(i => i.type === 'rule').length, 2);
}
// Just played: nothing comes back from memory yet.
assert.ok(!C.build(hist([req('hotel-upgrades', t0 - 3600e3)]), pool, t0).items.some(i => i.type === 'recall'));
// Unplayed cases first for the fresh items.
const played = pool.filter(c => c.difficulty >= 1).slice(0, 12).map(c => req(c.id, t0 - 2 * DAY));
for (let n = 0; n < 20; n++) {
  const R = C.build(hist(played), pool, t0);
  R.items.filter(i => i.type === 'lever' || i.type === 'first').forEach(i => assert.ok(!played.some(p => p.card === i.card), 'played case used as fresh: ' + i.card));
}
// What you missed last round comes back.
const missedFlaw = { weeks: [], coffee: [{ at: t0 - DAY, items: [{ type: 'flaw', card: 'x', ok: 'missed' }, { type: 'quiz', card: 'y', ok: 'got' }] }] };
for (let n = 0; n < 20; n++) assert.ok(C.build(missedFlaw, pool, t0).items.some(i => i.type === 'flaw'));

// Finishing: the recall goes into the stand-up's queue, My scores gets the kinds and a ledger.
const R = C.build(weakM, pool, t0);
R.items.forEach(i => { i.ok = 'got'; if (i.type === 'recall') i.rated = 'got'; });
const h = JSON.parse(JSON.stringify(weakM));
C.record(h, R, t0);
assert.strictEqual(h.coffee.length, 1);
assert.strictEqual(h.recall[R.items[0].card].streak, 1);
const lines = C.ledger(h, t0);
assert.ok(/1 round · 1 day this month/.test(lines[0]), lines[0]);
assert.ok(/Stop rules 2 of 2/.test(lines[1]), lines[1]);

// A round from yesterday makes way; today's stays.
assert.strictEqual(C.stale({ at: t0 - DAY }, t0), true);
assert.strictEqual(C.stale({ at: t0 - 3600e3 }, t0), false);

// First-question checks guess from the wording.
const tick = t => Object.fromEntries(C.FIRST_CHECKS.map(([k, , f]) => [k, f(t)]));
assert.deepStrictEqual(tick('Which flights were late, and since when?'), { open: true, work: true, specific: true });
assert.deepStrictEqual(tick('Do you want an e-learning or a workshop?'), { open: false, work: false, specific: false });
console.log('coffee ok');
