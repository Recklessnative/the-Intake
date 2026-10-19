// End-to-end checks for the 2041 arc (STORY.md, spoilers): seeds finished weeks, plays one normal
// week on Autofill with Gemini mocked, and checks which hints land where. Usage: node tests/story.cjs [root] [shots]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const SHOTS = process.argv[3] || require('os').tmpdir();
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8766);

function mock(route) {
  const body = JSON.parse(route.request().postData());
  const sys = body.systemInstruction.parts[0].text;
  const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]);
  let out;
  if (sys.startsWith('You are Mieke')) out = { reply: 'Ask what changed.' };
  else if (sys.startsWith('You are the examiner')) out = { wayBack: 'clear', diagnosis: { score: 3, evidence: 'q', next: 'n' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', leverCall: 'partly', questionNotAsked: 'What changed?', verdict: 'Fine.' };
  else if (sys.includes('the executive board of')) out = { members: [{ role: 'CFO', preempted: true, line: 'Fine.', reactions: ['nod'] }, { role: 'CHRO', preempted: false, line: 'Works council?', reactions: ['nod'] }, { role: 'COO', preempted: false, line: 'Shifts?', reactions: ['nod'] }], aside: '' };
  else if (sys.includes('feedback to')) out = { score: 3, reply: 'Got it.', note: 'Clear.' };
  else if (sys.includes('chair of the board')) out = { slide: { score: 3, note: 'Clear.' }, answers: [{ role: 'CHRO', score: 4, note: 'ok' }, { role: 'COO', score: 3, note: 'ok' }], verdicts: { approved: 'Approved.', pilot: 'A pilot.', rejected: 'No.' } };
  else if (sys.includes('rate the concept')) out = { boldness: 2, boldnessReason: 'x', objections: ['Who pays?'], acceptReply: 'ok' };
  else out = { reply: 'Nights, mostly.', revealed: facts.slice(0, 1), quality: 'good', qualityWhy: 'open' };
  return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } });
}

const PTS = { diagnosis: 15, measurement: 10, fit: 10, nextLevel: 10, risks: 8, pitch: 7 };
// A history with `n` finished normal weeks (plus, with `hard`, a hard week, which must not count).
const history = (n, cards, hard) => ({ promoted: n >= 4 ? { week: 4 } : undefined, weeks: Array.from({ length: n }, (_, i) => ({ id: 'seed' + i, started: Date.UTC(2026, 0, 1 + 7 * i), done: true, title: 'Learning Consultant', avg: 60, requests: cards.map((c, k) => ({ index: k, card: c, total: 60, at: Date.UTC(2026, 0, 1 + 7 * i), pts: PTS })) }))
  .concat(hard ? [{ id: 'seedhard', started: Date.UTC(2026, 3, 1), done: true, hard: true, title: 'Learning Consultant', avg: 60, requests: [{ index: 0, card: cards[0], total: 60, pts: PTS }] }] : []) });

// `arc`: hints that already landed in earlier weeks.
async function playWeek(b, n, opt, onFloor) {
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const prompts = [];
  await p.route('https://generativelanguage.googleapis.com/**', route => { prompts.push(JSON.parse(route.request().postData()).systemInstruction.parts[0].text); return mock(route); });
  await p.addInitScript(([h, arc]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('intake-key', 'TESTKEY');
    localStorage.setItem('intake-intro', 'seen');
    ['walkin', 'tour', 'floor', 'hint-call', 'hint-leads', 'hint-write', 'hint-scores', 'patience'].forEach(k => localStorage.setItem('intake-told-' + k, '1'));
    localStorage.setItem('intake-scores', JSON.stringify(h));
    if (arc) localStorage.setItem('intake-arc', JSON.stringify(arc));
  }, [history(n, ['hotel-upgrades', 'telecom-first-call', 'logistics-night-shift'], opt.hard), { shown: opt.arc || {}, noted: opt.noted || [] }]);
  await p.goto('http://localhost:8766/?debug=1');
  await p.click('#btn-start');
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
  const seen = { mails: await p.textContent('#mail-rows'), mieke: [], toasts: [], floors: [] };
  const grabMieke = async () => seen.mieke.push(await p.evaluate(() => document.getElementById('mieke-log').textContent));
  await p.waitForTimeout(1600);
  await grabMieke();
  if (errs.length) throw new Error('page errors: ' + errs);
  // The stand-up is not part of the story: mark it done and put it away.
  if (await p.isVisible('#w-standup')) { await p.evaluate(() => { window.__intake.state.standup.done = true; }); await p.click('#w-standup .tb.close'); }
  if (opt.atDesk) { if (!(await p.isVisible('#w-inbox'))) await p.click('.desk-icon[data-app="w-inbox"]'); await opt.atDesk(p, seen); }
  for (let req = 0; req < 3; req++) {
    if (await p.isVisible('#w-academy')) await p.click('#w-academy .tb.close');
    if (opt.onDesk) await opt.onDesk(p, req, prompts);
    const last = await p.evaluate(() => window.__intake.state.index + 1 === window.__intake.state.cards.length);
    await p.click('#btn-debug');
    await p.waitForSelector('#w-leads.open');
    await p.click('#btn-leads-done');
    await p.waitForSelector('#w-write.open');
    if (await p.isVisible('#memo4-form')) { await p.click('#btn-debug'); await p.click('#memo4-form button[type=submit]'); }
    else { await p.click('#btn-debug'); await p.click('#board-next'); }
    await p.waitForSelector('#p-bet.active');
    await p.click('#btn-debug'); await p.click('#bet-form button[type=submit]');
    await p.waitForSelector('#p-defence.active, #p-score.active');
    if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
    await p.waitForSelector('#p-score.active');
    await p.click('#btn-next');
    await p.waitForSelector('#s-office.active');
    await p.waitForFunction(() => !document.getElementById('office-film'));
    const f = await p.evaluate(() => ({
      line: document.getElementById('office-line').textContent,
      spots: [...document.querySelectorAll('#office-list button')].map(b => b.dataset.spot)
    }));
    f.req = req; f.last = last;
    if (onFloor) await onFloor(p, f);
    seen.floors.push(f);
    if (last) break;
    await p.click('#office-list button.primary');
    await p.waitForFunction(() => /^sit-(played|failed)/.test(document.body.dataset.film || '') && !document.getElementById('office-film'), null, { timeout: 15000 });
    seen.toasts.push(await p.textContent('#toast'));
    await p.waitForTimeout(1600);
    await grabMieke();
  }
  seen.arc = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-arc') || '{}'));
  seen.errs = errs;
  await p.close();
  return seen;
}
const card = async (p, spot) => { await p.click('#office-list button[data-spot="' + spot + '"]'); const t = await p.textContent('#office-card'); await p.click('#office-card button'); return t; };
const fail = m => { throw new Error(m); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  // Week 2 (one finished week): the Facilities mail, and Darren's planner changes on Wednesday.
  let planner = '';
  let mailNote = '';
  const atDesk = async p => {
    // The odd mail can go in the notebook from the inbox.
    await p.click('#mail-rows tr:has-text("Lift, floor 5")');
    await p.click('#btn-mail-note');
    mailNote = await p.textContent('#btn-mail-note') + ' / ' + await p.textContent('#toast');
  };
  const w2 = await playWeek(b, 1, { arc: { badge: 7, tape: 8 }, atDesk }, async (p, f) => {
    if (f.req === 1) {
      await p.click('#office-list button[data-spot="darren"]');
      await p.waitForSelector('#office-look');
      await p.click('#office-list button[data-thing="planner"]');
      planner = await p.textContent('#office-card');
      await p.click('#office-card button');
      await p.click('#office-list button:has-text("Back to the floor")');
    }
  });
  if (!w2.mails.includes('Lift, floor 5')) fail('week 2: no Facilities mail about floor 5');
  if (!planner.includes('Same as last week')) fail('week 2: Darren\'s planner did not change: ' + planner);
  if (w2.mieke.some(t => t.includes('Morning again'))) fail('week 2: "Morning again" too early');
  if (!/Noted.*Noted\. Your notebook/.test(mailNote) || !w2.arc.noted.some(n => n.id === 'floor5')) fail('week 2: could not note the floor 5 mail: ' + mailNote);
  if (w2.errs.length) fail('week 2 errors: ' + w2.errs);
  console.log('week 2 ok', JSON.stringify(w2.arc));
  // Week 3, after a hard week that does not count: "Morning again!" on Monday, rain at 08:56 the
  // next morning, the lift flickers at the end of the week.
  let lift = '', odd = {};
  const tape = { id: 'tape', who: 'The lift', label: 'Button 5', text: 'Grey tape over button 5.' };
  const w3 = await playWeek(b, 2, { hard: true, arc: { badge: 7, tape: 8, floor5: 14, planner: 16 }, noted: [tape] }, async (p, f) => {
    if (f.req !== 2) return;
    await p.click('#office-list button[data-spot="lift"]');
    lift = await p.textContent('#office-card');
    await p.screenshot({ path: SHOTS + '/arc-flicker.png' });
    // Doesn't add up: note the lift, then pin it to the taped-over button with a guess.
    await p.click('#office-card button.note-it');
    if ((await p.textContent('#office-card button.note-it')) !== '📌 Noted') fail('Note it did not note');
    await p.click('#office-notebook');
    await p.click('.nb-tabs [data-tab="odd"]');
    odd.list = await p.$$eval('.nb-odd input', l => l.map(x => x.value));
    await p.screenshot({ path: SHOTS + '/arc-notebook0.png' });
    await p.check('.nb-odd input[value="morning"]'); await p.check('.nb-odd input[value="rain"]');
    await p.fill('.nb-pin input', 'both happen every day');
    await p.click('.nb-pin button');
    odd.wrong = await p.textContent('.nb-out');
    await p.check('.nb-odd input[value="flicker"]'); await p.check('.nb-odd input[value="tape"]');
    odd.checked = await p.$$eval('.nb-odd input:checked', l => l.length);
    await p.fill('.nb-pin input', '');
    await p.click('.nb-pin button');
    odd.empty = await p.textContent('.nb-out');
    await p.fill('.nb-pin input', 'the lift goes to five anyway');
    await p.click('.nb-pin button');
    odd.lead = await p.textContent('.nb-out.lead').catch(() => '');
    await p.screenshot({ path: SHOTS + '/arc-notebook.png' });
    await p.click('#office-card .tb.close');
  });
  if (odd.list.join(' ') !== 'tape morning rain flicker') fail('notebook odd page wrong: ' + odd.list);
  if (!/coincidence/.test(odd.wrong) || odd.checked !== 2 || !/Write down/.test(odd.empty) || !/isn't there/.test(odd.lead)) fail('pinning wrong: ' + JSON.stringify(odd));
  if (!w3.mieke[0].includes('Morning again!')) fail('week 3: Mieke does not say "Morning again!": ' + w3.mieke[0].slice(-200));
  if (!w3.toasts[0].includes('08:56')) fail('week 3: no rain at 08:56 on Tuesday: ' + w3.toasts[0]);
  if (!lift.includes('4, then 5, then 4') || !w3.floors[2].line.includes('Nobody gets out')) fail('week 3: no lift flicker');
  if (w3.errs.length) fail('week 3 errors: ' + w3.errs);
  console.log('week 3 ok', JSON.stringify(w3.arc));
  // Act 2. Every earlier hint has landed; from week 5 every week is a team week (Monday and Thursday).
  const ACT1 = { badge: 7, tape: 8, floor5: 14, planner: 16, morning: 21, rain: 22, flicker: 24 };
  // Week 5: the recalled 2008 headline on Monday, the coffee machine's corrected year on Thursday.
  let coffee = '';
  const w5 = await playWeek(b, 4, { arc: ACT1 }, async (p, f) => { if (f.last) coffee = await card(p, 'coffee'); });
  if (!w5.mails.includes('Recall: Lehman Brothers files for bankruptcy')) fail('week 5: no recalled Lehman headline');
  if (!coffee.includes('corrected the 0 to a 2')) fail('week 5: coffee note not corrected: ' + coffee);
  if (w5.errs.length) fail('week 5 errors: ' + w5.errs);
  console.log('week 5 ok');
  // Week 6: a bounce whose source is from much later; Thursday's case file is a restored scan.
  let source = '', normal = '', legible = '';
  const w6b = await playWeek(b, 5, { arc: Object.assign({ lehman: 35, coffee: 38 }, ACT1), atDesk: async p => {
    await p.click('#mail-rows tr:has-text("Undeliverable")');
    await p.click('[data-mail="source"]');
    source = await p.textContent('#mail-body');
    await p.screenshot({ path: SHOTS + '/arc-source.png' });
    await p.click('#mail-rows tr:has-text("Coffee machine")');
    await p.click('[data-mail="source"]');
    normal = await p.textContent('#mail-body');
  }, onDesk: async (p, req) => { if (req === 1) legible = await p.textContent('#briefing'); } });
  if (!/14 Mar 2041/.test(source) || !/71% recovered/.test(source)) fail('week 6: bounce source wrong: ' + source);
  if (/2041|recovered/.test(normal) || !/2007/.test(normal)) fail('week 6: an ordinary mail source gives it away: ' + normal);
  if (!/71% legible/.test(legible) || !/REDACTED: ARCHIVE/.test(legible)) fail('week 6: Thursday case file is not a restored scan: ' + legible);
  if (w6b.errs.length) fail('week 6 errors: ' + w6b.errs);
  console.log('week 6 ok');
  // Week 7: Bart's empty draft on Monday; Max's intake log in Thursday's case file.
  let bart = '', maxq = '';
  const w7 = await playWeek(b, 6, { arc: Object.assign({ lehman: 35, coffee: 38, source: 42, legible: 45 }, ACT1), atDesk: async p => {
    await p.evaluate(() => { document.querySelector('#start-menu [data-open="w-team"]').click(); });
    await p.waitForSelector('#w-team.open');
    await p.click('.team-tab:has-text("Bart")');
    await p.click('.team-draft button:has-text("Something else")');
    await p.click('#btn-team-send');
    bart = await p.textContent('#team');
    await p.screenshot({ path: SHOTS + '/arc-bart.png' });
    await p.click('#team .team-result button.link');
    await p.click('#w-team .tb.close');
  }, onDesk: async (p, req) => {
    if (req !== 1) return;
    if (!(await p.isVisible('#w-case'))) await p.click('.desk-icon[data-app="w-case"]');
    await p.click('.arc-log summary');
    await p.click('.arc-log button:has-text("doing now")');
    maxq = await p.textContent('.arc-log');
    await p.screenshot({ path: SHOTS + '/arc-max.png' });
  } });
  if (!/didn't write it/.test(bart) || !/MODULEGEN/.test(bart) || !w7.arc.noted.some(n => n.id === 'bart')) fail('week 7: Bart\'s empty draft wrong: ' + bart.slice(-400));
  if (w7.mails.includes('Lehman')) fail('week 7: the recalled 2008 headline is back in the inbox');
  if (!/Fourteen good questions/.test(maxq)) fail('week 7: Max\'s log wrong: ' + maxq.slice(-300));
  if (w7.errs.length) fail('week 7 errors: ' + w7.errs);
  console.log('week 7 ok', JSON.stringify(w7.arc.shown));
  await b.close(); srv.close();
  console.log('story: all fine');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
