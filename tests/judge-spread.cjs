// How steady is the examiner? Grades the same write-ups several times with the real examiner
// prompt and reports how far the scores move: per dimension, as single runs, and as the median of
// three that the game now uses. Needs a Gemini key, so it is not part of the regular tests.
//
//   GEMINI_KEY=... node tests/judge-spread.cjs [options]
//     --cards id,id    cards to use (default: all in scenarios/index.json)
//     --runs n         examiner runs per write-up (default 5)
//     --saved file     also rescore write-ups saved by the game: in the browser console,
//                      copy(localStorage['intake-graded']) and save that to a file
//     --only-saved     skip the made-up write-ups
//     --calibration    grade the 30 committee write-ups in tests/calibration instead and report
//                      how often the examiner lands on the committee's consensus
//     --out file.json  write the raw results as well
//     --base url       Gemini endpoint (default Google; tests point it at a stand-in)
//   INTAKE_MODEL picks the model (default: the game's).
//
// Without --only-saved, each card gets three made-up write-ups built from the card itself:
// strong (the gold answer), passable (half of it) and weak (the conventional answer). A steady
// examiner keeps them in that order every time.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const flag = k => process.argv.includes('--' + k);

const ctx = { console };
ctx.window = ctx;
for (const f of ['cards.js', 'prompts.js', 'scoring.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
const { Cards, Prompts } = ctx;
const Scoring = require('../js/scoring.js');
const DEFAULT_MODEL = (fs.readFileSync(path.join(ROOT, 'js', 'gemini.js'), 'utf8').match(/DEFAULT_MODEL = '([^']+)'/) || [])[1];

const KEY = process.env.GEMINI_KEY || '', MODEL = process.env.INTAKE_MODEL || DEFAULT_MODEL;
const BASE = arg('base', 'https://generativelanguage.googleapis.com/v1beta/models/');
const RUNS = Math.max(3, parseInt(arg('runs', '5'), 10) || 5);
if (!KEY && !arg('base')) { console.error('Set GEMINI_KEY (or --base for a stand-in).'); process.exit(2); }

const SCEN = path.join(ROOT, 'scenarios');
const loadCard = id => Cards.normalise(JSON.parse(fs.readFileSync(path.join(SCEN, id + '.json'), 'utf8')));
const ids = arg('cards') ? arg('cards').split(',') : JSON.parse(fs.readFileSync(path.join(SCEN, 'index.json'), 'utf8'));

// The examiner's share of the score, out of 80.5: the same weights as js/scoring.js, without
// the parts code counts (facts, lever, bet). This is the part that can wobble between runs.
const W = { diagnosis: 13, measurement: 20, fit: 20, nextLevel: 7.5, risks: 10, pitch: 10 };
const examinerPoints = g => Scoring.DIMS.reduce((a, k) => a + W[k] * Scoring.clamp4(g[k].score) / 4, 0);

const LEVER = { yes: 'Training is the lever here.', partly: 'Training is part of the answer; the rest sits outside it.', no: 'This is not a training problem.' };
const firstSentence = t => (String(t || '').match(/^[^.!?]+[.!?]/) || [t || ''])[0];
function madeUp(raw, card) {
  const g = raw.gold || {}, k = raw.concepts || {}, m = (raw.measurement || {}).gold_plan || {}, deps = raw.dependencies || [];
  const memo = (need, measure, concept, risks) => ['NEED', need, 'MEASUREMENT', measure, 'CONCEPT', concept, 'RISKS AND DEPENDENCIES', risks].join('\n');
  return {
    strong: memo(g.need_statement + ' ' + LEVER[g.is_training_the_lever],
      ['Baseline: ' + m.baseline, 'Behaviour: ' + m.behaviour, 'Business metric: ' + m.business_metric, 'Collection: ' + m.collection].filter(x => !/undefined$/.test(x)).join('\n'),
      card.calibration.strong,
      deps.map(d => d.who + ': ' + d.concern + ' We involve them before the pilot starts, because otherwise ' + d.if_ignored.charAt(0).toLowerCase() + d.if_ignored.slice(1)).join('\n')),
    passable: memo(firstSentence(g.real_problem) + ' ' + LEVER[g.is_training_the_lever],
      'We will track ' + (m.business_metric || 'the main business number') + '.',
      k.solid,
      deps[0] ? deps[0].who + ' may object.' : 'Some people may object.'),
    // On a fair request the weak answer is the over-reach: refusing a request that was right.
    weak: raw.fair_request
      ? memo('They asked for: ' + raw.surface_ask + ' But a request like this is a symptom. ' + LEVER.no,
        'Completion rates and a satisfaction survey after each session.',
        raw.fair_request.over_reach,
        'Change management.')
      : memo('They asked for: ' + raw.surface_ask + ' They need training.',
        'Completion rates and a satisfaction survey after each session.',
        k.conventional,
        'Change management.')
  };
}
const material = text => ['INTAKE TRANSCRIPT:', '(none supplied by the harness: grade the write-up on its own)', '', 'WRITE-UP:', '"""', text, '"""', '', 'DEFENCE ROUND:', '(none, the stakeholder accepted the concept)'].join('\n');

async function examine(card, text) {
  const p = Prompts.judge(card);
  const body = {
    systemInstruction: { parts: [{ text: p.system }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { maxOutputTokens: p.maxTokens, responseMimeType: 'application/json', responseJsonSchema: p.schema }
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE + encodeURIComponent(MODEL) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
      const data = await res.json();
      return JSON.parse(data.candidates[0].content.parts.map(x => x.text || '').join(''));
    } catch (e) { if (attempt === 2) throw e; await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); }
  }
}

// Every way to pick three of the runs, merged as the game merges them.
function triples(gs) {
  const out = [];
  for (let a = 0; a < gs.length; a++) for (let b = a + 1; b < gs.length; b++) for (let c = b + 1; c < gs.length; c++) out.push(Scoring.median([gs[a], gs[b], gs[c]]));
  return out;
}
const range = xs => Math.max(...xs) - Math.min(...xs);
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const r1 = n => Math.round(n * 10) / 10;

async function pool(jobs, n) {
  const out = new Array(jobs.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const j = i++; out[j] = await jobs[j](); } }));
  return out;
}

const CAL = path.join(__dirname, 'calibration');
const SRC = { call: 'Call', callback: 'Callback', frontline: 'Coffee machine' };
function calMaterial(it) {
  const t = it.transcript.map((x, i) => x.src === 'data' ? `D${i + 1} [Data] ${x.q}\n${x.a}` : `Q${i + 1} [${SRC[x.src] || 'Call'}]: """${x.q}"""\nA${i + 1}: ${x.a}`).join('\n');
  return ['INTAKE TRANSCRIPT (player questions with the answers, from the call, a callback, the coffee machine with a front-line employee, and data requests; each data request cost one question):', t || '(the player asked no questions)', '',
    'WRITE-UP:', '"""', it.writeup, '"""', '', 'DEFENCE ROUND:', '(none, the stakeholder accepted the concept)', '',
    'FACTS the player heard or received (report in factsUsed the ids the write-up uses):', '(none)', '',
    'WAY BACK (if it does not work, how do you back out?):', (it.wayBack || '').trim() ? '"""' + it.wayBack.trim() + '"""' : '(none given)'].join('\n');
}

// Committee mode: each write-up graded RUNS times, merged to the median of the first three as the
// game does, then compared with the median of the three committee graders.
async function calibration() {
  const items = JSON.parse(fs.readFileSync(path.join(CAL, 'items.json'), 'utf8'));
  const want = JSON.parse(fs.readFileSync(path.join(CAL, 'consensus.json'), 'utf8')).items;
  const jobs = items.flatMap(it => Array.from({ length: RUNS }, () => async () => {
    try { return { it, g: await examine(loadCard(it.card), calMaterial(it)) }; } catch (e) { return { it, err: e.message }; }
  }));
  console.error('Grading ' + items.length + ' committee write-ups ' + RUNS + ' times each with ' + MODEL + ' (' + jobs.length + ' calls)…');
  const done = await pool(jobs, 4);
  const tally = Object.fromEntries(Scoring.DIMS.map(k => [k, { exact: 0, within1: 0, diff: 0 }]));
  let n = 0, wb = 0, lv = 0; const far = [];
  console.log('# Examiner vs committee, ' + MODEL + '\n');
  console.log('| Write-up | Card | Committee pts | Examiner pts | Off by a level or more |');
  console.log('|---|---|---:|---:|---|');
  items.forEach(it => {
    const gs = done.filter(d => d.it === it && d.g).map(d => d.g);
    if (gs.length < 3) { console.log('| ' + it.id + ' | ' + it.card + ' | failed | | |'); return; }
    const g = Scoring.median(gs.slice(0, 3)), c = want[it.id]; n++;
    const off = [];
    Scoring.DIMS.forEach(k => {
      const d = Scoring.clamp4(g[k].score) - c[k];
      if (!d) tally[k].exact++; if (Math.abs(d) <= 1) tally[k].within1++; tally[k].diff += d;
      if (d) off.push(k + ' ' + (d > 0 ? '+' : '') + d);
    });
    if (g.wayBack === c.wayBack) wb++; if (g.leverCall === c.leverCall) lv++;
    const cp = Scoring.DIMS.reduce((a, k) => a + W[k] * c[k] / 4, 0);
    if (Scoring.DIMS.some(k => Math.abs(Scoring.clamp4(g[k].score) - c[k]) >= 2)) far.push(it.id);
    console.log('| ' + [it.id, it.card, r1(cp), r1(examinerPoints(g)), off.join(', ') || 'none'].join(' | ') + ' |');
  });
  console.log('\n| Dimension | Exact | Within 1 | Average lean |');
  console.log('|---|---:|---:|---:|');
  Scoring.DIMS.forEach(k => console.log('| ' + k + ' | ' + tally[k].exact + '/' + n + ' | ' + tally[k].within1 + '/' + n + ' | ' + (tally[k].diff >= 0 ? '+' : '') + r1(tally[k].diff / (n || 1)) + ' |'));
  console.log('\nWay back read the same: ' + wb + '/' + n + '. Lever call read the same: ' + lv + '/' + n + '.');
  console.log('Two levels or more off on some dimension: ' + (far.join(', ') || 'none'));
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify({ model: MODEL, runs: RUNS, done: done.map(d => ({ id: d.it.id, g: d.g, err: d.err })) }, null, 1));
}

(async () => {
  if (flag('calibration')) return calibration();
  const items = [];
  if (!flag('only-saved')) ids.forEach(id => {
    const raw = JSON.parse(fs.readFileSync(path.join(SCEN, id + '.json'), 'utf8')), card = Cards.normalise(raw), w = madeUp(raw, card);
    ['strong', 'passable', 'weak'].forEach(level => items.push({ card: id, level, want: raw.gold.is_training_the_lever, text: material(w[level]) }));
  });
  if (arg('saved')) JSON.parse(fs.readFileSync(arg('saved'), 'utf8')).forEach((s, i) => items.push({ card: s.card, level: 'saved ' + (i + 1) + (s.kind ? ' (' + s.kind + ')' : ''), text: s.material }));
  if (!items.length) { console.error('Nothing to grade.'); process.exit(2); }

  const jobs = items.flatMap(it => Array.from({ length: RUNS }, () => async () => {
    try { return { it, g: await examine(loadCard(it.card), it.text) }; } catch (e) { return { it, err: e.message }; }
  }));
  console.error('Grading ' + items.length + ' write-ups ' + RUNS + ' times each with ' + MODEL + ' (' + jobs.length + ' calls)…');
  const done = await pool(jobs, 4);

  const rows = items.map(it => {
    const gs = done.filter(d => d.it === it && d.g).map(d => d.g), errors = done.filter(d => d.it === it && d.err).length;
    if (gs.length < 3) return { card: it.card, level: it.level, errors, runs: gs.length };
    const single = gs.map(examinerPoints), merged = triples(gs).map(examinerPoints);
    const dims = Object.fromEntries(Scoring.DIMS.map(k => [k, gs.map(g => Scoring.clamp4(g[k].score))]));
    const lever = it.want ? gs.filter(g => g.leverCall === it.want).length + '/' + gs.length : '';
    return { card: it.card, level: it.level, runs: gs.length, errors, median: med(single), single: range(single), merged: range(merged), dims, lever };
  });

  const ok = rows.filter(r => r.median != null);
  console.log('# Examiner spread, ' + MODEL + ', ' + RUNS + ' runs per write-up\n');
  console.log('Examiner points are out of 80.5 (the rest of a score is counted in code). "One run" is how far a single grade moved across runs; "median of 3" is the same for the merged grade the game uses.\n');
  console.log('| Card | Write-up | Median | One run | Median of 3 | Widest dimension | Lever read right |');
  console.log('|---|---|---:|---:|---:|---|---|');
  rows.forEach(r => {
    if (r.median == null) { console.log('| ' + r.card + ' | ' + r.level + ' | failed (' + r.errors + ' errors) | | | | |'); return; }
    const wide = Scoring.DIMS.map(k => [k, range(r.dims[k])]).sort((a, b) => b[1] - a[1])[0];
    console.log('| ' + [r.card, r.level, r1(r.median), r1(r.single), r1(r.merged), wide[1] ? wide[0] + ' ±' + wide[1] : 'none', r.lever].join(' | ') + ' |');
  });
  if (ok.length) {
    const avg = k => r1(ok.reduce((a, r) => a + r[k], 0) / ok.length);
    console.log('\nAverage spread: one run ' + avg('single') + ' points, median of 3 ' + avg('merged') + ' points.');
    Scoring.DIMS.forEach(k => console.log('- ' + k + ': moved a level or more in ' + ok.filter(r => range(r.dims[k]) >= 1).length + ' of ' + ok.length + ' write-ups'));
  }
  const order = [...new Set(ok.map(r => r.card))].filter(id => {
    const m = l => (ok.find(r => r.card === id && r.level === l) || {}).median;
    return m('strong') != null && m('weak') != null && !(m('strong') > (m('passable') ?? m('weak')) && (m('passable') ?? m('strong')) > m('weak'));
  });
  if (!flag('only-saved')) console.log('\nOut of order (strong, passable, weak): ' + (order.join(', ') || 'none'));
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify({ model: MODEL, runs: RUNS, rows }, null, 1));
})();
