// End-to-end checks for the 2041 arc (STORY.md, spoilers): seeds finished weeks, plays one normal
// week on Autofill (weeks 2, 3, 5 to 7, and the reveal in week 8) with Gemini mocked, and checks which hints land where. Usage: node tests/story.cjs [root] [shots]
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
const history = (n, cards, hard) => ({ promoted: n >= 4 ? { week: 4 } : undefined, weeks: Array.from({ length: n }, (_, i) => ({ id: 'seed' + i, started: Date.UTC(2026, 0, 1 + 7 * i), done: true, title: 'Learning Consultant', avg: 60, requests: cards.map((c, k) => ({ index: k, card: c, who: 'Client ' + k, org: 'Org ' + k, call: k === 0 ? 'yes' : undefined, total: 60, at: Date.UTC(2026, 0, 1 + 7 * i), pts: PTS })) }))
  .concat(hard ? [{ id: 'seedhard', started: Date.UTC(2026, 3, 1), done: true, hard: true, title: 'Learning Consultant', avg: 60, requests: [{ index: 0, card: cards[0], total: 60, pts: PTS }] }] : []) });

// `arc`: hints that already landed in earlier weeks.
async function playWeek(b, n, opt, onFloor) {
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await require('./looks.cjs')(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const prompts = [];
  await p.route('https://generativelanguage.googleapis.com/**', route => { prompts.push(JSON.parse(route.request().postData()).systemInstruction.parts[0].text); return mock(route); });
  await p.addInitScript(([h, arc, extra]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('intake-key', 'TESTKEY');
    localStorage.setItem('intake-intro', 'seen');
    ['walkin', 'tour', 'floor', 'hint-call', 'hint-leads', 'hint-write', 'hint-scores', 'patience'].forEach(k => localStorage.setItem('intake-told-' + k, '1'));
    localStorage.setItem('intake-scores', JSON.stringify(h));
    if (arc) localStorage.setItem('intake-arc', JSON.stringify(arc));
    Object.entries(extra || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  }, [history(n, ['hotel-upgrades', 'telecom-first-call', 'logistics-night-shift'], opt.hard), { shown: opt.arc || {}, noted: opt.noted || [] }, opt.storage]);
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
    if (opt.atScore) { await opt.atScore(p, seen); break; }
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
    // From the evening of the tender the lift asks: home, or button 5.
    let revealed = false;
    const press5 = await p.isVisible('#office-card button:has-text("Press 5")');
    if (press5) seen.lift = await p.textContent('#office-card');
    if (press5 && opt.onLift) revealed = await opt.onLift(p, seen);
    else if (await p.isVisible('#office-card button:has-text("Walk home through town")')) {
      // After a finished week the lift also offers the town (js/town.js).
      if (opt.onTown && !seen.town) { await p.click('#office-card button:has-text("Walk home through town")'); await p.waitForSelector('#town.in'); seen.town = await opt.onTown(p, seen); await p.click('#town .tw-bar button.primary'); revealed = true; }
      else await p.click('#office-card button:has-text("Go home")');
    }
    if (revealed) await p.waitForSelector('#s-desk', { state: 'visible' });
    else await p.waitForFunction(() => /^sit-(played|failed)/.test(document.body.dataset.film || '') && !document.getElementById('office-film'), null, { timeout: 15000 });
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
// Opens each place on the town map and returns its text, keyed by place; every <details> opened.
async function townText(p) {
  const out = {};
  for (const id of ['flat', 'junction', 'hall', 'streets']) {
    await p.click('#town .tw-pin[data-place="' + id + '"]');
    await p.evaluate(() => document.querySelectorAll('#town details').forEach(d => { d.open = true; }));
    out[id] = await p.textContent('#town .tw-panel');
  }
  out.map = await p.textContent('#town .tw-map');
  out.notes = await p.$$eval('#town .tw-panel details > button', bs => bs.map(b => b.textContent));
  return out;
}

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
  // The town, act 1: a plain 2007 town, a week's pay, a regular whose case went right.
  const onTown1 = async p => {
    const t = await townText(p);
    await p.click('#town .tw-pin[data-place="flat"]');
    await p.evaluate(() => { document.querySelector('#town details:last-of-type').open = true; });
    await p.click('#town .tw-cat li:has-text("A plant") button');
    t.after = await p.textContent('#town .tw-panel');
    await p.screenshot({ path: SHOTS + '/arc-town.png' });
    return t;
  };
  const w2 = await playWeek(b, 1, { arc: { badge: 7, tape: 8 }, atDesk, onTown: onTown1 }, async (p, f) => {
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
  const T1 = w2.town || fail('week 2: the lift did not offer the town');
  if (!/Employee no\. 1207/.test(T1.flat) || !/Net pay \(EUR\) \.+ 289\.05/.test(T1.flat) || /Immersion|Sign-offs|Mieke/.test(T1.flat)) fail('week 2: payslip wrong: ' + T1.flat);
  if (!/plant that is, against the odds, alive/.test(T1.after) || !/276\.55/.test(T1.after)) fail('week 2: buying the plant did not work: ' + T1.after);
  if (!/first check-in screen/.test(T1.junction) || !/Still working on it/.test(T1.junction) || /DELAYED/.test(T1.junction)) fail('week 2: Monday check at The Junction wrong: ' + T1.junction);
  if (T1.notes.some(n => /Note it/.test(n)) || /1207/.test(T1.hall) || /fog|recovered/i.test(T1.streets + T1.map)) fail('week 2: act 1 town shows a seam: ' + JSON.stringify(T1));
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
  if (!/tape is gone/.test(w5.lift || '') || !/Go home/.test(w5.lift)) fail('week 5: the lift does not offer button 5 after the tender: ' + w5.lift);
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
  }, onDesk: async (p, req) => { if (req === 1) legible = await p.textContent('#briefing'); }, onTown: async p => {
    // Act 2 in town, on a Monday evening: the 3 September message, the 08:56 train, ticket 1207.
    const t = await townText(p);
    await p.click('#town .tw-pin[data-place="flat"]');
    await p.click('#town details:has-text("answering machine") summary');
    await p.click('#town details:has-text("answering machine") button');
    t.noted = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-arc')).noted.map(n => n.id));
    return t;
  } });
  const T2 = w6b.town || fail('week 6: no town');
  if (!/3 September 2007/.test(T2.flat) || !/Immersion costs: covered by the Learning House/.test(T2.flat) || !/paid for being right/.test(T2.flat) || /Sign-offs/.test(T2.flat)) fail('week 6: act 2 flat wrong: ' + T2.flat);
  if (!/08:56 Brussels-North · DELAYED/.test(T2.junction) || !/Ticket: 1207|ticket: 1207/.test(T2.hall) || !/fog/i.test(T2.streets)) fail('week 6: act 2 town seams missing: ' + JSON.stringify(T2));
  if (!T2.noted.includes('town:machine')) fail('week 6: could not note the answering machine: ' + T2.noted);
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
  // Week 8, nobody went up yet: 5 is the only button. Floor 5, the operator's mail, the waiver; then
  // the aftermath on the floor, the boot screen, the start menu and My scores.txt.
  const ALL = Object.assign({ lehman: 35, coffee: 38, source: 42, legible: 45, bart: 49, transcript: 52 }, ACT1);
  const rv = {};
  const w8 = await playWeek(b, 7, { arc: ALL, noted: [tape], onLift: async (p, seen) => {
    if (await p.isVisible('#office-card button:has-text("Go home")')) fail('week 8: the lift still offers home');
    await p.click('#office-card button:has-text("Press 5")');
    await p.waitForSelector('#reveal.in');
    // The lift film plays first, then lands on the floor 5 still.
    await p.waitForSelector('#reveal .rv-film');
    rv.film = await p.textContent('#reveal .rv-line');
    await p.waitForFunction(() => /^lift5-/.test(document.body.dataset.film || ''), null, { timeout: 15000 });
    rv.played = await p.evaluate(() => document.body.dataset.film);
    await p.waitForTimeout(900);
    await p.screenshot({ path: SHOTS + '/arc-floor5.png' });
    await p.click('#reveal .office-tag');
    rv.mail = await p.textContent('#reveal .rv-mail');
    rv.log = await p.textContent('#reveal .rv-log');
    await p.click('#reveal .rv-att');
    await p.fill('#reveal .rv-sign input', 'Test Player');
    await p.screenshot({ path: SHOTS + '/arc-waiver.png' });
    rv.before = await p.evaluate(() => localStorage.getItem('intake-told-reveal'));
    await p.click('#reveal .rv-sign button');
    await p.waitForSelector('#reveal .rv-back');
    rv.name = await p.inputValue('#reveal .rv-sign input');
    rv.after = await p.evaluate(() => localStorage.getItem('intake-told-reveal'));
    await p.screenshot({ path: SHOTS + '/arc-signed.png' });
    await p.click('#reveal .rv-back');
    await p.waitForSelector('#reveal', { state: 'detached' });
    return true;
  } }, async (p, f) => {
    if (!f.last) return;
    rv.mieke = await card(p, 'mieke');
    if (await p.isVisible('#office-look')) await p.click('#office-list button:has-text("Back to the floor")');
    rv.tv = await card(p, 'tv');
    rv.desk = await p.evaluate(() => ({ boot: document.querySelector('.boot-foot').textContent, logoff: document.getElementById('btn-logoff').textContent, greyed: (document.getElementById('btn-logoff-2041') || {}).disabled }));
    await p.evaluate(() => { document.querySelector('#start-menu [data-open="w-scores"]').click(); });
    rv.scores = await p.textContent('#scores');
  });
  if (!/press 5/.test(rv.film) || rv.played !== 'lift5-played') fail('week 8: the lift film did not play: ' + rv.film + ' / ' + rv.played);
  if (!/only button 5 lights/i.test(w8.lift || '')) fail('week 8: 5 is not the only button: ' + w8.lift);
  if (!/operator@archive\.lindeveld\.be/.test(rv.mail) || !/cohort 12, seat 07/.test(rv.mail) || !/Sorry about the rain/.test(rv.mail)) fail('week 8: operator mail wrong: ' + rv.mail);
  if (!/Flagged by participant: [1-9]/.test(rv.log) || !/Button 5/.test(rv.log)) fail('week 8: the session log does not list what you noted: ' + rv.log);
  if (rv.before || rv.after !== '1' || rv.name !== '1207') fail('week 8: signing did not turn you into 1207: ' + JSON.stringify(rv));
  if (!/Participant 0031/.test(rv.mieke) || !/Test card/.test(rv.tv)) fail('week 8: no aftermath on the floor: ' + rv.mieke + ' / ' + rv.tv);
  if (!/2041\.03/.test(rv.desk.boot) || !/Clock out/.test(rv.desk.logoff) || !rv.desk.greyed) fail('week 8: no aftermath on the desk: ' + JSON.stringify(rv.desk));
  if (!/Exported from session 1207/.test(rv.scores)) fail('week 8: My scores.txt is not exported from session 1207');
  if (w8.errs.length) fail('week 8 errors: ' + w8.errs);
  console.log('week 8 ok');
  // Week 9, the week after the reveal: one request, the operator's. Autofill calls it "not a learning
  // problem" with a name under it, so the ending is Log off.
  const fin = {};
  const w9 = await playWeek(b, 8, { arc: ALL, noted: [tape], storage: { 'intake-told-reveal': '1' }, onDesk: async (p, req) => {
    fin.cards = await p.evaluate(() => window.__intake.state.cards.map(c => c.id));
    fin.tell = await p.evaluate(() => { const b = document.getElementById('btn-tellme'); const was = b.hidden; b.click(); return { was, found: document.getElementById('found').textContent }; });
  }, atScore: async (p, seen) => {
    fin.next = await p.textContent('#btn-next');
    await p.evaluate(() => { const b = window.__intake.state.run.writeup; b.accountable = 'Test Player'; });
    await p.click('#btn-next');
    await p.waitForSelector('#reveal.ending.in');
    for (let k = 0; k < 6 && !(await p.$('#reveal .rv-back')); k++) { await p.mouse.click(40, 40); await p.waitForTimeout(400); }
    await p.waitForSelector('#reveal .rv-back');
    await p.waitForTimeout(2200);
    fin.card = await p.textContent('#reveal .rv-endcard');
    await p.screenshot({ path: SHOTS + '/arc-ending.png' });
    await p.click('#reveal .rv-back');
    await p.waitForSelector('#s-title', { state: 'visible' });
    fin.ending = await p.evaluate(() => localStorage.getItem('intake-ending'));
    fin.sub = await p.textContent('#title-sub');
  } });
  if (fin.cards.join() !== 'operator-2041') fail('week 9: not the operator\'s request: ' + fin.cards);
  if (fin.tell.was || !/^7 \/ 7/.test(fin.tell.found)) fail('week 9: Just tell me did not tell: ' + JSON.stringify(fin.tell));
  if (!/operator is waiting/.test(fin.next)) fail('week 9: scorecard does not lead to the ending: ' + fin.next);
  if (fin.ending !== 'logoff' || !/Most cohorts notice four/.test(fin.card) || !/Final settlement: 0\.00/.test(fin.card) || !/Sign-offs: 1/.test(fin.card)) fail('week 9: Log off ending wrong: ' + JSON.stringify(fin));
  if (!/logged off/.test(fin.sub)) fail('week 9: title does not know the session ended: ' + fin.sub);
  if (w9.mails.includes('Darren') || !w9.mails.includes('Request: we need a course')) fail('week 9: inbox is not just the operator: ' + w9.mails.slice(0, 300));
  if (w9.errs.length) fail('week 9 errors: ' + w9.errs);
  console.log('week 9 ok');
  // The same week, called "learning fixes this": Clock in tomorrow, and the next week is a normal one.
  const ci = {};
  await playWeek(b, 8, { arc: ALL, storage: { 'intake-told-reveal': '1' }, atScore: async p => {
    await p.evaluate(() => { window.__intake.state.run.writeup.lever = 'yes'; });
    await p.click('#btn-next');
    await p.waitForSelector('#reveal.ending.clockin.in');
    for (let k = 0; k < 6 && !(await p.$('#reveal .rv-back')); k++) { await p.mouse.click(40, 40); await p.waitForTimeout(400); }
    ci.card = await p.textContent('#reveal .rv-endcard');
    await p.click('#reveal .rv-back');
    await p.waitForFunction(() => window.__intake.state.cards.length > 1);
    ci.after = await p.evaluate(() => ({ ending: localStorage.getItem('intake-ending'), final: window.__intake.state.final, cards: window.__intake.state.cards.map(c => c.id) }));
  } });
  if (ci.after.ending !== 'clockin' || ci.after.final || ci.after.cards.includes('operator-2041') || !/Session 1207 continues/.test(ci.card)) fail('Clock in ending wrong: ' + JSON.stringify(ci));
  console.log('clock in ok');
  // After the reveal and Log off, the town is the archive: the operator's Monday check, Sign-offs: 1.
  const w10 = await playWeek(b, 9, { arc: ALL, storage: { 'intake-told-reveal': '1', 'intake-ending': 'logoff', 'intake-signoffs': '1' }, onTown: async p => {
    const t = await townText(p);
    await p.screenshot({ path: SHOTS + '/arc-town-2041.png' });
    return t;
  } });
  const T3 = w10.town || fail('after the ending: no town');
  if (!/MONDAY CHECK, filed by the operator/.test(T3.junction) || !/Sign-offs: 1/.test(T3.flat) || !/Final settlement: 0\.00/.test(T3.flat) || !/ARCHIVE ITEM/.test(T3.flat)) fail('after the ending: town wrong: ' + JSON.stringify(T3));
  if (!/NOW SERVING: 1207/.test(T3.hall) || !/not recovered/.test(T3.map) || T3.notes.length) fail('after the ending: the archive town wrong: ' + JSON.stringify(T3));
  if (w10.errs.length) fail('town errors: ' + w10.errs);
  console.log('town ok');
  await b.close(); srv.close();
  console.log('story: all fine');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
