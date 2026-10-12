const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8765);
let p, visible, MOBILE, shot = 0;
// The case board: five short steps, each locked in (some with feedback first), then the memo.
// The bet before the stakeholder reads the concept. The first time, check the rules: both picks
// are required, and a bold concept needs a way back.
let betChecked = false;
async function bet() {
  await p.waitForSelector('#p-bet.active');
  if (!betChecked) {
    betChecked = true;
    await p.click('#bet-form button[type=submit]');
    if (!(await p.textContent('#toast')).includes('Pick both')) throw new Error('bet sent without picks');
    await p.click('#bet-form [data-bet="bold"] [data-v="3"]');
    await p.click('#bet-form [data-bet="appetite"] [data-v="1"]');
    if (!(await p.isVisible('#bet-exit-label'))) throw new Error('bold bet asks no way back');
    await p.click('#bet-form button[type=submit]');
    if (!(await p.textContent('#toast')).includes('way back')) throw new Error('bold bet sent without a way back');
    await p.fill('#bet-form [name=exit]', 'Pilot on one shift; stop if near-misses do not drop.');
  } else if (await p.isVisible('#btn-debug')) {
    await p.click('#btn-debug');
  } else {
    await p.click('#bet-form [data-bet="bold"] [data-v="1"]');
    await p.click('#bet-form [data-bet="appetite"] [data-v="1"]');
  }
  await p.click('#bet-form button[type=submit]');
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
  if (!(await p.evaluate(() => document.getElementById('desktop').style.backgroundImage)).includes('svg')) throw new Error('no wallpaper painted');
  if (!MOBILE) await p.screenshot({ path: SHOTS + '/display.png' });
  await p.click('#w-display .tb.close'); if (!MOBILE) await p.click('#phone-away'); if (await p.isVisible('#phone')) throw new Error('phone did not go away'); await p.click('#w-mieke .tb.close');
  if (MOBILE) await p.click('.task:has-text("Call")');
}
// The CoE Academy module: Monday morning, on top. Answer, resume mid-way, finish, tips.
async function academy() {
  await visible('#w-academy');
  if (!(await p.textContent('#academy')).includes('Ask before you make')) throw new Error('week 1 module is not "Ask before you make"');
  if (!(await p.$('#academy .ac-hero')) || await p.$$eval('.ac-obj li', l => l.length) !== 3) throw new Error('academy welcome slide incomplete');
  await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + (MOBILE ? '/academy-mobile.png' : '/academy-welcome.png') });
  await p.click('#academy .ac-btn.go');                       // Start
  await p.click('.ac-opt >> nth=0');                         // wrong on purpose
  if (!(await p.$('.ac-opt.wrong')) || !(await p.$('.ac-opt.right .ac-why'))) throw new Error('no feedback after a wrong answer');
  if (await p.isDisabled('#ac-next')) throw new Error('Next stays off after answering');
  await p.waitForTimeout(700);
  await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#s-desk.active');
  if (!MOBILE) { await p.click('.desk-icon[data-app="w-academy"]'); } else { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-academy"]'); }
  await visible('#w-academy');
  if (!(await p.$('.ac-opt.wrong'))) throw new Error('academy answer not restored');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/academy.png' });
  await p.click('#ac-next');
  for (let i = 1; i < 4; i++) { const k = await p.evaluate(i => Academy.MODULES[0].questions[i].options.findIndex(o => o.ok), i); await p.click('.ac-opt >> nth=' + k); await p.click('#ac-next'); }
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
  await visible('#w-leads');
  const r0 = await p.evaluate(() => { const r = window.__intake.state.run; return { left: r.questionsLeft, phase: r.phase }; });
  if (r0.phase !== 'investigate' || r0.left !== 8) throw new Error('follow-up budget wrong: ' + JSON.stringify(r0));
  if (!(await p.isDisabled('#btn-callback'))) throw new Error('callback open before finding anything');
  if (!MOBILE) { await p.click('.desk-icon[data-app="w-write"]'); if (!(await p.textContent('#toast')).includes('done asking')) throw new Error('case board should wait for the follow-up'); }
  await p.click('#data-buttons [data-kind="kpi"]');            // no expectation yet: refused
  if (await p.$('#data-docs .data-doc')) throw new Error('data request without an expectation');
  const before = await p.evaluate(() => window.__intake.state.run.revealed.size);
  await p.fill('#data-expect', 'Most damage on nights, in the first month.');
  await p.click('#data-buttons [data-kind="kpi"]');
  await p.waitForSelector('#data-docs .data-doc');
  if (!(await p.textContent('#data-docs')).includes('You expected: Most damage on nights')) throw new Error('expectation not shown with the document');
  const dr = await p.evaluate(() => { const r = window.__intake.state.run; return { had: r.had.length, rev: r.revealed.size }; });
  if (!dr.had || dr.rev !== before) throw new Error('data facts credited on the click: ' + JSON.stringify(dr));
  if (!(await p.isDisabled('#data-buttons [data-kind="kpi"]'))) throw new Error('a data kind can be asked twice');
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
    else if (sys.includes('chair of the board')) { boardCalls++; out = { slide: { score: 3, note: 'Clear ask.' }, answers: [{ role: 'CHRO', score: 4, note: 'Named it.' }, { role: 'COO', score: 2, note: 'Vague.' }], decision: 'pilot', verdict: 'A pilot. Report back in March.' }; }
    else if (sys.includes('rate the concept')) reactions++, out = { boldness: 3, boldnessReason: 'x', objections: ['Who pays?', 'Works council?', 'Pick rate?'], acceptReply: 'ok' };
    else if (sys.includes('at the coffee machine')) { corridor++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'First day I watched a video.', revealed: facts.slice(0, 1), quality: 'good', qualityWhy: 'open, about the first day' }; }
    else { if (sys.includes('This is a callback')) callbacks++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'Nights, mostly.', revealed: facts.slice(0, 1), quality: calls % 3 ? 'good' : 'weak', qualityWhy: calls % 3 ? 'open and specific' : 'closed: yes or no' }; }
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } });
  });
  await p.goto('http://localhost:8765/');
  await p.click('#btn-start');                      // no key -> settings
  await p.fill('#in-key', 'TESTKEY'); await p.click('#btn-save-key');
  await p.click('#btn-start');
  // The cold open: 2007, AI years away. Click through it once.
  await p.waitForSelector('#s-intro.active');
  for (let i = 0; i < 5; i++) await p.click('#s-intro', { position: { x: 20, y: 20 } });
  await p.waitForSelector('#intro-card:not([hidden])');
  if (!(await p.textContent('#intro-lines')).includes('fifteen years away')) throw new Error('intro lines missing');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/intro.png' });
  await p.click('#btn-intro-go');
  await p.waitForSelector('#s-cubicle.active');
  let req = -1;
  for (let n = 0; n < 3; n++) {
    if (n === 0 && !MOBILE) { await p.waitForTimeout(1200); await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/boot.png' }); }
    if (n === 0) {
      // Log on is one click from the first line of the boot screen.
      if ((await p.textContent('#btn-sit')) !== 'Log on') throw new Error('boot screen makes you read before logging on');
      await p.click('#btn-sit'); await p.waitForSelector('#s-desk.active');
    }
    if (!(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file empty');
    if (await p.$eval('#mail-rows', t => t.querySelectorAll('tr.unread').length) < 1) throw new Error('no unread mail');
    if (n === 1 && !(await p.$$eval('#mail-rows tr', rows => rows.some(r => r.textContent.includes('✓'))))) throw new Error('handled request missing from the inbox');
    if (n === 1) { await academy(); await p.click('#mail-rows tr:has-text("❗")'); }   // week 1: the module comes after the first case
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
      if (!MOBILE) await visible('#w-case');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/inbox.png' });
    }
    if (!MOBILE) { await visible('#w-inbox'); await visible('#w-case'); await visible('#w-notes'); }
    req++;
    if (req === 0) {
      const r = await p.evaluate(() => window.__intake.state.run);
      if (r.card.difficulty !== 0 || r.questionsLeft !== 10 || r.patience !== 5) throw new Error('first full case is not a starter: ' + r.card.id);
    }
    await p.click('#btn-call');
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
    if (req === 2) await followUp();
    if (!MOBILE) { await visible('#w-write'); await visible('#w-call'); await visible('#w-notes'); if (await p.isVisible('#chat-form')) throw new Error('chat form should be gone after the call'); }
    if (req === 0) {
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
    if (req === 0 && examiner !== 3) throw new Error('expected three examiner runs per request, got ' + examiner);
    if (req === 0 && reactions !== 3) throw new Error('expected three boldness readings per request, got ' + reactions);
    if (req === 0 && (!wayBackSeen || !(await p.textContent('#score-rows')).includes('Your way back: vague'))) throw new Error('way back not graded');
    if (req === 0 && !(await p.textContent('#score-rows')).includes('Hidden facts found')) throw new Error('diagnosis parts missing');
    if (req === 0) {
      // The scorecard teaches: next level, model answers, and one hindsight question.
      if (!(await p.textContent('#score-rows')).includes('Next level: Name the cause')) throw new Error('no next-level line');
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
  }
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
  await p.fill('.member textarea[name=b0]', 'Yes, we showed it to them on Tuesday.');
  await p.fill('.member textarea[name=b1]', 'We pilot on day shift first.');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/board.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#boardroom .score-total');
  const bt = await p.textContent('#boardroom .score-total');
  if (bt.trim() !== '80 / 100') throw new Error('board total wrong: ' + bt);   // 30 slide + 20 + 20 + 10
  if (!(await p.textContent('#boardroom .br-stamp')).includes('PILOT')) throw new Error('no stamp on the result');
  await p.waitForTimeout(900);
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/board-result.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#s-end.active');
  if (!(await p.textContent('#end-memo-body')).includes('A pilot. That is not a no') || !(await p.textContent('#end-memo-body')).includes('week 1 of 4')) throw new Error('Friday memo wrong: ' + await p.textContent('#end-memo-body'));
  if (!(await p.textContent('#end-board')).includes('Approved as a pilot') || !(await p.textContent('#share-text')).includes('as a pilot')) throw new Error('board result missing on the end screen');
  console.log('END', await p.textContent('#end-title'), await p.textContent('#end-score'), 'gemini calls', calls, 'mieke', mieke);
  if (!mieke) throw new Error('Mieke was never asked');
  if (!(await p.$('#share-img canvas')) || await p.isVisible('#btn-linkedin') || !(await p.textContent('#share-text')).includes('hidden facts')) throw new Error('share card wrong on a normal week');
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
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
  if (await p.evaluate(() => window.__intake.state.cards.some(c => c.difficulty === 0))) throw new Error('starters in a second week');
  if (await p.isVisible('#w-coe')) throw new Error('the CoE folder should only open by itself in the first week');
  // Week 2: the Monday stand-up waits on top: last week's full case, recalled from memory.
  const w2 = await p.evaluate(() => ({ no: window.__intake.state.weekNo, shape: window.__intake.state.cards.map(c => c.difficulty).join(' '), mod: window.__intake.state.academy.id, su: (window.__intake.state.standup || { items: [] }).items.map(i => i.card) }));
  if (w2.no !== 2 || w2.shape !== '1 1 2' || w2.mod !== 'is-it-training') throw new Error('week 2 shape wrong: ' + JSON.stringify(w2));
  if (!w2.su.length || w2.su.some(id => ['hotel-upgrades', 'construction-cost-reports', 'telecom-first-call'].includes(id))) throw new Error('stand-up should recall last week\'s full cases: ' + w2.su);
  await visible('#w-standup');
  if (await p.isVisible('#w-academy')) throw new Error('the module should not open on top of the stand-up');
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
  // The module is still there, from the mail or the desktop.
  if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-academy"]'); } else await p.click('.desk-icon[data-app="w-academy"]');
  await visible('#w-academy');
  await p.click('#btn-debug'); await p.click('#btn-debug');   // autofill: start, answer the first question
  if (!(await p.$('.ac-opt.right'))) throw new Error('academy autofill did not answer');
  await p.click('#w-academy .tb.close');
  await p.click('#btn-debug');                       // inbox -> scripted call -> follow-up
  await p.waitForSelector('#w-leads.open');
  await p.click('#btn-debug');                       // data requests and the coffee machine, scripted
  if (!(await p.$$eval('#data-docs .data-doc', l => l.length))) throw new Error('autofill asked for no data');
  await p.click('#btn-leads-done');
  await p.waitForSelector('#w-write.open');
  if (!(await p.$('#board.fade2')) || await p.isVisible('#formats') || await p.isVisible('[data-rung-ev="baseline"]')) throw new Error('week 2 board still shows the measure and concept chips');
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
  await p.evaluate(() => { window.__intake.state.weekNo = 3; });
  await p.click('#btn-debug'); await p.waitForSelector('#w-leads.open'); await p.click('#btn-leads-done');
  await p.waitForSelector('#memo4-form:not([hidden])');
  if (await p.isVisible('#board')) throw new Error('board shown in week 3');
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
  if ((txt.match(/=== Week of/g) || []).length !== 2 || !txt.includes('Requests handled: 5') || !txt.includes('[starter]') || !txt.includes('CoE Academy: Ask before you make · 3 of 4 right') || !txt.includes('board: pilot 80/100')) throw new Error('scores file wrong: ' + txt.slice(0, 400));
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/scores.png' });
  // The team: after a promotion, two own requests and three junior drafts with one flaw each.
  if (!(await p.$('#scores .charts svg')) || !(await p.textContent('#scores .weak-spot')).includes('weak spot')) throw new Error('score charts missing');
  if (await p.evaluate(() => document.body.classList.contains('aero'))) throw new Error('Doors Aero before the promotion');
  await p.goto('http://localhost:8765/?debug=1&promote=1');
  if (!(await p.evaluate(() => JSON.parse(localStorage.getItem('intake-scores')).promoted))) throw new Error('?promote=1 did not promote');
  // The promotion comes with Doors Aero: glass windows, the Aero Aurora wallpaper and a word from IT.
  const aero = await p.evaluate(() => ({ on: document.body.classList.contains('aero'), wp: localStorage.getItem('intake-wallpaper') }));
  if (!aero.on || aero.wp !== 'aurora') throw new Error('promotion did not switch to Doors Aero: ' + JSON.stringify(aero));
  p.once('dialog', d => d.accept().catch(() => {}));
  await p.click('#btn-start');
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
  const tw = await p.evaluate(() => ({ n: window.__intake.state.cards.length, team: window.__intake.state.team && window.__intake.state.team.drafts.map(d => d.junior + ':' + d.flaw + ':' + d.lines.length), clash: window.__intake.state.team && window.__intake.state.team.drafts.some(d => window.__intake.state.cards.some(c => c.id === d.card)) }));
  if (tw.n !== 2 || !tw.team || tw.team.length !== 3 || tw.clash) throw new Error('team week wrong: ' + JSON.stringify(tw));
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
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
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
  // Hard mode: three tough cases, 6 questions, no case file, no Mieke, a 150-word memo, a LinkedIn card.
  await p.goto('http://localhost:8765/?debug=1');
  await p.click('#btn-hard');
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
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
