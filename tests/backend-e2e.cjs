// Plays through the PHP backend: claim a run, play a request, hit the cap, unlock with a code.
// Run from tests/backend-e2e.sh, which starts PHP with SQLite and the mock Gemini.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.route('**/js/config.js*', r => r.fulfill({ contentType: 'text/javascript', body: "window.INTAKE_CONFIG = { api: 'api/index.php', donateUrl: 'https://example.test/coffee' };" }));
  await p.goto('http://127.0.0.1:8793/');
  await p.waitForFunction(() => /free weeks? left/.test(document.getElementById('runs-left').textContent));
  console.log('title:', await p.textContent('#runs-left'));
  await p.click('#btn-start');
  while (!(await p.isVisible('#s-desk'))) await p.click('#btn-sit');
  if (await p.isVisible('#w-academy')) await p.click('#w-academy .tb.close');
  if (await p.isVisible('#w-coe')) await p.click('#w-coe .tb.close');
  await p.click('#mail-rows tr:has-text("❗")');     // calm Monday: open the request first
  await p.click('#btn-call');
  await p.fill('#chat-input', 'What changed recently?'); await p.click('#chat-form button[type=submit]');
  await p.waitForFunction(() => document.querySelectorAll('#chat-log .msg.them').length === 2);
  await p.click('#btn-hangup');
  await p.click('#btn-memo-mode');
  for (const n of ['gap', 'idea']) await p.fill(`#write-form [name=${n}]`, 'x');
  await p.click('#write-form button[type=submit]');
  await p.waitForSelector('#p-score.active');
  console.log('scored through the proxy:', await p.textContent('#score-total'));
  await p.goto('http://127.0.0.1:8793/');
  await p.waitForFunction(() => /1 free week left/.test(document.getElementById('runs-left').textContent));
  console.log('charged at the first scorecard:', await p.textContent('#runs-left'));
  await p.click('#btn-start');               // second free run, not charged until played
  await p.waitForSelector('#s-cubicle.active');
  const run2 = await p.evaluate(() => Gemini.runId);
  await p.goto('http://127.0.0.1:8793/');
  await p.click('#btn-start');               // abandoned before playing: the same week comes back
  await p.waitForSelector('#s-cubicle.active');
  if (await p.evaluate(() => Gemini.runId) !== run2) throw new Error('unplayed week was not handed back');
  console.log('unplayed week handed back');
  await p.evaluate(r => Gemini.backend('played', { runId: r }), run2);
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
