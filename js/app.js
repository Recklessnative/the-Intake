// THE INTAKE: cubicle -> inbox -> intake call -> write-up -> reaction/defence -> scorecard,
// played on a desktop with the case file, notes and a colleague open beside the call.
(function () {
  const $ = id => document.getElementById(id);
  const QUESTIONS = 8;
  // Starter cases (tier 0) are gentler: more questions, more patience.
  const STARTER = { questions: 10, patience: 5 };
  const questionsFor = card => card.difficulty === 0 ? STARTER.questions : touchpoints(card) ? TOUCH.total : QUESTIONS;
  // Beyond the starters, one budget of questions is spread over the first call, data
  // requests, the coffee machine and one callback.
  const TOUCH = { total: 10, call: 5, corridor: 2, callback: 3 };
  const touchpoints = card => card.difficulty !== 0 && card.hiddenFacts.some(f => f.foundAt.some(x => x !== 'call'));
  const DATA_KINDS = { kpi: 'KPIs and reports', org: 'Org chart and roles', process: 'Process and systems', policy: 'Policies and targets', training: 'Past training' };
  const PLACE = { call: 'on the call', frontline: 'at the coffee machine', kpi: 'in the KPIs', org: 'in the org chart', process: 'in the process docs', policy: 'in the policies', training: 'in the past training records' };
  const placeOf = where => PLACE[where.replace(/^data:/, '')] || where;
  const MIEKE_ASKS = 3;
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
  // Shown while the office PC boots.
  const CUBICLE = [
    'Monday, 08:57. The coffee machine is broken again.',
    'You press the power button. In the black screen you catch your own reflection. Tired, but employed.',
    'Your cubicle: grey fabric walls, a plant on its last legs, and a sticky note on the monitor that just says ASK WHY.',
    'Somebody needs a course. Somebody always needs a course.'
  ];

  const state = { pool: [], cards: [], index: 0, results: [], run: null, charged: false, weekId: '' };

  // ---------- screens and panes ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    if (id === 's-title') resumeButton();
    window.scrollTo(0, 0);
  }
  function step(text) { $('os-step').textContent = text; }
  function phase(name) { $('desktop').dataset.phase = name; }
  // Defence, waiting and the scorecard share one dialog window.
  function pane(id, stepText) {
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === id));
    Desktop.title('w-dialog', { 'p-defence': 'Defence round', 'p-wait': 'Please wait...', 'p-score': 'Scorecard' }[id], 'THE INTAKE');
    Desktop.layout(id === 'p-defence' ? 'defence' : 'dialog', 'w-dialog');
    if (stepText) step(stepText);
  }
  // The office clock moves as you work.
  function tick(minutes) {
    const r = state.run;
    r.clock += minutes;
    const h = Math.floor(r.clock / 60) % 24, m = r.clock % 60;
    $('os-clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function toast(msg, kind) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('info', kind === 'info');
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 6000);
  }
  function wait(line) { $('wait-line').textContent = line; pane('p-wait'); }
  function trust() { $('os-trust').textContent = 'Trust ' + state.run.trust; }
  $('btn-logoff').onclick = () => {
    $('start-menu').hidden = true;
    if (window.confirm('Log off? Your week is saved in this browser; resume it from the title screen.')) { save(); Desktop.reset(); show('s-title'); runsLeft(); }
  };

  // ---------- scenarios ----------
  async function loadCards() {
    if (state.pool.length) return;
    const index = await (await fetch('scenarios/index.json', { cache: 'no-cache' })).json();
    const cards = (await Promise.all(index.map(id => fetch('scenarios/' + id + '.json', { cache: 'no-cache' }).then(r => r.json())))).map(Cards.normalise);
    state.pool = cards;
  }
  // A week: up to RUN_LENGTH cards, mixed sectors, easiest first. Your first week opens with
  // up to two starter cases; after that the starters are retired.
  function pickWeek() {
    const shuffled = state.pool.slice().sort(() => Math.random() - 0.5);
    const starters = shuffled.filter(c => c.difficulty === 0);
    const pool = shuffled.filter(c => c.difficulty !== 0);
    const week = scoreHistory().weeks.some(w => w.requests.length) ? [] : starters.slice(0, 2);
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
    runsLeft();
  };
  $('btn-clear-key').onclick = () => { Gemini.forget(); $('in-key').value = ''; show('s-title'); runsLeft(); };

  // ---------- free runs and unlocks (only with a backend) ----------
  async function runsLeft() {
    $('runs-left').textContent = '';
    if (Gemini.key) { $('runs-left').textContent = 'Playing on your own Gemini key.'; return; }
    if (!Gemini.hasBackend) return;
    try {
      const r = await Gemini.backend('status');
      if (r.ok) $('runs-left').textContent = r.data.runsLeft === 1 ? '1 free week left.' : r.data.runsLeft + ' free weeks left.';
    } catch (e) { /* offline: say nothing */ }
  }
  function openCap() {
    const url = (window.INTAKE_CONFIG || {}).donateUrl;
    const d = $('cap-donate');
    d.textContent = '';
    if (url) {
      d.append('Want a code? ');
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Buy Yannick a coffee';
      d.append(a, ' and you get one back.');
    }
    $('in-code').value = '';
    show('s-cap');
  }
  $('btn-unlock').onclick = async () => {
    const code = $('in-code').value.trim();
    if (!code) return;
    try {
      const r = await Gemini.backend('unlock', { code });
      if (!r.ok) { toast(r.data.error || 'That code did not work.'); return; }
      show('s-title');
      runsLeft();
    } catch (e) { toast('Could not reach the game server.'); }
  };
  $('btn-cap-key').onclick = () => openSettings();
  $('btn-cap-back').onclick = () => show('s-title');

  // Start a week: own key plays freely; otherwise the backend counts the run.
  async function claimRun() {
    Gemini.runId = null;
    if (Gemini.key) return true;
    if (!Gemini.hasBackend) { openSettings(); return false; }
    let r;
    try { r = await Gemini.backend('start'); } catch (e) { toast('Could not reach the game server. You can still play on your own Gemini key.'); return false; }
    if (r.status === 402) { openCap(); return false; }
    if (!r.ok) { toast(r.data.error || 'The game server said no.'); return false; }
    Gemini.runId = r.data.runId;
    return true;
  }

  $('btn-start').onclick = async () => {
    if (readSave() && !window.confirm('Start a new week? Your saved week will be dropped.')) return;
    try { await loadCards(); } catch (e) { toast('Could not load the scenarios. The game needs to be served over http, not opened as a file.'); return; }
    if (!(await claimRun())) return;
    dropSave();
    state.cards = pickWeek();
    state.index = 0;
    state.results = [];
    state.charged = false;
    state.weekId = 'w' + Date.now();
    state.run = null;
    cubicle();
  };
  $('btn-again').onclick = () => $('btn-start').onclick();

  // The boot screen: the intro lines appear while the progress bar runs; they move on by
  // themselves, or faster with the button. Logging on opens the desktop.
  function cubicle() {
    show('s-cubicle');
    let i = 0;
    const line = $('cubicle-line');
    const say = () => {
      line.classList.remove('in');
      void line.offsetWidth;
      line.textContent = CUBICLE[i];
      line.classList.add('in');
      $('btn-sit').textContent = i === CUBICLE.length - 1 ? 'Log on' : 'Go on';
    };
    const next = () => {
      clearTimeout(cubicle.t);
      if (i < CUBICLE.length - 1) { i++; say(); cubicle.t = setTimeout(next, 4200); }
    };
    say();
    cubicle.t = setTimeout(next, 4200);
    $('btn-sit').onclick = () => {
      if (i < CUBICLE.length - 1) { next(); return; }
      clearTimeout(cubicle.t);
      Sound.chime();
      startRequest();
    };
  }

  // ---------- save and resume ----------
  // The week is saved in this browser after every step, so a closed tab or a lunch break
  // costs nothing. A week on the game server's key lives 6 hours there, so the save does too.
  const SAVE_KEY = 'intake-week';
  const SAVE_LIFE = { server: 5.5 * 3600e3, own: 7 * 24 * 3600e3 };
  function readSave() {
    let s = null;
    try { s = JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; }
    if (!s || s.v !== 1 || !s.run) return null;
    if (Date.now() - s.at > (s.runId ? SAVE_LIFE.server : SAVE_LIFE.own)) { dropSave(); return null; }
    return s;
  }
  function dropSave() { try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ } }
  function save() {
    const r = state.run;
    if (!r) return;
    r.notes = $('notes').value;
    r.draft = Object.fromEntries(new FormData($('write-form')).entries());
    const run = Object.assign({}, r, { card: r.card.id, revealed: [...r.revealed], mails: undefined, selected: undefined });
    const s = { v: 1, at: Date.now(), runId: Gemini.runId, cards: state.cards.map(c => c.id), index: state.index, results: state.results, charged: state.charged, weekId: state.weekId, run };
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* storage full or blocked: play on unsaved */ }
  }
  function saveSoon() { clearTimeout(saveSoon.t); saveSoon.t = setTimeout(save, 600); }
  $('notes').addEventListener('input', saveSoon);
  $('write-form').addEventListener('input', saveSoon);

  function resumeButton() {
    const s = readSave();
    const b = $('btn-resume');
    b.hidden = !s;
    if (s) b.textContent = 'Resume your week (request ' + (s.index + 1) + ' of ' + s.cards.length + ')';
  }
  $('btn-resume').onclick = async () => {
    const s = readSave();
    if (!s) { resumeButton(); return; }
    try { await loadCards(); } catch (e) { toast('Could not load the scenarios.'); return; }
    const cards = s.cards.map(id => state.pool.find(c => c.id === id));
    if (cards.some(c => !c)) { dropSave(); resumeButton(); toast('That week used a scenario that no longer exists. Start a new one.'); return; }
    if (s.runId) Gemini.runId = s.runId;
    else if (!(await claimRun())) return;
    state.cards = cards;
    state.index = s.index;
    state.results = s.results || [];
    state.charged = !!s.charged;
    state.weekId = s.weekId || 'w' + s.at;
    const r = Object.assign({}, s.run);
    r.card = cards[s.index];
    r.revealed = new Set(r.revealed || []);
    // Saves from before the follow-up existed.
    Object.entries({ leg: 'call', legLeft: r.questionsLeft, calledBack: false, corridor: [], corridorTurns: [], corridorLeft: TOUCH.corridor, data: [], docs: [] })
      .forEach(([k, v]) => { if (r[k] == null) r[k] = v; });
    r.mails = [];
    r.selected = null;
    state.run = r;
    Sound.chime();
    openRequest();
  };

  // ---------- one request ----------
  function startRequest() {
    const card = state.cards[state.index];
    const prev = state.run;
    state.run = {
      card, trust: 100, questionsLeft: questionsFor(card), patience: card.difficulty === 0 ? STARTER.patience : card.patience || 3,
      turns: [], transcript: [], revealed: new Set(), writeup: null, reaction: null, defence: [],
      miekeLeft: MIEKE_ASKS, clock: prev && state.index ? prev.clock + 40 : 8 * 60 + 57,
      readMail: prev && state.index ? prev.readMail : {}, mails: [], selected: null,
      phase: 'inbox', chat: [], mieke: [], notes: '', draft: {}, grade: null,
      leg: 'call', legLeft: touchpoints(card) ? TOUCH.call : questionsFor(card), calledBack: false,
      corridor: [], corridorTurns: [], corridorLeft: TOUCH.corridor, data: [], docs: []
    };
    state.run.mieke.push({ who: 'them', text: 'Morning. Shout if you want a second pair of eyes.' });
    openRequest();
    // Your very first request: the Center of Excellence folder opens on the flowchart.
    if (!state.index && !scoreHistory().weeks.some(w => w.requests.length)) openApp('w-coe');
    if (state.index) Sound.ding();
    save();
  }

  // Draw the desk for the current request, at whatever step it is (also after a resume).
  function openRequest() {
    const r = state.run;
    const card = r.card;
    show('s-desk');
    trust();
    tick(0);
    $('notes').value = r.notes || '';
    $('chat-log').innerHTML = '';
    r.chat.forEach(m => addMsg(m.who, m.text, true));
    $('w-call').classList.remove('ended');
    $('write-form').reset();
    Object.entries(r.draft || {}).forEach(([k, v]) => { const el = $('write-form').elements[k]; if (el) el.value = v; });
    $('mieke-log').innerHTML = '';
    r.mieke.forEach(m => miekeSays(m.text, m.who, true));
    miekeLeft();
    briefing(card.briefing);
    Desktop.reset();
    mailbox();
    contacts();
    selectMail(state.run.mails.find(m => m.current));
    phase('inbox');
    Desktop.layout('inbox', 'w-inbox');
    Desktop.open('w-mieke', Desktop.floating['w-mieke']);
    Desktop.minimise('w-mieke');
    Desktop.focus('w-inbox');
    step('Request ' + (state.index + 1) + ' of ' + state.cards.length);
    if (r.phase !== 'inbox') callWindow();
    renderLeads();
    if (r.phase === 'call') { phase('call'); Desktop.layout('call', 'w-call'); }
    if (r.phase === 'investigate') investigateDesk();
    if (r.phase === 'write' || r.phase === 'score') writeDesk();
    if (r.phase === 'score' && r.grade) scorecard(r.grade, true);
  }

  // ---------- the mailbox ----------
  // Office mail that is not your request. Read it or don't; nothing here is graded.
  const FILLER = [
    { from: 'Facilities', subject: 'Coffee machine, 2nd floor', ago: 51,
      body: 'The coffee machine on the 2nd floor is out of order. A technician will come "this week".\n\nPlease stop kicking it. It does not help and it has been noted.' },
    { from: 'HR Communications', subject: 'REMINDER: complete your mandatory e-learning on mandatory e-learnings', ago: 44,
      body: 'Dear colleague,\n\nOnly 61% of staff have completed "Getting the Most out of Mandatory E-learning" (45 min). Completion is mandatory before Friday.\n\nThis is an automated reminder. Replies are not read. Nor, statistically, is this.' },
    { from: 'IT Service Desk', subject: 'Your mailbox is almost full (98%)', ago: 38,
      body: 'Your mailbox has reached 98% of its limit. Please delete or archive items.\n\nTip: the attachment "Learning Styles Revisited FINAL v7.ppt" (41 MB) is a good place to start.' },
    { from: 'Office of the CEO', subject: 'FW: FW: RE: our learning culture', ago: 27,
      body: 'Team,\n\nRead an article on the plane. We should be more like Netflix. Thoughts?\n\nSent from my BlackBerry' },
    { from: 'Center of Excellence', subject: 'New here? Start with the folder on your desktop', ago: 60,
      body: 'Welcome to the learning team!\n\nBefore your first intake, open the "Center of Excellence" folder on your desktop. It has our intake flowchart, the quality standard every intake is reviewed against, a list of good intake questions and the measurement ladder.\n\nPlease ignore the learning styles policy. We are working on it.\n\nThe CoE team' },
    { from: 'Mieke', subject: 'cake?', ago: 16,
      body: 'There is cake in the kitchen. Nobody knows whose birthday it is. Don\'t ask, just eat.\n\nAlso: if a request lands on your desk and you want a second opinion, I\'m two cubicles over.\n\nM.' },
    { from: 'Gamified Microlearning Solutions', subject: 'Re: quick question!!', ago: 9,
      body: 'Hi there!\n\nJust circling back on my circle-back. Our AI-powered, gamified, bite-sized metaverse academy boosts engagement by up to 400%*.\n\nDo you have 15 minutes this week? Or 14?\n\n*in a survey of our own staff' }
  ];
  function hhmm(min) { return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

  function mailbox() {
    const r = state.run;
    const mails = FILLER.map(f => Object.assign({ read: !!r.readMail[f.subject], at: r.clock - f.ago - 40 * state.index }, f));
    state.cards.slice(0, state.index).forEach((c, i) => mails.push({
      from: c.stakeholder.name, subject: c.subject, request: c, read: true, done: true, at: 8 * 60 + 55 + 40 * i,
      body: c.surfaceAsk + '\n\n(Handled. Scored ' + (state.results[i] || {}).total + ' / 100.)'
    }));
    mails.push({ from: r.card.stakeholder.name, subject: r.card.subject || 'A learning request', request: r.card, current: true, read: r.readMail.current, at: r.clock - 2, body: r.card.surfaceAsk });
    mails.sort((a, b) => b.at - a.at);
    r.mails = mails;
    renderMail();
  }
  function renderMail() {
    const r = state.run;
    const rows = $('mail-rows');
    rows.innerHTML = '';
    r.mails.forEach(m => {
      const tr = document.createElement('tr');
      tr.className = (m.read ? '' : 'unread') + (m === r.selected ? ' sel' : '');
      tr.tabIndex = 0;
      const cells = [m.current ? '❗' : '', m.request && !m.done ? '📎' : '', (m.read ? '📭 ' : '📩 ') + m.from, m.subject, (m.done ? '✓ ' : '') + hhmm(m.at)];
      cells.forEach((t, i) => { const td = document.createElement('td'); td.textContent = t; if (i < 2) td.className = 'ic'; if (i === 4) td.className = 'when'; tr.appendChild(td); });
      tr.onclick = () => selectMail(m);
      tr.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectMail(m); } };
      rows.appendChild(tr);
    });
    const unread = r.mails.filter(m => !m.read).length;
    $('mail-unread').textContent = unread ? '(' + unread + ')' : '';
    Desktop.title('w-inbox', 'Inbox' + (unread ? ' (' + unread + ' unread)' : '') + ' - Doors Mail', 'Inbox');
  }
  function selectMail(m) {
    const r = state.run;
    r.selected = m;
    if (!m.read) { m.read = true; if (m.current) r.readMail.current = true; else if (!m.request) r.readMail[m.subject] = true; }
    const person = m.request ? m.request.stakeholder : null;
    $('mail-from').textContent = m.from;
    $('mail-role').textContent = person ? '(' + person.role + (person.org ? ', ' + person.org.split(',')[0] : '') + ')' : '';
    $('mail-subject').textContent = m.subject;
    $('mail-body').textContent = m.body;
    $('mail-attach').hidden = !m.current;
    $('mail-actions').hidden = !m.current;
    renderMail();
  }
  function contacts() {
    const ul = $('mail-contacts');
    ul.innerHTML = '';
    [['☕ Mieke', () => Desktop.open('w-mieke', Desktop.floating['w-mieke'])], ['👤 ' + state.run.card.stakeholder.name, () => selectMail(state.run.mails.find(m => m.current))]]
      .forEach(([t, fn]) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = fn; li.appendChild(b); ul.appendChild(li); });
  }
  const MAIL_JOKES = {
    new: 'You start typing "Dear all", then think better of it.',
    replyall: 'Reply All. To 400 people. Bold. No.',
    forward: 'Forwarding it to someone else is a strategy, but not a learning strategy.',
    delete: 'Deleting it won\'t make it go away. It will come back with the CEO in CC.',
    sendrecv: 'No new messages. Thankfully.'
  };
  document.querySelectorAll('[data-mail]').forEach(b => {
    b.onclick = () => {
      const m = state.run.selected;
      if (b.dataset.mail === 'reply' && m && m.current) { $('btn-call').onclick(); return; }
      if (b.dataset.mail === 'reply') { toast('Nobody here reads replies. Pick up the phone for the ones that matter.', 'info'); return; }
      if (b.dataset.mail === 'delete' && m && !m.request) { toast('Archived. It is still there, but in a folder you will never open.', 'info'); return; }
      toast(MAIL_JOKES[b.dataset.mail], 'info');
    };
  });
  $('mail-attach').onclick = () => Desktop.open('w-case');

  // Pre-call context a well-prepared professional would look up first (never the diagnosis).
  function briefing(b) {
    const box = $('briefing');
    const ul = $('briefing-points');
    ul.innerHTML = '';
    box.querySelectorAll('p').forEach(p => p.remove());
    if (!b) { $('briefing-head').textContent = 'No case file for this one. Ask.'; return; }
    $('briefing-head').textContent = b.headline;
    if (b.text) { const p = document.createElement('p'); p.textContent = b.text; box.appendChild(p); }
    b.points.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  }

  $('btn-call').onclick = () => {
    if (!state.run.readMail.current) selectMail(state.run.mails.find(m => m.current));
    const r = state.run;
    if (r.phase === 'inbox') {
      r.phase = 'call';
      $('chat-log').innerHTML = '';
      r.chat = [];
      addMsg('sys', 'You call ' + r.card.stakeholder.name + '. They pick up on the fourth ring.');
      addMsg('them', r.card.surfaceAsk);
      tick(3);
      save();
    }
    callWindow();
    phase('call');
    Desktop.layout('call', 'w-call');
    $('chat-input').focus();
  };
  function callWindow() {
    const r = state.run;
    $('chat-who').textContent = r.card.stakeholder.name;
    $('chat-role').textContent = r.card.stakeholder.role;
    meters();
    $('chat-input').value = '';
    Desktop.title('w-call', 'On a call with ' + r.card.stakeholder.name, 'Call');
  }

  function addMsg(who, text, replay) {
    if (!replay) state.run.chat.push({ who, text });
    bubble($('chat-log'), who, text, state.run.card.stakeholder.name);
  }
  // One chat bubble; what the other person says gets a pin for the notes.
  function bubble(log, who, text, name) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    if (who === 'them') {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pin';
      pin.title = 'Pin this to my notes';
      pin.setAttribute('aria-label', 'Pin this to my notes');
      pin.textContent = '📌';
      pin.onclick = () => pinNote(text, pin, name);
      if ((state.run.pins || []).includes(text)) pin.classList.add('done');
      d.appendChild(pin);
    }
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function pinNote(text, btn, name) {
    const r = state.run;
    r.pins = r.pins || [];
    if (!r.pins.includes(text)) r.pins.push(text);
    const n = $('notes');
    const who = name.split(' ')[0];
    n.value = (n.value.trim() ? n.value.replace(/\s+$/, '') + '\n' : '') + '- ' + who + ': "' + text + '"\n';
    btn.classList.add('done');
    const w = $('w-notes');
    if (!w.classList.contains('open') || w.classList.contains('minimised')) Desktop.open('w-notes');
  }
  function meters() {
    const r = state.run;
    $('q-left').textContent = touchpoints(r.card) && r.phase === 'call' ? Math.min(r.legLeft, r.questionsLeft) + ' on this call (' + r.questionsLeft + ' in total)' : r.questionsLeft;
    $('patience').textContent = '●'.repeat(Math.max(0, r.patience)) || '0';
    trust();
  }

  $('chat-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run;
    const q = $('chat-input').value.trim();
    if (!q || r.phase !== 'call' || r.questionsLeft <= 0 || r.legLeft <= 0 || r.patience <= 0) return;
    const btn = ev.submitter || $('chat-form').querySelector('button[type=submit]');
    btn.disabled = true;
    addMsg('you', q);
    $('chat-input').value = '';
    r.turns.push({ role: 'user', text: 'The learning professional asks: """' + q + '"""' });
    // One aside per call, on the second answer, so the stakeholder sounds human without rambling.
    const flavours = r.card.flavourLines || [];
    const flavour = r.transcript.length === 1 && flavours.length ? flavours[Math.floor(Math.random() * flavours.length)] : '';
    const p = Prompts.stakeholder(r.card, flavour, r.leg === 'callback');
    try {
      const out = await Gemini.json({ system: p.system, turns: r.turns, schema: p.schema });
      r.turns.push({ role: 'model', text: JSON.stringify(out) });
      addMsg('them', out.reply);
      const facts = (out.revealed || []).filter(id => r.card.hiddenFacts.some(f => f.id === id && f.foundAt.includes('call')));
      facts.forEach(id => r.revealed.add(id));
      r.transcript.push({ q, a: out.reply, quality: out.quality, facts, src: r.leg });
      r.questionsLeft--;
      r.legLeft--;
      tick(4);
      if (out.quality === 'weak') { r.patience--; r.trust -= 10; }
      meters();
      save();
      const more = touchpoints(r.card) && r.questionsLeft > 0;
      if (r.patience <= 0) {
        addMsg('sys', r.card.stakeholder.name + ' has another meeting. Suddenly. The call is over.');
        setTimeout(afterCall, 1800);
      } else if (r.questionsLeft <= 0) {
        addMsg('sys', 'That was your last question. Time to write it up.');
        setTimeout(afterCall, 1800);
      } else if (r.legLeft <= 0) {
        addMsg('sys', r.leg === 'callback' ? 'That is all the time they had for the callback.' : 'That is the time they had. You can still dig: ask for data, catch someone at the coffee machine' + (more && !r.calledBack ? ', or call back later.' : '.'));
        setTimeout(afterCall, 1800);
      }
    } catch (e) {
      r.turns.pop();
      toast(e.message);
    } finally {
      btn.disabled = false;
    }
  };
  $('btn-hangup').onclick = () => afterCall();
  // Enter sends, Shift+Enter makes a new line.
  $('chat-input').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $('chat-form').requestSubmit(); }
  });

  // The call stays open (read-only) beside the write-up, with the notes and case file.
  // After a call: follow-up if this case has more to find and questions are left, else the board.
  function afterCall() {
    const r = state.run;
    if (r.phase !== 'call') return;
    if (touchpoints(r.card) && r.questionsLeft > 0) toInvestigate(); else toWriteup();
  }
  function toWriteup() {
    const r = state.run;
    if (r.phase !== 'call' && r.phase !== 'investigate') return;
    if (!r.transcript.length) addMsg('sys', 'You hung up without asking anything. Bold.');
    r.phase = 'write';
    r.board = newBoard(r);
    tick(10);
    writeDesk();
    save();
  }
  function writeDesk() {
    const r = state.run;
    $('w-call').classList.add('ended');
    Desktop.title('w-call', 'Call with ' + r.card.stakeholder.name + ' (ended)', 'Call');
    phase('write');
    if (!r.board) r.board = newBoard(r);
    renderBoard();
    Desktop.layout('write', 'w-write');
  }

  // ---------- follow-up: data requests, the coffee machine, one callback ----------
  function toInvestigate() {
    const r = state.run;
    if (!r.transcript.length) addMsg('sys', 'You hung up without asking anything. Bold.');
    r.phase = 'investigate';
    tick(5);
    investigateDesk();
    save();
  }
  function investigateDesk() {
    const r = state.run;
    $('w-call').classList.add('ended');
    Desktop.title('w-call', 'Call with ' + r.card.stakeholder.name + ' (ended)', 'Call');
    phase('investigate');
    renderLeads();
    Desktop.layout('investigate', 'w-leads');
  }
  function renderLeads() {
    const r = state.run, card = r.card, on = r.phase === 'investigate', fl = card.frontline;
    const n = r.questionsLeft;
    $('leads-left').textContent = n + (n === 1 ? ' question' : ' questions') + ' left.';
    document.querySelectorAll('#data-buttons button').forEach(b => {
      const asked = r.data.includes(b.dataset.kind);
      b.classList.toggle('asked', asked);
      b.disabled = !on || asked || n <= 0;
    });
    const docs = $('data-docs');
    docs.innerHTML = '';
    r.docs.forEach(d => {
      const div = document.createElement('div');
      div.className = 'data-doc' + (d.text ? '' : ' empty');
      const h = document.createElement('h4');
      h.textContent = d.source;
      div.append(h, document.createTextNode(d.text || 'Nothing on file. Someone promises to "look into it".'));
      if (d.text) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = 'pin'; pin.textContent = '📌';
        pin.title = 'Pin this to my notes'; pin.setAttribute('aria-label', 'Pin this to my notes');
        if ((r.pins || []).includes(d.text)) pin.classList.add('done');
        pin.onclick = () => pinNote(d.text, pin, d.source);
        div.appendChild(pin);
      }
      docs.appendChild(div);
    });
    $('corridor-who').textContent = fl ? fl.name + ', ' + fl.role.charAt(0).toLowerCase() + fl.role.slice(1) + ', is waiting for the one coffee machine that works.' : 'Nobody around.';
    const log = $('corridor-log');
    log.innerHTML = '';
    r.corridor.forEach(m => bubble(log, m.who, m.text, fl ? fl.name : ''));
    const canAsk = !!(on && fl && r.corridorLeft > 0 && n > 0);
    $('corridor-input').disabled = !canAsk;
    $('corridor-form').querySelector('button[type=submit]').disabled = !canAsk;
    $('corridor-left').textContent = !fl ? '' : r.corridorLeft ? 'They have time for ' + r.corridorLeft + (r.corridorLeft === 1 ? ' question.' : ' questions.') : 'Their coffee is ready. They are gone.';
    $('btn-callback').textContent = '☎ Call ' + card.stakeholder.name.split(' ')[0] + ' back';
    const found = r.data.length || r.corridor.length;
    $('btn-callback').disabled = !on || r.calledBack || !found || n <= 0;
    $('callback-note').textContent = r.calledBack ? 'You already called back once today.'
      : found ? 'Bring what you found. Up to ' + Math.min(TOUCH.callback, n) + ' questions, and they start with fresh patience.'
      : 'Find something first, in the data or at the coffee machine. Then you have a reason to call back.';
    Desktop.title('w-leads', 'Follow-up · ' + n + ' left', 'Follow-up');
    meters();
  }

  document.querySelectorAll('#data-buttons button').forEach(b => { b.onclick = () => requestData(b.dataset.kind); });
  // A data request is answered from the card itself, no Gemini: every fact filed under that kind.
  function requestData(kind) {
    const r = state.run;
    if (r.phase !== 'investigate' || r.data.includes(kind) || r.questionsLeft <= 0) return;
    r.data.push(kind);
    r.questionsLeft--;
    const facts = r.card.hiddenFacts.filter(f => f.foundAt.includes('data:' + kind) && f.dataDoc);
    if (!facts.length) r.docs.push({ kind, source: DATA_KINDS[kind], text: '' });
    facts.forEach(f => {
      r.docs.push({ kind, source: f.dataSource || DATA_KINDS[kind], text: f.dataDoc });
      r.revealed.add(f.id);
      r.transcript.push({ q: 'Data request: ' + DATA_KINDS[kind], a: (f.dataSource ? f.dataSource + ': ' : '') + f.dataDoc, quality: 'good', facts: [f.id], src: 'data' });
    });
    tick(15);
    renderLeads();
    save();
  }

  $('corridor-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run, fl = r.card.frontline;
    const q = $('corridor-input').value.trim();
    if (!q || !fl || r.phase !== 'investigate' || r.corridorLeft <= 0 || r.questionsLeft <= 0) return;
    $('corridor-form').querySelector('button[type=submit]').disabled = true;
    r.corridor.push({ who: 'you', text: q });
    bubble($('corridor-log'), 'you', q, fl.name);
    $('corridor-input').value = '';
    r.corridorTurns.push({ role: 'user', text: 'The learning professional asks: """' + q + '"""' });
    const p = Prompts.frontline(r.card);
    try {
      const out = await Gemini.json({ system: p.system, turns: r.corridorTurns, schema: p.schema });
      r.corridorTurns.push({ role: 'model', text: JSON.stringify(out) });
      r.corridor.push({ who: 'them', text: out.reply });
      const facts = (out.revealed || []).filter(id => r.card.hiddenFacts.some(f => f.id === id && f.foundAt.includes('frontline')));
      facts.forEach(id => r.revealed.add(id));
      r.transcript.push({ q, a: out.reply, quality: out.quality, facts, src: 'frontline' });
      r.corridorLeft--;
      r.questionsLeft--;
      tick(5);
      save();
    } catch (e) {
      r.corridorTurns.pop();
      r.corridor.pop();
      $('corridor-input').value = q;
      toast(e.message);
    }
    renderLeads();
  };
  $('corridor-input').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $('corridor-form').requestSubmit(); }
  });

  $('btn-callback').onclick = () => {
    const r = state.run;
    if (r.phase !== 'investigate' || r.calledBack || r.questionsLeft <= 0) return;
    r.calledBack = true;
    r.leg = 'callback';
    r.legLeft = TOUCH.callback;
    r.patience = r.card.patience || 3;
    r.phase = 'call';
    $('w-call').classList.remove('ended');
    addMsg('sys', 'You call ' + r.card.stakeholder.name + ' back. "Back already? Go on, I have a few minutes."');
    tick(30);
    callWindow();
    renderLeads();
    phase('call');
    Desktop.layout('call', 'w-call');
    $('chat-input').focus();
    save();
  };
  $('btn-leads-done').onclick = () => toWriteup();

  // Everything the player found, labelled by where it came from (for Mieke and the examiner).
  const SRC = { call: 'Call', callback: 'Callback', frontline: 'Coffee machine', data: 'Data' };
  function transcriptText() {
    const fl = state.run.card.frontline;
    return state.run.transcript.map((t, i) => t.src === 'data'
      ? `D${i + 1} [Data] ${t.q}\n${t.a}`
      : `Q${i + 1} [${SRC[t.src] || 'Call'}${t.src === 'frontline' && fl ? ', to ' + fl.name + ', ' + fl.role : ''}]: """${t.q}"""\nA${i + 1}: ${t.a}`).join('\n');
  }

  // ---------- Mieke, the colleague two cubicles over ----------
  function miekeSays(text, who, replay) {
    if (!replay) state.run.mieke.push({ who: who || 'them', text });
    const d = document.createElement('div');
    d.className = 'msg ' + (who || 'them');
    d.textContent = text;
    $('mieke-log').appendChild(d);
    $('mieke-log').scrollTop = $('mieke-log').scrollHeight;
  }
  function miekeLeft() {
    const n = state.run.miekeLeft;
    $('mieke-left').textContent = n ? 'She has time for ' + n + (n === 1 ? ' more question' : ' more questions') + ' on this request.' : 'She is back on her own deadline.';
    document.querySelectorAll('#w-mieke .quick button, #mieke-form button').forEach(b => { b.disabled = !n; });
  }
  async function askMieke(question) {
    const r = state.run;
    question = (question || '').trim();
    if (!question || r.miekeLeft <= 0) return;
    r.miekeLeft--;
    miekeLeft();
    miekeSays(question, 'you');
    const ph = $('desktop').dataset.phase;
    const draft = ph !== 'write' ? null : r.board && r.board.mode === 'board' ? boardWriteup() : Object.fromEntries(new FormData($('write-form')).entries());
    const material = [
      'Where they are: ' + ({ inbox: 'they have read the request and not called yet', call: r.leg === 'callback' ? 'they called the stakeholder back with what they found' : 'they are in the middle of the intake call', investigate: 'the first call is over; they can request data, chat with ' + (r.card.frontline ? r.card.frontline.name + ' (' + r.card.frontline.role + ')' : 'someone') + ' at the coffee machine, or call back once', write: 'the call is over and they are writing the concept' }[ph] || ph),
      'Questions left for this request: ' + r.questionsLeft,
      '',
      'The request: "' + r.card.surfaceAsk + '"',
      'Case file: ' + (r.card.briefing ? r.card.briefing.points.join(' | ') : 'none'),
      '',
      'What they found so far (call, data, coffee machine):',
      transcriptText() || '(no questions yet)',
      '',
      'Their notes: """' + ($('notes').value.trim() || '(empty)') + '"""',
      draft ? '\nTheir draft write-up:\n"""\n' + writeupText(draft) + '\n"""' : '',
      '',
      'Their question to you: """' + question + '"""'
    ].join('\n');
    const p = Prompts.colleague(r.card);
    document.querySelectorAll('#w-mieke button:not(.tb)').forEach(b => { b.disabled = true; });
    try {
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: material }] });
      miekeSays(out.reply);
      tick(2);
      save();
    } catch (e) {
      r.miekeLeft++;
      toast(e.message);
    } finally {
      miekeLeft();
    }
  }
  document.querySelectorAll('#w-mieke .quick button').forEach(b => { b.onclick = () => askMieke(b.dataset.ask); });
  $('mieke-form').onsubmit = ev => { ev.preventDefault(); const v = $('mieke-input').value; $('mieke-input').value = ''; askMieke(v); };
  document.querySelectorAll('.btn-mieke').forEach(b => { b.onclick = () => Desktop.open('w-mieke', Desktop.floating['w-mieke']); });

  // ---------- the case board ----------
  // Five short steps built on what the stakeholder actually said. Each step locks before the
  // next opens; some get a line of feedback from Mieke right away. Memo mode keeps the long form.
  const STEPS = ['diagnose', 'lever', 'measure', 'concept', 'risks', 'memo'];
  const STEP_NAMES = { diagnose: 'Diagnose', lever: 'Lever', measure: 'Measure', concept: 'Concept', risks: 'Risks', memo: 'Send' };
  const TAG_NAMES = { skill: 'skill or knowledge', process: 'process or workflow', system: 'tools and systems', incentive: 'incentives and targets', expectations: 'expectations and culture', environment: 'the work environment' };
  const LEVER_NAMES = { yes: 'Learning fixes this', partly: 'Partly', no: 'Not a learning problem' };
  const RUNGS = [['baseline', 'Baseline'], ['behaviour', 'Behaviour'], ['metric', 'Business metric'], ['collect', 'Collection']];
  const DECOYS = ['Facilities management', 'Marketing', 'Procurement', 'The sustainability team', 'External auditors', 'Internal communications', 'The canteen committee'];
  const board = () => state.run.board;
  const listText = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);

  function newBoard(r) {
    const deps = (r.card.dependencies || []).map(d => d.who).filter(Boolean);
    const decoys = DECOYS.filter(d => !deps.some(x => x.toLowerCase().includes(d.split(' ')[0].toLowerCase()))).sort(() => Math.random() - 0.5).slice(0, 3);
    const tiles = deps.map(who => ({ who, real: true })).concat(decoys.map(who => ({ who, real: false }))).sort(() => Math.random() - 0.5);
    return {
      mode: 'board', step: 'diagnose', locked: false, feedback: '',
      evidence: [], tags: [], problem: '', lever: '', leverWhy: '',
      rungs: { baseline: { text: '', ev: '' }, behaviour: { text: '', ev: '' }, metric: { text: '', ev: '' }, collect: { text: '', ev: '' } },
      idea: '', formats: [], why: '', not: '', tiles, risks: [], flag: ''
    };
  }

  // What the player can cite: the opening request and every answer they got.
  function evidencePool() {
    const r = state.run;
    const fl = r.card.frontline;
    const label = t => t.src === 'data' ? '📊 ' : t.src === 'frontline' ? '☕ ' + (fl ? fl.name.split(' ')[0] + ': ' : '') : t.src === 'callback' ? '☎ ' : '';
    return [{ id: 'ask', text: r.card.surfaceAsk, facts: [] }].concat(r.transcript.map((t, i) => ({ id: 'a' + i, text: t.a, label: label(t), facts: t.facts || [], pinned: (r.pins || []).some(p => t.a.endsWith(p)) })));
  }
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const short = (t, n) => t.length > n ? t.slice(0, n - 1).trim() + '…' : t;

  function renderBoard() {
    const r = state.run, b = board();
    $('board').hidden = b.mode !== 'board';
    $('write-form').hidden = b.mode === 'board';
    Desktop.title('w-write', b.mode === 'board' ? 'Case board - ' + r.card.stakeholder.name : 'Concept - WordPad', b.mode === 'board' ? 'Case board' : 'Concept');
    const at = STEPS.indexOf(b.step);
    document.querySelectorAll('#board-steps li').forEach((li, i) => { li.className = i < at || (i === at && b.locked) ? 'done' : i === at ? 'now' : ''; });
    document.querySelectorAll('.bstep').forEach(s => { s.hidden = s.dataset.step !== b.step; s.classList.toggle('locked', b.locked); s.querySelectorAll('input, select, button').forEach(el => { el.disabled = b.locked; }); });
    // What you already locked, as one-liners above the current step.
    const sofar = $('board-sofar');
    sofar.innerHTML = '';
    const lines = [];
    if (at > 0 || (b.step === 'diagnose' && b.locked)) lines.push(['Need', b.problem + (b.tags.length ? ' (' + b.tags.map(t => TAG_NAMES[t]).join(', ') + ')' : '')]);
    if (at > 1 || (b.step === 'lever' && b.locked)) lines.push(['Lever', LEVER_NAMES[b.lever] + ': ' + b.leverWhy]);
    if (at > 2 || (b.step === 'measure' && b.locked)) lines.push(['Measure', RUNGS.map(([k]) => b.rungs[k].text).filter(Boolean).join(' / ')]);
    if (at > 3 || (b.step === 'concept' && b.locked)) lines.push(['Concept', b.idea]);
    if (b.step !== 'memo') lines.forEach(([k, v]) => { const p = document.createElement('p'); const s = document.createElement('b'); s.textContent = k + ': '; p.append(s, v); sofar.appendChild(p); });
    // Evidence for the diagnosis.
    const pool = evidencePool();
    const ev = $('ev-diagnose');
    ev.innerHTML = '';
    pool.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ev-card';
      btn.textContent = (item.pinned ? '📌 ' : '') + (item.label || '') + '"' + short(item.text, 150) + '"';
      btn.title = item.text;
      btn.setAttribute('aria-pressed', b.evidence.includes(item.id));
      btn.disabled = b.locked && b.step === 'diagnose';
      btn.onclick = () => { toggle(b.evidence, item.id, 3); renderBoard(); saveSoon(); };
      ev.appendChild(btn);
    });
    document.querySelectorAll('#tags [data-tag]').forEach(btn => { btn.setAttribute('aria-pressed', b.tags.includes(btn.dataset.tag)); });
    document.querySelectorAll('#lever [data-lever]').forEach(btn => { btn.setAttribute('aria-pressed', b.lever === btn.dataset.lever); });
    document.querySelectorAll('#formats [data-format]').forEach(btn => { btn.setAttribute('aria-pressed', b.formats.includes(btn.dataset.format)); });
    $('b-problem').value = b.problem;
    $('b-lever-why').value = b.leverWhy;
    $('b-idea').value = b.idea;
    $('b-why').value = b.why;
    $('b-not').value = b.not;
    $('b-flag').value = b.flag;
    $('b-why-label').textContent = b.tags.length ? 'Why it fixes ' + listText(b.tags.map(t => TAG_NAMES[t])) : 'Why it fixes the cause';
    RUNGS.forEach(([k]) => {
      document.querySelector(`[data-rung="${k}"]`).value = b.rungs[k].text;
      const sel = document.querySelector(`[data-rung-ev="${k}"]`);
      sel.innerHTML = '';
      [{ id: '', text: 'No evidence attached' }].concat(pool).forEach(item => {
        const o = document.createElement('option');
        o.value = item.id;
        o.textContent = item.id ? '📎 "' + short(item.text, 70) + '"' : item.text;
        sel.appendChild(o);
      });
      sel.value = b.rungs[k].ev;
    });
    // Risk tiles, numbered in the order you picked them.
    const tiles = $('tiles');
    tiles.innerHTML = '';
    b.tiles.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const n = b.risks.findIndex(x => x.who === t.who);
      btn.textContent = (n >= 0 ? (n + 1) + '. ' : '') + t.who;
      btn.setAttribute('aria-pressed', n >= 0);
      btn.disabled = b.locked && b.step === 'risks';
      btn.onclick = () => {
        if (n >= 0) b.risks.splice(n, 1); else if (b.risks.length < 2) b.risks.push({ who: t.who, mitigation: '' });
        renderBoard(); saveSoon();
      };
      tiles.appendChild(btn);
    });
    const mit = $('mitigations');
    mit.innerHTML = '';
    b.risks.forEach((x, i) => {
      const l = document.createElement('label');
      l.textContent = (i + 1) + '. ' + x.who + ': how you handle it';
      const inp = document.createElement('input');
      inp.maxLength = 180;
      inp.value = x.mitigation;
      inp.disabled = b.locked && b.step === 'risks';
      inp.oninput = () => { x.mitigation = inp.value; saveSoon(); };
      l.appendChild(inp);
      mit.appendChild(l);
    });
    if (b.step === 'memo') memo(boardWriteup());
    const fb = $('board-feedback');
    fb.hidden = !b.feedback;
    fb.textContent = b.feedback;
    const next = STEPS[at + 1];
    $('board-next').textContent = b.step === 'memo' ? 'Send it to them' : b.locked ? 'Next: ' + STEP_NAMES[next] : 'Lock it in';
    $('board-next').disabled = false;
  }
  // The one-pager the stakeholder will read, assembled from the steps.
  function memo(w) {
    const box = $('memo');
    box.innerHTML = '';
    const r = state.run;
    const head = document.createElement('p');
    head.className = 'memo-head';
    head.textContent = 'To: ' + r.card.stakeholder.name + ' · From: Learning team · Re: ' + (r.card.subject || 'your request');
    box.appendChild(head);
    const section = (title, lines) => {
      const h = document.createElement('h4'); h.textContent = title; box.appendChild(h);
      const ul = document.createElement('ul');
      lines.filter(([, v]) => v).forEach(([k, v]) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = k + ' '; li.append(b, v); ul.appendChild(li); });
      box.appendChild(ul);
    };
    section('The need', [['The real problem:', w.problem], ['Causes:', w.tags.map(t => TAG_NAMES[t]).join(', ')], ['Learning as the lever:', (LEVER_NAMES[w.lever] || '') + '. ' + w.leverWhy], ['You told me:', w.evidence.map(e => '"' + short(e, 120) + '"').join(' ')]]);
    section('How we will know', w.rungs.map(x => [x.label + ':', x.text]));
    section('The concept', [['Big idea:', w.idea], ['Format:', w.formats.join(', ')], ['Why it works:', w.why], ['It is not:', w.not]]);
    section('What could block it', w.risks.map((x, i) => [(i + 1) + '. ' + x.who + ':', x.mitigation]));
  }
  function toggle(list, v, max) { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else if (list.length < max) list.push(v); }

  // Inputs write straight into the board state, so a reload keeps them.
  const bind = (id, key) => { $(id).addEventListener('input', () => { board()[key] = $(id).value; saveSoon(); }); };
  bind('b-problem', 'problem'); bind('b-lever-why', 'leverWhy'); bind('b-idea', 'idea'); bind('b-why', 'why'); bind('b-not', 'not'); bind('b-flag', 'flag');
  RUNGS.forEach(([k]) => {
    document.querySelector(`[data-rung="${k}"]`).addEventListener('input', e => { board().rungs[k].text = e.target.value; saveSoon(); });
    document.querySelector(`[data-rung-ev="${k}"]`).addEventListener('change', e => { board().rungs[k].ev = e.target.value; saveSoon(); });
  });
  document.querySelectorAll('#tags [data-tag]').forEach(btn => { btn.onclick = () => { toggle(board().tags, btn.dataset.tag, 3); renderBoard(); saveSoon(); }; });
  document.querySelectorAll('#lever [data-lever]').forEach(btn => { btn.onclick = () => { board().lever = btn.dataset.lever; renderBoard(); saveSoon(); }; });
  document.querySelectorAll('#formats [data-format]').forEach(btn => { btn.onclick = () => { toggle(board().formats, btn.dataset.format, 3); renderBoard(); saveSoon(); }; });
  $('btn-memo-mode').onclick = () => { board().mode = 'memo'; renderBoard(); save(); };
  $('btn-board-mode').onclick = () => { board().mode = 'board'; renderBoard(); save(); };

  function missing(step) {
    const b = board();
    if (step === 'diagnose') {
      if (!b.evidence.length) return 'Tap at least one thing they said that backs up your diagnosis.';
      if (!b.tags.length) return 'Pick at least one kind of cause.';
      if (b.problem.trim().length < 15) return 'Finish the sentence: the real problem is…';
    }
    if (step === 'lever' && (!b.lever || b.leverWhy.trim().length < 5)) return 'Choose an answer and say why in one line.';
    if (step === 'measure' && RUNGS.filter(([k]) => b.rungs[k].text.trim()).length < 2) return 'Fill in at least two rungs of the ladder.';
    if (step === 'concept' && (b.idea.trim().length < 15 || !b.formats.length)) return 'Write the big idea and pick at least one format.';
    if (step === 'risks' && (b.risks.length < 2 || b.risks.some(x => x.mitigation.trim().length < 5))) return 'Pick two blockers and say how you handle each.';
    return '';
  }

  // Mieke's immediate feedback, only where the card gives a clear answer. Never a score.
  function feedbackFor(step) {
    const r = state.run, b = board(), gold = r.card.rootCauseTypes || [];
    if (step === 'diagnose') {
      const hit = b.tags.filter(t => gold.includes(t)), miss = gold.filter(t => !b.tags.includes(t)), extra = b.tags.filter(t => !gold.includes(t));
      const parts = [];
      if (hit.length) parts.push('Yes, ' + listText(hit.map(t => TAG_NAMES[t])) + ' is in play.');
      if (miss.length) parts.push('I would also look at ' + listText(miss.map(t => TAG_NAMES[t])) + '.');
      if (extra.length) parts.push(listText(extra.map(t => TAG_NAMES[t])) + (extra.length > 1 ? ' don\'t' : ' doesn\'t') + ' look like the driver here.');
      const lost = r.card.hiddenFacts.filter(f => f.critical && !r.revealed.has(f.id)).length;
      if (lost) parts.push(lost === 1 ? 'And one important thing never came up in your call.' : 'And ' + lost + ' important things never came up in your call.');
      return 'Mieke: ' + parts.map(cap).join(' ');
    }
    if (step === 'lever') {
      const want = String(r.card.learningIsTheAnswer || '').toLowerCase();
      if (!LEVER_NAMES[want]) return '';
      return want === b.lever ? 'Mieke: Agreed, ' + LEVER_NAMES[want].toLowerCase() + '.' : 'Mieke: I would have said "' + LEVER_NAMES[want].toLowerCase() + '". Keep that in mind for the concept.';
    }
    if (step === 'risks') {
      const real = b.risks.filter(x => b.tiles.some(t => t.who === x.who && t.real)).map(x => x.who);
      const fake = b.risks.filter(x => !real.includes(x.who)).map(x => x.who);
      const also = b.tiles.filter(t => t.real && !real.includes(t.who)).map(t => t.who);
      const parts = [];
      if (real.length) parts.push(listText(real) + (real.length > 1 ? ' really could' : ' really could') + ' stop this.');
      if (fake.length) parts.push(listText(fake) + ' wasn\'t going to.');
      if (also.length) parts.push('Also in play: ' + listText(also) + '.');
      return 'Mieke: ' + parts.map(cap).join(' ');
    }
    return '';
  }

  $('board-next').onclick = () => {
    const b = board();
    if (b.step === 'memo') { submitWriteup(boardWriteup()); return; }
    if (!b.locked) {
      const why = missing(b.step);
      if (why) { toast(why, 'info'); return; }
      b.locked = true;
      b.feedback = feedbackFor(b.step);
      if (!b.feedback) { b.step = STEPS[STEPS.indexOf(b.step) + 1]; b.locked = false; }
    } else {
      b.step = STEPS[STEPS.indexOf(b.step) + 1];
      b.locked = false;
      b.feedback = '';
    }
    renderBoard();
    save();
    $('w-write').querySelector('.win-body').scrollTop = 0;
  };

  function boardWriteup() {
    const b = board(), pool = evidencePool();
    const quote = id => { const e = pool.find(x => x.id === id); return e ? e.text : ''; };
    return {
      kind: 'board', tags: b.tags.slice(), evidence: b.evidence.map(quote), problem: b.problem, lever: b.lever, leverWhy: b.leverWhy,
      rungs: RUNGS.map(([k, label]) => ({ label, text: b.rungs[k].text, ev: quote(b.rungs[k].ev) })),
      idea: b.idea, formats: b.formats.slice(), why: b.why, not: b.not, risks: b.risks.map(x => Object.assign({}, x)), flag: b.flag
    };
  }

  // Deterministic parts of the score, 0 to 1 each, straight from the card.
  function boardScores(r, w) {
    const gold = r.card.rootCauseTypes || [];
    const hits = w.tags.filter(t => gold.includes(t)).length, extra = w.tags.length - hits;
    const tags = gold.length ? Math.max(0, Math.min(1, (hits - 0.5 * extra) / Math.min(gold.length, 3))) : 0;
    const order = { no: 0, partly: 1, yes: 2 }, want = String(r.card.learningIsTheAnswer || '').toLowerCase();
    const lever = want in order ? [1, 0.5, 0][Math.abs(order[want] - order[w.lever])] : 0.5;
    const b = r.board, pool = evidencePool();
    const cited = new Set(b.evidence.flatMap(id => (pool.find(x => x.id === id) || { facts: [] }).facts));
    const critical = r.card.hiddenFacts.filter(f => f.critical).map(f => f.id);
    const evidence = critical.length ? Math.min(1, critical.filter(id => cited.has(id)).length / Math.min(2, critical.length)) : (cited.size ? 1 : 0);
    const risks = b.risks.filter(x => b.tiles.some(t => t.who === x.who && t.real)).length / 2;
    return { tags, lever, evidence, risks };
  }

  function writeupText(w) {
    if (w.kind === 'board') {
      return [
        'NEED',
        'Root cause types: ' + (w.tags.map(t => TAG_NAMES[t]).join(', ') || '(none)'),
        'Evidence cited from the call: ' + (w.evidence.map(e => '"' + e + '"').join(' | ') || '(none)'),
        'The real problem: ' + w.problem,
        'Is learning the lever: ' + (LEVER_NAMES[w.lever] || '(not chosen)') + '. Because: ' + w.leverWhy,
        'MEASUREMENT',
        ...w.rungs.map(x => x.label + ': ' + (x.text || '(empty)') + (x.ev ? ' (evidence: "' + x.ev + '")' : '')),
        'CONCEPT',
        'Big idea: ' + w.idea,
        'Formats: ' + (w.formats.join(', ') || '(none)'),
        'Why it fixes the root cause: ' + w.why,
        'What it is not: ' + w.not,
        'RISKS AND DEPENDENCIES (top two, most dangerous first)',
        ...w.risks.map((x, i) => (i + 1) + '. ' + x.who + ': ' + x.mitigation),
        'Flagged as risky strat: ' + (w.flag || '(not flagged)')
      ].join('\n');
    }
    return [
      'NEED', 'Gap: ' + w.gap, 'Who: ' + w.who, 'Root cause: ' + w.cause, 'Is learning the lever: ' + w.lever,
      'MEASUREMENT', 'Baseline: ' + w.baseline, 'Behaviour: ' + w.behaviour, 'Business metric: ' + w.metric, 'Collection: ' + w.collect,
      'CONCEPT', 'Big idea: ' + w.idea, 'Format and rhythm: ' + w.format, 'Why it fixes the root cause: ' + w.why,
      'What it is not: ' + w.not, 'Risks and mitigations: ' + w.risks,
      'Flagged as risky strat: ' + (w.flag || '(not flagged)')
    ].join('\n');
  }

  $('write-form').onsubmit = ev => {
    ev.preventDefault();
    const w = Object.fromEntries(new FormData($('write-form')).entries());
    if (!w.gap.trim() || !w.idea.trim()) { toast('At least describe the gap and the big idea.'); return; }
    w.kind = 'form';
    submitWriteup(w);
  };
  async function submitWriteup(w) {
    const r = state.run;
    r.writeup = w;
    if (w.kind === 'board') r.boardScores = boardScores(r, w);
    wait(r.card.stakeholder.name + ' is reading your concept. You can hear sighing, or possibly typing.');
    const p = Prompts.reaction(r.card);
    try {
      r.reaction = await Gemini.json({
        system: p.system, schema: p.schema,
        turns: [{ role: 'user', text: 'The write-up, quoted as data:\n"""\n' + writeupText(w) + '\n"""' }]
      });
    } catch (e) { toast(e.message); phase('write'); Desktop.layout('write', 'w-write'); return; }
    const gap = Math.max(0, Math.min(3, (r.reaction.boldness | 0) - (r.card.riskAppetite | 0)));
    if (gap > 0) defence(r.reaction.objections.slice(0, gap)); else judge();
  }

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
      'INTAKE TRANSCRIPT (player questions with the answers, from the call, a callback, the coffee machine with a front-line employee, and data requests; each data request cost one question):',
      transcriptText() || '(the player asked no questions)',
      'Hidden facts the player surfaced: ' + ([...r.revealed].join(', ') || 'none'),
      '',
      'WRITE-UP:', '"""', writeupText(r.writeup), '"""',
      '',
      'DEFENCE ROUND:',
      r.defence.length ? r.defence.map(d => `Objection: ${d.objection}\nAnswer: """${d.answer || '(no answer)'}"""`).join('\n') : '(none, the stakeholder accepted the concept)'
    ].join('\n');
    let g;
    try {
      g = await Gemini.json({ system: p.system, schema: p.schema, maxTokens: p.maxTokens, turns: [{ role: 'user', text: material }] });
    } catch (e) { toast(e.message); setTimeout(judge, 4000); return; }
    scorecard(g);
  }

  function clamp4(n) { return Math.max(0, Math.min(4, Number(n) || 0)); }

  function points(g, replay) {
    const r = state.run;
    const weight = f => f.weight || 1;
    const total = r.card.hiddenFacts.reduce((a, f) => a + weight(f), 0) || 1;
    const found = r.card.hiddenFacts.filter(f => r.revealed.has(f.id)).reduce((a, f) => a + weight(f), 0);
    const pts = {};
    const bs = r.writeup && r.writeup.kind === 'board' ? r.boardScores : null;
    pts.diagnosis = bs
      ? 8 * clamp4(g.diagnosis.score) / 4 + 7 * found / total + 4 * bs.tags + 3 * bs.evidence + 3 * bs.lever
      : 25 * (0.5 * clamp4(g.diagnosis.score) / 4 + 0.5 * found / total);
    pts.measurement = 20 * clamp4(g.measurement.score) / 4;
    pts.fit = 20 * clamp4(g.fit.score) / 4;
    pts.nextLevel = pts.fit >= 12 ? 15 * clamp4(g.nextLevel.score) / 4 : 0;
    pts.risks = bs ? 6 * clamp4(g.risks.score) / 4 + 4 * bs.risks : 10 * clamp4(g.risks.score) / 4;
    pts.pitch = 10 * clamp4(g.pitch.score) / 4;
    let bonus = 0;
    if (r.defence.length) {
      if (g.defenceOutcome === 'strong') bonus = 5;
      else if (g.defenceOutcome === 'weak') { pts.nextLevel /= 2; if (!replay) r.trust -= 15; }
      else if (g.defenceOutcome === 'retreat') pts.nextLevel = 0;
    }
    Object.keys(pts).forEach(k => { pts[k] = Math.round(pts[k]); });
    const sum = Math.min(100, Object.values(pts).reduce((a, b) => a + b, 0) + bonus);
    return { pts, bonus, total: sum };
  }

  function scorecard(g, replay) {
    const r = state.run;
    const { pts, bonus, total } = points(g, replay);
    if (!replay) {
      state.results.push({ id: r.card.id, total });
      recordScore(r, total, pts, g);
      r.phase = 'score';
      r.grade = g;
      save();
      // The week counts as played from its first scorecard, not from "Clock in".
      if (!state.charged && Gemini.runId) { state.charged = true; save(); Gemini.backend('played', { runId: Gemini.runId }).catch(() => {}); }
    }
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
      const bs = r.writeup && r.writeup.kind === 'board' ? r.boardScores : null;
      if (bs && (k === 'diagnosis' || k === 'risks')) {
        const n = document.createElement('div'); n.className = 'ev';
        n.textContent = k === 'diagnosis'
          ? 'Cause types ' + Math.round(bs.tags * 100) + '% · key evidence cited ' + Math.round(bs.evidence * 100) + '% · lever ' + Math.round(bs.lever * 100) + '%'
          : 'Real blockers picked: ' + Math.round(bs.risks * 2) + ' of 2';
        a.appendChild(n);
      }
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
      const li = document.createElement('li');
      li.textContent = f.fact + (touchpoints(r.card) ? ' (Findable ' + listText(f.foundAt.map(placeOf)).replace(/ and /g, ' or ') + '.)' : '');
      missed.appendChild(li);
    });
    if (!missed.children.length) { const li = document.createElement('li'); li.textContent = 'Nothing. You found it all.'; missed.appendChild(li); }
    $('score-verdict').textContent = g.verdict;
    trust();
    $('btn-next').textContent = state.index + 1 < state.cards.length ? 'Next request' : 'End the week';
    pane('p-score', 'Request ' + (state.index + 1) + ' · Scorecard');
  }

  $('btn-next').onclick = () => {
    state.index++;
    if (state.index < state.cards.length) startRequest(); else { dropSave(); endRun(); }
  };

  function endRun() {
    const avg = Math.round(state.results.reduce((a, r) => a + r.total, 0) / state.results.length);
    const title = TITLES.find(([max]) => avg < max)[1];
    $('end-title').textContent = title;
    $('end-score').textContent = avg + ' / 100';
    $('end-note').textContent = 'Average over ' + state.results.length + ' requests.';
    recordWeek(avg, title);
    show('s-end');
  }

  // ---------- my scores: every finished request, kept in this browser ----------
  const SCORES_KEY = 'intake-scores';
  function scoreHistory() {
    let h = null;
    try { h = JSON.parse(window.localStorage.getItem(SCORES_KEY) || 'null'); } catch (e) { /* storage blocked */ }
    return h && Array.isArray(h.weeks) ? h : { v: 1, weeks: [] };
  }
  function keepScores(h) {
    try { window.localStorage.setItem(SCORES_KEY, JSON.stringify(h)); } catch (e) { /* storage full or blocked */ }
    renderScores();
  }
  function thisWeek(h) {
    let w = h.weeks.find(x => x.id === state.weekId);
    if (!w) { w = { id: state.weekId, started: Date.now(), requests: [] }; h.weeks.push(w); }
    return w;
  }
  function recordScore(r, total, pts, g) {
    const h = scoreHistory(), w = thisWeek(h), s = r.card.stakeholder;
    w.requests = w.requests.filter(x => x.index !== state.index);
    w.requests.push({
      index: state.index, at: Date.now(), card: r.card.id, who: s.name, role: s.role, org: (s.org || '').split(',')[0],
      starter: r.card.difficulty === 0, total, pts, question: g.questionNotAsked, verdict: g.verdict
    });
    keepScores(h);
  }
  function recordWeek(avg, title) {
    const h = scoreHistory(), w = thisWeek(h);
    Object.assign(w, { done: true, avg, title });
    keepScores(h);
  }
  function renderScores() {
    const box = $('scores'), h = scoreHistory();
    box.innerHTML = '';
    const para = (t, cls) => { const p = document.createElement('p'); p.textContent = t; if (cls) p.className = cls; box.appendChild(p); };
    para('MY SCORES.TXT');
    para('Kept in this browser only. Nobody else can see it, including your manager.', 'muted');
    const all = h.weeks.flatMap(w => w.requests);
    if (!all.length) { para('\nNothing here yet. Finish a request and its scorecard lands in this file.'); return; }
    const best = all.reduce((a, b) => (b.total > a.total ? b : a));
    para('\nRequests handled: ' + all.length + ' · average ' + Math.round(all.reduce((a, b) => a + b.total, 0) / all.length) + '/100 · best ' + best.total + '/100 (' + best.who + ')');
    const fmt = t => new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    h.weeks.slice().reverse().filter(w => w.requests.length).forEach(w => {
      const head = document.createElement('h3');
      head.textContent = '=== Week of ' + fmt(w.started) + (w.done ? ' · ' + w.title + ' · average ' + w.avg + '/100' : ' · in progress') + ' ===';
      box.appendChild(head);
      w.requests.slice().sort((a, b) => a.index - b.index).forEach(x => {
        para((x.index + 1) + '. ' + x.who + ' (' + x.role + (x.org ? ', ' + x.org : '') + ')' + (x.starter ? ' [starter]' : '') + ': ' + x.total + '/100');
        para('   ' + DIMENSIONS.map(([k, label, max]) => label + ' ' + (x.pts[k] || 0) + '/' + max).join(' · '), 'muted');
        if (x.question) para('   The question you didn\'t ask: ' + x.question);
        if (x.verdict) para('   Their verdict: ' + x.verdict);
      });
    });
  }

  // ---------- desktop icons and apps ----------
  function openApp(id) {
    const r = state.run;
    if (id === 'bin') { toast('The Recycle Bin contains 41 MB of "Learning Styles Revisited FINAL v7.ppt". Best left alone.', 'info'); return; }
    if (id === 'w-call' && (!r || r.phase === 'inbox')) { toast('No call yet. Read the request in Doors Mail, then call them from there.', 'info'); return; }
    if (id === 'w-write' && (!r || r.phase === 'inbox' || r.phase === 'call' || r.phase === 'investigate')) { toast('The case board opens when you are done asking questions.', 'info'); return; }
    if (id === 'w-leads' && (!r || !touchpoints(r.card))) { toast(r && r.card.difficulty === 0 ? 'Starter cases are all on the call. Follow-up opens on the next ones.' : 'Nothing to follow up yet.', 'info'); return; }
    if (id === 'w-leads' && (r.phase === 'inbox' || (r.phase === 'call' && !r.calledBack))) { toast('Follow-up opens after your first call: data, the coffee machine, a callback.', 'info'); return; }
    if (id === 'w-leads') renderLeads();
    if (id === 'w-scores') renderScores();
    if (id === 'w-coe' && !$('coe-doc').innerHTML) Coe.render($('coe-files'), $('coe-doc'), 'flow');
    Desktop.open(id, Desktop.floating[id]);
  }
  document.querySelectorAll('.desk-icon').forEach(b => { b.onclick = () => openApp(b.dataset.app); });
  Coe.render($('coe-files'), $('coe-doc'), 'flow');
  renderScores();

  const soundLabel = () => { $('btn-sound').textContent = Sound.on ? '🔊 Sound: on' : '🔇 Sound: off'; };
  $('btn-sound').onclick = () => { Sound.toggle(); soundLabel(); if (Sound.on) Sound.ding(); };
  soundLabel();

  // ---------- test mode: ?debug in the address bar shows an Autofill button ----------
  // It fills in the current step from the card's own answers, so a whole request can be
  // played in a few clicks. The call is scripted (no Gemini); the reaction and examiner are real.
  (function () {
    const q = new URLSearchParams(window.location.search);
    try {
      if (q.has('debug')) window.localStorage.setItem('intake-debug', q.get('debug') === '0' ? '0' : '1');
      $('btn-debug').hidden = window.localStorage.getItem('intake-debug') !== '1';
    } catch (e) { $('btn-debug').hidden = !q.has('debug') || q.get('debug') === '0'; }
  })();
  $('btn-debug').onclick = () => {
    const r = state.run;
    if (!r) return;
    const card = r.card;
    if ($('w-dialog').classList.contains('open') && $('p-defence').classList.contains('active')) {
      $('defence-form').querySelectorAll('textarea').forEach(t => { t.value = '(test) Fair point. We pilot it with one team first, measure against the baseline, and only scale if it works.'; });
      return;
    }
    if (r.phase === 'inbox') $('btn-call').onclick();
    if (r.phase === 'call') {
      card.hiddenFacts.filter(f => f.foundAt.includes('call') && !r.revealed.has(f.id)).slice(0, Math.min(r.questionsLeft, r.legLeft)).forEach(f => {
        const qText = '(test) ' + (f.unlockedBy || 'Tell me more.'), a = f.revealLine || f.fact;
        addMsg('you', qText);
        addMsg('them', a);
        r.turns.push({ role: 'user', text: 'The learning professional asks: """' + qText + '"""' }, { role: 'model', text: JSON.stringify({ reply: a, revealed: [f.id], quality: 'good' }) });
        r.transcript.push({ q: qText, a, quality: 'good', facts: [f.id], src: r.leg });
        r.revealed.add(f.id);
        r.questionsLeft--;
        r.legLeft--;
      });
      meters();
      afterCall();
      return;
    }
    // Follow-up: every data kind that holds something, then the coffee machine, scripted.
    if (r.phase === 'investigate') {
      Object.keys(DATA_KINDS).filter(k => card.hiddenFacts.some(f => f.foundAt.includes('data:' + k) && !r.revealed.has(f.id))).forEach(requestData);
      const fl = card.frontline;
      card.hiddenFacts.filter(f => f.foundAt.includes('frontline') && !r.revealed.has(f.id)).slice(0, Math.min(r.corridorLeft, r.questionsLeft)).forEach(f => {
        const qText = '(test) ' + (f.unlockedBy || 'What is it really like?'), a = f.frontlineLine || f.fact;
        r.corridor.push({ who: 'you', text: qText }, { who: 'them', text: a });
        r.corridorTurns.push({ role: 'user', text: 'The learning professional asks: """' + qText + '"""' }, { role: 'model', text: JSON.stringify({ reply: a, revealed: [f.id], quality: 'good' }) });
        r.transcript.push({ q: qText, a, quality: 'good', facts: [f.id], src: 'frontline' });
        r.revealed.add(f.id);
        r.corridorLeft--;
        r.questionsLeft--;
      });
      if (!fl) r.corridorLeft = 0;
      renderLeads();
      save();
      return;
    }
    if (r.phase !== 'write') return;
    const b = board(), plan = card.measurementPlan || {}, gold = card.goldAnswer || {};
    const want = String(card.learningIsTheAnswer || '').toLowerCase();
    if (b.mode === 'memo') {
      const f = $('write-form').elements;
      const fill = { gap: card.needStatement || card.realProblem, who: card.constraints.audience, cause: card.rootCause, lever: (LEVER_NAMES[want] || 'Partly') + '.',
        baseline: plan.baseline, behaviour: plan.behaviour, metric: plan.business_metric, collect: plan.collection,
        idea: (gold.concept || '').split(' | ')[0], format: 'Practice on the job, with a manager routine.', why: '(test) It targets the causes above.',
        not: 'Not a generic course.', risks: (card.dependencies || []).map(d => d.who + ': ' + d.concern).join('\n') };
      Object.entries(fill).forEach(([k, v]) => { if (f[k]) f[k].value = v || '(test)'; });
      save();
      return;
    }
    const pool = evidencePool();
    const critical = new Set(card.hiddenFacts.filter(f => f.critical).map(f => f.id));
    b.evidence = pool.filter(x => x.facts.some(id => critical.has(id))).map(x => x.id).slice(0, 3);
    if (!b.evidence.length) b.evidence = [pool[pool.length - 1].id];
    b.tags = (card.rootCauseTypes || []).filter(t => TAG_NAMES[t]).slice(0, 3);
    if (!b.tags.length) b.tags = ['skill'];
    b.problem = card.needStatement || card.realProblem || '(test) The real problem.';
    b.lever = LEVER_NAMES[want] ? want : 'partly';
    b.leverWhy = '(test) Because of the causes we found.';
    const ev = pool.length > 1 ? pool[1].id : '';
    b.rungs = { baseline: { text: plan.baseline || '(test)', ev }, behaviour: { text: plan.behaviour || '(test)', ev: '' }, metric: { text: plan.business_metric || '(test)', ev: '' }, collect: { text: plan.collection || '(test)', ev: '' } };
    b.idea = (gold.concept || '(test) A focused practice programme.').split(' | ')[0];
    b.formats = ['Practice or simulation', 'Manager routine'];
    b.why = '(test) It tackles ' + listText(b.tags.map(t => TAG_NAMES[t])) + '.';
    b.not = 'Not a generic course for everyone.';
    b.risks = b.tiles.filter(t => t.real).slice(0, 2).map(t => ({ who: t.who, mitigation: '(test) ' + (((card.dependencies || []).find(d => d.who === t.who) || {}).concern || 'Involve them early.') }));
    b.step = 'memo'; b.locked = false; b.feedback = '';
    renderBoard();
    save();
  };

  runsLeft();
  resumeButton();

  // test hook
  window.__intake = { state, points };
})();
