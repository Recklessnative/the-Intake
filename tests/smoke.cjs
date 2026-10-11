const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8765);
let p, visible, MOBILE, shot = 0;
// The case board: five short steps, each locked in (some with feedback first), then the memo.
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
  await lockAndGo();
  await p.click('#tiles button >> nth=0'); await p.click('#tiles button >> nth=1');
  await p.fill('#mitigations input >> nth=0', 'Ask them first.'); await p.fill('#mitigations input >> nth=1', 'Pilot on one shift.');
  await lockAndGo();
  if (!(await p.textContent('#memo')).includes('Big idea: A ten-minute buddy walk')) throw new Error('memo not assembled');
  if (req === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/memo.png' });
  await next();
}
// The CoE Academy module: Monday morning, on top. Answer, resume mid-way, finish, tips.
async function academy() {
  await visible('#w-academy');
  if (!(await p.textContent('#academy')).includes('Ask before you make')) throw new Error('week 1 module is not "Ask before you make"');
  await p.click('#academy button.primary');                  // Start
  await p.click('.ac-opt >> nth=0');                         // wrong on purpose
  if (!(await p.$('.ac-opt.wrong')) || !(await p.$('.ac-opt.right .ac-why'))) throw new Error('no feedback after a wrong answer');
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
  if (!(await p.textContent('#briefing')).includes('CoE Academy tips')) throw new Error('tips not pinned to the case file');
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
  await p.click('#data-buttons [data-kind="kpi"]');
  await p.waitForSelector('#data-docs .data-doc');
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
  let boardCalls = 0, calls = 0, corridor = 0, callbacks = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    calls++;
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!body.generationConfig.responseJsonSchema) throw new Error('no schema');
    if ('temperature' in body.generationConfig) throw new Error('temperature sent');
    if (!route.request().url().includes('gemini-3.5-flash-lite')) throw new Error('wrong model ' + route.request().url());
    let out;
    if (sys.startsWith('You are Mieke')) { mieke++; if (!body.contents[0].parts[0].text.includes('What they found so far')) throw new Error('Mieke got no context'); if (/\[\w+\]/.test(sys)) throw new Error('Mieke must not see hidden facts'); out = { reply: 'Ask what changed when the numbers dipped.' }; }
    else if (sys.startsWith('You are the examiner')) out = { diagnosis: { score: 3, evidence: 'q' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', questionNotAsked: 'What changed?', verdict: 'Fine. Fine.' };
    else if (sys.includes('the executive board of')) { boardCalls++; if (!body.contents[0].parts[0].text.includes('The ask')) throw new Error('board got no slide'); out = { members: [{ role: 'CFO', preempted: true, line: 'The cost is on the slide. Fine.' }, { role: 'CHRO', preempted: false, line: 'Has the works council seen this?' }, { role: 'COO', preempted: false, line: 'Who covers the shifts?' }] }; }
    else if (sys.includes('chair of the board')) { boardCalls++; out = { slide: { score: 3, note: 'Clear ask.' }, answers: [{ role: 'CHRO', score: 4, note: 'Named it.' }, { role: 'COO', score: 2, note: 'Vague.' }], decision: 'pilot', verdict: 'A pilot. Report back in March.' }; }
    else if (sys.includes('rate the concept')) out = { boldness: 3, boldnessReason: 'x', objections: ['Who pays?', 'Works council?', 'Pick rate?'], acceptReply: 'ok' };
    else if (sys.includes('at the coffee machine')) { corridor++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'First day I watched a video.', revealed: facts.slice(0, 1), quality: 'good' }; }
    else { if (sys.includes('This is a callback')) callbacks++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'Nights, mostly.', revealed: facts.slice(0, 1), quality: calls % 3 ? 'good' : 'weak' }; }
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } });
  });
  await p.goto('http://localhost:8765/');
  await p.click('#btn-start');                      // no key -> settings
  await p.fill('#in-key', 'TESTKEY'); await p.click('#btn-save-key');
  await p.click('#btn-start');
  let req = -1;
  for (let n = 0; n < 3; n++) {
    if (n === 0 && !MOBILE) { await p.waitForTimeout(1200); await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/boot.png' }); }
    if (n === 0) { while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit'); }
    if (!(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file empty');
    if (await p.$eval('#mail-rows', t => t.querySelectorAll('tr.unread').length) < 1) throw new Error('no unread mail');
    if (n === 1 && !(await p.$$eval('#mail-rows tr', rows => rows.some(r => r.textContent.includes('✓'))))) throw new Error('handled request missing from the inbox');
    if (n === 0) {
      // First request ever: the CoE Academy module on top, the Center of Excellence open on the flowchart.
      const first = await p.evaluate(() => window.__intake.state);
      const shape = first.cards.map(c => c.difficulty).join(' ');
      if (shape !== '0 0 1' || first.days.join('') !== '013') throw new Error('week 1 shape wrong: ' + shape + ' / ' + first.days);
      if (!(await p.evaluate(() => document.getElementById('w-coe').classList.contains('open')))) throw new Error('CoE folder did not open on the first request');
      await academy();
      if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-coe"]'); } else await p.click('.desk-icon[data-app="w-coe"]');
      await visible('#w-coe');
      if (!(await p.$('#coe-doc svg.flow'))) throw new Error('flowchart missing');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/coe.png' });
      await p.click('#coe-files button:has-text("quality standard")');
      if (!(await p.textContent('#coe-doc')).includes('Measurement')) throw new Error('standard did not open');
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
    if (req === 1) {
      // Close the tab mid-call and come back: the week resumes where it was.
      await p.reload();
      if (!(await p.isVisible('#btn-resume'))) throw new Error('no resume button after reload');
      await p.click('#btn-resume');
      await p.waitForSelector('#s-desk.active');
      if (await p.$$eval('#chat-log .msg.you', l => l.length) !== 2) throw new Error('call transcript not restored');
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
    await p.click('#btn-hangup');
    if (req === 2) await followUp();
    if (!MOBILE) { await visible('#w-write'); await visible('#w-call'); await visible('#w-notes'); if (await p.isVisible('#chat-form')) throw new Error('chat form should be gone after the call'); }
    if (req === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + "/write.png" });
    if (req === 1) {
      // Memo mode: the long form is still there for those who want it.
      await p.click('#btn-memo-mode');
      for (const n of ['gap', 'who', 'cause', 'lever', 'baseline', 'behaviour', 'metric', 'collect', 'idea', 'format', 'why', 'not', 'risks']) await p.fill(`#write-form [name=${n}]`, 'Something specific about ' + n);
      await p.click('#write-form button[type=submit]');
    } else {
      await caseBoard(req);
    }
    await p.waitForSelector('#p-defence.active, #p-score.active');
    let objs = 0;
    if (await p.$('#p-defence.active')) {
      objs = await p.$$eval('#defence-form textarea', t => t.length);
      for (let i = 0; i < objs; i++) await p.fill(`#defence-form [name=a${i}]`, 'Pilot first, then decide.');
      await p.click('#defence-form button[type=submit]');
    }
    await p.waitForSelector('#p-score.active');
    console.log('request', req + 1, await p.textContent('#score-title'), await p.textContent('#score-total'), 'objections', objs);
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
  await p.click('#boardroom button.primary');
  await p.waitForSelector('.member textarea');
  if (await p.$$eval('.member textarea', l => l.length) !== 2 || !(await p.$('.member.nod'))) throw new Error('board questions wrong');
  await p.fill('.member textarea[name=b0]', 'Yes, we showed it to them on Tuesday.');
  await p.fill('.member textarea[name=b1]', 'We pilot on day shift first.');
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/board.png' });
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#boardroom .score-total');
  const bt = await p.textContent('#boardroom .score-total');
  if (bt.trim() !== '80 / 100') throw new Error('board total wrong: ' + bt);   // 30 slide + 20 + 20 + 10
  await p.click('#boardroom button.primary');
  await p.waitForSelector('#s-end.active');
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
  // Week 2: a new module waits on top (skipped here); the full case has the help faded.
  const w2 = await p.evaluate(() => ({ no: window.__intake.state.weekNo, shape: window.__intake.state.cards.map(c => c.difficulty).join(' '), mod: window.__intake.state.academy.id }));
  if (w2.no !== 2 || w2.shape !== '1 1 2' || w2.mod !== 'is-it-training') throw new Error('week 2 shape wrong: ' + JSON.stringify(w2));
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
  await p.waitForSelector('#p-defence.active, #p-score.active');
  if (await p.$('#p-defence.active')) { await p.click('#btn-debug'); await p.click('#defence-form button[type=submit]'); }
  await p.waitForSelector('#p-score.active');
  console.log('memo request', await p.textContent('#score-total'));
  if (MOBILE) { await p.click('#btn-startmenu'); await p.click('#start-menu [data-open="w-scores"]'); } else await p.click('.desk-icon[data-app="w-scores"]');
  await visible('#w-scores');
  const txt = await p.textContent('#scores');
  if ((txt.match(/=== Week of/g) || []).length !== 2 || !txt.includes('Requests handled: 5') || !txt.includes('[starter]') || !txt.includes('CoE Academy: Ask before you make · 3 of 4 right') || !txt.includes('board: pilot 80/100')) throw new Error('scores file wrong: ' + txt.slice(0, 400));
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/scores.png' });
  // Hard mode: three tough cases, 6 questions, no case file, no Mieke, a 150-word memo, a LinkedIn card.
  await p.goto('http://localhost:8765/?debug=1');
  p.on('dialog', d => d.accept().catch(() => {}));
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
    if (await p.isVisible('#p-score.active') || await p.isVisible('#p-defence.active')) throw new Error('empty memo was sent');
    await p.click('#btn-debug');
    if (!(await p.textContent('#hard-count')).match(/^\d+ \/ 150/)) throw new Error('word count missing');
    await p.click('#hard-form button[type=submit]');
    await p.waitForSelector('#p-defence.active, #p-score.active', { timeout: 8000 }).catch(async e => { throw new Error('hard memo not sent: ' + await p.textContent('#toast') + ' | ' + await p.textContent('#hard-count') + ' ' + JSON.stringify(errs)); });
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
