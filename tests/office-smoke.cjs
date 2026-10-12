// Plays the office prototype end to end with Gemini mocked: walk the plan, read a file, talk to
// the stakeholder, catch a colleague in the corridor, hold the 15:00 meeting, read the minutes.
// Usage: node tests/office-smoke.cjs [root] [screenshot dir] [--mobile]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const OUT = process.argv[3] || require('os').tmpdir();
const MOBILE = process.argv.includes('--mobile');
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(d); });
}).listen(8766);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: MOBILE ? { width: 390, height: 844 } : { width: 1366, height: 768 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const seen = { stakeholder: 0, lobby: 0, meeting: 0, minutes: 0 };
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    const body = JSON.parse(route.request().postData());
    const sys = body.systemInstruction.parts[0].text;
    if (!sys.includes('autumn 2007')) throw new Error('prompt without the period line');
    let out;
    if (sys.startsWith('You play a meeting room')) {
      seen.meeting++;
      if (!body.contents[0].parts[0].text.includes('Learning professional:')) throw new Error('meeting got no transcript');
      if (seen.meeting === 1 && !sys.includes('talked in the corridor')) throw new Error('lobbying did not reach the meeting');
      out = { lines: [{ who: 'S', text: 'And the budget?', interrupts: false }, { who: 'A', text: 'Not before we see the plan.', interrupts: true }, { who: 'B', text: 'I disagree with that.', interrupts: false }] };
    } else if (sys.startsWith('You are the minute-taker')) {
      seen.minutes++;
      out = { people: [{ who: 'S', outcome: 'commits', says: 'Fine, a pilot.', condition: '' }, { who: 'A', outcome: 'conditional', says: 'Show me first.', condition: 'they see the plan' }, { who: 'B', outcome: 'blocks', says: 'No.', condition: '' }], agreed: 'A pilot on one team.', missed: 'Nobody asked who pays.' };
    } else if (sys.includes('catches you in the corridor')) {
      seen.lobby++;
      out = { reply: 'What do you need from me?', stance: 'unsure', why: 'wants details' };
    } else {
      seen.stakeholder++;
      const facts = [...sys.matchAll(/- \[(\w+)\]/g)].map(m => m[1]);
      out = { reply: 'Mostly the new people.', revealed: facts.slice(0, 1), quality: 'good', qualityWhy: 'open and specific' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) });
  });
  await p.goto('http://localhost:8766/office.html');
  await p.waitForFunction(() => document.getElementById('intro-ask').textContent.length > 10);
  // No key yet: the prototype asks for one.
  await p.click('#btn-go');
  if (!(await p.isVisible('#key-box'))) throw new Error('no key box');
  await p.fill('#key', 'test-key');
  await p.click('#btn-go');
  await p.waitForSelector('#s-day:not([hidden])');
  const room = async name => {
    if (MOBILE) await p.click(`#rooms-list button:has-text("${name}")`);
    else await p.click(`#plan .room[aria-label="${name}"]`);
  };
  const slot = () => p.evaluate(() => window.__office.state.slot);

  // 09:00 at the desk: the case file is free, a file costs the hour.
  await p.click('#panel button:has-text("Read the case file")');
  if (await slot() !== 0) throw new Error('case file cost an hour');
  await p.click('#panel button:has-text("Draft your proposal")');
  await p.fill('#draft', 'Coach the new people on the floor, measure errors per shift before and after.');
  await p.click('#panel button:has-text("KPIs and reports")');
  if (await slot() !== 1) throw new Error('reading a file did not take the hour');
  if (!(await p.isDisabled('#panel button:has-text("KPIs and reports")'))) throw new Error('file can be read twice');

  // 10:00: the stakeholder is on the shop floor.
  await room('Shop floor');
  await p.click('#panel button:has-text("asked for this")');
  await p.fill('#say', 'What changed in the last three months?');
  await p.press('#say', 'Enter');
  await p.waitForSelector('#panel .msg .q.good');
  if (await p.evaluate(() => window.__office.state.firstQ) == null) throw new Error('first question not timed');
  await p.screenshot({ path: OUT + (MOBILE ? '/office-mobile.png' : '/office.png') });
  await p.click('#panel button:has-text("Leave")');
  if (await slot() !== 2) throw new Error('chat did not take the hour');

  // 11:00: colleague A drops by the desk.
  await room('Your borrowed desk');
  await p.click('#panel button:has-text("Catch")');
  await p.fill('#say', 'What would you need to see before you say yes?');
  await p.click('#panel button:has-text("Ask")');
  await p.waitForSelector('#panel .stance');
  await p.click('#panel button:has-text("Leave")');
  // Wait out the rest of the morning.
  while (await slot() < 6) {
    await room('Your borrowed desk');
    await p.click('#panel button:has-text("Wait an hour")');
  }

  // 15:00: the meeting.
  await p.waitForSelector('#panel h2:has-text("15:00")');
  if ((await p.inputValue('#say')).indexOf('Coach the new people') !== 0) throw new Error('draft not carried into the meeting');
  await p.click('#panel button:has-text("Open the meeting")');
  await p.waitForFunction(() => document.querySelectorAll('#panel .msg').length >= 4);
  if (!(await p.$('#panel .msg.int'))) throw new Error('interruption not shown');
  await p.fill('#say', 'One team first, and we stop if errors do not drop.');
  await p.click('#panel button:has-text("Answer")');
  await p.waitForFunction(() => document.querySelectorAll('#panel .msg').length >= 8);
  await p.screenshot({ path: OUT + (MOBILE ? '/office-meeting-mobile.png' : '/office-meeting.png') });
  await p.click('#panel button:has-text("Wrap up")');
  await p.click('#panel button:has-text("See the minutes")');
  if (!(await p.textContent('#chat-err')).includes('Pick a stance')) throw new Error('minutes without predictions');
  for (const k of ['S', 'A', 'B']) await p.selectOption(`#panel select[name=${k}]`, k === 'B' ? 'blocks' : 'commits');
  await p.fill('#panel textarea[name=agreed]', 'A pilot with one team.');
  await p.click('#panel button:has-text("See the minutes")');
  await p.waitForSelector('#s-end:not([hidden])');
  const end = await p.textContent('#s-end');
  if (!/First question after \d+:\d\d/.test(end) || !end.includes('A pilot on one team.') || !end.includes('Your day')) throw new Error('end screen incomplete: ' + end.slice(0, 300));
  await p.screenshot({ path: OUT + (MOBILE ? '/office-end-mobile.png' : '/office-end.png'), fullPage: true });
  if (seen.meeting !== 2 || seen.minutes !== 1 || seen.lobby !== 1 || seen.stakeholder !== 1) throw new Error('calls ' + JSON.stringify(seen));
  console.log('office', MOBILE ? 'mobile' : 'desktop', JSON.stringify(seen), 'errors', JSON.stringify(errs));
  await b.close(); srv.close();
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
