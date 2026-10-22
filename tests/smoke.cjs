const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : f.endsWith('.webp') ? 'image/webp' : f.endsWith('.png') ? 'image/png' : 'text/html' }); s.end(d); });
}).listen(8765);
let p, visible, MOBILE, shot = 0;
// The case board: five short steps, each locked in (some with feedback first), then the memo.
// The bet before the stakeholder reads the concept. The first time, check the rules: both picks
// are required, and a bold concept needs a way back.
let betChecked = false;
// Sitting down lands on your desk (js/seat.js); the screen is one click further.
async function toScreen() {
  await p.waitForSelector('#s-seat.active');
  await p.click('#seat-list button[data-go="screen"]');
  await p.waitForSelector('#s-seat:not(.active)');
}
// The start of a week: the desk, then the boot screen, then Log on.
async function logOn() {
  for (let i = 0; i < 20 && !(await p.isVisible('#s-desk.active')); i++) {
    if (await p.isVisible('#s-seat.active')) await p.click('#seat-list button[data-go="screen"]');
    else if (await p.isVisible('#s-cubicle.active')) await p.click('#btn-sit');
    else await p.waitForTimeout(200);
  }
}
async function bet() {
  await p.waitForSelector('#p-bet.active');
  if (!betChecked) {
    betChecked = true;
    await p.click('#bet-form button[type=submit]');
    if (!(await p.textContent('#bet-why')).includes('Pick both')) throw new Error('bet sent without picks');
    await p.click('#bet-form [data-bet="bold"] [data-v="3"]');
    await p.click('#bet-form [data-bet="appetite"] [data-v="1"]');
    if (!(await p.isVisible('#bet-exit-label'))) throw new Error('bold bet asks no way back');
    await p.click('#bet-form button[type=submit]');
    if (!(await p.textContent('#bet-why')).includes('way back')) throw new Error('bold bet sent without a way back');
    await p.fill('#bet-form [name=exit]', 'Pilot on one shift; stop if near-misses do not drop.');
  } else if (await p.isVisible('#btn-debug')) {
    await p.click('#btn-debug');
  } else {
    await p.click('#bet-form [data-bet="bold"] [data-v="1"]');
    await p.click('#bet-form [data-bet="appetite"] [data-v="1"]');
  }
  await p.click('#bet-form button[type=submit]');
}

// Two strong requests in My scores (60+, diagnosis 15+): one step less help on the next board.
function strong([id, n]) {
  const h = JSON.parse(localStorage.getItem('intake-scores'));
  h.weeks.push({ id, started: Date.now(), requests: [...Array(n).keys()].map(i => ({ index: i, at: Date.now(), card: 'hotel-upgrades', who: 'Test', role: 'Test', org: 'Test', total: 80, pts: { diagnosis: 20 }, help: 'full' })) });
  localStorage.setItem('intake-scores', JSON.stringify(h));
}
// ...and out again once the board has been dealt, so the rest of the run counts only real requests.
function unstrong() {
  const h = JSON.parse(localStorage.getItem('intake-scores'));
  h.weeks = h.weeks.filter(w => !/^test-strong/.test(w.id));
  localStorage.setItem('intake-scores', JSON.stringify(h));
}
async function caseBoard(req) {
  const next = () => p.click('#board-next');
  const lockAndGo = async () => { await next(); if (await p.isVisible('#board-feedback')) { if (!(await p.textContent('#board-feedback')).startsWith('Mieke:')) throw new Error('feedback without Mieke'); if (req === 0 && !MOBILE && !shot++) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/feedback.png' }); await next(); } };
  await next();                                          // nothing filled: refused
  if (!(await p.isVisible('.bstep[data-step="diagnose"]'))) throw new Error('empty diagnosis was accepted');
  await p.click('#ev-diagnose .ev-card >> nth=1');
  await p.click('#tags [data-tag="skill"]'); await p.click('#tags [data-tag="process"]');
  await p.fill('#b-problem', 'Night-shift newcomers skip the scan because nobody shows them and the bonus rewards speed.');
  await lockAndGo();
  if (req === 2) {
    await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#s-desk.active');
    if (!(await p.isVisible('.bstep[data-step="lever"]'))) throw new Error('board did not resume at the lever step: ' + JSON.stringify(await p.evaluate(() => ({ step: window.__intake.state.run.board && window.__intake.state.run.board.step, phase: window.__intake.state.run.phase, desk: document.getElementById('desktop').dataset.phase, wwrite: document.getElementById('w-write').className, board: document.getElementById('board').hidden }))));
  }
  await p.click('#lever [data-lever="partly"]'); await p.fill('#b-lever-why', 'Half of it is the bonus and the rota.');
  await lockAndGo();
  await p.fill('[data-rung="baseline"]', 'Incidents per 1,000 picks on nights, last quarter.');
  await p.selectOption('[data-rung-ev="baseline"]', { index: 2 });
  await p.fill('[data-rung="metric"]', 'Night incident rate down by a third.');
  await lockAndGo();
  // The very first request is a worked example: Mieke has filled in the concept and the risks.
  if (req === 0) {
    const ex = await p.evaluate(() => window.__intake.state.run.card.example);
    if (!ex || (await p.inputValue('#b-idea')) !== ex.idea || !(await p.isVisible('#board-example'))) throw new Error('no worked example on the first request');
    if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/example.png' });
    // She fills in owners only for the causes she would have named; the rest are yours.
    for (const row of await p.$$('#owners .owner-row')) if (!(await row.$('[aria-pressed="true"]'))) await (await row.$('[data-owner="us"]')).click();
    await lockAndGo();
    if (!(await p.textContent('#board-example')).includes('risks are mine') || await p.$$eval('#mitigations input', l => l.filter(i => i.value).length) !== 2) throw new Error('risks not filled in by Mieke');
    await lockAndGo();
    if (!(await p.textContent('#memo')).includes('Big idea: ' + ex.idea)) throw new Error('memo lost the example');
    await next();
    return;
  }
  await p.fill('#b-idea', 'A ten-minute buddy walk on every newcomer\'s first three nights.');
  await p.click('#formats [data-format="On-the-job huddle"]');
  await p.fill('#b-why', 'It puts a person next to the newcomer when it matters.'); await p.fill('#b-not', 'Not another video.');
  await next();                                          // no owners yet: refused
  if (await p.isVisible('#board-feedback')) throw new Error('concept locked without owners');
  await p.click('#owners .owner-row >> nth=0 >> [data-owner="us"]');
  await p.click('#owners .owner-row >> nth=1 >> [data-owner="other"]');
  await p.fill('#owners input', 'The night shift managers');
  await next();
  if (!(await p.textContent('#board-feedback')).includes('not fixing what we do not own')) throw new Error('no owner feedback: ' + await p.textContent('#board-feedback'));
  await next();
  await p.click('#tiles button >> nth=0'); await p.click('#tiles button >> nth=1');
  await p.fill('#mitigations input >> nth=0', 'Ask them first.'); await p.fill('#mitigations input >> nth=1', 'Pilot on one shift.');
  await lockAndGo();
  if (!(await p.textContent('#memo')).includes('Big idea: A ten-minute buddy walk')) throw new Error('memo not assembled');
  if (!(await p.textContent('#memo')).includes('Process or workflow: The night shift managers')) throw new Error('memo has no owners');
  if (req === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/memo.png' });
  await next();
}
// The 2000s layer: Messenger nudge, the brick phone (texts and Snake), wallpapers.
async function retro() {
  const SHOTS = process.argv[3] || require('os').tmpdir();
  const start = async id => { if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="' + id + '"]'); } else { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="' + id + '"]'); } await visible('#' + id); };
  await start('w-mieke');
  const before = await p.$$eval('#mieke-log .msg.them', l => l.length);
  await p.click('#btn-nudge');
  await p.waitForFunction(n => document.querySelectorAll('#mieke-log .msg.them').length === n + 1, before);
  if (!(await p.textContent('#mieke-log')).includes('You have just sent a nudge.') || !(await p.textContent('#mieke-log')).includes('Mieke says:')) throw new Error('nudge or Messenger lines missing');
  if (!MOBILE) await p.screenshot({ path: SHOTS + '/messenger.png' });
  await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-phone"]');
  await p.waitForSelector('#phone:not([hidden])');
  if (await p.$('#w-phone, #phone .titlebar')) throw new Error('the phone should not be a window');
  await p.click('#phone-keys [data-k="2"]');
  if (!(await p.textContent('#phone-screen')).match(/Messages 1\/[12]/)) throw new Error('texts have no page counter');
  if (!(await p.textContent('#phone-screen')).match(/Mum|Network/)) throw new Error('no text on the brick phone: ' + await p.textContent('#phone-screen'));
  await p.click('#phone-keys [data-k="back"]'); await p.click('#phone-keys [data-k="1"]');
  if (!(await p.$('#phone-screen canvas.ph-snake'))) throw new Error('Snake did not start');
  await p.click('#phone-keys [data-k="8"]'); await p.waitForTimeout(600);
  if (!MOBILE) await p.screenshot({ path: SHOTS + '/phone.png' });
  await p.click('#phone-keys [data-k="back"]');
  await start('w-display');
  const wp = await p.$$eval('#display-grid .wp', l => l.map(b => b.className));
  if (wp.length !== 6 || wp.filter(c => c.includes('locked')).length !== 5 || !wp[0].includes(' on')) throw new Error('wallpapers wrong: ' + wp);
  await p.click('#display-grid .wp >> nth=2');
  if (!(await p.textContent('#toast')).includes('Locked')) throw new Error('locked wallpaper did not explain');
  const bg = await p.evaluate(() => getComputedStyle(document.getElementById('desktop')).backgroundImage);
  if (!bg.includes('wallpapers/hill' + (MOBILE ? '-phone' : '') + '.webp') || !bg.includes('svg')) throw new Error('no wallpaper painted: ' + bg.slice(0, 120));
  // Every rendered picture on the desk loads (icons, Mieke's picture, Staply).
  const broken = await p.$$eval('img', l => l.filter(i => i.complete && i.getAttribute('src') && !i.naturalWidth).map(i => i.getAttribute('src')));
  if (broken.length) throw new Error('pictures did not load: ' + broken.join(', '));
  if (!MOBILE) await p.screenshot({ path: SHOTS + '/display.png' });
  await p.click('#w-display .tb.close'); if (!MOBILE) await p.click('#phone-away'); if (await p.isVisible('#phone')) throw new Error('phone did not go away'); await p.click('#w-mieke .tb.close');
  if (MOBILE) await p.click('.task:has-text("Call")');
}
// The CoE Academy module: Monday morning, on top. Answer, resume mid-way, finish, tips.
// Mieke explains a part of the desk the first time you use it, in one bubble that does not block.
async function tip(what) {
  await p.waitForSelector('.tour.tip:not([data-look^="look-"])', { timeout: 25000 }).catch(() => { throw new Error('no hint from Mieke for ' + what); });   // after any first looks in the queue
  await p.click('#tour-next');
  if (await p.$('.tour')) throw new Error('hint for ' + what + ' did not close');
}
async function academy() {
  await visible('#w-academy');
  if (!(await p.textContent('#academy')).includes('Ask before you make')) throw new Error('week 1 module is not "Ask before you make"');
  if (!(await p.$('#academy .ac-hero')) || await p.$$eval('.ac-obj li', l => l.length) !== 3) throw new Error('academy welcome slide incomplete');
  await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + (MOBILE ? '/academy-mobile.png' : '/academy-welcome.png') });
  await p.click('#academy .ac-btn.go');                       // Start
  // The options are shuffled: the right one is not always B any more.
  await p.click('.ac-opt[data-opt="' + await p.evaluate(() => Academy.MODULES[0].questions[0].options.findIndex(o => !o.ok)) + '"]'); // wrong on purpose
  if (!(await p.$('.ac-opt.wrong')) || !(await p.$('.ac-opt.right .ac-why'))) throw new Error('no feedback after a wrong answer');
  if (await p.isDisabled('#ac-next')) throw new Error('Next stays off after answering');
  await p.waitForTimeout(700);
  await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#s-desk.active');
  if (await p.evaluate(() => Sound.place) !== 'desk') throw new Error('no room tone at the desk');
  if (!MOBILE) { await p.click('.desk-icon[data-app="w-academy"]'); } else { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-academy"]'); }
  await visible('#w-academy');
  if (!(await p.$('.ac-opt.wrong'))) throw new Error('academy answer not restored');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/academy.png' });
  await p.click('#ac-next');
  for (let i = 1; i < 4; i++) { const k = await p.evaluate(i => Academy.MODULES[0].questions[i].options.findIndex(o => o.ok), i); await p.click('.ac-opt[data-opt="' + k + '"]'); await p.click('#ac-next'); }
  const score = await p.textContent('.ac-score');
  if (score !== '3 of 4 right' || await p.$$eval('.ac-tips li', l => l.length) !== 3) throw new Error('academy end wrong: ' + score);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/academy-tips.png' });
  if ((await p.textContent('#briefing')).includes('CoE Academy tips')) throw new Error('tips should not be pinned to the case file any more');
  await p.click('#ac-close');
  if (await p.isVisible('#w-academy')) throw new Error('Back to work did not close the module');
  await visible('#w-inbox');
  await p.click('#mail-rows tr:has-text("CoE Academy")');
  if ((await p.textContent('#btn-academy')) !== '🎓 See the tips again') throw new Error('academy mail button wrong');
  await p.click('#btn-academy'); await visible('#w-academy'); await p.click('#ac-close');
}
// The follow-up after a first call: a data request, the coffee machine, one callback.
async function followUp() {
  await p.waitForSelector('#w-leads.open');
  await tip('Follow-up');
  await visible('#w-leads');
  const r0 = await p.evaluate(() => { const r = window.__intake.state.run; return { left: r.questionsLeft, phase: r.phase }; });
  if (r0.phase !== 'investigate' || r0.left !== 8) throw new Error('follow-up budget wrong: ' + JSON.stringify(r0));
  if (!(await p.isDisabled('#btn-callback'))) throw new Error('callback open before finding anything');
  if (!MOBILE) { await p.click('.desk-icon[data-app="w-write"]'); if (!(await p.textContent('#toast')).includes('done asking')) throw new Error('case board should wait for the follow-up'); }
  // Ask where this card keeps a data fact: not every card keeps it in the KPIs any more.
  const kind = await p.evaluate(() => { const f = window.__intake.state.run.card.hiddenFacts.find(x => x.dataDoc && x.foundAt.some(a => a.startsWith('data:'))); return f.foundAt.find(a => a.startsWith('data:')).slice(5); });
  const kindBtn = '#data-buttons [data-kind="' + kind + '"]';
  await p.click(kindBtn);            // no expectation yet: refused
  if (await p.$('#data-docs .data-doc')) throw new Error('data request without an expectation');
  const before = await p.evaluate(() => window.__intake.state.run.revealed.size);
  await p.fill('#data-expect', 'Most damage on nights, in the first month.');
  await p.click(kindBtn);
  await p.waitForSelector('#data-docs .data-doc');
  if (!(await p.textContent('#data-docs')).includes('You expected: Most damage on nights')) throw new Error('expectation not shown with the document');
  const dr = await p.evaluate(() => { const r = window.__intake.state.run; return { had: r.had.length, rev: r.revealed.size }; });
  if (!dr.had || dr.rev !== before) throw new Error('data facts credited on the click: ' + JSON.stringify(dr));
  if (!(await p.isDisabled(kindBtn))) throw new Error('a data kind can be asked twice');
  await p.fill('#corridor-input', 'How did you learn the job here?'); await p.press('#corridor-input', 'Enter');
  await p.waitForFunction(() => document.querySelectorAll('#corridor-log .msg.them').length === 1);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/followup.png' });
  // Close the tab during the follow-up: it comes back with the documents and the chat.
  await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#s-desk.active');
  await p.waitForSelector('#w-leads.open');
  if (!(await p.$$eval('#corridor-log .msg.them', l => l.length)) || !(await p.$$eval('#data-docs .data-doc', l => l.length))) throw new Error('follow-up not restored');
  await p.click('#btn-callback');
  await visible('#w-call');
  if (await p.isVisible('#w-call.ended')) throw new Error('callback window still ended');
  await p.fill('#chat-input', 'The log says it is mostly agency newcomers. Did you know?'); await p.press('#chat-input', 'Enter');
  await p.waitForFunction(() => document.querySelectorAll('#chat-log .msg.you').length === 3);
  await p.click('#btn-hangup');
  await p.waitForSelector('#w-leads.open');
  const r1 = await p.evaluate(() => { const r = window.__intake.state.run; return { left: r.questionsLeft, cb: r.calledBack, srcs: r.transcript.map(t => t.src) }; });
  if (r1.left !== 5 || !r1.cb || !r1.srcs.includes('frontline') || !r1.srcs.includes('callback')) throw new Error('follow-up state wrong: ' + JSON.stringify(r1));
  if (!(await p.isDisabled('#btn-callback'))) throw new Error('second callback allowed');
  await p.click('#btn-leads-done');
}
(async () => {
  MOBILE = process.argv.includes('--mobile');
  const b = await chromium.launch(); p = await b.newPage({ viewport: MOBILE ? { width: 390, height: 844 } : { width: 1366, height: 768 } });
  await require('./looks.cjs')(p);
  visible = async sel => { if (!(await p.isVisible(sel))) throw new Error(sel + ' should be visible'); };
  let mieke = 0;
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let examiner = 0, reactions = 0, wayBackSeen = false, boardCalls = 0, calls = 0, corridor = 0, callbacks = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    calls++;
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!body.generationConfig.responseJsonSchema) throw new Error('no schema');
    if ('temperature' in body.generationConfig) throw new Error('temperature sent');
    if (!route.request().url().includes('gemini-3.5-flash-lite')) throw new Error('wrong model ' + route.request().url());
    let out;
    if (sys.startsWith('You are Mieke')) { mieke++; if (!body.contents[0].parts[0].text.includes('What they found so far')) throw new Error('Mieke got no context'); if (/\[\w+\]/.test(sys)) throw new Error('Mieke must not see hidden facts'); out = { reply: 'Ask what changed when the numbers dipped.' }; }
    else if (sys.startsWith('You are the examiner')) examiner++, wayBackSeen = wayBackSeen || JSON.stringify(body).includes('stop if near-misses do not drop'), out = { wayBack: 'vague', diagnosis: { score: 3, evidence: 'q', next: 'Name the cause in one line.' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', leverCall: 'partly', questionNotAsked: 'What changed?', verdict: 'Fine. Fine.' };
    else if (sys.includes('the executive board of')) { boardCalls++; if (!body.contents[0].parts[0].text.includes('The ask')) throw new Error('board got no slide'); if (!body.contents[0].parts[0].text.includes('How the slide looks: Design')) throw new Error('board got no design'); const R = ['nod', 'note', 'frown', 'eyebrow', 'yawn', 'calculator']; out = { members: [{ role: 'CFO', preempted: true, line: 'The cost is on the slide. Fine.', reactions: R }, { role: 'CHRO', preempted: false, line: 'Has the works council seen this?', reactions: R.slice().reverse() }, { role: 'COO', preempted: false, line: 'Who covers the shifts?', reactions: ['nod'] }], aside: 'CFO, to the COO: was that a star?' }; }
    else if (sys.includes('feedback to')) out = { score: body.contents[0].parts[0].text.includes('(test)') ? 3 : 0, reply: 'Got it, I will fix it.', note: 'Clear.' };
    else if (sys.includes('chair of the board')) { boardCalls++; out = { slide: { score: 3, note: 'Clear ask.' }, answers: [{ role: 'CHRO', score: 4, note: 'Named it.' }, { role: 'COO', score: 0, note: 'Dodged it.' }], verdicts: { approved: 'Approved. Do not make us regret it.', pilot: 'A pilot. Report back in March.', rejected: 'No. Come back with numbers.' } }; }
    else if (sys.includes('rate the concept')) reactions++, out = { boldness: 3, boldnessReason: 'x', objections: ['Who pays?', 'Works council?', 'Pick rate?'], acceptReply: 'ok' };
    else if (sys.includes('at the coffee machine')) { corridor++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'First day I watched a video.', revealed: facts.slice(0, 1), quality: 'good', qualityWhy: 'open, about the first day' }; }
    else { if (sys.includes('This is a callback')) callbacks++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'Nights, mostly.', revealed: facts.slice(0, 1), quality: calls % 3 ? 'good' : 'weak', qualityWhy: calls % 3 ? 'open and specific' : 'closed: yes or no' }; }
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } });
  });
  await p.goto('http://localhost:8765/');
  // The title screen sounds like its stage: a first visit is the Monday-morning business park.
  if (await p.evaluate(() => Sound.place) !== 'title1') throw new Error('title sound wrong: ' + await p.evaluate(() => Sound.place));
  await p.click('#btn-start'); await p.waitForSelector('#s-settings.active');   // no key -> settings, which says why
  if (!(await p.textContent('#settings-intro')).includes('needs a Gemini API key') || (await p.textContent('#btn-save-key')) !== 'Save and clock in') throw new Error('key screen does not say a key is needed');
  await p.fill('#in-key', 'TESTKEY'); await p.click('#btn-save-key');   // ...and Save clocks you in
  // The cold open: 2007, AI years away. Click through it once.
  await p.waitForSelector('#s-intro.active');
  for (let i = 0; i < 5; i++) await p.click('#s-intro', { position: { x: 20, y: 20 } });
  await p.waitForSelector('#intro-card:not([hidden])');
  if (!(await p.textContent('#intro-lines')).includes('fifteen years away')) throw new Error('intro lines missing');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/intro.png' });
  await p.click('#btn-intro-go');
  // Your first morning: the walk from the lift to your desk, skippable, then the boot screen.
  await p.waitForSelector('#s-walkin.active, #s-seat.active');
  if (await p.isVisible('#s-walkin')) {
    if (!(await p.isVisible('#btn-walkin-skip'))) throw new Error('walk-in has no Skip');
    await p.waitForFunction(() => { const v = document.querySelector('#s-walkin video'); return !v || v.currentTime > 2 || !document.getElementById('s-walkin').classList.contains('active'); }, null, { timeout: 10000 });
    if (!MOBILE && await p.isVisible('#s-walkin')) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/walkin.png' });
    if (await p.isVisible('#btn-walkin-skip')) await p.click('#btn-walkin-skip');
  }
  // You sit down at your desk first: the render, its things, and the screen to click.
  await p.waitForSelector('#s-seat.active');
  const deskThings = await p.$$eval('#seat-pic .office-tag', l => l.map(b => b.dataset.thing).sort().join(' '));
  if (deskThings !== 'binders calendar coat mug pens phone plant screen sticky tray') throw new Error('desk things wrong: ' + deskThings);
  if (!(await p.textContent('#seat-list')).includes('Log on')) throw new Error('the desk does not say the screen logs you on');
  await p.click('#seat-pic .office-tag[data-thing="plant"]');
  if (!(await p.textContent('#seat-card')).includes('plant')) throw new Error('the plant says nothing');
  await p.click('#seat-card .row button');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/desk.png' });
  await p.click('#seat-pic .office-tag[data-thing="screen"]');
  await p.waitForSelector('#s-cubicle.active');
  if (await p.evaluate(() => document.body.dataset.walkin) !== 'played') throw new Error('the walk-in film did not play: ' + await p.evaluate(() => document.body.dataset.walkin));
  await p.waitForSelector('#s-cubicle.active');
  if ((await p.textContent('#cubicle-line')).startsWith('Your cubicle')) throw new Error('boot repeats the cubicle after the walk-in');
  let req = -1, stood = false;
  for (let n = 0; n < 3; n++) {
    if (n === 0 && !MOBILE) { await p.waitForTimeout(1200); await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/boot.png' }); }
    if (n === 0) {
      // Log on is one click from the first line of the boot screen.
      if ((await p.textContent('#btn-sit')) !== 'Log on') throw new Error('boot screen makes you read before logging on');
      await p.click('#btn-sit'); await p.waitForSelector('#s-desk.active');
      // Mieke calls on your first morning and shows you round the desk.
      await p.waitForSelector('#tour-answer'); await p.click('#tour-answer');
      const stops = [];
      for (let i = 0; i < 20; i++) {
        stops.push(await p.getAttribute('#tour', 'data-target'));
        if (i === 1 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/tour.png' });
        const last = !(await p.$('#tour-skip'));
        await p.click('#tour-next');
        if (last) break;
      }
      if (stops.length !== 5 || (!MOBILE && !stops.includes('w-mieke'))) throw new Error('tour stops wrong: ' + stops);
      // Day 1 shows only the icons you need today; the rest turn up when you first need them.
      if (!MOBILE && (await p.isVisible('.desk-icon[data-app="w-drill"]') || await p.isVisible('.desk-icon[data-app="w-leads"]') || !(await p.isVisible('.desk-icon[data-app="w-coe"]')))) throw new Error('day 1 desk icons wrong');
      if (await p.$('#tour')) throw new Error('tour did not close');
      // It can be replayed from the start menu, without the call; Escape ends it.
      await p.click('#btn-startmenu'); await p.click('#btn-tour');
      await p.waitForSelector('#tour-next'); await p.keyboard.press('Escape');
      if (await p.$('#tour')) throw new Error('Escape did not end the tour');
      // Mieke's pop-up stays in her chat, in place of the generic hello.
      await p.waitForFunction(() => document.getElementById('mieke-log').textContent.includes('Your first request'));
      if ((await p.textContent('#mieke-log')).includes('Shout if you want')) throw new Error('Mieke ping stacked under the hello');
    }
    if (!(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file empty');
    // The very first request: nothing else in the inbox is unread. Later, the new request is.
    const unread = await p.$eval('#mail-rows', t => t.querySelectorAll('tr.unread').length);
    if (n === 0 ? unread !== 0 : n === 1 ? unread !== 0 : unread < 1) throw new Error('unread mail wrong on request ' + (n + 1) + ': ' + unread);
    if (n === 0 && (await p.textContent('#mail-rows')).includes('CoE Academy')) throw new Error('module mail should wait until the module is due');
    if (n === 1 && !(await p.$$eval('#mail-rows tr', rows => rows.some(r => r.textContent.includes('✓'))))) throw new Error('handled request missing from the inbox');
    if (n === 1 && await p.isVisible('#w-academy')) throw new Error('week 1 module should wait until Thursday');
    if (n === 2) { await academy(); await p.click('#mail-rows tr:has-text("❗")'); }   // week 1: the module waits until Thursday morning
    // The story: Darren's welcome all week; Wednesday's real headline from Thursday on.
    const inbox = await p.textContent('#mail-rows');
    if (!inbox.includes('Welcome aboard') || (n === 2) !== inbox.includes('iPod touch')) throw new Error('story or news mail wrong on request ' + (n + 1));
    if (n === 2 && !(await p.textContent('#os-step')).includes('Thursday 6 Sep 2007')) throw new Error('game date wrong: ' + await p.textContent('#os-step'));
    if (n === 2) {
      const order = await p.evaluate(() => window.__intake.state.run.mails.map(m => m.day * 1440 + m.at));
      if (order.some((v, i) => i && v > order[i - 1]) || !(await p.textContent('#mail-rows tr >> nth=0')).includes('Today') || !(await p.textContent('#mail-rows')).includes('Mon ')) throw new Error('inbox not sorted by day: ' + order);
    }
    if (n === 0) {
      // First request ever: the CoE Academy module on top, the Center of Excellence open on the flowchart.
      const first = await p.evaluate(() => window.__intake.state);
      const shape = first.cards.map(c => c.difficulty).join(' ');
      if (shape !== '0 0 1' || first.days.join('') !== '013') throw new Error('week 1 shape wrong: ' + shape + ' / ' + first.days);
      // Calm Monday, request first: the inbox with the request open; the module waits until
      // request 2 and the CoE folder waits on the desktop.
      if (await p.evaluate(() => document.getElementById('w-coe').classList.contains('open'))) throw new Error('CoE folder should not open by itself any more');
      if (await p.isVisible('#w-academy')) throw new Error('week 1 should start with the request, not the module');
      if (!(await p.isVisible('#btn-call'))) throw new Error('the request is not open on the first Monday');
      // The inbox alone: the case file is the attachment, no toast sends you elsewhere.
      if (await p.isVisible('#w-case') || await p.isVisible('#w-notes')) throw new Error('first request should open the inbox alone');
      if (await p.isVisible('#toast') && (await p.textContent('#toast')).includes('New here')) throw new Error('the CoE toast is back');
      if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-coe"]'); } else await p.click('.desk-icon[data-app="w-coe"]');
      await visible('#w-coe');
      if (!(await p.$('#coe-doc svg.flow'))) throw new Error('flowchart missing');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/coe.png' });
      await p.click('#coe-files button:has-text("quality standard")');
      if (!(await p.textContent('#coe-doc')).includes('Measurement')) throw new Error('standard did not open');
      await p.click('#coe-files button:has-text("Pocket card")');
      if (!(await p.textContent('#coe-doc')).includes('No plan yet')) throw new Error('pocket card did not open');
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#coe-save-pocket')]);
      if (dl.suggestedFilename() !== 'intake-pocket-card.html') throw new Error('pocket card not saved: ' + dl.suggestedFilename());
      await p.click('#w-coe .tb.close');
      if (!MOBILE) {
        await p.click('.desk-icon[data-app="w-call"]');
        if (!(await p.textContent('#toast')).includes('No call yet')) throw new Error('phone icon before the call should explain');
        await p.click('.desk-icon[data-app="w-coe"]'); await visible('#w-coe'); await p.click('#w-coe .tb.close');
      }
      await p.click('#mail-rows tr:has-text("cake?")');
      if (await p.isVisible('#btn-call')) throw new Error('call button on a filler mail');
      await p.click('[data-mail="delete"]');
      await p.click('#mail-rows tr:has-text("❗")');
      await p.click('#mail-attach');
      await visible('#w-case');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/inbox.png' });
    }
    if (!MOBILE) { await visible('#w-inbox'); await visible('#w-case'); await visible('#w-notes'); }
    req++;
    if (req === 0) {
      const r = await p.evaluate(() => window.__intake.state.run);
      if (r.card.difficulty !== 0 || r.questionsLeft !== 10 || r.patience !== 5) throw new Error('first full case is not a starter: ' + r.card.id);
    }
    await p.click(MOBILE && req === 0 ? '#case-call' : '#btn-call');   // on a phone the case file is in front: call from there
    if (req === 0) await tip('the call');
    // Day one: the Start menu holds what the desk holds, and the tray only the clock.
    if (req === 0) {
      const os = await p.evaluate(() => ['#start-menu [data-open="w-display"]', '#start-menu [data-open="w-phone"]', '#start-menu [data-open="w-coffee"]', '#btn-staply', '#btn-phone', '#start-menu [data-open="w-mieke"]'].map(s => document.querySelector(s).hidden));
      if (os.join() !== 'true,true,true,true,true,false') throw new Error('day one OS not trimmed: ' + os);
    }
    if (!MOBILE) { await visible('#w-call'); await visible('#w-case'); await visible('#w-notes'); }
    for (let i = 0; i < 2; i++) { await p.fill('#chat-input', 'When do the incidents happen?'); await p.click('#chat-form button[type=submit]'); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.you').length === n, i + 1); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.them').length === n + 1, i + 1); }
    // Each question shows how it landed, with the reason, as soon as the answer is back.
    const tags = await p.$$eval('#chat-log .msg.you .qtag', l => l.map(x => x.className + ' ' + x.textContent));
    if (tags.length !== 2 || !tags.every(t => /good|ok|weak/.test(t) && t.includes(': '))) throw new Error('question quality not shown: ' + tags);
    if (req === 1) {
      // Close the tab mid-call and come back: the week resumes where it was.
      await p.reload();
      if (!(await p.isVisible('#btn-resume'))) throw new Error('no resume button after reload');
      await p.click('#btn-resume');
      await p.waitForSelector('#s-desk.active');
      if (await p.$$eval('#chat-log .msg.you', l => l.length) !== 2) throw new Error('call transcript not restored');
      if (await p.$$eval('#chat-log .msg.you .qtag', l => l.length) !== 2) throw new Error('question ratings not restored');
      if (!MOBILE) await visible('#w-call');
      // Stand up in the middle of the call: the floor, then back to the desk exactly as it was.
      await p.fill('#chat-input', 'Half a question');
      await p.evaluate(() => { Gemini.busy = 1; });
      await p.click('#btn-standup', { force: true });   // it looks dimmed (aria-disabled) while a reply is coming, but still says why
      if (!(await p.textContent('#toast')).includes('Wait for the reply') || await p.isVisible('#s-office')) throw new Error('stood up while a reply was coming');
      await p.evaluate(() => { Gemini.busy = 0; });
      const before = await p.evaluate(() => ({ clock: window.__intake.state.run.clock, visits: JSON.parse(localStorage.getItem('intake-floor')).visits }));
      await p.click('#btn-standup');
      await p.waitForSelector('#s-office.active');
      const desk = await p.textContent('#office-list button[data-spot="desk"]');
      if (!desk.includes('where you left it') || await p.$('#office-list button[data-spot="lift"]')) throw new Error('mid-request floor wrong: ' + desk);
      if (JSON.parse(await p.evaluate(() => localStorage.getItem('intake-floor'))).visits !== before.visits) throw new Error('a mid-request walk opened new places');
      await p.click('#office-list button[data-spot="desk"]');
      await toScreen();
      await p.waitForSelector('#s-desk.active');
      if (await p.inputValue('#chat-input') !== 'Half a question' || await p.$$eval('#chat-log .msg.you', l => l.length) !== 2) throw new Error('the call did not wait where it was');
      if (await p.evaluate(() => window.__intake.state.run.clock) !== before.clock + 5) throw new Error('the clock did not move while you were away');
      // Lean back from the screen: the desk, and the call still there when you look again.
      await p.click('#btn-leanback');
      await p.waitForSelector('#s-seat.active');
      if (!(await p.textContent('#seat-list')).includes('on the screen')) throw new Error('the desk does not say the request is on the screen');
      await toScreen();
      if (await p.inputValue('#chat-input') !== 'Half a question') throw new Error('leaning back lost the call');
      await p.fill('#chat-input', '');
    }
    if (req === 0) {
      await p.click('#chat-log .msg.them .pin');
      if (!(await p.inputValue('#notes')).includes('Nights, mostly.') && !(await p.inputValue('#notes')).length) throw new Error('pin did not reach the notes');
      await p.click('#w-call .btn-mieke');
      await visible('#w-mieke');
      await p.click('#w-mieke .quick button >> nth=0');
      await p.waitForFunction(() => document.querySelectorAll('#mieke-log .msg.them').length === 2);
      if (MOBILE) await p.click('.task:has-text("Call")');
      // Enter sends a question.
      await p.fill('#chat-input', 'Who signs off on this?'); await p.press('#chat-input', 'Enter');
      await p.waitForFunction(() => document.querySelectorAll('#chat-log .msg.you').length === 3);
      await p.waitForFunction(() => document.querySelectorAll('#chat-log .msg.them').length === 4);
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + "/call.png" });
    }
    if (req === 0) {
      const f = await p.textContent('#found');
      if (!/^[1-9]\d* \/ \d+$/.test(f)) throw new Error('found-facts counter did not move: ' + f);
    }
    if (req === 1) await retro();                    // the first text arrives after the first call
    await p.click('#btn-hangup');
    if (req === 0) await tip('the case board');
    if (req === 0) await p.waitForFunction(() => localStorage.getItem('intake-texts'));   // the first text arrives after the first call
    if (req === 2) await followUp();
    if (!MOBILE) { await visible('#w-write'); await visible('#w-call'); await visible('#w-notes'); if (await p.isVisible('#chat-form')) throw new Error('chat form should be gone after the call'); }
    if (req === 0 && await p.isVisible('#staply')) throw new Error('no Staply on the very first request');
    if (req === 2) {
      // Staply turns up on the case board with confidently bad advice.
      await p.waitForSelector('#staply:not([hidden])');
      if (!(await p.textContent('#staply')).includes('learning styles')) throw new Error('Staply said the wrong thing: ' + await p.textContent('#staply'));
      if (!MOBILE) { await p.waitForTimeout(600); await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/staply.png' }); }
      await p.click('#staply [data-st="yes"]');
      if ((await p.textContent('#staply .st-text')).includes('learning styles questionnaire?') || await p.isVisible('#staply .st-actions')) throw new Error('Staply did not answer the yes');
      await p.waitForSelector('#im-pop:not([hidden]) >> text=stapler');
      await p.evaluate(() => { document.getElementById('staply').hidden = true; document.getElementById('im-pop').hidden = true; });
    }
    if (req === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + "/write.png" });
    if (req === 1) {
      // Memo mode: the long form is still there for those who want it.
      await p.click('#btn-memo-mode');
      for (const n of ['gap', 'who', 'cause', 'lever', 'baseline', 'behaviour', 'metric', 'collect', 'idea', 'format', 'why', 'not', 'risks']) await p.fill(`#write-form [name=${n}]`, 'Something specific about ' + n);
      await p.click('#write-form button[type=submit]');
    } else {
      await caseBoard(req);
    }
    await bet();
    await p.waitForSelector('#p-defence.active, #p-score.active');
    let objs = 0;
    if (await p.$('#p-defence.active')) {
      objs = await p.$$eval('#defence-form textarea', t => t.length);
      for (let i = 0; i < objs; i++) await p.fill(`#defence-form [name=a${i}]`, 'Pilot first, then decide.');
      await p.click('#defence-form button[type=submit]');
    }
    await p.waitForSelector('#p-score.active');
    if (!(await p.textContent('#score-rows')).includes('Your bet:')) throw new Error('scorecard has no bet row');
    console.log('request', req + 1, await p.textContent('#score-title'), await p.textContent('#score-total'), 'objections', objs);
    if (req === 0) await tip('My scores');
    if (req === 0 && examiner !== 3) throw new Error('expected three examiner runs per request, got ' + examiner);
    if (req === 0 && reactions !== 3) throw new Error('expected three boldness readings per request, got ' + reactions);
    if (req === 0 && (!wayBackSeen || !(await p.textContent('#score-rows')).includes('Your way back: vague'))) throw new Error('way back not graded');
    if (req === 0 && !(await p.textContent('#score-rows')).includes('Hidden facts found')) throw new Error('diagnosis parts missing');
    if (req === 0) {
      // The scorecard teaches: next level, model answers, and one hindsight question.
      // The part with the most points left comes first, with its next level; the table does not repeat it.
      const focus = await p.textContent('#score-focus'), rowsText = await p.textContent('#score-rows');
      if (!focus.startsWith('Work on this next: ')) throw new Error('no work-on-this-next line');
      if (!(await p.isVisible('#btn-score-coffee'))) throw new Error('no coffee link under work-on-this-next');
      if (!(focus + rowsText).includes('Name the cause in one line.') || (focus.includes('Name the cause') && rowsText.includes('Next level: Name the cause'))) throw new Error('next-level line missing or repeated');
      if ((await p.$$('#score-rows details.model')).length < 4) throw new Error('model answers missing');
      await p.fill('#redo-q', 'Which shifts and which people were involved?');
      await p.click('#redo-form button');
      await p.waitForSelector('#redo-result .redo-found');
      if (!(await p.isHidden('#redo-form'))) throw new Error('redo can be asked twice');
      // Take it to Monday: an if-then plan, pre-filled with a question from the call.
      if (!(await p.inputValue('#plan-ask')).trim()) throw new Error('if-then plan not pre-filled');
      await p.fill('#plan-ask', 'What are people doing now that worries you?');
      await p.click('#plan-form button');
      if (!(await p.textContent('#plan-saved')).includes('pocket card')) throw new Error('plan not kept');
      const pocket = await p.evaluate(() => Coe.pocketFile(Coe.plans()));
      if (!pocket.includes('When someone asks me for a training, I will first ask: <b>What are people doing now')) throw new Error('plan not on the pocket card');
    }
    if (req === 1 && !(await p.isVisible('#plan-form'))) throw new Error('plan form not back for the next request');
    if (req === 1 && (await p.textContent('#redo-result')).trim()) throw new Error('redo carried into the next request');
    if (req === 0) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + (MOBILE ? "/score-mobile.png" : "/score.png") });
    if (req === 0) {
      // Reload on the scorecard: it comes back without counting the request twice.
      await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#p-score.active');
      if (await p.evaluate(() => window.__intake.state.results.length !== window.__intake.state.index + 1)) throw new Error('scorecard counted twice after resume');
    }
    await p.click('#btn-next');
    // Between requests: the office floor. Mieke says one thing, your desk moves you on; after the last request the board room does.
    await p.waitForSelector('#s-office.active');
    if (await p.evaluate(() => document.body.dataset.film) === 'stand-played') stood = true;
    // No black end-of-day screen: the evening is the floor itself, and the lift takes you home.
    if (await p.$('#daybreak')) throw new Error('the black day break is back');
    const evening = await p.evaluate(() => { const s = window.__intake.state; return s.days[s.index] !== s.days[s.index - 1]; });
    if (evening && req < 2) {
      const lift = await p.textContent('#office-list button[data-spot="lift"]');
      if (!/go home/i.test(lift) || !/start \w+day/.test(lift) || !/Tomorrow at 08:57/.test(lift)) throw new Error('the lift does not say it starts a new day: ' + lift);
      if (!/done\. Take the lift home/.test(await p.textContent('#office-line'))) throw new Error('the evening floor does not say the day is done');
    }
    // Each place has its own quiet sound: rain and wind by day, the same plus a low note at 17:40.
    if (await p.evaluate(() => Sound.place) !== (evening && req < 2 ? 'evening' : 'floor')) throw new Error('floor sound wrong: ' + await p.evaluate(() => Sound.place));
    if (req === 0) {
      // The speaker in the floor's tray mutes everything, and comes back on.
      await p.click('#s-office .tray-sound');
      if (await p.evaluate(() => Sound.on) || (await p.textContent('#s-office .tray-sound')) !== '🔇') throw new Error('the tray speaker did not mute');
      await p.click('#s-office .tray-sound');
      if (!(await p.evaluate(() => Sound.on))) throw new Error('the tray speaker did not unmute');
    }
    const spots = await p.$$eval('#office-list button', l => l.map(b => b.dataset.spot + (b.classList.contains('primary') ? '*' : '')));
    // A new place opens most visits: Bart's desk on the second, the canteen on the third.
    if (spots.join(' ') !== ['lift* desk mieke darren meeting tv coffee', 'lift* desk mieke bart darren meeting tv coffee', 'meeting* desk mieke bart darren canteen tv coffee'][req]) throw new Error('office floor places wrong: ' + spots);
    if (req === 0) {
      // First time on the floor: Mieke says what it is for.
      if (!(await p.textContent('#office-card')).includes('This is the floor')) throw new Error('no floor intro from Mieke');
      await p.click('#office-list button[data-spot="mieke"]');
      if (!(await p.textContent('#office-card')).includes('If I were you')) throw new Error('Mieke has no tip on the floor');
      await p.click('#office-card button');
      // Her desk, close up: things to find, each goes in the notebook. Then back to the floor.
      await p.waitForSelector('#office-look .office-look-pic');
      const things = await p.$$eval('#office-list button[data-thing]', l => l.map(b => b.dataset.thing + (b.classList.contains('fresh') ? '*' : '')));
      if (things.join(' ') !== 'coe* phone*') throw new Error('first look at Mieke\'s desk should offer two new things: ' + things);
      await p.click('#office-list button[data-thing="phone"]');
      if (!(await p.textContent('#office-card')).includes('Snake')) throw new Error('the phone says nothing');
      if (!(await p.textContent('#office-notebook')).includes('1/35')) throw new Error('notebook did not count the find: ' + await p.textContent('#office-notebook'));
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/look.png' });
      await p.click('#office-card button');
      await p.click('#office-list button:has-text("Back to the floor")');
      await p.waitForSelector('#office-look', { state: 'detached' });
      if (!MOBILE) {
        await p.hover('.office-tag[data-spot="darren"]');
        if (!(await p.$('.office-glow.on[data-spot="darren"]'))) throw new Error('hover does not light the place');
        await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/office.png' });
      } else await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/office-mobile.png' });
    }
    // The story, act 1: your badge is on your desk the first evening.
    if (req === 0) {
      await p.click('#office-list button[data-spot="desk"]');
      if (!(await p.textContent('#office-card')).includes('No. 1207')) throw new Error('no badge on your desk the first evening');
      await p.click('#office-card button');
    }
    await p.click('#office-list button.primary');
    // Back to the desk: you sit down (a short film), then the next request opens.
    if (req < 2) {
      await p.waitForFunction(() => /^sit-(played|failed)/.test(document.body.dataset.film || ''), null, { timeout: 15000 });
      if (await p.evaluate(() => document.body.dataset.film) !== 'sit-played') throw new Error('the sit-down film did not play');
      await p.waitForSelector('#office-film', { state: 'detached' });
      await toScreen();
      if (evening && !(await p.textContent('#toast')).includes('08:57')) throw new Error('no good-morning line after going home');
      // The first morning after going home, the lift has a taped-over button 5; after that it is the coffee machine again.
      if (evening && !(await p.textContent('#toast')).includes(req === 0 ? 'button 5' : 'coffee machine')) throw new Error('morning line wrong: ' + await p.textContent('#toast'));
    }
  }
  if (!stood) throw new Error('you never stood up from your desk: no stand-up film between two requests');
  // Friday: the board room. Pick a concept, the slide comes prefilled from the write-up.
  await p.waitForSelector('#p-board.active .board-pick');
  if (await p.$$eval('.board-pick', l => l.length) !== 3) throw new Error('board pick should list the three full cases');
  await p.click('.board-pick');
  await p.waitForSelector('.slide textarea');
  const pre = await p.$$eval('.slide textarea', l => l.filter(t => t.value.trim()).length);
  if (pre < 3) throw new Error('slide not prefilled from the write-up: ' + pre);
  await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#p-board.active .slide');
  await p.fill('.slide textarea[name=ask]', 'EUR 30k, 3 months, sponsor: the COO.');
  await p.fill('.slide textarea[name=evidence]', 'Six of nine new hires left in month one.');
  // Pitchwright: a design, a star wipe and WordArt, then the show, one box per click.
  await p.click('.pw-theme.t-ocean');
  await p.selectOption('select[name=pw-transition]', 'star');
  await p.click('input[name=pw-wordart]');
  if (!(await p.$('.pw-slide.t-ocean .pw-title.wordart')) || (await p.inputValue('.slide textarea[name=ask]')) !== 'EUR 30k, 3 months, sponsor: the COO.') throw new Error('slide design did not apply or lost text');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/slide-editor.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#slideshow .ss-slide.in-star');
  if (await p.$$eval('#slideshow .ss-box.later', l => l.length) !== 6) throw new Error('slide show should start with only the title');
  // The show happens in the rendered board room: the slide sits on its screen, the board is known by its things.
  const room = await p.evaluate(() => ({ pic: !!document.querySelector('#slideshow .ss-room img'), warp: (document.querySelector('#slideshow .ss-screen') || {}).style?.transform || '', places: document.querySelectorAll('#slideshow .br-place').length }));
  if (!room.pic || !/^matrix3d/.test(room.warp) || room.places !== 3) throw new Error('slide show is not in the board room: ' + JSON.stringify(room));
  for (let i = 0; i < 6; i++) await p.click('#slideshow');
  const reacts = await p.$$eval('#slideshow .ss-react', l => l.map(x => x.textContent).join(''));
  if (await p.$$eval('#slideshow .ss-box.later', l => l.length) || !reacts.includes('🧮')) throw new Error('slide show builds or reactions wrong: ' + reacts);
  await p.waitForTimeout(1200);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/show.png' });
  await p.click('#slideshow');
  if (!(await p.textContent('#slideshow .ss-end')).includes('was that a star')) throw new Error('no aside on a flashy slide');
  await p.click('#slideshow');
  await p.waitForSelector('.member textarea');
  if (await p.$('#slideshow')) throw new Error('slide show did not close');
  if (await p.$$eval('.member textarea', l => l.length) !== 2 || !(await p.$('.member.nod'))) throw new Error('board questions wrong');
  // No faces anywhere in the board room: no person or face emoji.
  if (/\p{Emoji_Presentation}/u.test((await p.textContent('#boardroom')).replace(/[👍✋📝👎❓💤🧮]/gu, ''))) throw new Error('a face in the board room: ' + await p.textContent('#boardroom'));
  if (!(await p.$('#boardroom .br-room .ss-screen'))) throw new Error('questions are not asked in the board room');
  if (await p.evaluate(() => Sound.place) !== 'board') throw new Error('no projector hum in the board room');
  await p.fill('.member textarea[name=b0]', 'Yes, we showed it to them on Tuesday.');
  await p.fill('.member textarea[name=b1]', 'We pilot on day shift first.');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/board.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#boardroom .score-total');
  const bt = await p.textContent('#boardroom .score-total');
  if (bt.trim() !== '70 / 100') throw new Error('board total wrong: ' + bt);   // 30 slide + 20 + 20 + 0
  // The score decides: 70 is a pilot (approved from 75, a pilot from 50), and the chair's line matches it.
  if (!(await p.textContent('#boardroom .br-stamp')).includes('PILOT')) throw new Error('stamp does not follow the score');
  if (!(await p.getAttribute('#boardroom .br-verdict .br-room img', 'src')).includes('board-dim')) throw new Error('a pilot should leave the projector on');
  if (!(await p.textContent('#boardroom .quick-debrief')).includes('A pilot. Report back')) throw new Error('verdict does not match the decision');
  await p.waitForTimeout(900);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/board-result.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#s-end.active');
  if (!(await p.textContent('#end-memo-body')).includes('A pilot. That is not a no') || !(await p.textContent('#end-memo-body')).includes('week 1 of 4')) throw new Error('Friday memo wrong: ' + await p.textContent('#end-memo-body'));
  if (!(await p.textContent('#end-board')).includes('Approved as a pilot') || !(await p.textContent('#share-text')).includes('as a pilot')) throw new Error('board result missing on the end screen');
  console.log('END', await p.textContent('#end-title'), await p.textContent('#end-score'), 'gemini calls', calls, 'mieke', mieke);
  // Mieke explained each new screen once, the first time it was in front of you.
  const told = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('intake-told-look-')).map(k => k.slice(12)));
  for (const k of ['look-w-case', 'look-w-notes', 'look-p-bet', 'look-p-score', 'look-p-board']) if (!told.includes(k)) throw new Error('no first look for ' + k + ': ' + told);
  if (!mieke) throw new Error('Mieke was never asked');
  // One interruption at a time: a second pop-up waits until the first is gone, then a quiet moment.
  await p.evaluate(() => { Retro.im('Jo from IT', 'first'); Retro.im('Facilities', 'second'); });
  const popUp = () => p.waitForFunction(() => !document.getElementById('im-pop').hidden, null, { timeout: 15000 });
  const popAway = () => p.evaluate(() => document.getElementById('im-pop').click());
  await popUp();
  if ((await p.textContent('#im-pop .im-text')) !== 'first') throw new Error('pop-ups not in order');
  await p.waitForTimeout(1500);
  if ((await p.textContent('#im-pop .im-text')) !== 'first') throw new Error('second pop-up replaced the first');
  await popAway();
  await p.waitForTimeout(1500);
  if (await p.evaluate(() => !document.getElementById('im-pop').hidden)) throw new Error('second pop-up did not wait for a quiet moment');
  await popUp();
  if ((await p.textContent('#im-pop .im-text')) !== 'second') throw new Error('second pop-up lost');
  await popAway();
  if (!(await p.$('#share-img canvas')) || await p.isVisible('#btn-linkedin') || !(await p.textContent('#share-text')).includes('hidden facts')) throw new Error('share card wrong on a normal week');
  // Friday on your desk: the rendered desk at 18:00; each thing opens its part of the week report.
  if (!MOBILE) {
    await p.waitForSelector('#friday-pic .office-tag[data-thing="report"]');
    if (await p.isVisible('#end-panel')) throw new Error('the week report should wait on the keyboard');
    await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/friday.png' });
    await p.click('#friday-pic .office-tag[data-thing="report"]');
    if (!(await p.isVisible('#end-title')) || await p.isVisible('#end-memo') || await p.isVisible('#share-text')) throw new Error('week report window wrong');
    await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/friday-report.png' });
    await p.click('#end-close');
    await p.click('#friday-pic .fd-hot[data-thing="memo"]');
    if (!(await p.isVisible('#end-memo')) || await p.isVisible('#end-title')) throw new Error('memo window wrong');
    await p.keyboard.press('Escape');
    if (await p.isVisible('#end-panel')) throw new Error('Escape did not put the memo down');
    await p.click('#friday-pic .office-tag[data-thing="screen"]');
    if (!(await p.isVisible('#share-text'))) throw new Error('share card window wrong');
    await p.click('#end-close');
  }
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/end.png', fullPage: true });
  if (boardCalls !== 2) throw new Error('expected two board calls, got ' + boardCalls);
  if (corridor !== 1 || callbacks !== 1) throw new Error('coffee machine or callback prompt missing: ' + corridor + ' ' + callbacks);
  // The stakeholder never knows what only the floor or the data knows.
  const leaks = await p.evaluate(() => window.__intake.state.pool.flatMap(c => { const sys = Prompts.stakeholder(c).system; return c.hiddenFacts.filter(f => !f.foundAt.includes('call') && sys.includes('[' + f.id + ']')).map(f => c.id + ':' + f.id); }));
  if (leaks.length) throw new Error('stakeholder knows off-call facts: ' + leaks);
  if (await p.evaluate(() => window.__intake.state.cards.filter(c => c.difficulty === 0).length) !== 2) throw new Error('first week should open with two starters');
  // Week 2 in test mode: Autofill plays a whole request; no starters, and the scores file keeps both weeks.
  await p.goto('http://localhost:8765/?debug=1');
  p.once('dialog', d => d.accept());
  await p.click('#btn-start');
  await logOn();
  if (await p.evaluate(() => window.__intake.state.cards.some(c => c.difficulty === 0))) throw new Error('starters in a second week');
  if (await p.isVisible('#w-coe')) throw new Error('the CoE folder should only open by itself in the first week');
  // Week 2: the Monday stand-up waits on top: last week's full case, recalled from memory.
  const w2 = await p.evaluate(() => ({ no: window.__intake.state.weekNo, shape: window.__intake.state.cards.map(c => c.difficulty).join(' '), mod: window.__intake.state.academy.id, su: (window.__intake.state.standup || { items: [] }).items.map(i => i.card) }));
  if (w2.no !== 2 || w2.shape !== '1 1 2' || w2.mod !== 'is-it-training') throw new Error('week 2 shape wrong: ' + JSON.stringify(w2));
  if (!w2.su.length || w2.su.some(id => ['hotel-upgrades', 'construction-cost-reports', 'telecom-first-call'].includes(id))) throw new Error('stand-up should recall last week\'s full cases: ' + w2.su);
  await visible('#w-standup');
  if (await p.isVisible('#w-academy')) throw new Error('the module should not open on top of the stand-up');
  // The story, act 1: from week 2 Facilities writes about the floor 5 button.
  if (!(await p.textContent('#mail-rows')).includes('Lift, floor 5')) throw new Error('no Facilities mail about floor 5 in week 2');
  await p.click('#su-reveal');
  if (await p.$('.su-answer')) throw new Error('stand-up revealed the answer before any recall');
  await p.fill('#standup textarea', 'Which shifts and which drivers are behind the damage?');
  await p.click('#su-reveal');
  if (await p.$('.su-answer')) throw new Error('stand-up revealed the answer without a lever call');
  const lever = await p.evaluate(() => window.__intake.state.standup.items[0].lever);
  await p.click('.su-call [data-call="' + (lever === 'no' ? 'yes' : 'no') + '"]');
  await p.click('#su-reveal');
  const ans = await p.textContent('.su-answer');
  if (!ans.includes('The question that opened it up') || !ans.includes('✗ You said')) throw new Error('stand-up reveal wrong: ' + ans);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/standup.png' });
  await p.click('.su-same [data-same="yes"]');
  while (!(await p.$('#su-done'))) await p.click('#btn-debug');
  await p.click('#su-done');
  if (await p.isVisible('#w-standup')) throw new Error('stand-up did not close');
  const rec = await p.evaluate(() => { const h = JSON.parse(localStorage.getItem('intake-scores')); return { r: h.recall, w: h.weeks[h.weeks.length - 1].standup }; });
  if (!rec.w || rec.w.of !== w2.su.length || rec.r[w2.su[0]].streak !== 0 || !rec.r[w2.su[0]].seen) throw new Error('stand-up not recorded: ' + JSON.stringify(rec));
  // Measurement drill: sort the card's measures, write a stop rule, rate it; no points, kept in My scores.
  if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-drill"]'); } else await p.click('.desk-icon[data-app="w-drill"]');
  await visible('#w-drill');
  await p.click('#drill-check');
  if (!(await p.textContent('#drill .su-why')).includes('Sort every')) throw new Error('drill let an empty sort through');
  const bins = await p.evaluate(() => window.__intake.state.drill.R.tiles.map(t => t.bin));
  if (!bins.includes('works') || !bins.includes('trap')) throw new Error('drill tiles missing a bin: ' + bins);
  for (let i = 0; i < bins.length; i++) await p.click('.drill-tiles > li:nth-child(' + (i + 1) + ') [data-bin="' + bins[i] + '"]');
  await p.click('#drill-check');
  if ((await p.$$eval('.drill-tiles li.ok', l => l.length)) !== bins.length) throw new Error('drill sort not marked right');
  await p.fill('#drill textarea', 'Pilot with one team. If damage per 1,000 parcels has not dropped by a third by the end of March, we stop.');
  await p.click('#drill-rule');
  const ticks = await p.$$eval('.drill-checks input', l => l.map(x => x.checked));
  if (ticks.length !== 4 || ticks.some(t => !t)) throw new Error('drill rule checks wrong: ' + ticks);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/drill.png' });
  await p.click('#drill [data-rate="got"]');
  await p.waitForSelector('#drill-again');
  const dr = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).drills);
  if (!dr || dr.length !== 1 || dr[0].right !== bins.length || dr[0].rating !== 'got') throw new Error('drill not recorded: ' + JSON.stringify(dr));
  await p.click('#drill-again');
  if (await p.evaluate(() => window.__intake.state.drill.R.rating)) throw new Error('another case did not start a new drill');
  await p.click('#w-drill .tb.close');
  // Coffee with Mieke on the desk: five mixed items, each answered then rated; kept in My scores.
  await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-coffee"]');
  await visible('#w-coffee');
  for (let i = 0; i < 5; i++) {
    const type = await p.evaluate(() => { const R = Coffee.load(); return R.items[R.now].type; });
    const B = '#coffee-desk ';
    if (type === 'recall' || type === 'first') { await p.fill(B + 'textarea', 'Which shifts does it happen on, and since when?'); if (type === 'recall') await p.click(B + '[data-call="partly"]'); await p.click(B + '#cf-check'); await p.click(B + '[data-rate="got"]'); }
    if (type === 'rule') { await p.fill(B + 'textarea', 'Pilot with one team. If errors have not dropped by a third by the end of March, we stop.'); await p.click(B + '#cf-check'); await p.click(B + '[data-rate="partly"]'); }
    if (type === 'lever') { await p.click(B + '#cf-check'); if (!(await p.textContent(B + '.su-why')).includes('fact')) throw new Error('coffee lever let an empty answer through'); await p.click(B + '[data-fact="0"]'); await p.click(B + '[data-call="no"]'); await p.click(B + '#cf-check'); await p.click(B + '#cf-next'); }
    if (type === 'flaw') { await p.click(B + '[data-line="0"]'); await p.click(B + '#cf-next'); }
    if (type === 'quiz') { await p.click(B + '.ac-opt >> nth=0'); await p.click(B + '#cf-next'); }
  }
  await p.waitForSelector('#coffee-desk #cf-done');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/coffee.png' });
  const cf = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).coffee);
  if (!cf || cf.length !== 1 || cf[0].items.length !== 5 || cf[0].items.some(x => !x.ok)) throw new Error('coffee not recorded: ' + JSON.stringify(cf));
  await p.click('#coffee-desk #cf-done');
  if (await p.isVisible('#w-coffee')) throw new Error('Done did not close the coffee');
  // The module is still there, from the mail or the desktop.
  if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-academy"]'); } else await p.click('.desk-icon[data-app="w-academy"]');
  await visible('#w-academy');
  await p.click('#btn-debug'); await p.click('#btn-debug');   // autofill: start, answer the first question
  if (!(await p.$('.ac-opt.right'))) throw new Error('academy autofill did not answer');
  await p.click('#w-academy .tb.close');
  // Help fades with how you do: two strong requests take the chips off the board.
  await p.evaluate(strong, ['test-strong-1', 2]);
  await p.click('#btn-debug');                       // inbox -> scripted call -> follow-up
  await p.waitForSelector('#w-leads.open');
  await p.click('#btn-debug');                       // data requests and the coffee machine, scripted
  if (!(await p.$$eval('#data-docs .data-doc', l => l.length))) throw new Error('autofill asked for no data');
  await p.click('#btn-leads-done');
  await p.waitForSelector('#w-write.open');
  if (!(await p.$('#board.fade2')) || await p.isVisible('#formats') || await p.isVisible('[data-rung-ev="baseline"]')) throw new Error('board after strong requests still shows the measure and concept chips');
  await p.evaluate(unstrong);
  if (await p.evaluate(() => window.__intake.state.run.revealed.size) < 3) throw new Error('autofill call revealed too little');
  await p.click('#btn-debug');                       // fills every step, lands on the memo
  if (!(await p.isVisible('.bstep[data-step="memo"]'))) throw new Error('autofill did not reach the memo');
  await p.click('#board-next');
  await bet();
  await p.waitForSelector('#p-defence.active, #p-score.active');
  if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
  await p.waitForSelector('#p-score.active');
  console.log('autofill request', await p.textContent('#score-total'));
  // Week 3 and later: a blank one-pager instead of the board (tried here on the next full case).
  await p.click('#btn-next');
  await p.waitForSelector('#s-office.active'); await p.click('#office-list button.primary');
  // With a finished week behind you the lift asks: home, or through town.
  if (await p.isVisible('#office-card button:has-text("Go home")')) await p.click('#office-card button:has-text("Go home")');
  await p.waitForFunction(() => /^sit-(played|failed)/.test(document.body.dataset.film || '') && !document.getElementById('office-film'), null, { timeout: 15000 });
  await toScreen();
  // Help fades with how you do: four strong requests take the board away.
  await p.evaluate(strong, ['test-strong-2', 4]);
  await p.click('#btn-debug'); await p.waitForSelector('#w-leads.open'); await p.click('#btn-leads-done');
  await p.waitForSelector('#memo4-form:not([hidden])');
  if (await p.isVisible('#board')) throw new Error('board shown after strong requests');
  await p.evaluate(unstrong);
  await p.click('#btn-debug');
  if (!(await p.inputValue('#memo4-form [name=need]'))) throw new Error('memo autofill empty');
  await p.click('#memo4-form button[type=submit]');
  await bet();
  await p.waitForSelector('#p-defence.active, #p-score.active');
  if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
  await p.waitForSelector('#p-score.active');
  console.log('memo request', await p.textContent('#score-total'));
  if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-scores"]'); } else await p.click('.desk-icon[data-app="w-scores"]');
  await visible('#w-scores');
  const txt = await p.textContent('#scores');
  if ((txt.match(/=== Week of/g) || []).length !== 2 || !txt.includes('Requests handled: 5') || !txt.includes('[starter]') || !txt.includes('CoE Academy: Ask before you make · 3 of 4 right') || !txt.includes('board: pilot 70/100')) throw new Error('scores file wrong: ' + txt.slice(0, 400));
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/scores.png' });
  // The team: after a promotion, two own requests and three junior drafts with one flaw each.
  if (!(await p.$('#scores .charts svg')) || !(await p.textContent('#scores .weak-spot')).includes('weak spot')) throw new Error('score charts missing');
  if (await p.evaluate(() => document.body.classList.contains('aero'))) throw new Error('Doors Aero before the promotion');
  await p.goto('http://localhost:8765/?debug=1&promote=1');
  if (!(await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).promoted))) throw new Error('?promote=1 did not promote');
  // The promotion comes with Doors Aero: glass windows, the Aero Aurora wallpaper and a word from IT.
  const aero = await p.evaluate(() => ({ on: document.body.classList.contains('aero'), wp: localStorage.getItem('intake-wallpaper') }));
  if (!aero.on || aero.wp !== 'aurora') throw new Error('promotion did not switch to Doors Aero: ' + JSON.stringify(aero));
  // And it is still there the next morning: the desk reads your scores at start-up.
  await p.goto('http://localhost:8765/?debug=1');
  if (!(await p.evaluate(() => document.body.classList.contains('aero')))) throw new Error('Doors Aero gone after a reload');
  p.once('dialog', d => d.accept().catch(() => {}));
  await p.click('#btn-start');
  await logOn();
  const tw = await p.evaluate(() => ({ n: window.__intake.state.cards.length, team: window.__intake.state.team && window.__intake.state.team.drafts.map(d => d.junior + ':' + d.flaw + ':' + d.lines.length), clash: window.__intake.state.team && window.__intake.state.team.drafts.some(d => window.__intake.state.cards.some(c => c.id === d.card)) }));
  if (tw.n !== 2 || !tw.team || tw.team.length !== 3 || tw.clash) throw new Error('team week wrong: ' + JSON.stringify(tw));
  // The team week is announced on Monday morning, not discovered in the week report.
  if (!(await p.evaluate(() => window.__intake.state.run.mieke.some(m => /team lead/.test(m.text))))) throw new Error('Mieke does not announce the team week');
  if (await p.isVisible('#w-academy')) await p.click('#w-academy .tb.close');
  if (await p.isVisible('#w-standup')) await p.click('#w-standup .tb.close');
  await p.click('#mail-rows tr:has-text("drafts for your review")');
  await p.click('#btn-team');
  await visible('#w-team');
  if (!(await p.textContent('#mail-rows')).includes('Your new PC (Doors Aero)')) throw new Error('IT did not announce Doors Aero');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/aero.png' });
  // Display properties keeps the old look one click away.
  await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-display"]');
  await p.click('#display-style .style-pick:has-text("Classic")');
  if (await p.evaluate(() => document.body.classList.contains('aero'))) throw new Error('Doors Classic did not switch back');
  await p.click('#display-style .style-pick:has-text("Aero")');
  if (!(await p.evaluate(() => document.body.classList.contains('aero')))) throw new Error('Doors Aero did not switch on again');
  await p.click('.task:has-text("My team")');
  await visible('#w-team');
  // The reviewer gets the whole case: the request, the briefing and every fact the junior found.
  const file = await p.evaluate(() => ({ req: !!document.querySelector('#team .team-request'), notes: document.querySelectorAll('#team .team-facts li').length, where: !!document.querySelector('#team .team-where') }));
  if (!file.req || file.notes < 3 || !file.where) throw new Error('team case file incomplete: ' + JSON.stringify(file));
  await p.click('#btn-team-send');
  if (!(await p.textContent('#toast')).includes('line with the problem')) throw new Error('team send without a pick should explain');
  await p.click('#btn-debug');                       // picks the flaw and writes a note
  await p.click('#btn-team-send');
  await p.waitForSelector('.team-result');
  const tr = await p.textContent('.team-result');
  if (!tr.includes('10 / 10') || !tr.includes('You found the flaw') || !tr.includes('I will fix it')) throw new Error('team grade wrong: ' + tr);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/team.png' });
  await p.click('.team-tab >> nth=1');
  await p.click('.team-draft li >> nth=0');
  await p.fill('#team-note', 'Looks fine to me, send it out please and well done.');
  await p.click('#btn-team-send');
  await p.waitForSelector('.team-result');
  const h3 = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).weeks.slice(-1)[0].team);
  if (!h3 || h3.reviewed !== 2 || h3.of !== 30) throw new Error('team score not recorded: ' + JSON.stringify(h3));
  // One case: a single tier-1 request, no stand-up, module, team or board room, and it is not a week.
  await p.goto('http://localhost:8765/?debug=1');
  p.on('dialog', d => d.accept().catch(() => {}));
  const weeksBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).weeks.filter(w => w.requests.length).length);
  await p.click('#btn-one');
  await logOn();
  const os = await p.evaluate(() => { const s = window.__intake.state; return { one: s.one, tiers: s.cards.map(c => c.difficulty), q: s.run.questionsLeft, standup: !!s.standup, academy: !!s.academy, team: !!s.team }; });
  if (!os.one || os.tiers.join() !== '1' || os.q !== 7 || os.standup || os.academy || os.team) throw new Error('one case wrong: ' + JSON.stringify(os));
  await p.click('#btn-debug'); await p.waitForSelector('#w-leads.open');
  await p.click('#btn-debug'); await p.click('#btn-leads-done');
  await p.waitForSelector('#w-write.open');
  await p.click('#btn-debug');
  if (await p.isVisible('#memo4-form')) await p.click('#memo4-form button[type=submit]'); else await p.click('#board-next');
  await bet();
  await p.waitForSelector('#p-defence.active, #p-score.active');
  if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
  await p.waitForSelector('#p-score.active');
  if ((await p.textContent('#btn-next')) !== 'Done for today') throw new Error('one case offers more requests');
  await p.click('#btn-next');
  await p.waitForSelector('#s-end.active');
  if (!(await p.isVisible('#btn-full-week')) || (await p.textContent('#end-eyebrow')) !== 'One case, done' || await p.isVisible('#end-memo')) throw new Error('one-case end screen wrong');
  const oh = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).weeks.filter(w => w.requests.length));
  if (!(await p.textContent('#share-text')).startsWith('I just tried one case')) throw new Error('one-case share text says week');
  if (oh.length !== weeksBefore + 1 || !oh.at(-1).one) throw new Error('one case not recorded as one case');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/end-one.png' });
  console.log('one case', await p.textContent('#end-score'));
  // A retest from My scores: a case from two or more weeks back, as one case, against your first score.
  await p.goto('http://localhost:8765/?debug=1');
  const rt = await p.evaluate(() => { const b = document.querySelector('#scores .retests button'); if (!b) return null; b.click(); return b.dataset.card; });
  if (!rt || !(await p.textContent('#scores')).includes('=== Progress')) throw new Error('no progress or retest in My scores');
  await logOn();
  const rs = await p.evaluate(() => { const s = window.__intake.state; return { one: s.one, ids: s.cards.map(c => c.id), retest: s.retest }; });
  if (!rs.one || rs.ids.join() !== rt || !rs.retest || rs.retest.card !== rt) throw new Error('retest is not that case: ' + JSON.stringify(rs) + ' vs ' + rt);
  await p.click('#btn-debug'); await p.waitForSelector('#w-leads.open, #w-write.open');
  if (await p.isVisible('#w-leads')) { await p.click('#btn-debug'); await p.click('#btn-leads-done'); }
  await p.waitForSelector('#w-write.open');
  await p.click('#btn-debug');
  if (await p.isVisible('#memo4-form')) await p.click('#memo4-form button[type=submit]'); else await p.click('#board-next');
  await bet();
  await p.waitForSelector('#p-defence.active, #p-score.active');
  if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
  await p.waitForSelector('#p-score.active');
  await p.click('#btn-next'); await p.waitForSelector('#s-end.active');
  if (!(await p.textContent('#end-note')).startsWith('Retest: ')) throw new Error('retest end note wrong: ' + await p.textContent('#end-note'));
  if (!(await p.textContent('#scores')).includes('Retest, ')) throw new Error('retest not in My scores');
  console.log('retest', await p.textContent('#end-note'));
  // The morning call: a weekend is closed; a weekday is three questions, the lever, the need, the reveal.
  await p.goto('http://localhost:8765/?debug=1&morning=2026-10-17');
  await p.click('#btn-morning'); await p.waitForSelector('#s-morning.active #mc-one');
  if (!(await p.textContent('#morning')).includes('no. 6 rings on Monday')) throw new Error('weekend morning call wrong: ' + await p.textContent('#morning'));
  await p.goto('http://localhost:8765/?debug=1&morning=2026-10-14');
  const callsBefore = calls;
  await p.click('#btn-morning'); await p.waitForSelector('#s-morning.active #mc-input');
  if (!(await p.textContent('.mc-top')).includes('Morning call no. 3')) throw new Error('morning call number wrong: ' + await p.textContent('.mc-top'));
  for (let i = 0; i < 3; i++) {
    await p.fill('#mc-input', 'What changed when the numbers dipped, question ' + (i + 1) + '?'); await p.press('#mc-input', 'Enter');
    // Wait for her answer, not just your question: the screen redraws when it arrives.
    await p.waitForFunction(n => document.querySelectorAll('.mc-log .msg.them').length === n + 1 && !document.querySelector('.mc-ask button[type=submit]:disabled'), i + 1);
  }
  const mcCard = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-morning')).card);
  if (calls - callsBefore !== 3) throw new Error('morning call used ' + (calls - callsBefore) + ' Gemini calls');
  await p.waitForSelector('#mc-reveal');
  await p.click('#mc-reveal');
  if (!(await p.textContent('.board-why')).includes('Make the call first')) throw new Error('reveal without a lever call');
  await p.click('[data-lever="partly"]');
  await p.fill('#mc-need', 'Night shift newcomers never get shown the routine.');
  await p.click('#mc-reveal'); await p.waitForSelector('.mc-verdict');
  await p.check('#mc-best');
  const mcShare = await p.textContent('#mc-share-text');
  if (!mcShare.startsWith('THE INTAKE · Morning call no. 3') || !mcShare.includes('My best question') || mcShare.includes('Night shift')) throw new Error('morning share text wrong: ' + mcShare);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/morning.png', fullPage: true });
  const mh = await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).mornings);
  if (!mh || mh.length !== 1 || mh[0].no !== 3 || mh[0].card !== mcCard) throw new Error('morning call not recorded: ' + JSON.stringify(mh));
  // Coming back the same day shows the reveal again, not a fresh call.
  await p.goto('http://localhost:8765/?debug=1&morning=2026-10-14');
  await p.click('#btn-morning'); await p.waitForSelector('.mc-verdict');
  // ...and the full case is the same stakeholder, as one case.
  await p.click('#mc-full');
  await logOn();
  const mf = await p.evaluate(() => ({ one: window.__intake.state.one, ids: window.__intake.state.cards.map(c => c.id) }));
  if (!mf.one || mf.ids.join() !== mcCard) throw new Error('full case is not the morning card: ' + JSON.stringify(mf) + ' vs ' + mcCard);
  console.log('morning call', mcShare.split('\n')[1]);
  // Hard mode: three tough cases, 6 questions, no case file, no Mieke, a 150-word memo, a LinkedIn card.
  await p.goto('http://localhost:8765/?debug=1');
  await p.click('#btn-hard');
  await logOn();
  // Hard mode is off the story: no arc hints in the inbox, even after a finished week.
  if ((await p.textContent('#mail-rows')).includes('Lift, floor 5')) throw new Error('an arc hint in hard mode');
  const hs = await p.evaluate(() => ({ hard: window.__intake.state.hard, tiers: window.__intake.state.cards.map(c => c.difficulty), q: window.__intake.state.run.questionsLeft, brief: document.getElementById('briefing-points').children.length }));
  if (!hs.hard || hs.tiers.length !== 3 || hs.tiers.some(t => t < 2) || hs.q !== 6 || hs.brief) throw new Error('hard week wrong: ' + JSON.stringify(hs));
  if (!MOBILE && await p.isVisible('.desk-icon[data-app="w-mieke"]')) throw new Error('Mieke on the desk in hard mode');
  if (await p.isVisible('#w-academy')) throw new Error('a CoE module in hard mode');
  for (let i = 0; i < 3; i++) {
    await p.click('#btn-debug'); await p.waitForSelector('#w-leads.open');
    await p.click('#btn-debug'); await p.click('#btn-leads-done');
    await p.waitForSelector('#hard-form:not([hidden])');
    await p.click('#hard-form button[type=submit]');
    if (await p.isVisible('#p-score.active') || await p.isVisible('#p-defence.active') || await p.isVisible('#p-bet.active')) throw new Error('empty memo was sent');
    await p.click('#btn-debug');
    if (!(await p.textContent('#hard-count')).match(/^\d+ \/ 150/)) throw new Error('word count missing');
    await p.click('#hard-form button[type=submit]');
    await p.waitForSelector('#p-bet.active', { timeout: 8000 }).catch(async e => { throw new Error('hard memo not sent: ' + await p.textContent('#toast') + ' | ' + await p.textContent('#hard-count') + ' ' + JSON.stringify(errs)); });
    await bet();
    await p.waitForSelector('#p-defence.active, #p-score.active');
    if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
    await p.waitForSelector('#p-score.active');
    console.log('hard request', i + 1, await p.textContent('#score-total'));
    await p.click('#btn-next');
  }
  await p.waitForSelector('#p-board.active .board-pick');
  await p.click('#btn-debug');                       // pick
  if (await p.$$eval('.slide textarea', l => l.filter(t => t.value.trim()).length)) throw new Error('hard-mode slide should start blank');
  await p.click('#boardroom button.primary');
  if (await p.isVisible('.member')) throw new Error('an empty slide was presented');
  await p.click('#btn-debug'); await p.click('#boardroom button.primary');
  await p.waitForSelector('#slideshow');
  await p.keyboard.press('Escape');
  await p.waitForSelector('.member textarea');
  await p.click('#btn-debug'); await p.click('#boardroom button.primary');
  await p.waitForSelector('#boardroom .score-total');
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#s-end.active');
  if (!(await p.isVisible('#btn-linkedin')) || !(await p.isVisible('#share-badge'))) throw new Error('hard week has no LinkedIn card');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/end-hard.png', fullPage: true });
  console.log('share text:', await p.textContent('#share-text'));
  console.log('errors', errs);
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
