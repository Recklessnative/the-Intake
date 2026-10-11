const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8765);
(async () => {
  const MOBILE = process.argv.includes('--mobile');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: MOBILE ? { width: 390, height: 844 } : { width: 1366, height: 768 } });
  const visible = async sel => { if (!(await p.isVisible(sel))) throw new Error(sel + ' should be visible'); };
  let mieke = 0;
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let calls = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    calls++;
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!body.generationConfig.responseJsonSchema) throw new Error('no schema');
    if ('temperature' in body.generationConfig) throw new Error('temperature sent');
    if (!route.request().url().includes('gemini-3.5-flash-lite')) throw new Error('wrong model ' + route.request().url());
    let out;
    if (sys.startsWith('You are Mieke')) { mieke++; if (!body.contents[0].parts[0].text.includes('The call so far')) throw new Error('Mieke got no context'); if (/\[\w+\]/.test(sys)) throw new Error('Mieke must not see hidden facts'); out = { reply: 'Ask what changed when the numbers dipped.' }; }
    else if (sys.startsWith('You are the examiner')) out = { diagnosis: { score: 3, evidence: 'q' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', questionNotAsked: 'What changed?', verdict: 'Fine. Fine.' };
    else if (sys.includes('rate the concept')) out = { boldness: 3, boldnessReason: 'x', objections: ['Who pays?', 'Works council?', 'Pick rate?'], acceptReply: 'ok' };
    else { const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]); out = { reply: 'Nights, mostly.', revealed: facts.slice(0, 1), quality: calls % 3 ? 'good' : 'weak' }; }
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } });
  });
  await p.goto('http://localhost:8765/');
  await p.click('#btn-start');                      // no key -> settings
  await p.fill('#in-key', 'TESTKEY'); await p.click('#btn-save-key');
  await p.click('#btn-start');
  for (let req = 0; req < 3; req++) {
    if (req === 0) { for (let i = 0; i < 3; i++) await p.click('#btn-sit'); }
    if (!(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file empty');
    if (!MOBILE) { await visible('#w-inbox'); await visible('#w-case'); await visible('#w-notes'); }
    await p.click('#btn-call');
    if (!MOBILE) { await visible('#w-call'); await visible('#w-case'); await visible('#w-notes'); }
    for (let i = 0; i < 2; i++) { await p.fill('#chat-input', 'When do the incidents happen?'); await p.click('#chat-form button[type=submit]'); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.you').length === n, i + 1); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.them').length === n + 1, i + 1); }
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
    if (!MOBILE) { await visible('#w-write'); await visible('#w-call'); await visible('#w-notes'); if (await p.isVisible('#chat-form')) throw new Error('chat form should be gone after the call'); }
    if (req === 0 && !MOBILE) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + "/write.png" });
    for (const n of ['gap', 'who', 'cause', 'lever', 'baseline', 'behaviour', 'metric', 'collect', 'idea', 'format', 'why', 'not', 'risks']) await p.fill(`#write-form [name=${n}]`, 'Something specific about ' + n);
    await p.click('#write-form button[type=submit]');
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
    await p.click('#btn-next');
  }
  await p.waitForSelector('#s-end.active');
  console.log('END', await p.textContent('#end-title'), await p.textContent('#end-score'), 'gemini calls', calls, 'mieke', mieke);
  if (!mieke) throw new Error('Mieke was never asked');
  console.log('errors', errs);
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
