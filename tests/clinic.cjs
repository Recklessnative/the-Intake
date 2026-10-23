// The Learning House (js/clinic.js): checks the clinic's data against the scenario cards, then walks
// a visit in the browser in act 1 (call, sort, gap, one line, near miss, filed, the reader's card,
// the CoE folder, a field stamp), act 2 (the reader's year and its notebook seam) and act 3.
// Usage: node tests/clinic.cjs [root] [shots]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const SHOTS = process.argv[3] || require('os').tmpdir();
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };

// ---------- the data ----------
const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} }, document: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/clinic.js'), 'utf8'), sandbox);
const C = sandbox.window.Clinic;
const cardFile = id => JSON.parse(fs.readFileSync(path.join(ROOT, 'scenarios', id + '.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenarios/index.json'), 'utf8'));
// Post-2007 names may only appear on the reader's cards.
const LATER = /Mosher|Gottfredson|Weinbauer|five moments|12 levers|twelve levers|\b20(0[8-9]|[1-4]\d)\b/i;
C.MODELS.forEach(m => {
  const X = C.CASES[m.id];
  if (!X || X.main.length !== 2 || !X.near) return fail(m.id + ': needs two cases and a near miss');
  const slots = m.slots.map(s => s[0]);
  X.main.forEach(M => {
    if (!pool.includes(M.card)) fail(m.id + ': ' + M.card + ' is not in the pool');
    const c = cardFile(M.card);
    M.cards.forEach(k => {
      if (!slots.includes(k.s)) fail(m.id + '/' + M.card + ': no slot ' + k.s);
      if (k.f && !c.hidden_facts.some(f => f.id === k.f)) fail(m.id + '/' + M.card + ': no fact ' + k.f);
      if (k.d && !c.dependencies.some(d => d.who === k.d)) fail(m.id + '/' + M.card + ': no dependency ' + k.d);
    });
    M.asked.forEach(a => { if (!slots.includes(a)) fail(m.id + '/' + M.card + ': asked slot ' + a); });
    if (M.edits.filter(e => e.ok).length !== 1) fail(m.id + '/' + M.card + ': one right edit');
    if (!/changes nothing/.test(M.edits[M.edits.length - 1].t)) fail(m.id + '/' + M.card + ': last edit is "changes nothing"');
    if (LATER.test(JSON.stringify(M))) fail(m.id + '/' + M.card + ': a post-2007 name in the clinic');
  });
  const n = cardFile(X.near.card);
  X.near.facts.forEach(f => { if (!n.hidden_facts.some(x => x.id === f)) fail(m.id + ' near miss: no fact ' + f); });
  if (X.near.options.filter(o => o.ok).length !== 1) fail(m.id + ' near miss: one right option');
  if (LATER.test(m.gist + m.question + m.title + m.by)) fail(m.id + ': a post-2007 name on the handout');
});
Object.entries(C.LENS).forEach(([id, map]) => {
  if (!pool.includes(id)) return fail('lens: ' + id + ' is not in the pool');
  const c = cardFile(id);
  Object.entries(map).forEach(([f, k]) => {
    if (!c.hidden_facts.some(x => x.id === f)) fail('lens ' + id + ': no fact ' + f);
    if (!C.MODELS.some(m => m.id === k)) fail('lens ' + id + ': no handout ' + k);
  });
});
pool.forEach(id => { if (!C.LENS[id]) fail('lens: ' + id + ' has no field stamps'); });

// ---------- in the browser ----------
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8767);

const PTS = { diagnosis: 15, measurement: 10, fit: 10, nextLevel: 10, risks: 8, pitch: 7 };
const history = { weeks: [{ id: 'seed0', started: Date.UTC(2026, 0, 1), done: true, title: 'Learning Consultant', avg: 60,
  requests: ['mfg-green-belts', 'telecom-first-call', 'hotel-upgrades'].map((c, k) => ({ index: k, card: c, who: 'Client ' + k, org: 'Org ' + k, total: 60, at: Date.UTC(2026, 0, 1), pts: PTS })) }] };

async function page(b, mobile) {
  const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 900 } });
  await require('./looks.cjs')(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(h => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('intake-key', 'TESTKEY');
    localStorage.setItem('intake-intro', 'seen');
    ['walkin', 'tour', 'floor', 'hint-call', 'hint-leads', 'hint-write', 'hint-scores', 'patience'].forEach(k => localStorage.setItem('intake-told-' + k, '1'));
    localStorage.setItem('intake-scores', JSON.stringify(h));
  }, history);
  await p.goto('http://localhost:8767/');
  await p.click('#btn-start');
  // The desk first (js/seat.js), then the boot screen, then Log on.
  for (let i = 0; i < 40 && !(await p.isVisible('#s-desk.active')); i++) {
    if (await p.isVisible('#s-seat.active')) await p.click('#seat-list button[data-go="screen"]');
    else if (await p.isVisible('#s-cubicle.active')) await p.click('#btn-sit');
    else await p.waitForTimeout(150);
  }
  await p.waitForFunction(() => window.__intake.state.pool && window.__intake.state.pool.length);
  p.errs = errs;
  return p;
}
// Opens Lindeveld as the evening lift would, for an act: 1, 2 (week 5) or 3 (after the reveal).
const openTown = (p, act, day) => p.evaluate(([act, day]) => {
  const pool = window.__intake.state.pool;
  Town.open({ now: { week: act === 2 ? 5 : 2, day: 1 }, weeks: 1, checks: ['mfg-green-belts', 'telecom-first-call', 'hotel-upgrades'].map(c => ({ card: c, who: 'x', by: 'x', said: 'x', line: 'x' })),
    scrap: [], revealed: act === 3, ending: null, tomorrow: 'Wednesday', card: id => pool.find(c => c.id === id), dayKey: 'test:' + day });
}, [act, day]);
const house = async p => {
  await p.click('#town .tw-pin[data-place="house"]');
  if (await p.isVisible('.lh-call')) { await p.click('.lh-call button:has-text("Answer")'); const t = await p.textContent('.lh-call'); await p.click('.lh-call button:has-text("Hang up")'); return t; }
  return '';
};
const open = (p, label) => p.evaluate(l => { const d = [...document.querySelectorAll('#town details')].find(x => x.querySelector('summary').textContent === l); d.open = true; return d.textContent; }, label);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const p = await page(b);
  await openTown(p, 1, 1);
  await p.waitForSelector('#town.in');
  if (!(await p.isVisible('#town .tw-pin[data-place="house"]'))) fail('no Learning House pin on the map');
  const call = await house(p);
  if (!/Case Clinic/.test(call)) fail('act 1: the first call does not explain the clinic: ' + call);
  if (/1207|2041|recovered|20(1|4)\d/.test(await p.textContent('#town .tw-panel'))) fail('act 1: the Learning House shows a seam');
  const shelf = await open(p, 'The grey machine in the corner');
  if (!/smudged/.test(shelf) || /Print a card/.test(shelf)) fail('act 1: the reader prints before any clinic: ' + shelf);
  await open(p, 'The Case Clinic');
  await p.click('#lh-sit');
  await p.waitForSelector('#clinic.in');
  await p.waitForTimeout(400);
  const hand = await p.textContent('#clinic');
  if (!/Three inputs to transfer/.test(hand) || !/Baldwin and Ford, 1988/.test(hand) || !/Brabant|Peeters/.test(hand) || !/You had this one/.test(hand)) fail('handout 1 should use the played Green Belt case: ' + hand.slice(0, 300));
  await p.screenshot({ path: SHOTS + '/clinic-handout.png' });
  await p.click('#lh-next');
  // Sort: one card wrong on purpose, the rest where the handout puts them.
  const sorts = await p.evaluate(() => Clinic.CASES.inputs.main[0].cards.map(c => c.s));
  const names = { trainee: 'The trainee', design: 'The training design', work: 'The work environment' };
  for (let i = 0; i < sorts.length; i++) {
    const want = i === 0 ? 'work' : sorts[i];
    await p.click(`#clinic .lh-tiles li:nth-child(${i + 1}) button:has-text("${names[want]}")`);
  }
  await p.click('#lh-next');
  const sorted = await p.textContent('#clinic .ac-verdict');
  if (!/4 of 5/.test(sorted)) fail('sort count: ' + sorted);
  await p.screenshot({ path: SHOTS + '/clinic-sort.png' });
  await p.click('#lh-next');
  const gap = await p.textContent('#clinic .ac-stage');
  if (!/The request works here/.test(gap) || !/work environment/.test(gap)) fail('gap: ' + gap);
  await p.screenshot({ path: SHOTS + '/clinic-gap.png' });
  await p.click('#lh-next');
  await p.click('#clinic .ac-opt:has-text("monthly project review")');
  if (!(await p.$('#clinic .ac-opt.right'))) fail('the right edit is not marked right');
  await p.click('#lh-next');
  const near = await p.textContent('#clinic .ac-stage');
  if (!/Goossens|Lievens/.test(near) || !/estimate/.test(near)) fail('near miss should be the cost reports case with its facts: ' + near.slice(0, 300));
  await p.click('#clinic .ac-opt:has-text("Hardly")');
  await p.click('#lh-next');
  const end = await p.textContent('#clinic .ac-stage');
  if (!/Sorted 4 of 5/.test(end) || !/Changed the right line/.test(end) || !/Spotted the near miss/.test(end) || !/whirr/.test(end)) fail('end of visit: ' + end);
  await p.screenshot({ path: SHOTS + '/clinic-filed.png' });
  await p.click('#lh-next');
  await p.waitForSelector('#clinic', { state: 'detached' });
  const after = await open(p, 'The Case Clinic');
  if (!/another evening/.test(after)) fail('a second clinic on the same evening: ' + after);
  await open(p, 'The grey machine in the corner');
  await p.click('#town details:has-text("grey machine") button:has-text("Print a card")');
  const card = await open(p, 'The grey machine in the corner');
  if (!/12 levers/.test(card) || !/smudged/.test(card) || /2016/.test(card.split('Outside the game')[0])) fail('act 1 reader card: ' + card);
  await p.screenshot({ path: SHOTS + '/clinic-reader.png' });
  // Calls come once an evening.
  await p.click('#town .tw-pin[data-place="flat"]');
  if (await house(p)) fail('a second call on the same evening');
  await p.click('#town .tw-bar button.primary');
  await p.waitForSelector('#town', { state: 'detached' });
  // The folder on the desk.
  await p.evaluate(() => { const w = document.getElementById('w-coe'); if (!w.classList.contains('open')) document.querySelector('.desk-icon[data-app="w-coe"]').click(); });
  const files = await p.textContent('#coe-files');
  if (!/Learning House 1\. Three inputs to transfer/.test(files) || !/Reader card\. 12 levers/.test(files)) fail('CoE folder: ' + files);
  await p.click('#coe-files button:has-text("Three inputs")');
  if (!(await p.$('#coe-doc svg.flow'))) fail('the handout has no diagram');
  // The field stamp: a fact its question finds, on a live call.
  const st = await p.evaluate(() => Clinic.stamp('mfg-green-belts', ['firefighting', 'other_code']));
  if (st.length !== 1 || st[0].id !== 'inputs' || st[0].n !== 1) fail('field stamp: ' + JSON.stringify(st));
  await p.click('#coe-files button:has-text("Three inputs")');
  if (!/Stamped on your calls: 1 time/.test(await p.textContent('#coe-doc'))) fail('stamp not on the handout');
  await p.screenshot({ path: SHOTS + '/clinic-coe.png' });

  // Act 2: the next handout, Mieke's excuse, the year in ink, the reader as a notebook seam.
  await openTown(p, 2, 2);
  const call2 = await house(p);
  if (!call2) fail('act 2: no call');
  const reader2 = await open(p, 'The grey machine in the corner');
  if (!/2016/.test(reader2) || !/fresh/.test(reader2)) fail('act 2: the reader\'s year: ' + reader2);
  await p.click('#town details:has-text("grey machine") button:has-text("Note it")');
  if (!(await p.evaluate(() => Arc.noted('town:reader')))) fail('act 2: the reader is not noted');
  const next = await open(p, 'The Case Clinic');
  if (!/Could they do it\?/.test(next)) fail('visit 2 should bring handout 2: ' + next);
  await p.click('#town .tw-bar button.primary');
  await p.waitForSelector('#town', { state: 'detached' });

  // Act 3: the operator's terminal, and Mieke off the record.
  await openTown(p, 3, 3);
  const call3 = await house(p);
  if (!/Off the record/.test(call3)) fail('act 3 call: ' + call3);
  const reader3 = await open(p, 'The grey machine in the corner');
  if (!/OPERATOR TERMINAL 3/.test(reader3)) fail('act 3 reader: ' + reader3);
  await p.screenshot({ path: SHOTS + '/clinic-act3.png' });
  if (p.errs.length) fail('page errors: ' + p.errs);
  await p.close();

  // Phone width: the matrix grid and the clinic fit.
  const m = await page(b, true);
  await m.evaluate(() => localStorage.setItem('intake-clinic', JSON.stringify({ handouts: ['inputs', 'bem', 'support'], printed: [], stamps: {}, visits: 3 })));
  await openTown(m, 1, 9);
  await house(m);
  await open(m, 'The Case Clinic');
  await m.click('#lh-sit');
  await m.click('#lh-next');
  await m.waitForTimeout(400);
  const wide = await m.evaluate(() => document.querySelector('#clinic .lh-win').scrollWidth <= window.innerWidth + 1);
  if (!wide) fail('phone: the clinic is wider than the screen');
  await m.screenshot({ path: SHOTS + '/clinic-phone.png' });
  if (m.errs.length) fail('phone page errors: ' + m.errs);
  await b.close();
  srv.close();
  console.log(bad ? bad + ' failed' : 'clinic: all good');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
