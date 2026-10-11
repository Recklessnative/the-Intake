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
// A quick intake from the inbox: refuse an empty answer, resume mid-way, grade, debrief.
async function quickOne(n) {
  const kind = await p.evaluate(() => window.__intake.state.run.card.kind);
  if (!(await p.textContent('#btn-call')).includes('Handle it')) throw new Error('quick mail has no Handle it button');
  await p.click('#btn-call');
  await visible('#w-quick');
  await p.click('#quick-send');
  if (!(await p.isVisible('#quick-send')) || await p.$('.quick-score')) throw new Error('empty quick answer was sent');
  if (kind === 'one-question') await p.fill('#quick textarea', 'Since when are the schedules late, and what changed then?');
  else if (kind === 'triage') { await p.click('#quick .chips [data-v="dont_train"]'); await p.fill('#quick input', 'The tool is the problem, not the people.'); }
  else throw new Error('unexpected quick kind in week 1: ' + kind);
  if (n === 2) {
    await p.waitForTimeout(700);
    await p.reload(); await p.click('#btn-resume'); await p.waitForSelector('#s-desk.active');
    await visible('#w-quick');
    if (await p.getAttribute('#quick .chips [data-v="dont_train"]', 'aria-pressed') !== 'true') throw new Error('quick answer not restored');
  }
  await p.click('#quick-send');
  await p.waitForSelector('.quick-score');
  if (n === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/quick.png' });
  console.log('quick', n + 1, kind, await p.textContent('.quick-score'));
  await p.click('#quick-next');
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
  let calls = 0, corridor = 0, callbacks = 0, quickCalls = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    calls++;
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!body.generationConfig.responseJsonSchema) throw new Error('no schema');
    if ('temperature' in body.generationConfig) throw new Error('temperature sent');
    if (!route.request().url().includes('gemini-3.5-flash-lite')) throw new Error('wrong model ' + route.request().url());
    let out;
    if (sys.startsWith('You are Mieke')) { mieke++; if (!body.contents[0].parts[0].text.includes('What they found so far')) throw new Error('Mieke got no context'); if (/\[\w+\]/.test(sys)) throw new Error('Mieke must not see hidden facts'); out = { reply: 'Ask what changed when the numbers dipped.' }; }
    else if (sys.includes('measurement exercise')) { quickCalls++; const r = { score: 3, note: 'Specific.' }; out = { baseline: r, behaviour: r, metric: r, collection: r }; }
    else if (sys.includes('exactly ONE question')) { quickCalls++; const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'Since June, now that you ask.', revealed: facts.slice(0, 1), score: 3, note: 'Good: you asked what changed.' }; }
    else if (sys.startsWith('You are the examiner')) out = { diagnosis: { score: 3, evidence: 'q' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', questionNotAsked: 'What changed?', verdict: 'Fine. Fine.' };
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
  for (let n = 0; n < 5; n++) {
    if (n === 0 && !MOBILE) { await p.waitForTimeout(1200); await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/boot.png' }); }
    if (n === 0) { while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit'); }
    if (!(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file empty');
    if (await p.$eval('#mail-rows', t => t.querySelectorAll('tr.unread').length) < 1) throw new Error('no unread mail');
    if (n === 1 && !(await p.$$eval('#mail-rows tr', rows => rows.some(r => r.textContent.includes('✓'))))) throw new Error('handled request missing from the inbox');
    if (n === 0) {
      // First request ever: a quick one-question intake, and the Center of Excellence opens on the flowchart.
      const first = await p.evaluate(() => window.__intake.state);
      if (!first.run.card.quick || first.run.card.kind !== 'one-question') throw new Error('first request is not a quick one-question: ' + first.run.card.id);
      const shape = first.cards.map(c => c.quick ? 'q:' + c.kind : c.difficulty).join(' ');
      if (shape !== 'q:one-question 0 q:triage 0 1' || first.days.join('') !== '00112') throw new Error('week 1 shape wrong: ' + shape + ' / ' + first.days);
      await visible('#w-coe');
      if (!(await p.$('#coe-doc svg.flow'))) throw new Error('flowchart missing');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/coe.png' });
      await p.click('#coe-files button:has-text("quality standard")');
      if (!(await p.textContent('#coe-doc')).includes('Measurement')) throw new Error('standard did not open');
      await p.click('#w-coe .tb.close');
      if (!MOBILE) {
        await p.click('.desk-icon[data-app="w-call"]');
        if (!(await p.textContent('#toast')).includes('quick intake')) throw new Error('phone icon before the call should explain');
        await p.click('.desk-icon[data-app="w-coe"]'); await visible('#w-coe'); await p.click('#w-coe .tb.close');
      }
      await p.click('#mail-rows tr:has-text("cake?")');
      if (await p.isVisible('#btn-call')) throw new Error('call button on a filler mail');
      await p.click('[data-mail="delete"]');
      await p.click('#mail-rows tr:has-text("❗")');
      if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/inbox.png' });
    }
    if (!MOBILE) { await visible('#w-inbox'); await visible('#w-case'); await visible('#w-notes'); }
    if (await p.evaluate(() => window.__intake.state.run.card.quick)) { await quickOne(n); continue; }
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
  await p.waitForSelector('#s-end.active');
  console.log('END', await p.textContent('#end-title'), await p.textContent('#end-score'), 'gemini calls', calls, 'mieke', mieke);
  if (!mieke) throw new Error('Mieke was never asked');
  if (quickCalls !== 1) throw new Error('expected one Gemini call for the quick intakes, got ' + quickCalls);
  // Every quick kind grades and draws its form and debrief.
  const kinds = await p.evaluate(async () => {
    const out = {};
    for (const c of window.__intake.state.quickPool) {
      const a = { q: 'What changed?', pick: 'train', why: 'Because.', baseline: 'b', behaviour: 'c', line: 0, fix: 'A much better line here.' };
      const box = document.createElement('div');
      Quick.form(box, c, a, () => {}, () => {});
      const res = await Quick.grade(c, a);
      Quick.debrief(box, c, a, res);
      out[c.kind] = (out[c.kind] || []).concat(res.total);
    }
    return out;
  });
  if (Object.keys(kinds).length !== 4 || kinds.measure.some(t => t !== 75)) throw new Error('quick kinds: ' + JSON.stringify(kinds));
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
  // Week 2: two quick ones first, autofilled; then a full case with the help faded.
  const w2 = await p.evaluate(() => ({ no: window.__intake.state.weekNo, shape: window.__intake.state.cards.map(c => c.quick ? 'q' : c.difficulty).join(' ') }));
  if (w2.no !== 2 || w2.shape !== 'q q 1 q 2') throw new Error('week 2 shape wrong: ' + JSON.stringify(w2));
  for (let i = 0; i < 2; i++) {
    await p.click('#btn-debug'); await visible('#w-quick');
    await p.click('#btn-debug'); await p.click('#quick-send');
    await p.waitForSelector('.quick-score');
    console.log('autofill quick', await p.evaluate(() => window.__intake.state.run.card.kind), await p.textContent('.quick-score'));
    await p.click('#quick-next');
  }
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
  await p.click('#btn-debug'); await p.click('#btn-debug'); await p.click('#btn-debug'); await p.click('#quick-send'); await p.waitForSelector('.quick-score'); await p.click('#quick-next');
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
  if ((txt.match(/=== Week of/g) || []).length !== 2 || !txt.includes('Requests handled: 10') || !txt.includes('[starter]') || !txt.includes('[quick: triage]')) throw new Error('scores file wrong: ' + txt.slice(0, 400));
  if (!MOBILE) await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/scores.png' });
  console.log('errors', errs);
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
