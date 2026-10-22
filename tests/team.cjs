// Unit checks for the team's memory in js/team.js: who has grown, and Darren's line about them.
// Usage: node tests/team.cjs
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/team.js'), 'utf8'), ctx);
const T = ctx.window.Team;
const card = {
  id: 'c1', subject: 'A course.', stakeholder: { name: 'Ann Peeters' }, needStatement: 'Need.', learningIsTheAnswer: 'partly', realProblem: 'Real.',
  measurementPlan: { baseline: 'b', business_metric: 'm' }, measurementTraps: ['Satisfaction.'], calibration: { strong: 'Strong.', weak: 'Weak.' }, redFlags: [],
  dependencies: [{ who: 'Finance', concern: 'Signs off.' }], hiddenFacts: [{ fact: 'f', foundAt: ['call'] }]
};
// Coached well on Bart's weak spot (risks) twice: Bart has grown. Once is not enough; a missed flaw does not count.
const log = [
  { junior: 'bart', flaw: 'risks', weak: true, spot: 4, coach: 6 }, { junior: 'bart', flaw: 'risks', weak: true, spot: 4, coach: 4 },
  { junior: 'priya', flaw: 'measure', weak: true, spot: 4, coach: 6 }, { junior: 'jens', flaw: 'concept', weak: true, spot: 0, coach: 6 }, { junior: 'jens', flaw: 'concept', weak: true, spot: 4, coach: 6 }
];
assert.deepStrictEqual([...T.grownFrom(log)], ['bart']);
// A grown junior's flaw is never their old weak spot, every seed.
for (let i = 0; i < 40; i++) {
  const d = T.draft(card, T.junior('bart'), 'seed' + i, true);
  assert.notStrictEqual(d.flaw, 'risks');
  assert.ok(d.grown && !d.atypical);
}
const plan = T.plan([card, card, card], 'w1', false, ['bart']);
assert.deepStrictEqual([...plan.map(d => d.grown)], [true, false, false]);
// Darren's memo line: grown juniors first, then a poor review, then praise; nothing reviewed is its own line.
const team = { drafts: plan };
assert.ok(/unreviewed/.test(T.memoLine(team, [])));
plan[0].grade = { spot: 4, coach: 6, total: 10 }; plan[1].grade = { spot: 0, coach: 2, total: 2 };
assert.ok(/Bart has got noticeably sharper on the risks/.test(T.memoLine(team, ['bart'])));
assert.ok(/Priya's draft went out with a hole/.test(T.memoLine(team, [])));
plan[1].grade = { spot: 4, coach: 4, total: 8 };
assert.ok(/Bart says your feedback was "actually useful"/.test(T.memoLine(team, [])));
assert.deepStrictEqual([...T.memory(team).map(x => [x.junior, x.weak])], [['bart', false], ['priya', plan[1].flaw === 'measure']]);
console.log('team ok');
