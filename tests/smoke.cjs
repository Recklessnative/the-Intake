const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8765);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let calls = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    calls++;
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!body.generationConfig.responseSchema) throw new Error('no schema');
    let out;
    if (sys.startsWith('You are the examiner')) out = { diagnosis: { score: 3, evidence: 'q' }, measurement: { score: 2, evidence: 'q' }, fit: { score: 3, evidence: 'q' }, nextLevel: { score: 3, evidence: 'q' }, risks: { score: 2, evidence: 'q' }, pitch: { score: 3, evidence: 'q' }, defenceOutcome: 'strong', questionNotAsked: 'What changed?', verdict: 'Fine. Fine.' };
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
    if (!(await p.isVisible('#briefing')) || !(await p.$$eval('#briefing-points li', l => l.length))) throw new Error('case file missing on the inbox');
    await p.click('#btn-call');
    for (let i = 0; i < 2; i++) { await p.fill('#chat-input', 'When do the incidents happen?'); await p.click('#chat-form button[type=submit]'); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.you').length === n, i + 1); await p.waitForFunction(n => document.querySelectorAll('#chat-log .msg.them').length === n + 1, i + 1); }
    await p.click('#btn-hangup');
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
    if (req === 0) await p.screenshot({ path: (process.argv[3] || require("os").tmpdir()) + "/score.png", fullPage: true });
    await p.click('#btn-next');
  }
  await p.waitForSelector('#s-end.active');
  console.log('END', await p.textContent('#end-title'), await p.textContent('#end-score'), 'gemini calls', calls);
  console.log('errors', errs);
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
