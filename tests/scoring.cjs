// Unit checks for js/scoring.js: one measure across modes, facts counted once, the median merge.
// Usage: node tests/scoring.cjs
const assert = require('assert');
const S = require('../js/scoring.js');

const card = {
  learningIsTheAnswer: 'partly', riskAppetite: 1,
  hiddenFacts: [{ id: 'a', weight: 2, critical: true }, { id: 'b' }, { id: 'c' }]
};
const grade = (n, extra) => Object.assign({
  diagnosis: { score: n, evidence: 'd' + n }, measurement: { score: n, evidence: '' }, fit: { score: n, evidence: '' },
  nextLevel: { score: n, evidence: '' }, risks: { score: n, evidence: '' }, pitch: { score: n, evidence: '' },
  defenceOutcome: 'none', leverCall: 'partly', questionNotAsked: 'q' + n, verdict: 'v' + n
}, extra);
const run = (kind, extra) => Object.assign({ revealed: new Set(['a']), writeup: kind === 'board' ? { kind, lever: 'partly' } : { kind }, bet: { appetite: 1, bold: 1 }, reaction: { boldness: 1 }, defence: [] }, extra);

// The same grade and the same lever call score the same on the case board and in a memo.
const board = S.points(card, run('board'), grade(3)), memo = S.points(card, run('memo4'), grade(3)), hard = S.points(card, run('hard'), grade(3));
assert.deepStrictEqual(board.pts, memo.pts);
assert.deepStrictEqual(memo.pts, hard.pts);

// Facts count once: finding more of them moves only the diagnosis, by at most 8 points.
const all = S.points(card, run('memo4', { revealed: ['a', 'b', 'c'] }), grade(3));
assert.strictEqual(all.pts.diagnosis - memo.pts.diagnosis, Math.round(13 * 3 / 4 + 8 + 4) - Math.round(13 * 3 / 4 + 8 * 0.5 + 4));
['measurement', 'fit', 'nextLevel', 'risks', 'pitch'].forEach(k => assert.strictEqual(all.pts[k], memo.pts[k]));
assert.strictEqual(all.facts, 1);

// Lever: right 1, one step off 0.25, opposite 0, no call 0. On the board the player's pick counts, in a memo the examiner's reading.
assert.strictEqual(S.lever(card, 'partly'), 1);
assert.strictEqual(S.lever(card, 'yes'), 0.25);
assert.strictEqual(S.lever({ learningIsTheAnswer: 'no' }, 'yes'), 0);
assert.strictEqual(S.lever(card, 'unclear'), 0);
assert.strictEqual(S.points(card, run('board', { writeup: { kind: 'board', lever: 'yes' } }), grade(3)).lever, 0.25);
assert.strictEqual(S.points(card, run('memo4'), grade(3, { leverCall: 'unclear' })).lever, 0);

// A full-marks request is 100, and the maximum parts add up to 100 before bonuses.
const top = S.points(card, run('memo4', { revealed: ['a', 'b', 'c'] }), grade(4));
assert.strictEqual(Object.values(top.pts).reduce((a, b) => a + b, 0), 100);

// Median of three: per dimension, with that run's evidence; the lower middle when two are left.
const m = S.median([grade(1), grade(4), grade(2, { defenceOutcome: 'strong' })]);
assert.strictEqual(m.diagnosis.score, 2);
assert.strictEqual(m.diagnosis.evidence, 'd2');
assert.strictEqual(m.spread.diagnosis, 3);
assert.strictEqual(m.runs, 3);
assert.strictEqual(m.defenceOutcome, 'none');
assert.strictEqual(m.verdict, 'v2');
assert.strictEqual(S.median([grade(3), grade(2)]).fit.score, 2);
assert.strictEqual(S.median([grade(3)]).fit.score, 3);
// A three-way tie on the defence takes the middle outcome.
assert.strictEqual(S.median([grade(2, { defenceOutcome: 'retreat' }), grade(2, { defenceOutcome: 'strong' }), grade(2, { defenceOutcome: 'weak' })]).defenceOutcome, 'weak');

// Fit is a ramp, not a cliff: ambition scales with fit, one level never moves it by more than a quarter.
const at = f => S.points(card, run('memo4'), grade(3, { fit: { score: f, evidence: '' } })).pts.nextLevel;
assert.ok(at(1) > 0 && at(1) < at(2) && at(2) < at(3) && at(3) < at(4));
assert.strictEqual(at(0), 0);
assert.ok(at(3) - at(2) <= Math.ceil(15 / 4));

// The way back counts when the examiner reads it as concrete, not when it is merely long.
const over = { appetite: 1, bold: 2, exit: 'We stop it if it does not work.' };
assert.strictEqual(S.sizing(card, over, { boldness: 2 }, 'none', 'vague').fit, 0.6);
assert.strictEqual(S.sizing(card, over, { boldness: 2 }, 'none', 'concrete').fit, 1);
assert.strictEqual(S.sizing(card, over, { boldness: 2 }, 'none').fit, 1);  // older grades: length only
assert.strictEqual(S.median([grade(3, { wayBack: 'vague' }), grade(3, { wayBack: 'concrete' }), grade(3, { wayBack: 'concrete' })]).wayBack, 'concrete');

// Boldness: median of the readings, with the objections of a run that gave the median.
const rx = (b, o) => ({ boldness: b, objections: [o], acceptReply: o });
const bm = S.boldness([rx(3, 'three'), rx(1, 'one'), rx(2, 'two')]);
assert.strictEqual(bm.boldness, 2);
assert.strictEqual(bm.objections[0], 'two');
assert.strictEqual(bm.spread, 2);
assert.strictEqual(S.boldness([null, rx(1, 'one')]).boldness, 1);
assert.strictEqual(S.boldness([]), null);

// Data facts count only when used: cited on the board or used in the write-up per the examiner.
const dcard = { learningIsTheAnswer: 'yes', hiddenFacts: [{ id: 'k', weight: 2 }, { id: 'c' }] };
const drun = extra => Object.assign({ revealed: ['c'], had: ['k'], writeup: { kind: 'memo4' }, bet: {}, defence: [] }, extra);
assert.deepStrictEqual(S.credit(dcard, drun(), grade(3)).unused, ['k']);
assert.strictEqual(S.points(dcard, drun(), grade(3)).facts, 1 / 3);
assert.strictEqual(S.points(dcard, drun({ cited: ['k'] }), grade(3)).facts, 1);
assert.strictEqual(S.points(dcard, drun(), grade(3, { factsUsed: ['k'] })).facts, 1);
assert.strictEqual(S.points(dcard, drun({ had: [] }), grade(3, { factsUsed: ['k'] })).facts, 1 / 3);  // cannot use what you never had
assert.deepStrictEqual(S.median([grade(3, { factsUsed: ['k'] }), grade(3, { factsUsed: ['k', 'c'] }), grade(3)]).factsUsed, ['k']);

console.log('scoring ok');
