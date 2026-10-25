// Fair requests (scenarios/README.md): the examiner, the stakeholder's reaction, the team drafts and
// the scorecard treat "yes, what you asked for, made to fit" as the right answer on these cards only.
// Usage: node tests/fair.cjs
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), SCEN = path.join(ROOT, 'scenarios');
const ctx = { console };
ctx.window = ctx;
for (const f of ['cards.js', 'prompts.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
const { Cards, Prompts } = ctx;
const Scoring = require('../js/scoring.js');
const raw = id => JSON.parse(fs.readFileSync(path.join(SCEN, id + '.json'), 'utf8'));
const ids = JSON.parse(fs.readFileSync(path.join(SCEN, 'index.json'), 'utf8'));
const fair = ids.filter(id => raw(id).fair_request);

// A couple of them, at different tiers, and the rest of the pool still hides another problem.
assert.ok(fair.length >= 2, 'at least two fair requests');
assert.ok(new Set(fair.map(id => raw(id).tier)).size >= 2, 'fair requests at more than one tier');
assert.ok(fair.length * 4 <= ids.length, 'fair requests stay the exception');

fair.forEach(id => {
  const c = Cards.normalise(raw(id)), k = raw(id).concepts;
  assert.strictEqual(c.learningIsTheAnswer, 'yes', id);
  assert.ok(c.fair && c.fair.why && c.fair.overReach, id);
  // The weak anchor is refusing it; the boldness anchor is still the plain course.
  assert.strictEqual(c.calibration.weak, c.fair.overReach, id);
  assert.strictEqual(c.calibration.conventional, k.conventional, id);
  const judge = Prompts.judge(c).system;
  assert.ok(judge.includes('THIS IS A FAIR REQUEST') && judge.includes(c.fair.why), id + ': examiner told');
  assert.ok(judge.includes('Weak (around 0 to 1): ' + c.fair.overReach), id + ': weak anchor is the over-reach');
  const reaction = Prompts.reaction(c).system;
  assert.ok(reaction.includes('the conventional answer (0) is: ' + k.conventional), id + ': boldness anchor');
  assert.ok(reaction.includes('sound relieved') && !reaction.includes('sound underwhelmed'), id + ': reaction');
  // The lever call is scored like any other: yes is right, no is wrong.
  assert.strictEqual(Scoring.lever(c, 'yes'), 1);
  assert.strictEqual(Scoring.lever(c, 'no'), 0);
});

// Every other card is unchanged.
ids.filter(id => !fair.includes(id)).forEach(id => {
  const c = Cards.normalise(raw(id));
  assert.strictEqual(c.fair, null, id);
  assert.strictEqual(c.calibration.weak, raw(id).concepts.conventional, id);
  assert.ok(!Prompts.judge(c).system.includes('FAIR REQUEST'), id);
  assert.ok(Prompts.reaction(c).system.includes('sound underwhelmed'), id);
});
console.log(fair.length + ' fair requests of ' + ids.length + ' cards: ' + fair.join(', ') + '. All fine.');
