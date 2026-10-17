// The Morning Call: one stakeholder a day, the same for everyone. Three questions, the lever call
// and the need in one line, then the reveal and a share line that gives nothing away. No desktop,
// no case board, no examiner: one Gemini call per question and nothing else.
// The card of the day comes from the date (working days since the first morning call), so
// colleagues get the same one; the game date runs through autumn 2007 on the same count.
// Static, trusted markup; card text goes in with textContent.
(function () {
  const DAY = 864e5;
  const EPOCH = Date.UTC(2026, 9, 12);          // Monday: morning call no. 1
  const START07 = Date.UTC(2007, 8, 3);         // Monday 3 September 2007, your first day
  const WEEKDAYS07 = 80;                        // 3 Sep to 21 Dec 2007, then it starts over
  const QUESTIONS = 3;
  const KEY = 'intake-morning';
  const LEVER = { yes: 'Yes, training is the lever', partly: 'Partly', no: 'No, not a training problem' };
  const LEVER_LINE = { yes: 'Training is the lever here.', partly: 'Training is part of the answer; the rest sits outside it.', no: 'This is not a training problem.' };
  const QUALITY = { good: ['✓', 'Good question'], ok: ['~', 'Fair, but generic'], weak: ['✗', 'Weak question'] };
  const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, cls, id) { const b = el('button', cls, text); b.type = 'button'; if (id) b.id = id; return b; }

  // Today as a UTC midnight, from the player's own calendar date. `?morning=2026-10-14` overrides it (tests).
  function today(now) {
    const o = /[?&]morning=(\d{4})-(\d\d)-(\d\d)/.exec(window.location.search);
    if (o) return Date.UTC(+o[1], +o[2] - 1, +o[3]);
    const d = now || new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // Working days since the first morning call, counting from 1. Weekends: null, the office is closed.
  function number(t) {
    const days = Math.max(0, Math.floor((t - EPOCH) / DAY)), dow = days % 7;
    if (dow > 4) return null;
    return Math.floor(days / 7) * 5 + dow + 1;
  }
  function nextNumber(t) { for (let i = 1; i < 4; i++) { const n = number(t + i * DAY); if (n) return n; } return null; }
  // The same working day in autumn 2007.
  function date07(no) {
    const i = (no - 1) % WEEKDAYS07, d = new Date(START07 + (Math.floor(i / 5) * 7 + i % 5) * DAY);
    return NAMES[(d.getUTCDay() + 6) % 7] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' 2007';
  }
  // The card for call no. N: a fixed shuffle of the whole pool, a new shuffle each time round.
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cardFor(no, pool) {
    const ids = pool.map(c => c.id).sort(), round = Math.floor((no - 1) / ids.length), r = rng(2007 + round);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const id = ids[(no - 1) % ids.length];
    return pool.find(c => c.id === id);
  }
  const callFacts = card => card.hiddenFacts.filter(f => f.foundAt.includes('call'));
  const org = card => (card.stakeholder.org || '').split(',')[0];
  const first = card => card.stakeholder.name.split(' ')[0];

  // The round for today, kept until tomorrow.
  function load(no) {
    try { const R = JSON.parse(window.localStorage.getItem(KEY) || 'null'); if (R && R.no === no) return R; } catch (e) { /* storage blocked */ }
    return null;
  }
  function keep(R) { try { window.localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) { /* storage blocked */ } }
  function fresh(no, card) { return { no, card: card.id, turns: [], asked: [], revealed: [], lever: null, need: '', done: false, best: false }; }

  // The share line: how you played, not what the answer was.
  function shareText(R, card, url) {
    const facts = callFacts(card), found = facts.filter(f => R.revealed.includes(f.id)).length;
    const q = R.asked.map(a => ({ good: 'good', ok: 'ok', weak: 'weak' }[a.quality] || '?')).join(' ');
    const right = R.lever === card.learningIsTheAnswer ? '✓' : R.lever === 'partly' || card.learningIsTheAnswer === 'partly' ? '~' : '✗';
    const best = R.best && bestQuestion(R);
    return 'THE INTAKE · Morning call no. ' + R.no + ' · ' + date07(R.no) + '\n' +
      (card.sector ? card.sector + ' · ' : '') + 'questions: ' + (q || 'none') + ' · facts ' + found + '/' + facts.length + ' · training the answer? ' + right +
      (best ? '\nMy best question: "' + best + '"' : '') + '\n' + url;
  }
  function bestQuestion(R) {
    const good = R.asked.filter(a => a.quality === 'good');
    const pick = good.find(a => (a.facts || []).length) || good[0];
    return pick ? pick.q : '';
  }

  // env: { Gemini, Prompts, Sound, toast, claim(), url, record(R, card), monthCount(), fullCase(card), back(), debug }
  function render(box, R, card, env) {
    box.innerHTML = '';
    const top = el('div', 'mc-top');
    top.append(el('b', null, 'Morning call no. ' + R.no), el('span', null, date07(R.no)));
    box.appendChild(top);
    const body = el('div', 'mc-body');
    box.appendChild(body);
    const facts = callFacts(card), found = () => facts.filter(f => R.revealed.includes(f.id)).length;

    body.appendChild(el('p', 'su-mieke', R.asked.length || R.done ? 'Mieke: "' + first(card) + ' again. Go on."'
      : 'Mieke: "Morning! ' + card.stakeholder.name + ', ' + card.stakeholder.role + (org(card) ? ' at ' + org(card) : '') + ', is on line 2. You have three questions before the next meeting starts. Find out what is really going on."'));
    const meters = el('p', 'mc-meters');
    const paint = () => { meters.textContent = 'Questions left ' + (QUESTIONS - R.asked.length) + ' · Facts found ' + found() + ' of ' + facts.length; };
    paint();
    body.appendChild(meters);
    const log = el('div', 'mc-log');
    log.setAttribute('aria-live', 'polite');
    const say = (who, text, m) => {
      const d = el('div', 'msg ' + who, text);
      if (m && QUALITY[m.quality]) d.appendChild(el('span', 'qtag ' + m.quality, QUALITY[m.quality].join(' ') + (m.why ? ': ' + m.why : '')));
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };
    say('them', card.surfaceAsk);
    R.asked.forEach(a => { say('you', a.q, a); say('them', a.a); if ((a.facts || []).length) say('sys', '💡 Found: ' + a.facts.length + (a.facts.length === 1 ? ' fact' : ' facts')); });
    body.appendChild(log);

    // Step 1: three questions.
    if (!R.done && R.asked.length < QUESTIONS && R.lever == null) {
      const form = el('form', 'mc-ask');
      const input = el('textarea');
      input.rows = 2; input.maxLength = 300; input.id = 'mc-input';
      input.placeholder = R.asked.length ? 'Your next question' : 'Your first question. Not the training: the problem.';
      const send = el('button', 'primary', 'Ask');
      send.type = 'submit';
      const enough = btn('I have enough', 'ghost', 'mc-enough');
      enough.hidden = !R.asked.length;
      enough.onclick = () => { R.stop = true; keep(R); render(box, R, card, env); };
      const row = el('div', 'row');
      row.append(send, enough);
      form.append(input, row);
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); form.requestSubmit(); } });
      form.onsubmit = async ev => {
        ev.preventDefault();
        const q = input.value.trim();
        if (q.length < 3 || send.disabled) return;
        send.disabled = true;
        if (!(await env.claim())) { send.disabled = false; return; }
        const mine = say('you', q);
        input.value = '';
        const p = env.Prompts.stakeholder(card, '', false);
        const turns = R.turns.concat([{ role: 'user', text: 'The learning professional asks: """' + q + '"""' }]);
        try {
          const out = await env.Gemini.json({ system: p.system, turns, schema: p.schema });
          const got = (out.revealed || []).filter(id => facts.some(f => f.id === id) && !R.revealed.includes(id));
          R.turns = turns.concat([{ role: 'model', text: JSON.stringify(out) }]);
          R.asked.push({ q, a: out.reply, quality: out.quality, why: String(out.qualityWhy || '').slice(0, 80), facts: got });
          R.revealed = R.revealed.concat(got);
          if (got.length && env.Sound) env.Sound.found();
          keep(R);
          render(box, R, card, env);
          const next = document.getElementById('mc-input');
          if (next) next.focus();
        } catch (e) {
          mine.remove();
          input.value = q;
          env.toast(e.message);
          send.disabled = false;
        }
      };
      body.appendChild(form);
      if (!R.asked.length) body.appendChild(el('p', 'fine', 'Each question costs one. A vague or leading one tells you less; the tag under it says why.'));
      return;
    }

    // Step 2: the lever call and the need, in your words.
    if (!R.done) {
      body.appendChild(el('p', 'su-q', (R.asked.length < QUESTIONS ? '' : 'That was your last question. ') + 'Is training the answer here?'));
      const chips = el('div', 'chips');
      Object.entries(LEVER).forEach(([k, label]) => {
        const b = btn(label);
        b.dataset.lever = k;
        b.setAttribute('aria-pressed', R.lever === k);
        b.onclick = () => { R.lever = k; keep(R); chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
        chips.appendChild(b);
      });
      body.appendChild(chips);
      body.appendChild(el('p', 'su-q', 'The real problem is…'));
      const need = el('textarea');
      need.rows = 2; need.maxLength = 300; need.id = 'mc-need';
      need.placeholder = 'One sentence: who does what, and why.';
      need.value = R.need;
      need.oninput = () => { R.need = need.value; keep(R); };
      body.appendChild(need);
      const why = el('p', 'board-why');
      why.setAttribute('role', 'status');
      const go = btn('Show me what was going on', 'primary', 'mc-reveal');
      go.onclick = () => {
        if (!R.lever) { why.textContent = 'Make the call first: yes, partly or no.'; return; }
        if (R.need.trim().length < 10) { why.textContent = 'One sentence on the real problem. A guess counts.'; need.focus(); return; }
        R.done = true; R.at = Date.now(); keep(R);
        env.record(R, card);
        render(box, R, card, env);
        box.scrollTop = 0;
      };
      body.append(why, go);
      return;
    }

    // The reveal: all checked in code from the card.
    const right = R.lever === card.learningIsTheAnswer;
    const close = !right && (R.lever === 'partly' || card.learningIsTheAnswer === 'partly');
    const verdict = el('div', 'mc-verdict ' + (right ? 'ok' : close ? 'near' : 'no'));
    verdict.append(el('b', null, (right ? '✓ Right call. ' : close ? '~ One step off. ' : '✗ Not quite. ') + LEVER_LINE[card.learningIsTheAnswer]),
      el('p', null, 'You said: ' + LEVER[R.lever] + '. Facts found: ' + found() + ' of ' + facts.length + ' that a call can find.'));
    body.appendChild(verdict);
    const ans = el('div', 'su-answer');
    ans.append(el('p', null, 'Their real need: ' + (card.needStatement || card.realProblem)), el('p', 'mc-yours', 'You wrote: ' + R.need));
    body.appendChild(ans);
    const missed = facts.filter(f => !R.revealed.includes(f.id));
    if (missed.length) {
      body.appendChild(el('p', 'su-q', 'What ' + first(card) + ' would have told you:'));
      const ul = el('ul', 'mc-missed');
      missed.forEach(f => ul.appendChild(el('li', null, f.fact)));
      body.appendChild(ul);
    } else body.appendChild(el('p', 'su-q', 'You found everything a call could find.'));
    const elsewhere = card.hiddenFacts.length - facts.length;
    if (elsewhere) body.appendChild(el('p', 'fine', elsewhere + (elsewhere === 1 ? ' more fact sits' : ' more facts sit') + ' in their data or on the floor. That is the full case.'));
    if (card.questionHint) body.appendChild(el('p', 'mc-hint', 'The question that opens it up: "' + card.questionHint + '"'));

    // Share, opt in to your best question.
    const share = el('div', 'mc-share');
    const pre = el('pre', 'mc-share-text');
    pre.id = 'mc-share-text';
    const paintShare = () => { pre.textContent = shareText(R, card, env.url); };
    paintShare();
    const lab = el('label', 'check');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!R.best; cb.id = 'mc-best';
    cb.disabled = !bestQuestion(R);
    cb.onchange = () => { R.best = cb.checked; keep(R); paintShare(); };
    lab.append(cb, ' Add my best question');
    const copy = btn('Copy', null, 'mc-copy');
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(pre.textContent); env.toast('Copied. It says how you did, not what the answer was.', 'info'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); env.toast('Selected. Copy it yourself.', 'info'); }
    };
    share.append(el('p', 'su-q', 'Share how you did. The answer stays a secret, so a colleague can play the same call.'), pre, lab, copy);
    body.appendChild(share);

    const n = env.monthCount();
    body.appendChild(el('p', 'mc-next', first(card) + ' is in meetings until tomorrow. ' + (nextNumber(today()) ? 'Morning call no. ' + nextNumber(today()) + ' is a new stakeholder. ' : '') + 'Morning calls this month: ' + n + '.'));
    const row = el('div', 'row');
    const full = btn('Take the full case (about 10 minutes)', 'primary', 'mc-full');
    full.onclick = () => env.fullCase(card);
    const back = btn('Back to the title', 'ghost', 'mc-back');
    back.onclick = env.back;
    row.append(full, back);
    if (env.debug) { const again = btn('Play again (test mode)', 'ghost', 'mc-again'); again.onclick = () => { const F = fresh(R.no, card); keep(F); render(box, F, card, env); }; row.appendChild(again); }
    body.appendChild(row);
  }

  // Saturday and Sunday.
  function closed(box, t, env) {
    box.innerHTML = '';
    const top = el('div', 'mc-top');
    top.append(el('b', null, 'Morning call'), el('span', null, 'The weekend'));
    const body = el('div', 'mc-body');
    const no = nextNumber(t);
    body.append(el('p', 'su-mieke', 'Mieke: "The office is closed. Even Darren is offline, officially."'),
      el('p', null, 'Morning call no. ' + no + ' rings on Monday. Want a case now? One case takes about ten minutes.'));
    const row = el('div', 'row');
    const one = btn('Try one case', 'primary', 'mc-one');
    one.onclick = () => env.fullCase(null);
    const back = btn('Back to the title', 'ghost', 'mc-back');
    back.onclick = env.back;
    row.append(one, back);
    body.appendChild(row);
    box.append(top, body);
  }

  window.Morning = { today, number, nextNumber, date07, cardFor, callFacts, load, keep, fresh, render, closed, shareText, QUESTIONS };
})();
