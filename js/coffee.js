// Coffee with Mieke: about three minutes of mixed practice, any day, with no Gemini call and no
// points. Five short items, each followed straight away by the model answer: a recall from the
// stand-up queue (same spacing, same record), a lever call on someone else's notes, your first
// question on a fresh request, the flaw in a junior's draft, a stop rule, and one Academy question
// with its options shuffled. What comes up follows your weakest scorecard part and what you missed
// last round, mostly on cases you have not played, and the same kind never comes twice in a row.
// My scores keeps a record per skill, never a streak. Static, trusted markup; card text goes in
// with textContent.
(function () {
  const KEY = 'intake-coffee';
  const N = 5, REST = 20 * 36e5;
  const LEVER = { yes: 'Yes, training was the lever.', partly: 'Partly: training helps, the rest sits outside it.', no: 'No, it is not a training problem.' };
  const CALL = [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']];
  const RATE = [['got', 'Yes'], ['partly', 'Partly'], ['missed', 'Not really']];
  const TYPES = ['lever', 'first', 'flaw', 'rule', 'quiz'];
  const SKILL = { recall: 'Old cases from memory', lever: 'Lever calls', first: 'First questions', flaw: 'Flaws spotted', rule: 'Stop rules', quiz: 'Academy questions' };
  // The scorecard part you are weakest on decides what comes up twice.
  const DIMS = [['diagnosis', 25], ['measurement', 20], ['fit', 20], ['nextLevel', 15], ['risks', 10], ['pitch', 10]];
  const FOR_DIM = { diagnosis: ['lever', 'first'], measurement: ['rule', 'rule'], fit: ['flaw', 'flaw'], nextLevel: ['flaw', 'flaw'], risks: ['flaw', 'flaw'], pitch: ['quiz', 'quiz'] };
  const JUNIOR_FOR = { risks: 'bart', measurement: 'priya', fit: 'jens', nextLevel: 'jens' };
  const MODULE_FOR = { diagnosis: 'is-it-training', measurement: 'measure', fit: 'spot-the-flaw', nextLevel: 'spot-the-flaw', risks: 'read-the-room', pitch: 'the-board' };

  // A first question, checked from its wording. Like the drill's stop rule, the ticks are a guess
  // that you correct.
  const SOLUTION = /\b(course|courses|training|train|e-?learning|module|workshop|session|webinar|quiz|refresher|programme|program|curriculum)\b/i;
  const CLOSED = /^\s*(is|are|was|were|do|does|did|can|could|will|would|should|have|has|had|shall|may|might)\b/i;
  const FIRST_CHECKS = [
    ['open', 'Open: they cannot answer it with yes or no', t => !CLOSED.test(t)],
    ['work', 'About the work, not about a course or a format', t => !SOLUTION.test(t)],
    ['specific', 'Specific: one thing, a when, a who or a where', t => /\b(when|which|who|where|since|changed|exactly|how many|how often|what happens)\b/i.test(t)]
  ];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, cls, id) { const b = el('button', cls, text); b.type = 'button'; if (id) b.id = id; return b; }
  const shuffle = (a, r) => { r = r || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const any = (list, r) => list[Math.floor((r || Math.random)() * list.length)];
  const first = name => String(name || '').split(' ')[0];
  const orgOf = card => (card.stakeholder.org || '').split(',')[0];

  // The scorecard part with the lowest share over your last five full requests, or null.
  function weakest(history) {
    const reqs = (history.weeks || []).flatMap(w => w.requests || []).filter(r => !r.starter && r.pts).slice(-5);
    if (!reqs.length) return null;
    const share = DIMS.map(([k, max]) => [k, reqs.reduce((a, r) => a + (r.pts[k] || 0), 0) / (max * reqs.length)]);
    share.sort((a, b) => a[1] - b[1]);
    return share[0][1] < 0.9 ? share[0][0] : null;
  }

  // Which kinds come up, in which order: a due recall first, then your weak spot (twice), what you
  // missed last round, the rest at random; never the same kind twice in a row.
  function plan(history, due, r) {
    const weak = weakest(history);
    const last = (history.coffee || []).slice(-1)[0];
    const missed = last ? last.items.filter(i => i.type !== 'recall' && i.ok !== 'got').map(i => i.type) : [];
    const want = (weak ? FOR_DIM[weak] : []).concat(missed, shuffle(TYPES.slice(), r));
    const count = {}, cap = t => (weak && FOR_DIM[weak][0] === t && FOR_DIM[weak][1] === t ? 2 : 1);
    const pool = [];
    for (const t of want) {
      if (pool.length >= N - (due ? 1 : 0)) break;
      if ((count[t] || 0) >= cap(t)) continue;
      count[t] = (count[t] || 0) + 1;
      pool.push(t);
    }
    const out = due ? ['recall'] : [];
    while (pool.length) {
      const prev = out[out.length - 1];
      const left = {};
      pool.forEach(t => { left[t] = (left[t] || 0) + 1; });
      const options = Object.keys(left).filter(t => t !== prev).sort((a, b) => left[b] - left[a]);
      const t = options.length ? options[0] : pool[0];
      pool.splice(pool.indexOf(t), 1);
      out.push(t);
    }
    return { types: out, weak };
  }

  // A new round. `history` is My scores, `pool` the loaded cards.
  function build(history, pool, now) {
    now = now || Date.now();
    const r = Math.random;
    const played = new Set((history.weeks || []).flatMap(w => (w.requests || []).map(x => x.card)));
    // Only cases you played at least a day ago can come back from memory.
    const aged = { recall: history.recall || {}, weeks: (history.weeks || []).map(w => Object.assign({}, w, { requests: (w.requests || []).filter(x => (x.at || 0) <= now - REST) })) };
    const due = window.Standup ? Standup.pick(aged, pool, null, 1, now)[0] : null;
    const { types, weak } = plan(history, due, r);
    const used = new Set(due ? [due.card] : []);
    const real = pool.filter(c => c.difficulty >= 1);
    const fresh = () => { const f = real.filter(c => !used.has(c.id) && !played.has(c.id)); return f.length ? f : real.filter(c => !used.has(c.id)); };
    const take = c => { if (c) used.add(c.id); return c; };
    const seenQuiz = new Set((history.coffee || []).slice(-6).flatMap(x => x.items).filter(i => i.type === 'quiz').map(i => i.card));
    const items = types.map(t => {
      if (t === 'recall') return Object.assign({ type: 'recall' }, due);
      if (t === 'lever') {
        const c = take(any(fresh(), r));
        const crit = shuffle(c.hiddenFacts.filter(f => f.critical), r), other = shuffle(c.hiddenFacts.filter(f => !f.critical), r);
        const facts = crit.slice(0, 2).concat(other.slice(0, 2), crit.slice(2), other.slice(2)).slice(0, 4);
        return { type: 'lever', card: c.id, facts: shuffle(facts.map(f => ({ text: f.fact, key: f.critical })), r), call: '', pick: null, checked: false, ok: null };
      }
      if (t === 'first') return { type: 'first', card: take(any(fresh(), r)).id, answer: '', ticks: null, ok: null };
      if (t === 'rule') {
        const c = take((window.Drill && Drill.pickCard(history, pool.filter(x => !used.has(x.id)), null)) || any(fresh(), r));
        return { type: 'rule', card: c.id, rule: '', ticks: null, ok: null };
      }
      if (t === 'flaw') {
        const c = take(any(fresh(), r));
        const j = Team.JUNIORS.find(x => x.id === JUNIOR_FOR[weak]) || any(Team.JUNIORS, r);
        const d = Team.draft(c, j, 'coffee' + now);
        return { type: 'flaw', card: c.id, junior: j.name, lines: d.lines.map(l => ({ label: l.label, text: l.text })), flaw: d.lines.findIndex(l => l.k === d.flaw), why: d.why, pick: null, ok: null };
      }
      // An Academy question, from the module for your weak spot when there is one.
      const mods = Academy.MODULES;
      const qs = mods.flatMap(m => m.questions.map((q, i) => ({ m, i, key: m.id + ':' + i })));
      const want = qs.filter(q => !seenQuiz.has(q.key) && !used.has(q.key));
      const mine = want.filter(q => q.m.id === MODULE_FOR[weak]);
      const q = any(mine.length ? mine : want.length ? want : qs, r);
      used.add(q.key);
      return { type: 'quiz', card: q.key, order: shuffle(q.m.questions[q.i].options.map((o, k) => k), r), pick: null, ok: null };
    });
    return { v: 1, at: now, weak, items, now: 0, finished: false };
  }

  function load() {
    try { const R = JSON.parse(localStorage.getItem(KEY) || 'null'); return R && R.v === 1 ? R : null; } catch (e) { return null; }
  }
  function keep(R) {
    try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) { /* storage blocked: the round lives until reload */ }
  }
  // A round started on an earlier day, or one already finished, makes way for a new one.
  function stale(R, now) {
    if (!R) return true;
    const a = new Date(R.at), b = new Date(now || Date.now());
    return a.toDateString() !== b.toDateString();
  }

  // ---------- one item each ----------
  function chips(list, chosen, disabled, onPick, attr) {
    const row = el('div', 'chips');
    list.forEach(([k, label]) => {
      const b = btn(label);
      b.dataset[attr || 'k'] = k;
      b.setAttribute('aria-pressed', chosen === k);
      b.disabled = !!disabled;
      b.onclick = () => { onPick(k); row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
      row.appendChild(b);
    });
    return row;
  }
  function rateRow(question, onRate) {
    const box = el('div');
    box.appendChild(el('p', 'su-q', question));
    box.appendChild(chips(RATE, null, false, onRate, 'rate'));
    return box;
  }
  function nextBtn(go) { const b = btn('Next', 'primary', 'cf-next'); b.onclick = go; return b; }
  function ticksList(checks, ticks, locked, save) {
    const ul = el('ul', 'drill-checks');
    checks.forEach(([k, label]) => {
      const li = el('li'), cb = el('input');
      cb.type = 'checkbox'; cb.checked = !!ticks[k]; cb.disabled = locked; cb.id = 'cf-' + k;
      cb.onchange = () => { ticks[k] = cb.checked; save(); };
      const lab = el('label', null, label); lab.htmlFor = cb.id;
      li.append(cb, lab); ul.appendChild(li);
    });
    return ul;
  }
  const ask = (card, cls) => el('p', cls || 'su-case', card.stakeholder.name + (orgOf(card) ? ' (' + orgOf(card) + ')' : '') + ': "' + card.surfaceAsk + '"');

  // Recall: one of your own cases, from memory. Rated like the stand-up and kept in the same queue.
  function recall(body, it, card, save, next) {
    body.appendChild(el('p', 'su-mieke', 'Mieke: "Remember this one? It just landed again. From memory, no peeking."'));
    body.appendChild(el('p', 'su-case', it.who + (it.org ? ' (' + it.org + ')' : '') + ': "' + it.ask + '"'));
    body.appendChild(el('p', 'su-q', 'What do you ask first?'));
    const t = el('textarea');
    t.rows = 2; t.maxLength = 400; t.placeholder = 'Your first question to them.'; t.value = it.answer || '';
    body.appendChild(t);
    body.appendChild(el('p', 'su-q', 'And is training the lever?'));
    body.appendChild(chips(CALL, it.call, it.answer != null, k => { it.call = k; save(); }, 'call'));
    const why = el('p', 'su-why');
    if (it.answer == null) {
      const b = btn('Tell me', 'primary', 'cf-check');
      b.onclick = () => {
        if (t.value.trim().length < 10) { t.focus(); why.textContent = 'One question from memory first. Guessing counts; blank does not.'; return; }
        if (!it.call) { why.textContent = 'Make the lever call too.'; return; }
        it.answer = t.value.trim(); save(); next(true);
      };
      body.append(b, why);
      return;
    }
    t.readOnly = true;
    const right = it.call === it.lever;
    const ans = el('div', 'su-answer');
    if (it.hint) ans.appendChild(el('p', null, 'The question that opened it up: ' + it.hint));
    ans.appendChild(el('p', null, 'What was really going on: ' + it.real));
    ans.appendChild(el('p', right ? 'su-right' : 'su-wrong', (right ? '✓ ' : '✗ You said ' + it.call + '. ') + (LEVER[it.lever] || '')));
    body.appendChild(ans);
    body.appendChild(rateRow('Did your first question go after the same thing?', k => {
      it.rated = k === 'got' && right ? 'got' : k !== 'missed' || right ? 'partly' : 'missed';
      it.ok = it.rated; save(); next();
    }));
  }

  // Lever: somebody else's call notes on a request you have not played. Code-checked.
  function lever(body, it, card, save, next) {
    body.appendChild(el('p', 'su-mieke', 'Mieke: "Not your case. Someone else did the call and these are their notes. You make the call."'));
    body.appendChild(ask(card));
    const ul = el('ol', 'drill-tiles cf-facts');
    it.facts.forEach((f, i) => {
      const li = el('li', it.checked ? (f.key ? 'ok' : it.pick === i ? 'no' : null) : null);
      const b = btn(f.text, 'cf-fact');
      b.dataset.fact = i;
      b.setAttribute('aria-pressed', it.pick === i);
      b.disabled = it.checked;
      b.onclick = () => { it.pick = i; save(); ul.querySelectorAll('.cf-fact').forEach(x => x.setAttribute('aria-pressed', x === b)); };
      li.appendChild(b);
      if (it.checked && f.key) li.appendChild(el('p', 'drill-why', 'This one points at the cause.'));
      ul.appendChild(li);
    });
    body.appendChild(el('p', 'su-q', 'What came out of the call. Click the fact that tells you most about the cause.'));
    body.appendChild(ul);
    body.appendChild(el('p', 'su-q', 'Is training the lever?'));
    body.appendChild(chips(CALL, it.call, it.checked, k => { it.call = k; save(); }, 'call'));
    const why = el('p', 'su-why');
    if (!it.checked) {
      const b = btn('Check', 'primary', 'cf-check');
      b.onclick = () => {
        if (it.pick == null) { why.textContent = 'Click the fact that matters most first. A guess counts.'; return; }
        if (!it.call) { why.textContent = 'Make the lever call: yes, partly or no.'; return; }
        const callOk = it.call === card.learningIsTheAnswer, factOk = it.facts[it.pick].key;
        it.checked = true; it.ok = callOk && factOk ? 'got' : callOk || factOk ? 'partly' : 'missed';
        save(); next(true);
      };
      body.append(b, why);
      return;
    }
    const right = it.call === card.learningIsTheAnswer;
    const ans = el('div', 'su-answer');
    ans.appendChild(el('p', right ? 'su-right' : 'su-wrong', (right ? '✓ ' : '✗ You said ' + it.call + '. ') + LEVER[card.learningIsTheAnswer]));
    ans.appendChild(el('p', null, 'The real need: ' + (card.needStatement || card.realProblem)));
    body.appendChild(ans);
    body.appendChild(nextBtn(() => next()));
  }

  // First question: the opening message only. You tick your own question against three checks.
  function firstQ(body, it, card, save, next) {
    body.appendChild(el('p', 'su-mieke', 'Mieke: "Fresh from the inbox. Only the first question, nothing else."'));
    body.appendChild(ask(card));
    body.appendChild(el('p', 'su-q', 'What do you ask first?'));
    const t = el('textarea');
    t.rows = 2; t.maxLength = 400; t.placeholder = 'Your first question to ' + first(card.stakeholder.name) + '.'; t.value = it.answer;
    body.appendChild(t);
    const why = el('p', 'su-why');
    if (!it.ticks) {
      const b = btn('Check my question', 'primary', 'cf-check');
      b.onclick = () => {
        const v = t.value.trim();
        if (v.length < 10) { t.focus(); why.textContent = 'One real question first.'; return; }
        it.answer = v; it.ticks = Object.fromEntries(FIRST_CHECKS.map(([k, , test]) => [k, test(v)])); save(); next(true);
      };
      body.append(b, why);
      return;
    }
    t.readOnly = true;
    body.appendChild(el('p', 'fine', 'The ticks are a guess from your wording: untick what is not really there, tick what is.'));
    body.appendChild(ticksList(FIRST_CHECKS, it.ticks, !!it.ok, save));
    if (SOLUTION.test(it.answer)) body.appendChild(el('p', 'su-why', 'Your question already talks about the solution. The client hears: "so we are doing a course".'));
    const ans = el('div', 'su-answer');
    if (card.questionHint) ans.appendChild(el('p', null, 'The question that opened it up: ' + card.questionHint));
    ans.appendChild(el('p', null, 'The real need: ' + (card.needStatement || card.realProblem)));
    body.appendChild(ans);
    body.appendChild(rateRow('Did your question go after the same thing?', k => { it.ok = k; save(); next(); }));
  }

  // Flaw: a junior's draft with one wrong line, built from the card's own traps (js/team.js).
  function flaw(body, it, card, save, next) {
    body.appendChild(el('p', 'su-mieke', 'Mieke: "' + it.junior + ' left this on the printer. One line would get us in trouble. Which?"'));
    body.appendChild(el('p', 'su-case', 'The request from ' + card.stakeholder.name + (orgOf(card) ? ', ' + orgOf(card) : '') + ': ' + card.subject + '.'));
    const ul = el('ol', 'drill-tiles cf-lines');
    it.lines.forEach((l, i) => {
      const done = it.pick != null;
      const li = el('li', done ? (i === it.flaw ? (it.pick === i ? 'ok' : 'cf-key') : it.pick === i ? 'no' : null) : null);
      const b = btn('', 'cf-line');
      b.dataset.line = i;
      b.append(el('b', null, l.label + (/\?$/.test(l.label) ? ' ' : ': ')), document.createTextNode(l.text));
      b.disabled = done;
      b.setAttribute('aria-pressed', it.pick === i);
      b.onclick = () => { it.pick = i; it.ok = i === it.flaw ? 'got' : 'missed'; save(); next(true); };
      li.appendChild(b);
      if (done && i === it.flaw) li.appendChild(el('p', 'drill-why', (it.pick === i ? '✓ ' : '✗ This was the one. ') + it.why));
      ul.appendChild(li);
    });
    body.appendChild(ul);
    if (it.pick != null) body.appendChild(nextBtn(() => next()));
  }

  // Stop rule: the need is given, you write the rule. The same four checks as the drill.
  function rule(body, it, card, save, next) {
    const m = card.measurementPlan || {}, who = first(card.stakeholder.name);
    body.appendChild(el('p', 'su-mieke', 'Mieke: "The diagnosis is done. How would you know it worked?"'));
    body.appendChild(el('p', 'su-case', 'The need at ' + (orgOf(card) || 'the client') + ': ' + (card.needStatement || card.realProblem)));
    if (card.constraints.dataAvailable) body.appendChild(el('p', 'fine', 'Data ' + who + ' has: ' + card.constraints.dataAvailable + '.'));
    body.appendChild(el('p', 'su-q', 'Write the rule that stops or scales the pilot, in one or two sentences.'));
    const t = el('textarea');
    t.rows = 3; t.maxLength = 500; t.value = it.rule;
    t.placeholder = 'A first step, the measure, the result that makes you stop, and when you decide.';
    body.appendChild(t);
    const why = el('p', 'su-why');
    if (!it.ticks) {
      const b = btn('Check my rule', 'primary', 'cf-check');
      b.onclick = () => {
        const v = t.value.trim();
        if (v.length < 20) { t.focus(); why.textContent = 'One real sentence first.'; return; }
        it.rule = v; it.ticks = Object.fromEntries(Drill.CHECKS.map(([k, , test]) => [k, test(v)])); save(); next(true);
      };
      body.append(b, why);
      return;
    }
    t.readOnly = true;
    body.appendChild(el('p', 'fine', 'A rule needs all four. The ticks are a guess from your wording: correct them.'));
    body.appendChild(ticksList(Drill.CHECKS, it.ticks, !!it.ok, save));
    const ans = el('div', 'su-answer');
    ans.appendChild(el('p', null, 'What would show it worked here:'));
    [['Behaviour', m.behaviour], ['Business metric', m.business_metric]].forEach(([l, v]) => { if (v) ans.appendChild(el('p', null, l + ': ' + v)); });
    body.appendChild(ans);
    body.appendChild(rateRow('Would your rule have told ' + who + ' whether to stop or scale?', k => { it.ok = k; save(); next(); }));
  }

  // Quiz: one Academy question, options in a shuffled order.
  function quiz(body, it, save, next) {
    const [id, i] = it.card.split(':'), m = Academy.MODULES.find(x => x.id === id), q = m.questions[+i];
    body.appendChild(el('p', 'su-mieke', 'Mieke: "One from the Academy while the machine runs: ' + m.title.replace(/[.?!]$/, '') + '."'));
    body.appendChild(el('p', 'su-case', q.q));
    const box = el('div', 'ac-options cf-quiz');
    it.order.forEach((k, n) => {
      const o = q.options[k], done = it.pick != null;
      const b = el('button', 'ac-opt' + (done ? (o.ok ? ' right' : k === it.pick ? ' wrong' : '') : ''));
      b.type = 'button'; b.disabled = done; b.dataset.opt = k;
      b.append(el('span', 'ac-letter', 'ABCD'[n]), el('span', 'ac-opt-t', o.t));
      if (done && (o.ok || k === it.pick)) b.appendChild(el('span', 'ac-why', o.why));
      b.onclick = () => { it.pick = k; it.ok = o.ok ? 'got' : 'missed'; save(); next(true); };
      box.appendChild(b);
    });
    body.appendChild(box);
    if (it.pick != null) body.appendChild(nextBtn(() => next()));
  }

  // ---------- the round ----------
  // env: { save(R), finish(R) once when the last item is rated, back(), again() }
  function render(box, R, pool, env) {
    const redraw = () => render(box, R, pool, env);
    const save = () => env.save(R);
    box.innerHTML = '';
    const top = el('div', 'su-top cf-top');
    top.append(el('b', null, 'Coffee with Mieke'), el('span', null, R.now < R.items.length ? (R.now + 1) + ' of ' + R.items.length + ' · ' + SKILL[R.items[R.now].type] : 'Finished'));
    box.appendChild(top);
    const body = el('div', 'su-body cf-body');
    box.appendChild(body);
    const card = id => pool.find(c => c.id === id) || {};

    if (R.now >= R.items.length) {
      if (!R.finished) { R.finished = true; save(); env.finish(R); }
      const got = R.items.filter(i => i.ok === 'got').length;
      body.appendChild(el('p', 'su-mieke', got === R.items.length ? 'Mieke: "All five. Now use one of them on a real request today."'
        : 'Mieke: "What you missed comes back next coffee, in another case. That is how it sticks."'));
      const ul = el('ul', 'cf-summary');
      R.items.forEach(i => {
        const mark = i.ok === 'got' ? '✓' : i.ok === 'partly' ? '~' : '✗';
        ul.appendChild(el('li', 'cf-' + i.ok, mark + ' ' + SKILL[i.type]));
      });
      body.appendChild(ul);
      body.appendChild(el('p', 'fine', 'No points and no streak. My scores keeps how each kind is going.'));
      const row = el('div', 'row');
      const done = btn('Done', 'primary', 'cf-done'); done.onclick = () => env.back();
      const again = btn('Pour another round', 'ghost', 'cf-again'); again.onclick = () => env.again();
      row.append(done, again);
      body.appendChild(row);
      return;
    }
    if (R.now === 0 && R.items[0].ok == null && !R.items[0].answer && !R.items[0].ticks && R.items[0].pick == null && !R.items[0].checked) {
      body.appendChild(el('p', 'fine cf-intro', 'Five small ones, about three minutes. Your answer first, then hers. No points, nobody watching.'));
    }
    const it = R.items[R.now];
    // next(true) redraws the same item with its answer; next() moves on.
    const next = stay => { if (!stay) R.now++; save(); redraw(); box.scrollTop = 0; };
    const c = card(it.card);
    if (it.type === 'recall') recall(body, it, c, save, next);
    else if (it.type === 'lever') lever(body, it, c, save, next);
    else if (it.type === 'first') firstQ(body, it, c, save, next);
    else if (it.type === 'flaw') flaw(body, it, c, save, next);
    else if (it.type === 'rule') rule(body, it, c, save, next);
    else quiz(body, it, save, next);
  }

  // What My scores keeps: the kinds and how they went, plus the recall in the stand-up's queue.
  function record(history, R, now) {
    now = now || Date.now();
    history.coffee = (history.coffee || []).concat({ at: now, weak: R.weak || undefined, items: R.items.map(i => ({ type: i.type, card: i.card, ok: i.ok })) }).slice(-60);
    R.items.filter(i => i.type === 'recall' && i.rated && window.Standup).forEach(i => {
      history.recall = history.recall || {};
      Standup.record(history.recall, i, now);
    });
  }

  // The lines for My scores: days, not streaks, and how each kind went over its last ten.
  function ledger(history, now) {
    const rounds = history.coffee || [];
    if (!rounds.length) return [];
    const d = new Date(now || Date.now());
    const days = new Set(rounds.filter(x => { const a = new Date(x.at); return a.getMonth() === d.getMonth() && a.getFullYear() === d.getFullYear(); }).map(x => new Date(x.at).toDateString())).size;
    const parts = ['recall', 'lever', 'first', 'flaw', 'rule', 'quiz'].map(t => {
      const last = rounds.flatMap(x => x.items).filter(i => i.type === t).slice(-10);
      return last.length ? SKILL[t] + ' ' + last.filter(i => i.ok === 'got').length + ' of ' + last.length : null;
    }).filter(Boolean);
    return ['Coffee with Mieke: ' + rounds.length + ' round' + (rounds.length === 1 ? '' : 's') + ' · ' + days + ' day' + (days === 1 ? '' : 's') + ' this month', 'Right over the last ten of each: ' + parts.join(' · ')];
  }

  window.Coffee = { build, render, record, ledger, load, keep, stale, plan, weakest, FIRST_CHECKS };
})();
