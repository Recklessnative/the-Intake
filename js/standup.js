// The Monday stand-up: Mieke asks you to recall cases from earlier weeks, from memory, before
// she shows what was really going on. You rate your own recall; a case you got stops coming
// back, a case you missed returns next Monday. No Gemini call and no points: retrieval
// practice, not a test. Static, trusted markup.
(function () {
  const LEVER = { yes: 'Yes, training was the lever.', partly: 'Partly: training helped, the rest sat outside it.', no: 'No, it was not a training problem.' };
  const RATE = [['got', 'Got it'], ['partly', 'Partly'], ['missed', 'Missed it']];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // S = { items: [{ card, who, org, ask, real, lever, hint, answer, rated }], at, done }
  function render(box, S, save, done) {
    box.innerHTML = '';
    const top = el('div', 'su-top');
    top.append(el('b', null, 'Monday stand-up'), el('span', null, 'Mieke, with coffee · ' + Math.min(S.at + 1, S.items.length) + ' of ' + S.items.length));
    box.appendChild(top);
    const body = el('div', 'su-body');
    box.appendChild(body);
    if (S.at >= S.items.length) {
      const got = S.items.filter(i => i.rated === 'got').length;
      body.append(el('p', 'su-mieke', got === S.items.length ? 'Mieke: "All of them. Good. Then you can stop thinking about them."'
        : 'Mieke: "The ones you missed come back next Monday. That is not a punishment, that is how remembering works."'));
      const b = el('button', 'primary', 'Back to the inbox');
      b.type = 'button'; b.id = 'su-done';
      b.onclick = () => done(got, S.items.length);
      body.appendChild(b);
      return;
    }
    const it = S.items[S.at];
    if (S.at === 0 && it.answer == null) body.appendChild(el('p', 'su-mieke', 'Mieke: "Before the inbox: two cases from earlier. From memory, no peeking at your notes."'));
    body.appendChild(el('p', 'su-case', it.who + (it.org ? ' (' + it.org + ')' : '') + ' asked for: "' + it.ask + '"'));
    body.appendChild(el('p', 'su-q', 'What was really going on there?'));
    const t = el('textarea');
    t.name = 'recall'; t.rows = 3; t.maxLength = 600; t.placeholder = 'The real problem, who it was about, and whether training was the answer.';
    t.value = it.answer || '';
    body.appendChild(t);
    if (it.answer == null) {
      const b = el('button', 'primary', 'Tell me what it was');
      b.type = 'button'; b.id = 'su-reveal';
      b.onclick = () => {
        if (t.value.trim().length < 10) { t.focus(); t.placeholder = 'One line from memory first. Guessing counts; blank does not.'; return; }
        it.answer = t.value.trim(); save(); render(box, S, save, done);
      };
      body.appendChild(b);
      return;
    }
    t.readOnly = true;
    const ans = el('div', 'su-answer');
    ans.append(el('p', null, 'What it was: ' + it.real), el('p', null, LEVER[it.lever] || ''));
    if (it.hint) ans.appendChild(el('p', null, 'The question that would have opened it up: ' + it.hint));
    body.appendChild(ans);
    body.appendChild(el('p', 'su-q', 'How close were you?'));
    const row = el('div', 'chips su-rate');
    RATE.forEach(([k, label]) => {
      const b = el('button', null, label);
      b.type = 'button'; b.dataset.rate = k;
      b.setAttribute('aria-pressed', it.rated === k);
      b.onclick = () => { it.rated = k; S.at++; save(); render(box, S, save, done); };
      row.appendChild(b);
    });
    body.appendChild(row);
  }

  // Pick what comes back: requests from earlier weeks you have not yet recalled well,
  // lowest score first, one per case. `history` is My scores; `cards` the loaded cards.
  function pick(history, cards, weekId, n) {
    const recall = history.recall || {}, seen = new Set(), out = [];
    const past = history.weeks.filter(w => w.id !== weekId && !w.hard)
      .flatMap(w => (w.requests || []).filter(r => !r.starter).map(r => Object.assign({ started: w.started || 0 }, r)))
      .filter(r => recall[r.card] !== 'got')
      .sort((a, b) => (a.total - b.total) || (b.started - a.started));
    for (const r of past) {
      const c = cards.find(x => x.id === r.card);
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ card: c.id, who: r.who || c.stakeholder.name, org: r.org || '', ask: c.surfaceAsk, real: c.realProblem, lever: c.learningIsTheAnswer, hint: c.questionHint || '', answer: null, rated: null });
      if (out.length >= n) break;
    }
    return out;
  }

  window.Standup = { render, pick };
})();
