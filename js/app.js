// THE INTAKE: cubicle -> inbox -> intake call -> write-up -> reaction/defence -> scorecard,
// played on a desktop with the case file, notes and a colleague open beside the call.
(function () {
  const $ = id => document.getElementById(id);
  const QUESTIONS = 8;
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

  const state = { pool: [], cards: [], index: 0, results: [], run: null, charged: false };

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
    const s = { v: 1, at: Date.now(), runId: Gemini.runId, cards: state.cards.map(c => c.id), index: state.index, results: state.results, charged: state.charged, run };
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
    const r = Object.assign({}, s.run);
    r.card = cards[s.index];
    r.revealed = new Set(r.revealed || []);
    r.mails = [];
    r.selected = null;
    state.run = r;
    openRequest();
  };

  // ---------- one request ----------
  function startRequest() {
    const card = state.cards[state.index];
    const prev = state.run;
    state.run = {
      card, trust: 100, questionsLeft: QUESTIONS, patience: card.patience || 3,
      turns: [], transcript: [], revealed: new Set(), writeup: null, reaction: null, defence: [],
      miekeLeft: MIEKE_ASKS, clock: prev && state.index ? prev.clock + 40 : 8 * 60 + 57,
      readMail: prev && state.index ? prev.readMail : {}, mails: [], selected: null,
      phase: 'inbox', chat: [], mieke: [], notes: '', draft: {}, grade: null
    };
    state.run.mieke.push({ who: 'them', text: 'Morning. Shout if you want a second pair of eyes.' });
    openRequest();
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
    if (r.phase === 'call') { phase('call'); Desktop.layout('call', 'w-call'); }
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
    Desktop.title('w-inbox', 'Inbox' + (unread ? ' (' + unread + ' unread)' : '') + ' - KimMail', 'Inbox');
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
      pin.onclick = () => pinNote(text, pin);
      if ((state.run.pins || []).includes(text)) pin.classList.add('done');
      d.appendChild(pin);
    }
    $('chat-log').appendChild(d);
    $('chat-log').scrollTop = $('chat-log').scrollHeight;
  }
  function pinNote(text, btn) {
    const r = state.run;
    r.pins = r.pins || [];
    if (!r.pins.includes(text)) r.pins.push(text);
    const n = $('notes');
    const who = state.run.card.stakeholder.name.split(' ')[0];
    n.value = (n.value.trim() ? n.value.replace(/\s+$/, '') + '\n' : '') + '- ' + who + ': "' + text + '"\n';
    btn.classList.add('done');
    const w = $('w-notes');
    if (!w.classList.contains('open') || w.classList.contains('minimised')) Desktop.open('w-notes');
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
    // One aside per call, on the second answer, so the stakeholder sounds human without rambling.
    const flavours = r.card.flavourLines || [];
    const flavour = r.transcript.length === 1 && flavours.length ? flavours[Math.floor(Math.random() * flavours.length)] : '';
    const p = Prompts.stakeholder(r.card, flavour);
    try {
      const out = await Gemini.json({ system: p.system, turns: r.turns, schema: p.schema });
      r.turns.push({ role: 'model', text: JSON.stringify(out) });
      addMsg('them', out.reply);
      const facts = (out.revealed || []).filter(id => r.card.hiddenFacts.some(f => f.id === id));
      facts.forEach(id => r.revealed.add(id));
      r.transcript.push({ q, a: out.reply, quality: out.quality, facts });
      r.questionsLeft--;
      tick(4);
      if (out.quality === 'weak') { r.patience--; r.trust -= 10; }
      meters();
      save();
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
  // Enter sends, Shift+Enter makes a new line.
  $('chat-input').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $('chat-form').requestSubmit(); }
  });

  // The call stays open (read-only) beside the write-up, with the notes and case file.
  function toWriteup() {
    const r = state.run;
    if (r.phase !== 'call') return;
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
      'Where they are: ' + ({ inbox: 'they have read the request and not called yet', call: 'they are in the middle of the intake call', write: 'the call is over and they are writing the concept' }[ph] || ph),
      'Questions left in the call: ' + r.questionsLeft,
      '',
      'The request: "' + r.card.surfaceAsk + '"',
      'Case file: ' + (r.card.briefing ? r.card.briefing.points.join(' | ') : 'none'),
      '',
      'The call so far:',
      r.transcript.map((t, i) => `Q${i + 1}: """${t.q}"""\nA${i + 1}: ${t.a}`).join('\n') || '(no questions yet)',
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
    return [{ id: 'ask', text: r.card.surfaceAsk, facts: [] }].concat(r.transcript.map((t, i) => ({ id: 'a' + i, text: t.a, facts: t.facts || [], pinned: (r.pins || []).includes(t.a) })));
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
      btn.textContent = (item.pinned ? '📌 ' : '') + '"' + short(item.text, 150) + '"';
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
    if (state.index < state.cards.length) startRequest(); else { dropSave(); endRun(); }
  };

  function endRun() {
    const avg = Math.round(state.results.reduce((a, r) => a + r.total, 0) / state.results.length);
    const title = TITLES.find(([max]) => avg < max)[1];
    $('end-title').textContent = title;
    $('end-score').textContent = avg + ' / 100';
    $('end-note').textContent = 'Average over ' + state.results.length + ' requests.';
    show('s-end');
  }

  runsLeft();
  resumeButton();

  // test hook
  window.__intake = { state, points };
})();
