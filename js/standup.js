// The Monday stand-up: Mieke reads you an old request and asks for the move that carries over to
// the next client: what would you ask first, and is training the lever? Then she shows the
// question that opened it up, what was really going on and the lever. The lever is checked in
// code; you say whether your question went after the same thing. A case retires after two
// successes at least a week apart (real days, not game weeks), and nothing comes back within a day
// of its last review. No Gemini call and no points: retrieval practice, not a test. Static, trusted markup.
(function () {
  const LEVER = { yes: 'Yes, training was the lever.', partly: 'Partly: training helped, the rest sat outside it.', no: 'No, it was not a training problem.' };
  const CALL = [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']];
  const DAY = 864e5, GAP = 6 * DAY, REST = 20 * 36e5;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // S = { items: [{ card, who, org, ask, real, lever, hint, answer, call, same, rated }], at, done }
  function render(box, S, save, done) {
    box.innerHTML = '';
    const top = el('div', 'su-top');
    top.append(el('b', null, 'Monday stand-up'), el('span', null, 'Mieke, with coffee · ' + Math.min(S.at + 1, S.items.length) + ' of ' + S.items.length));
    box.appendChild(top);
    const body = el('div', 'su-body');
    box.appendChild(body);
    if (S.at >= S.items.length) {
      const got = S.items.filter(i => i.rated === 'got').length;
      body.append(el('p', 'su-mieke', got === S.items.length ? 'Mieke: "All of them. Get them right once more next week and I will stop asking."'
        : 'Mieke: "The ones you missed come back. That is not a punishment, that is how remembering works."'));
      const b = el('button', 'primary', 'Back to the inbox');
      b.type = 'button'; b.id = 'su-done';
      b.onclick = () => done(got, S.items.length);
      body.appendChild(b);
      return;
    }
    const it = S.items[S.at];
    if (S.at === 0 && it.answer == null) body.appendChild(el('p', 'su-mieke', 'Mieke: "Before the inbox. Say this request lands on your desk again tomorrow. From memory, no peeking at your notes."'));
    body.appendChild(el('p', 'su-case', it.who + (it.org ? ' (' + it.org + ')' : '') + ': "' + it.ask + '"'));
    body.appendChild(el('p', 'su-q', 'What do you ask first?'));
    const t = el('textarea');
    t.name = 'recall'; t.rows = 2; t.maxLength = 400; t.placeholder = 'Your first question to them.';
    t.value = it.answer || '';
    body.appendChild(t);
    body.appendChild(el('p', 'su-q', 'And is training the lever?'));
    const calls = el('div', 'chips su-call');
    CALL.forEach(([k, label]) => {
      const b = el('button', null, label);
      b.type = 'button'; b.dataset.call = k;
      b.setAttribute('aria-pressed', it.call === k);
      b.disabled = it.answer != null;
      b.onclick = () => { it.call = k; save(); calls.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
      calls.appendChild(b);
    });
    body.appendChild(calls);
    if (it.answer == null) {
      const b = el('button', 'primary', 'Tell me');
      b.type = 'button'; b.id = 'su-reveal';
      const why = el('p', 'su-why');
      b.onclick = () => {
        if (t.value.trim().length < 10) { t.focus(); why.textContent = 'One question from memory first. Guessing counts; blank does not.'; return; }
        if (!it.call) { why.textContent = 'Make the lever call too.'; return; }
        it.answer = t.value.trim(); save(); render(box, S, save, done);
      };
      body.append(b, why);
      return;
    }
    t.readOnly = true;
    const ans = el('div', 'su-answer');
    const right = it.call === it.lever;
    if (it.hint) ans.appendChild(el('p', null, 'The question that opened it up: ' + it.hint));
    ans.appendChild(el('p', null, 'What was really going on: ' + it.real));
    ans.appendChild(el('p', right ? 'su-right' : 'su-wrong', (right ? '✓ ' : '✗ You said ' + it.call + '. ') + (LEVER[it.lever] || '')));
    body.appendChild(ans);
    body.appendChild(el('p', 'su-q', 'Did your first question go after the same thing?'));
    const row = el('div', 'chips su-same');
    [['yes', 'Yes, more or less'], ['no', 'Not really']].forEach(([k, label]) => {
      const b = el('button', null, label);
      b.type = 'button'; b.dataset.same = k;
      b.onclick = () => {
        it.same = k === 'yes';
        it.rated = it.same && right ? 'got' : it.same || right ? 'partly' : 'missed';
        S.at++; save(); render(box, S, save, done);
      };
      row.appendChild(b);
    });
    body.appendChild(row);
  }

  // What My scores keeps per card: { streak, lastGot, seen }. Older saves stored a plain rating.
  function state(v) {
    if (v && typeof v === 'object') return { streak: v.streak | 0, lastGot: v.lastGot || 0, seen: v.seen || 0 };
    return { streak: v === 'got' ? 1 : 0, lastGot: 0, seen: 0 };
  }
  const retired = v => state(v).streak >= 2;

  // Record one stand-up answer. A "got" only adds to the streak if the last one was at least
  // six days ago, so two in one sitting never retire a case.
  function record(recall, item, now) {
    const s = state(recall[item.card]);
    if (item.rated === 'got') {
      if (s.streak === 0 || now - s.lastGot >= GAP) s.streak++;
      s.lastGot = now;
    } else s.streak = 0;
    s.seen = now;
    recall[item.card] = s;
  }

  // Pick what comes back: requests from earlier weeks that are not retired and not reviewed in the
  // last day. Never got right first, then lowest score, one per case.
  // `history` is My scores; `cards` the loaded cards.
  function pick(history, cards, weekId, n, now) {
    now = now || Date.now();
    const recall = history.recall || {}, seen = new Set(), out = [];
    const past = history.weeks.filter(w => w.id !== weekId && !w.hard)
      .flatMap(w => (w.requests || []).filter(r => !r.starter).map(r => Object.assign({ started: w.started || 0 }, r)))
      .filter(r => !retired(recall[r.card]) && now - state(recall[r.card]).seen >= REST)
      .sort((a, b) => (state(recall[a.card]).streak - state(recall[b.card]).streak) || (a.total - b.total) || (b.started - a.started));
    for (const r of past) {
      const c = cards.find(x => x.id === r.card);
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ card: c.id, who: r.who || c.stakeholder.name, org: r.org || '', ask: c.surfaceAsk, real: c.realProblem, lever: c.learningIsTheAnswer, hint: c.questionHint || '', answer: null, call: '', same: null, rated: null });
      if (out.length >= n) break;
    }
    return out;
  }

  window.Standup = { render, pick, record, retired };
})();
