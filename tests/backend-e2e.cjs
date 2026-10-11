// Plays through the PHP backend: claim a run, play a request, hit the cap, unlock with a code.
// Run from tests/backend-e2e.sh, which starts PHP with SQLite and the mock Gemini.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.INTAKE_CONFIG = { api: 'api/index.php', donateUrl: 'https://example.test/coffee' };" }));
  await p.goto('http://127.0.0.1:8793/');
  await p.waitForFunction(() => /free weeks? left/.test(document.getElementById('runs-left').textContent));
  console.log('title:', await p.textContent('#runs-left'));
  await p.click('#btn-start');
  for (let i = 0; i < 3; i++) await p.click('#btn-sit');
  await p.click('#btn-call');
  await p.fill('#chat-input', 'What changed recently?'); await p.click('#chat-form button[type=submit]');
  await p.waitForFunction(() => document.querySelectorAll('#chat-log .msg.them').length === 2);
  await p.click('#btn-hangup');
  for (const n of ['gap', 'idea']) await p.fill(`#write-form [name=${n}]`, 'x');
  await p.click('#write-form button[type=submit]');
  await p.waitForSelector('#p-score.active');
  console.log('scored through the proxy:', await p.textContent('#score-total'));
  await p.goto('http://127.0.0.1:8793/');
  await p.click('#btn-start');               // second free run
  await p.waitForSelector('#s-cubicle.active');
  await p.goto('http://127.0.0.1:8793/');
  await p.click('#btn-start');               // capped
  await p.waitForSelector('#s-cap.active');
  console.log('cap screen:', await p.textContent('#cap-donate'));
  await p.fill('#in-code', 'coffee-test'); await p.click('#btn-unlock');
  await p.waitForSelector('#s-title.active');
  await p.waitForFunction(() => /free weeks? left/.test(document.getElementById('runs-left').textContent));
  console.log('after unlock:', await p.textContent('#runs-left'));
  console.log('errors', errs);
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
