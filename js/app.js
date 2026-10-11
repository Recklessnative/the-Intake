// THE INTAKE v0.1: cubicle -> inbox -> intake call -> write-up -> reaction/defence -> scorecard.
(function () {
  const $ = id => document.getElementById(id);
  const QUESTIONS = 8;
  const RUN_LENGTH = 3;
  const TITLES = [[40, 'Order Taker'], [55, 'Course Builder'], [70, 'Learning Consultant'], [85, 'Learning Strategist'], [101, 'Board Whisperer']];
  const DIMENSIONS = [
    ['diagnosis', 'Need diagnosis', 25],
    ['measurement', 'Measurement', 20],
    ['fit', 'Concept fit', 20],
    ['nextLevel', 'Next level', 15],
    ['risks', 'Risks and dependencies', 10],
    ['pitch', 'Pitch and defence', 10]
  ];
  const CUBICLE = [
    'Monday, 08:57. The coffee machine is broken again.',
    'Your cubicle. Grey fabric walls, a plant on its last legs, and a sticky note that just says ASK WHY.',
    'The laptop is already blinking. Somebody needs a course. Somebody always needs a course.'
  ];

  const state = { pool: [], cards: [], index: 0, results: [], run: null };

  // ---------- screens and panes ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }
  function pane(id, step) {
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === id));
    if (step) $('os-step').textContent = step;
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 6000);
  }
  function wait(line) { $('wait-line').textContent = line; pane('p-wait'); }
  function trust() { $('os-trust').textContent = 'Trust ' + state.run.trust; }

  // ---------- scenarios ----------
  async function loadCards() {
    if (state.pool.length) return;
    const index = await (await fetch('scenarios/index.json')).json();
    const cards = (await Promise.all(index.map(id => fetch('scenarios/' + id + '.json').then(r => r.json())))).map(Cards.normalise);
    state.pool = cards;
  }
  // A week: up to RUN_LENGTH cards, mixed sectors, easiest first.
  function pickWeek() {
    const pool = state.pool.slice().sort(() => Math.random() - 0.5);
    const week = [];
    for (const c of pool) if (week.length < RUN_LENGTH && !week.some(w => w.sector === c.sector)) week.push(c);
    for (const c of pool) if (week.length < RUN_LENGTH && !week.includes(c)) week.push(c);
    return week.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));
  }

  // ---------- title / settings ----------
  $('btn-settings').onclick = () => openSettings();
  $('btn-back-title').onclick = () => show('s-title');
  function openSettings() {
    $('in-key').value = Gemini.key;
    $('in-model').value = Gemini.model;
    show('s-settings');
  }
  $('btn-save-key').onclick = () => {
    const key = $('in-key').value.trim();
    if (!key) { toast('Paste a Gemini API key first.'); return; }
    Gemini.save(key, $('in-model').value.trim(), $('in-remember').checked);
    show('s-title');
  };

  $('btn-start').onclick = async () => {
    if (!Gemini.key) { openSettings(); return; }
    try { await loadCards(); } catch (e) { toast('Could not load the scenarios. The game needs to be served over http, not opened as a file.'); return; }
    state.cards = pickWeek();
    state.index = 0;
    state.results = [];
    cubicle();
  };
  $('btn-again').onclick = () => $('btn-start').onclick();

  function cubicle() {
    show('s-cubicle');
    let i = 0;
    $('cubicle-line').textContent = CUBICLE[0];
    $('btn-sit').textContent = 'Go on';
    $('btn-sit').onclick = () => {
      i++;
      if (i < CUBICLE.length) {
        $('cubicle-line').textContent = CUBICLE[i];
        if (i === CUBICLE.length - 1) $('btn-sit').textContent = 'Sit down';
      } else {
        startRequest();
      }
    };
  }

  // ---------- one request ----------
  function startRequest() {
    const card = state.cards[state.index];
    state.run = {
      card, trust: 100, questionsLeft: QUESTIONS, patience: card.patience || 3,
      turns: [], transcript: [], revealed: new Set(), writeup: null, reaction: null, defence: []
    };
    show('s-desk');
    trust();
    $('mail-from').textContent = card.stakeholder.name;
    $('mail-role').textContent = card.stakeholder.role;
    $('mail-body').textContent = card.surfaceAsk;
    briefing(card.briefing);
    pane('p-inbox', 'Request ' + (state.index + 1) + ' of ' + state.cards.length + ' · Inbox');
  }

  // Pre-call context a well-prepared professional would look up first (never the diagnosis).
  function briefing(b) {
    const box = $('briefing');
    const ul = $('briefing-points');
    ul.innerHTML = '';
    box.querySelectorAll('p').forEach(p => p.remove());
    box.hidden = !b;
    if (!b) return;
    $('briefing-head').textContent = b.headline;
    if (b.text) { const p = document.createElement('p'); p.textContent = b.text; box.appendChild(p); }
    b.points.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  }

  $('btn-call').onclick = () => {
    const r = state.run;
    $('chat-who').textContent = r.card.stakeholder.name;
    $('chat-role').textContent = r.card.stakeholder.role;
    $('chat-log').innerHTML = '';
    addMsg('sys', 'You call ' + r.card.stakeholder.name + '. They pick up on the fourth ring.');
    addMsg('them', r.card.surfaceAsk);
    meters();
    $('chat-input').value = '';
    pane('p-chat', 'Request ' + (state.index + 1) + ' · Intake call');
    $('chat-input').focus();
  };

  function addMsg(who, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    $('chat-log').appendChild(d);
    $('chat-log').scrollTop = $('chat-log').scrollHeight;
  }
  function meters() {
    const r = state.run;
    $('q-left').textContent = r.questionsLeft;
    $('patience').textContent = '●'.repeat(Math.max(0, r.patience)) || '0';
    trust();
  }

  $('chat-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run;
    const q = $('chat-input').value.trim();
    if (!q || r.questionsLeft <= 0 || r.patience <= 0) return;
    const btn = ev.submitter || $('chat-form').querySelector('button[type=submit]');
    btn.disabled = true;
    addMsg('you', q);
    $('chat-input').value = '';
    r.turns.push({ role: 'user', text: 'The learning professional asks: """' + q + '"""' });
    const p = Prompts.stakeholder(r.card);
    try {
      const out = await Gemini.json({ system: p.system, turns: r.turns, schema: p.schema, temperature: p.temperature });
      r.turns.push({ role: 'model', text: JSON.stringify(out) });
      addMsg('them', out.reply);
      (out.revealed || []).forEach(id => { if (r.card.hiddenFacts.some(f => f.id === id)) r.revealed.add(id); });
      r.transcript.push({ q, a: out.reply, quality: out.quality });
      r.questionsLeft--;
      if (out.quality === 'weak') { r.patience--; r.trust -= 10; }
      meters();
      if (r.patience <= 0) {
        addMsg('sys', r.card.stakeholder.name + ' has another meeting. Suddenly. The call is over.');
        setTimeout(toWriteup, 1800);
      } else if (r.questionsLeft <= 0) {
        addMsg('sys', 'That was your last question. Time to write it up.');
        setTimeout(toWriteup, 1800);
      }
    } catch (e) {
      r.turns.pop();
      toast(e.message);
    } finally {
      btn.disabled = false;
    }
  };
  $('btn-hangup').onclick = () => toWriteup();

  function toWriteup() {
    $('write-form').reset();
    pane('p-write', 'Request ' + (state.index + 1) + ' · Write-up');
  }

  function writeupText(w) {
    return [
      'NEED', 'Gap: ' + w.gap, 'Who: ' + w.who, 'Root cause: ' + w.cause, 'Is learning the lever: ' + w.lever,
      'MEASUREMENT', 'Baseline: ' + w.baseline, 'Behaviour: ' + w.behaviour, 'Business metric: ' + w.metric, 'Collection: ' + w.collect,
      'CONCEPT', 'Big idea: ' + w.idea, 'Format and rhythm: ' + w.format, 'Why it fixes the root cause: ' + w.why,
      'What it is not: ' + w.not, 'Risks and mitigations: ' + w.risks,
      'Flagged as risky strat: ' + (w.flag || '(not flagged)')
    ].join('\n');
  }

  $('write-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run;
    const w = Object.fromEntries(new FormData($('write-form')).entries());
    if (!w.gap.trim() || !w.idea.trim()) { toast('At least describe the gap and the big idea.'); return; }
    r.writeup = w;
    wait(r.card.stakeholder.name + ' is reading your concept. You can hear sighing, or possibly typing.');
    const p = Prompts.reaction(r.card);
    try {
      r.reaction = await Gemini.json({
        system: p.system, schema: p.schema, temperature: p.temperature,
        turns: [{ role: 'user', text: 'The write-up, quoted as data:\n"""\n' + writeupText(w) + '\n"""' }]
      });
    } catch (e) { toast(e.message); pane('p-write'); return; }
    const gap = Math.max(0, Math.min(3, (r.reaction.boldness | 0) - (r.card.riskAppetite | 0)));
    if (gap > 0) defence(r.reaction.objections.slice(0, gap)); else judge();
  };

  function defence(objections) {
    const r = state.run;
    r.defenceAsked = objections;
    $('defence-intro').textContent = r.card.stakeholder.name + ' leans back. "This is… bold. Explain yourself."';
    const f = $('defence-form');
    f.innerHTML = '';
    objections.forEach((o, i) => {
      const q = document.createElement('p');
      q.className = 'msg them';
      q.textContent = o;
      const l = document.createElement('label');
      l.textContent = 'Your answer';
      const t = document.createElement('textarea');
      t.name = 'a' + i; t.rows = 3; t.maxLength = 700;
      l.appendChild(t);
      f.append(q, l);
    });
    const b = document.createElement('button');
    b.type = 'submit'; b.className = 'primary'; b.textContent = 'Make your case';
    f.appendChild(b);
    f.onsubmit = ev => {
      ev.preventDefault();
      r.defence = objections.map((o, i) => ({ objection: o, answer: (f.elements['a' + i].value || '').trim() }));
      judge();
    };
    pane('p-defence', 'Request ' + (state.index + 1) + ' · Defence round');
  }

  async function judge() {
    const r = state.run;
    wait('The examiner is reading the transcript. The examiner has read a lot of transcripts.');
    const p = Prompts.judge(r.card);
    const material = [
      'INTAKE TRANSCRIPT (player questions and stakeholder answers):',
      r.transcript.map((t, i) => `Q${i + 1}: """${t.q}"""\nA${i + 1}: ${t.a}`).join('\n') || '(the player asked no questions)',
      'Hidden facts the player surfaced: ' + ([...r.revealed].join(', ') || 'none'),
      '',
      'WRITE-UP:', '"""', writeupText(r.writeup), '"""',
      '',
      'DEFENCE ROUND:',
      r.defence.length ? r.defence.map(d => `Objection: ${d.objection}\nAnswer: """${d.answer || '(no answer)'}"""`).join('\n') : '(none, the stakeholder accepted the concept)'
    ].join('\n');
    let g;
    try {
      g = await Gemini.json({ system: p.system, schema: p.schema, temperature: p.temperature, maxTokens: p.maxTokens, turns: [{ role: 'user', text: material }] });
    } catch (e) { toast(e.message); setTimeout(judge, 4000); return; }
    scorecard(g);
  }

  function clamp4(n) { return Math.max(0, Math.min(4, Number(n) || 0)); }

  function points(g) {
    const r = state.run;
    const weight = f => f.weight || 1;
    const total = r.card.hiddenFacts.reduce((a, f) => a + weight(f), 0) || 1;
    const found = r.card.hiddenFacts.filter(f => r.revealed.has(f.id)).reduce((a, f) => a + weight(f), 0);
    const pts = {};
    pts.diagnosis = 25 * (0.5 * clamp4(g.diagnosis.score) / 4 + 0.5 * found / total);
    pts.measurement = 20 * clamp4(g.measurement.score) / 4;
    pts.fit = 20 * clamp4(g.fit.score) / 4;
    pts.nextLevel = pts.fit >= 12 ? 15 * clamp4(g.nextLevel.score) / 4 : 0;
    pts.risks = 10 * clamp4(g.risks.score) / 4;
    pts.pitch = 10 * clamp4(g.pitch.score) / 4;
    let bonus = 0;
    if (r.defence.length) {
      if (g.defenceOutcome === 'strong') bonus = 5;
      else if (g.defenceOutcome === 'weak') { pts.nextLevel /= 2; r.trust -= 15; }
      else if (g.defenceOutcome === 'retreat') pts.nextLevel = 0;
    }
    Object.keys(pts).forEach(k => { pts[k] = Math.round(pts[k]); });
    const sum = Math.min(100, Object.values(pts).reduce((a, b) => a + b, 0) + bonus);
    return { pts, bonus, total: sum };
  }

  function scorecard(g) {
    const r = state.run;
    const { pts, bonus, total } = points(g);
    state.results.push({ id: r.card.id, total });
    $('score-title').textContent = r.card.stakeholder.name + ': ' + (total >= 70 ? 'handled.' : total >= 45 ? 'survived.' : 'ouch.');
    $('score-total').textContent = total + ' / 100';
    const rows = $('score-rows');
    rows.innerHTML = '';
    DIMENSIONS.forEach(([k, label, max]) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      const name = document.createElement('div');
      name.textContent = label;
      const ev = document.createElement('div');
      ev.className = 'ev';
      ev.textContent = g[k].evidence;
      a.append(name, ev);
      if (k === 'nextLevel' && pts.fit < 12) {
        const n = document.createElement('div'); n.className = 'ev';
        n.textContent = 'Not counted: the concept has to fit the need first.';
        a.appendChild(n);
      }
      const b = document.createElement('td');
      b.className = 'pts';
      b.textContent = pts[k] + ' / ' + max;
      tr.append(a, b);
      rows.appendChild(tr);
    });
    if (r.defence.length) {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      a.textContent = 'Defence round: ' + ({ strong: 'held your ground', weak: 'wobbled', retreat: 'backed down' }[g.defenceOutcome] || 'n/a');
      const b = document.createElement('td'); b.className = 'pts'; b.textContent = bonus ? '+' + bonus : '';
      tr.append(a, b); rows.appendChild(tr);
    }
    $('score-question').textContent = g.questionNotAsked;
    const missed = $('score-missed');
    missed.innerHTML = '';
    r.card.hiddenFacts.filter(f => !r.revealed.has(f.id)).forEach(f => {
      const li = document.createElement('li'); li.textContent = f.fact; missed.appendChild(li);
    });
    if (!missed.children.length) { const li = document.createElement('li'); li.textContent = 'Nothing. You found it all.'; missed.appendChild(li); }
    $('score-verdict').textContent = g.verdict;
    trust();
    $('btn-next').textContent = state.index + 1 < state.cards.length ? 'Next request' : 'End the week';
    pane('p-score', 'Request ' + (state.index + 1) + ' · Scorecard');
  }

  $('btn-next').onclick = () => {
    state.index++;
    if (state.index < state.cards.length) startRequest(); else endRun();
  };

  function endRun() {
    const avg = Math.round(state.results.reduce((a, r) => a + r.total, 0) / state.results.length);
    const title = TITLES.find(([max]) => avg < max)[1];
    $('end-title').textContent = title;
    $('end-score').textContent = avg + ' / 100';
    $('end-note').textContent = 'Average over ' + state.results.length + ' requests.';
    show('s-end');
  }

  // test hook
  window.__intake = { state, points };
})();
