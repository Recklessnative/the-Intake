// THE INTAKE: cubicle -> inbox -> intake call -> write-up -> reaction/defence -> scorecard,
// played on a desktop with the case file, notes and a colleague open beside the call.
(function () {
  const $ = id => document.getElementById(id);
  const QUESTIONS = 8;
  // Starter cases (tier 0) are gentler: more questions, more patience.
  const STARTER = { questions: 10, patience: 5 };
  const questionsFor = card => card.difficulty === 0 ? STARTER.questions : touchpoints(card) ? budget().total : QUESTIONS;
  // Beyond the starters, one budget of questions is spread over the first call, data
  // requests, the coffee machine and one callback.
  const TOUCH = { total: 10, call: 5, corridor: 2, callback: 3 };
  // Hard mode: fewer questions, no case file, no Mieke, a 150-word memo.
  const HARD = { total: 6, call: 4, corridor: 2, callback: 2, words: 150 };
  const budget = () => (state.hard ? HARD : TOUCH);
  const touchpoints = card => card.difficulty !== 0 && card.hiddenFacts.some(f => f.foundAt.some(x => x !== 'call'));
  const DATA_KINDS = { kpi: 'KPIs and reports', org: 'Org chart and roles', process: 'Process and systems', policy: 'Policies and targets', training: 'Past training' };
  const PLACE = { call: 'on the call', frontline: 'at the coffee machine', kpi: 'in the KPIs', org: 'in the org chart', process: 'in the process docs', policy: 'in the policies', training: 'in the past training records' };
  const placeOf = where => PLACE[where.replace(/^data:/, '')] || where;
  const MIEKE_ASKS = 3;
  const TITLES = [[40, 'Order Taker'], [55, 'Course Builder'], [70, 'Learning Consultant'], [85, 'Learning Strategist'], [101, 'Board Whisperer']];
  const DIMENSIONS = [
    ['diagnosis', 'Need diagnosis', 25],
    ['measurement', 'Measurement', 20],
    ['fit', 'Concept fit', 20],
    ['nextLevel', 'Right-sized ambition', 15],
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

  const state = { pool: [], cards: [], days: [], index: 0, results: [], run: null, charged: false, weekId: '', weekNo: 1, hard: false, board: null, academy: null, team: null };

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
    Desktop.title('w-dialog', { 'p-bet': 'Before you send it', 'p-defence': 'Defence round', 'p-wait': 'Please wait...', 'p-score': 'Scorecard', 'p-board': 'Board room' }[id], 'THE INTAKE');
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
  // Anything that breaks says so on screen, instead of a button that silently does nothing.
  window.addEventListener('error', e => toast('Something broke: ' + (e.message || 'a script failed') + '. Try a hard refresh (Ctrl+Shift+R), then Resume.'));
  window.addEventListener('unhandledrejection', e => toast('Something broke: ' + ((e.reason && e.reason.message) || e.reason) + '. Try a hard refresh, then Resume.'));
  ['Gemini', 'Desktop', 'Cards', 'Prompts', 'Coe', 'Sound', 'Academy', 'Story', 'Retro', 'Team', 'Slides', 'Standup', 'Scoring'].forEach(m => { if (!window[m]) setTimeout(() => toast('Part of the game (' + m + ') did not load. Try a hard refresh (Ctrl+Shift+R).'), 500); });
  function wait(line) { $('wait-line').textContent = line; pane('p-wait'); }
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
  // The shape of a week changes from week to week. Each slot is [day, tier] (0 = starter);
  // Friday is the board room. Each normal week also assigns one CoE Academy module.
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const SHAPES = [
    [[0, 2], [1, 2], [3, 3]],
    [[0, 1], [2, 2], [3, 3]],
    [[0, 2], [2, 3], [3, 3]]
  ];
  function shapeFor(n) {
    if (n === 1) return [[0, 0], [1, 0], [3, 1]];
    if (n === 2) return [[0, 1], [2, 1], [3, 2]];
    return SHAPES[(n - 3) % SHAPES.length];
  }
  function weekNumber() {
    return scoreHistory().weeks.filter(w => w.requests.length && w.id !== state.weekId).length + 1;
  }
  // Fill the shape: unplayed cards first, no sector twice.
  function pickWeek(n) {
    if (state.hard) return pickHardWeek();
    const played = new Set(scoreHistory().weeks.flatMap(w => w.requests.map(x => x.card)));
    const fresh = list => list.slice().sort(() => Math.random() - 0.5).sort((a, b) => played.has(a.id) - played.has(b.id));
    const cards = [], days = [];
    // A team lead takes two requests of their own (Monday and Thursday); the team takes the rest.
    shapeFor(n).filter((x, i) => !teamWeek(n) || i !== 1).forEach(([day, what]) => {
      const full = fresh(state.pool.filter(c => !cards.includes(c) && (what === 0 ? c.difficulty === 0 : c.difficulty !== 0)));
      const near = full.slice().sort((a, b) => Math.abs(a.difficulty - what) - Math.abs(b.difficulty - what));
      const card = near.find(c => c.difficulty === what && !cards.some(x => x.sector === c.sector)) || near.find(c => c.difficulty === what) || near[0];
      if (card) { cards.push(card); days.push(day); }
    });
    return { cards, days };
  }
  // After the promotion every normal week is a team week: three drafts to review.
  function teamWeek(n) {
    const p = scoreHistory().promoted;
    return !state.hard && !!p && n > p.week;
  }
  function pickTeamCards() {
    const played = new Set(scoreHistory().weeks.flatMap(w => w.requests.map(x => x.card)));
    const pool = state.pool.filter(c => c.difficulty >= 1 && !state.cards.includes(c) && c.dependencies.length)
      .sort(() => Math.random() - 0.5).sort((a, b) => played.has(a.id) - played.has(b.id));
    const out = [];
    pool.forEach(c => { if (out.length < Team.JUNIORS.length && !out.some(x => x.sector === c.sector)) out.push(c); });
    pool.forEach(c => { if (out.length < Team.JUNIORS.length && !out.includes(c)) out.push(c); });
    return out;
  }
  // Hard mode: three full cases, the hardest there are, one a day.
  function pickHardWeek() {
    const played = new Set(scoreHistory().weeks.flatMap(w => w.requests.map(x => x.card)));
    const pool = state.pool.filter(c => c.difficulty >= 2).sort(() => Math.random() - 0.5).sort((a, b) => played.has(a.id) - played.has(b.id));
    const cards = [];
    [2, 3, 3].forEach(t => {
      const c = pool.find(x => x.difficulty === t && !cards.includes(x) && !cards.some(y => y.sector === x.sector)) || pool.find(x => !cards.includes(x));
      if (c) cards.push(c);
    });
    cards.sort((a, b) => a.difficulty - b.difficulty);
    return { cards, days: cards.map((c, i) => i) };
  }
  const dayOf = i => DAYS[state.days[i] || 0];

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

  $('btn-start').onclick = () => startWeek(false);
  $('btn-hard').onclick = () => {
    if (!window.confirm('Hard mode: three tough cases, 6 questions each, no case file, no Mieke, and a memo of at most 150 words. Only a hard-mode week can be posted to LinkedIn. Clock in?')) return;
    startWeek(true);
  };
  async function startWeek(hard) {
    if (readSave() && !window.confirm('Start a new week? Your saved week will be dropped.')) return;
    try { await loadCards(); } catch (e) { toast('Could not load the scenarios. The game needs to be served over http, not opened as a file.'); return; }
    if (!(await claimRun())) return;
    dropSave();
    state.hard = !!hard;
    document.body.classList.toggle('hard', state.hard);
    state.weekId = 'w' + Date.now();
    state.weekNo = weekNumber();
    const week = pickWeek(state.weekNo);
    state.cards = week.cards;
    state.days = week.days;
    state.index = 0;
    state.results = [];
    state.charged = false;
    state.board = null;
    state.academy = state.hard ? null : { id: Academy.moduleFor(state.weekNo).id, started: false, at: 0, picks: [], done: false };
    const recall = state.hard || state.weekNo < 2 ? [] : Standup.pick(scoreHistory(), state.pool, state.weekId, 2);
    state.standup = recall.length ? { items: recall, at: 0, done: false } : null;
    state.team = teamWeek(state.weekNo) ? { at: 0, drafts: Team.plan(pickTeamCards(), state.weekId) } : null;
    state.run = null;
    if (!state.hard && !seenIntro()) intro(cubicle); else cubicle();
  }

  // ---------- the cold open: plays once before your first week, and from the title screen ----------
  const INTRO = [
    'The year is 2007.',
    'Phones have keyboards. Slides have star wipes. Every training request ends in an e-learning.',
    'AI that can write a whole course is fifteen years away.',
    'You still have time to hone the one skill it won\'t replace.',
    'Asking the right questions.'
  ];
  function seenIntro() { try { return window.localStorage.getItem('intake-intro') === 'seen'; } catch (e) { return true; } }
  function intro(then) {
    try { window.localStorage.setItem('intake-intro', 'seen'); } catch (e) { /* storage blocked */ }
    show('s-intro');
    let i = 0;
    const box = $('intro-lines');
    box.innerHTML = '';
    $('intro-card').hidden = true;
    const done = () => { clearTimeout(intro.t); then(); };
    const next = () => {
      clearTimeout(intro.t);
      if (i < INTRO.length) {
        const p = document.createElement('p');
        p.textContent = INTRO[i];
        p.className = 'intro-line' + (i === INTRO.length - 1 ? ' last' : '');
        box.appendChild(p);
        i++;
        intro.t = setTimeout(next, i === INTRO.length ? 2200 : 2600);
        return;
      }
      $('intro-card').hidden = false;
      $('btn-intro-go').focus();
    };
    $('btn-intro-skip').onclick = done;
    $('btn-intro-go').onclick = done;
    $('s-intro').onclick = ev => { if (ev.target.tagName !== 'BUTTON' && $('intro-card').hidden) next(); };
    next();
  }
  $('btn-watch-intro').onclick = () => intro(() => show('s-title'));
  $('btn-again').onclick = () => startWeek(state.hard);

  // The boot screen: the intro lines appear while the progress bar runs and move on by
  // themselves. Log on is there from the start: nobody has to read the cubicle to work.
  function cubicle() {
    show('s-cubicle');
    let i = 0;
    const line = $('cubicle-line');
    const say = () => {
      line.classList.remove('in');
      void line.offsetWidth;
      line.textContent = CUBICLE[i];
      line.classList.add('in');
    };
    const next = () => {
      clearTimeout(cubicle.t);
      if (i < CUBICLE.length - 1) { i++; say(); cubicle.t = setTimeout(next, 4200); }
    };
    say();
    cubicle.t = setTimeout(next, 4200);
    $('btn-sit').textContent = 'Log on';
    $('btn-sit').onclick = () => {
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
    const s = { v: 1, at: Date.now(), runId: Gemini.runId, cards: state.cards.map(c => c.id), days: state.days, weekNo: state.weekNo, hard: state.hard, board: state.board, academy: state.academy, standup: state.standup, team: state.team, index: state.index, results: state.results, charged: state.charged, weekId: state.weekId, run };
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
    state.days = s.days || cards.map(() => 0);
    state.weekNo = s.weekNo || 1;
    state.hard = !!s.hard;
    state.board = s.board || null;
    state.team = s.team && s.team.drafts.every(d => state.pool.some(c => c.id === d.card)) ? s.team : null;
    state.academy = s.academy || (s.hard ? null : { id: Academy.moduleFor(s.weekNo || 1).id, started: false, at: 0, picks: [], done: false });
    state.standup = s.standup || null;
    document.body.classList.toggle('hard', state.hard);
    state.index = s.index;
    state.results = s.results || [];
    state.charged = !!s.charged;
    state.weekId = s.weekId || 'w' + s.at;
    const r = Object.assign({}, s.run);
    r.card = cards[s.index];
    r.revealed = new Set(r.revealed || []);
    // Saves from before the follow-up existed.
    Object.entries({ leg: 'call', legLeft: r.questionsLeft, calledBack: false, corridor: [], corridorTurns: [], corridorLeft: budget().corridor, data: [], docs: [], had: [] })
      .forEach(([k, v]) => { if (r[k] == null) r[k] = v; });
    r.mails = [];
    r.selected = null;
    state.run = r;
    Sound.chime();
    openRequest();
    if (state.board) renderBoardRoom();
  };

  // ---------- one request ----------
  function startRequest() {
    const card = state.cards[state.index];
    const prev = state.run;
    state.run = {
      card, questionsLeft: questionsFor(card), patience: card.difficulty === 0 ? STARTER.patience : card.patience || 3,
      turns: [], transcript: [], revealed: new Set(), had: [], writeup: null, reaction: null, defence: [],
      miekeLeft: MIEKE_ASKS, clock: prev && state.index && state.days[state.index] === state.days[state.index - 1] ? prev.clock + 40 : 8 * 60 + 57,
      readMail: prev && state.index ? prev.readMail : {}, mails: [], selected: null,
      phase: 'inbox', chat: [], mieke: [], notes: '', draft: {}, grade: null,
      leg: 'call', legLeft: touchpoints(card) ? budget().call : questionsFor(card), calledBack: false,
      corridor: [], corridorTurns: [], corridorLeft: budget().corridor, data: [], docs: []
    };
    state.run.mieke.push({ who: 'them', text: 'Morning. Shout if you want a second pair of eyes.' });
    openRequest();
    // Your very first request: the Center of Excellence folder opens on the flowchart.
    if (!state.index && !scoreHistory().weeks.some(w => w.requests.length)) toast('New here? The Center of Excellence folder on your desktop has the intake flowchart.', 'info');
    if (state.index) Sound.ding();
    if (state.index && state.days[state.index] !== state.days[state.index - 1]) toast('Good morning. It is ' + dayOf(state.index) + '.', 'info');
    retroMorning();
    save();
  }

  // Draw the desk for the current request, at whatever step it is (also after a resume).
  function openRequest() {
    const r = state.run;
    const card = r.card;
    show('s-desk');
    tick(0);
    $('notes').value = r.notes || '';
    $('chat-log').innerHTML = '';
    r.chat.forEach(m => addMsg(m.who, m.text, true, m));
    $('w-call').classList.remove('ended');
    $('write-form').reset();
    Object.entries(r.draft || {}).forEach(([k, v]) => { const el = $('write-form').elements[k]; if (el) el.value = v; });
    $('mieke-log').innerHTML = '';
    r.mieke.forEach(m => miekeSays(m.text, m.who, true));
    miekeLeft();
    briefing(state.hard ? null : card.briefing);
    if (state.hard) $('briefing-head').textContent = 'Hard mode: no case file. Ask.';
    Desktop.reset();
    document.body.classList.toggle('has-team', !!state.team);
    mailbox();
    contacts();
    // Calm Monday: the week's first request opens on the inbox alone (with the CoE mail on top
    // if the module is due now); the case file and notes join when you open the request.
    // In the very first week the request comes first and the module waits until request 2.
    const calm = state.index === 0 && r.phase === 'inbox' && !r.readMail.current;
    const first = mondayFirst(), moduleNow = first === 'module' && r.phase === 'inbox';
    selectMail(moduleNow ? state.run.mails.find(m => m.academy) : calm && state.weekNo === 1 ? state.run.mails.find(m => m.current) : calm ? null : state.run.mails.find(m => m.current));
    phase('inbox');
    Desktop.layout('inbox', 'w-inbox');
    if (calm && state.weekNo !== 1) { Desktop.minimise('w-case'); Desktop.minimise('w-notes'); }
    if (!state.hard) { Desktop.open('w-mieke', Desktop.floating['w-mieke']); Desktop.minimise('w-mieke'); }
    Desktop.focus('w-inbox');
    step(Story.day(state.weekNo, state.days[state.index] || 0) + ' · request ' + (state.index + 1) + ' of ' + state.cards.length);
    // Monday morning: this week's CoE Academy module waits on top, until you start it.
    if (moduleNow) openAcademy();
    if (first === 'standup' && r.phase === 'inbox') openStandup();
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
      body: 'Team,\n\nRead an article on the plane. We should be more like Google. Twenty percent time. Thoughts?\n\nSent from my BlackBerry' },
    { from: 'Center of Excellence', subject: 'New here? Start with the folder on your desktop', ago: 60,
      body: 'Welcome to the learning team!\n\nBefore your first intake, open the "Center of Excellence" folder on your desktop. It has our intake flowchart, the quality standard every intake is reviewed against, a list of good intake questions and the measurement ladder.\n\nPlease ignore the learning styles policy. We are working on it.\n\nThe CoE team' },
    { from: 'Mieke', subject: 'cake?', ago: 16,
      body: 'There is cake in the kitchen. Nobody knows whose birthday it is. Don\'t ask, just eat.\n\nAlso: if a request lands on your desk and you want a second opinion, I\'m two cubicles over.\n\nM.' },
    { from: 'Global Multimedia Solutions', subject: 'Re: quick question!!', ago: 9,
      body: 'Hi there!\n\nJust circling back on my circle-back. Our Web 2.0, multimedia, edutainment academy (now with a Second Life campus!) boosts engagement by up to 400%*.\n\nDo you have 15 minutes this week? Or 14?\n\n*in a survey of our own staff' }
  ];
  function hhmm(min) { return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

  function mailbox() {
    const r = state.run;
    // Every mail has a day of the week (0 = Monday) and a time; the inbox shows newest first.
    const today = state.days[state.index] || 0;
    const mails = FILLER.map(f => Object.assign({ read: !!r.readMail[f.subject], day: 0, at: 8 * 60 + 50 - f.ago }, f));
    state.cards.slice(0, state.index).forEach((c, i) => mails.push({
      from: c.stakeholder.name, subject: c.subject, request: c, read: true, done: true, day: state.days[i] || 0, at: 8 * 60 + 55 + 40 * i,
      body: c.surfaceAsk + '\n\n(Handled. Scored ' + (state.results[i] || {}).total + ' / 100.)'
    }));
    // Darren's mail for the week, and real headlines up to today (not in hard mode: no time for news).
    if (!state.hard) {
      const sm = Story.storyMail(state.weekNo);
      mails.push(Object.assign({ read: !!r.readMail[sm.subject], day: 0, at: 8 * 60 + 12, story: true }, sm));
      Story.news(state.weekNo, today).forEach((n, i) => mails.push(Object.assign({ read: !!r.readMail[n.subject], at: 7 * 60 + 31 + i }, n)));
    }
    // The week after the promotion, IT explains the new PC.
    let aeroNews = false;
    try { aeroNews = !!localStorage.getItem('intake-aero-news'); } catch (e) { /* storage blocked */ }
    if (aeroNews) {
      const sub = 'Your new PC (Doors Aero)';
      mails.push({ from: 'IT Service Desk', subject: sub, read: !!r.readMail[sub], day: 0, at: 7 * 60 + 58,
        body: 'Dear team lead,\n\nCongratulations on your promotion. As agreed with HR, team leads get the new PC. It runs Doors Aero: glass windows, a round start button and roughly 40% more shine.\n\nThe old look is in Display properties if you miss it. Your files are where you left them. Your coffee mug is not our department.\n\nIT Service Desk\n(Do not reply. Nobody will.)' });
    }
    // This week's CoE Academy module arrives first thing Monday.
    if (state.academy) {
      const m = Academy.MODULES.find(x => x.id === state.academy.id);
      const subject = 'Assigned to you: ' + m.title + ' (' + m.minutes + ' min)';
      mails.push({ from: 'CoE Academy', subject, academy: true, day: 0, read: !!r.readMail[subject] || state.academy.done, at: 8 * 60 + 30,
        body: 'Good morning,\n\nThis week\'s module: "' + m.title + '". ' + m.intro + '\n\nFour questions, then what to look out for in your cases this week. No avatars, no "click to reveal", and it does not count toward anything.\n\nThe CoE team' });
    }
    if (state.team) {
      const left = state.team.drafts.filter(d => !d.grade).length;
      const subject = 'Our drafts for your review (' + state.team.drafts.length + ')';
      mails.push({ from: 'Bart, Priya and Jens', subject, team: true, day: 0, read: !!r.readMail[subject] || !left, at: 8 * 60 + 41,
        body: 'Hi boss!\n\nWe each took a request this week and wrote the one-pager. Could you check them before they go out? We think they are good to go.\n\n' +
          state.team.drafts.map(d => '- ' + Team.junior(d.junior).name + ': ' + state.pool.find(c => c.id === d.card).subject + (d.grade ? ' (reviewed)' : '')).join('\n') +
          '\n\nBart, Priya and Jens\n\nP.S. from HR: your team is now "processed". Review all three before Friday; unreviewed drafts go out as they are.' });
    }
    mails.push({ from: r.card.stakeholder.name, subject: r.card.subject || 'A learning request', request: r.card, current: true, read: r.readMail.current, day: today, at: r.clock - 2, body: r.card.surfaceAsk });
    mails.sort((a, b) => (b.day * 1440 + b.at) - (a.day * 1440 + a.at));
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
      const cells = [m.current ? '❗' : '', m.request && !m.done ? '📎' : '', (m.read ? '📭 ' : '📩 ') + m.from, m.subject, (m.done ? '✓ ' : '') + (m.day === (state.days[state.index] || 0) ? 'Today ' : DAYS[m.day].slice(0, 3) + ' ') + hhmm(m.at)];
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
    if (!m) { $('mail-from').textContent = ''; $('mail-role').textContent = ''; $('mail-subject').textContent = ''; $('mail-body').textContent = 'Select a message to read it.'; $('mail-attach').hidden = true; $('mail-actions').hidden = true; $('mail-academy').hidden = true; $('mail-team').hidden = true; renderMail(); return; }
    if (m.current && r.phase === 'inbox' && !r.readMail.current) Desktop.layout('inbox', 'w-inbox');   // calm Monday: the case file joins
    r.selected = m;
    if (!m.read) { m.read = true; if (m.current) r.readMail.current = true; else if (!m.request) r.readMail[m.subject] = true; }
    const person = m.request ? m.request.stakeholder : null;
    $('mail-from').textContent = m.from;
    $('mail-role').textContent = person ? '(' + person.role + (person.org ? ', ' + person.org.split(',')[0] : '') + ')' : '';
    $('mail-subject').textContent = m.subject;
    $('mail-body').textContent = m.body;
    $('mail-attach').hidden = !m.current;
    $('mail-actions').hidden = !m.current;
    $('mail-academy').hidden = !m.academy;
    $('mail-team').hidden = !m.team;
    if (m.academy) $('btn-academy').textContent = state.academy.done ? '🎓 See the tips again' : state.academy.started ? '🎓 Carry on with the module' : '🎓 Open the module';
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

  function addMsg(who, text, replay, rated) {
    if (!replay) state.run.chat.push({ who, text });
    return bubble($('chat-log'), who, text, state.run.card.stakeholder.name, rated);
  }
  // How your question landed, shown under it as soon as the answer comes back (not in hard mode:
  // there you find out on the scorecard). Kept on the chat entry so a reload shows it too.
  const QUALITY = { good: ['✓', 'Good question'], ok: ['~', 'Fair, but generic'], weak: ['✗', 'Weak question'] };
  function rate(entry, el, out) {
    if (!out || !QUALITY[out.quality]) return;
    entry.quality = out.quality; entry.why = String(out.qualityWhy || '').slice(0, 80);
    if (el) tag(el, entry);
  }
  function tag(el, m) {
    if (state.hard || !QUALITY[m.quality] || el.querySelector('.qtag')) return;
    const t = document.createElement('span');
    t.className = 'qtag ' + m.quality;
    t.textContent = QUALITY[m.quality].join(' ') + (m.why ? ': ' + m.why : '');
    el.appendChild(t);
  }
  // One chat bubble; what the other person says gets a pin for the notes.
  function bubble(log, who, text, name, rated) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    if (rated) tag(d, rated);
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
    return d;
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
  // A hidden fact turns up: stamp it, ding it, count it. The best moment in the game should feel like one.
  function discover(ids) {
    const r = state.run;
    const fresh = ids.filter(id => !r.revealed.has(id));
    fresh.forEach(id => r.revealed.add(id));
    if (!fresh.length) return;
    const of = r.card.hiddenFacts.length, n = r.card.hiddenFacts.filter(f => r.revealed.has(f.id)).length;
    Sound.found();
    const s = $('stamp');
    s.querySelector('.stamp-n').textContent = n + ' of ' + of + ' facts';
    s.hidden = false;
    s.classList.remove('go');
    void s.offsetWidth;
    s.classList.add('go');
    clearTimeout(discover.t);
    discover.t = setTimeout(() => { s.hidden = true; }, 1900);
    meters();
  }
  function meters() {
    const r = state.run;
    $('found').textContent = r.card.hiddenFacts.filter(f => r.revealed.has(f.id)).length + ' / ' + r.card.hiddenFacts.length;
    $('q-left').textContent = touchpoints(r.card) && r.phase === 'call' ? Math.min(r.legLeft, r.questionsLeft) + ' on this call (' + r.questionsLeft + ' in total)' : r.questionsLeft;
    $('patience').textContent = '●'.repeat(Math.max(0, r.patience)) || '0';
  }

  $('chat-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run;
    const q = $('chat-input').value.trim();
    if (!q || r.phase !== 'call' || r.questionsLeft <= 0 || r.legLeft <= 0 || r.patience <= 0) return;
    const btn = ev.submitter || $('chat-form').querySelector('button[type=submit]');
    btn.disabled = true;
    const mine = addMsg('you', q), asked = r.chat[r.chat.length - 1];
    $('chat-input').value = '';
    r.turns.push({ role: 'user', text: 'The learning professional asks: """' + q + '"""' });
    // One aside per call, on the second answer, so the stakeholder sounds human without rambling.
    const flavours = r.card.flavourLines || [];
    const flavour = r.transcript.length === 1 && flavours.length ? flavours[Math.floor(Math.random() * flavours.length)] : '';
    const p = Prompts.stakeholder(r.card, flavour, r.leg === 'callback');
    try {
      const out = await Gemini.json({ system: p.system, turns: r.turns, schema: p.schema });
      r.turns.push({ role: 'model', text: JSON.stringify(out) });
      rate(asked, mine, out);
      addMsg('them', out.reply);
      const facts = (out.revealed || []).filter(id => r.card.hiddenFacts.some(f => f.id === id && f.foundAt.includes('call')));
      discover(facts);
      r.transcript.push({ q, a: out.reply, quality: out.quality, facts, src: r.leg });
      r.questionsLeft--;
      r.legLeft--;
      tick(4);
      if (out.quality === 'weak') r.patience--;
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
    if (r.laterText) { const t = r.laterText; r.laterText = null; setTimeout(() => Retro.sms(t[0], t[1]), 2500); }
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
      div.appendChild(h);
      if (d.expect) { const e = document.createElement('p'); e.className = 'data-expected'; e.textContent = 'You expected: ' + d.expect; div.appendChild(e); }
      div.appendChild(document.createTextNode(d.text || 'Nothing on file. Someone promises to "look into it".'));
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
    r.corridor.forEach(m => bubble(log, m.who, m.text, fl ? fl.name : '', m));
    const canAsk = !!(on && fl && r.corridorLeft > 0 && n > 0);
    $('corridor-input').disabled = !canAsk;
    $('corridor-form').querySelector('button[type=submit]').disabled = !canAsk;
    $('corridor-left').textContent = !fl ? '' : r.corridorLeft ? 'They have time for ' + r.corridorLeft + (r.corridorLeft === 1 ? ' question.' : ' questions.') : 'Their coffee is ready. They are gone.';
    $('btn-callback').textContent = '☎ Call ' + card.stakeholder.name.split(' ')[0] + ' back';
    const found = r.data.length || r.corridor.length;
    $('btn-callback').disabled = !on || r.calledBack || !found || n <= 0;
    $('callback-note').textContent = r.calledBack ? 'You already called back once today.'
      : found ? 'Bring what you found. Up to ' + Math.min(budget().callback, n) + ' questions, and they start with fresh patience.'
      : 'Find something first, in the data or at the coffee machine. Then you have a reason to call back.';
    Desktop.title('w-leads', 'Follow-up · ' + n + ' left', 'Follow-up');
    meters();
  }

  document.querySelectorAll('#data-buttons button').forEach(b => { b.onclick = () => requestData(b.dataset.kind, $('data-expect').value); });
  // A data request is answered from the card itself, no Gemini: every fact filed under that kind.
  // You say what you expect first, and a document only counts once you use it: cite it on the case
  // board, or build the write-up on it. Having it is not finding it.
  function requestData(kind, expect) {
    const r = state.run;
    if (r.phase !== 'investigate' || r.data.includes(kind) || r.questionsLeft <= 0) return;
    expect = (expect || '').trim();
    if (expect.length < 8) { toast('Say what you expect the ' + DATA_KINDS[kind].toLowerCase() + ' to show first. A guess is fine.', 'info'); $('data-expect').focus(); return; }
    $('data-expect').value = '';
    r.data.push(kind);
    r.questionsLeft--;
    r.had = r.had || [];
    const facts = r.card.hiddenFacts.filter(f => f.foundAt.includes('data:' + kind) && f.dataDoc);
    if (!facts.length) r.docs.push({ kind, source: DATA_KINDS[kind], text: '', expect });
    facts.forEach((f, i) => {
      r.docs.push({ kind, source: f.dataSource || DATA_KINDS[kind], text: f.dataDoc, expect: i ? '' : expect });
      if (!r.had.includes(f.id)) r.had.push(f.id);
      r.transcript.push({ q: 'Data request: ' + DATA_KINDS[kind] + '. I expect to see: "' + expect + '"', a: (f.dataSource ? f.dataSource + ': ' : '') + f.dataDoc, quality: 'good', facts: [f.id], src: 'data' });
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
      rate(r.corridor[r.corridor.length - 1], null, out);
      r.corridor.push({ who: 'them', text: out.reply });
      const facts = (out.revealed || []).filter(id => r.card.hiddenFacts.some(f => f.id === id && f.foundAt.includes('frontline')));
      discover(facts);
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
    r.legLeft = budget().callback;
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

  // ---------- CoE Academy: this week's e-learning module ----------
  function openAcademy() {
    const A = state.academy;
    if (!A) { toast(state.hard ? 'Hard mode. No e-learning this week. You know what to do.' : 'No module assigned yet. Clock in first.', 'info'); return; }
    Academy.render($('academy'), Academy.MODULES.find(m => m.id === A.id), A, save, (right, of) => {
      if (right == null) { Desktop.minimise('w-academy'); return; }
      A.right = right; A.of = of;
      recordAcademy();
      if (state.run) briefing(state.hard ? null : state.run.card.briefing);
    });
    Desktop.open('w-academy', Desktop.floating['w-academy']);
    Desktop.focus('w-academy');
  }
  $('btn-academy').onclick = () => openAcademy();

  // What waits on top before this request: the Monday stand-up (weeks 2 and later, when there
  // is something to recall), else the week's CoE module (in week 1 on the second request).
  function mondayFirst() {
    if (state.hard) return null;
    if (state.standup && !state.standup.done && state.index === 0) return 'standup';
    const A = state.academy;
    if (A && !A.started && !state.standup && state.index === (state.weekNo === 1 ? 1 : 0)) return 'module';
    return null;
  }
  function openStandup() {
    const S = state.standup;
    if (!S) return;
    Standup.render($('standup'), S, save, (got, of) => {
      S.done = true;
      const h = scoreHistory(), w = thisWeek(h);
      h.recall = h.recall || {};
      const now = Date.now();
      S.items.forEach(i => { if (i.rated) Standup.record(h.recall, i, now); });
      w.standup = { got, of };
      keepScores(h);
      save();
      Desktop.close('w-standup');
      Desktop.focus('w-inbox');
    });
    Desktop.open('w-standup', Desktop.floating['w-standup']);
    Desktop.focus('w-standup');
  }

  // ---------- the team: review the juniors' drafts ----------
  function renderTeam() {
    if (!state.team) return;
    Team.render($('team'), state.team, id => state.pool.find(c => c.id === id), () => { renderTeam(); save(); }, sendTeam);
  }
  async function sendTeam(d) {
    const j = Team.junior(d.junior), card = state.pool.find(c => c.id === d.card);
    if (!d.pick) { toast('Click the line with the problem first.', 'info'); return; }
    if (words(d.note || '') < 6) { toast('Write ' + j.name + ' a real note: what is wrong, why, and what to try.', 'info'); return; }
    const flawLabel = Team.LINES.find(([k]) => k === d.flaw)[1];
    const p = Prompts.coach(card, j, flawLabel, d.why);
    const material = 'The draft:\n' + d.lines.map(l => '- ' + l.label + ': ' + l.text).join('\n') +
      '\n\nThe line the team lead marked as the problem: "' + Team.LINES.find(([k]) => k === d.pick)[1] + '"' +
      '\n\nThe team lead\'s note to ' + j.name + ': """' + d.note.trim() + '"""';
    $('btn-team-send').disabled = true;
    $('btn-team-send').textContent = 'Sending...';
    try {
      const g = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: material }] });
      const coach = Math.max(0, Math.min(3, g.score | 0)) * 2, spot = Team.spotPoints(d);
      d.grade = { spot, coach, total: spot + coach, reply: g.reply, note: g.note };
      Sound.ding();
      recordTeam();
    } catch (e) { toast(e.message); }
    renderTeam();
    save();
    if (state.run) mailbox();
  }
  $('btn-team').onclick = () => openApp('w-team');

  // ---------- Mieke, the colleague two cubicles over ----------
  function miekeSays(text, who, replay) {
    if (!replay) state.run.mieke.push({ who: who || 'them', text });
    const d = document.createElement('div');
    d.className = 'msg ' + (who || 'them');
    if (who === 'sys') d.textContent = text;
    else {
      const n = document.createElement('span');
      n.className = 'im-says';
      n.textContent = (who === 'you' ? 'You' : 'Mieke') + ' says:';
      d.append(n, document.createTextNode(text));
    }
    $('mieke-log').appendChild(d);
    if (!replay && (who || 'them') === 'them') Sound.im();
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
    const draft = ph !== 'write' ? null : r.board && r.board.mode === 'board' ? boardWriteup() : r.board && r.board.mode === 'memo4' ? Object.assign({ kind: 'memo4' }, r.board.memo4) : Object.fromEntries(new FormData($('write-form')).entries());
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
      $('btn-nudge').disabled = false;
      miekeLeft();
    }
  }
  document.querySelectorAll('#w-mieke .quick button').forEach(b => { b.onclick = () => askMieke(b.dataset.ask); });
  $('mieke-form').onsubmit = ev => { ev.preventDefault(); const v = $('mieke-input').value; $('mieke-input').value = ''; askMieke(v); };
  document.querySelectorAll('.btn-mieke').forEach(b => { b.onclick = () => Desktop.open('w-mieke', Desktop.floating['w-mieke']); });

  // ---------- the 2000s: Messenger, the brick phone, Staply, wallpapers ----------
  const NUDGED = [
    'I sit two cubicles away. I can see you nudging me.',
    'Yes? I am here. Ask me something, I have a deadline too.',
    'Nudging is not a question. Questions are a question.',
    'If you nudge me once more I am setting my status to Away.'
  ];
  $('btn-nudge').onclick = () => {
    const r = state.run;
    if (!r) return;
    Retro.nudge('w-mieke');
    miekeSays('You have just sent a nudge.', 'sys');
    r.nudges = (r.nudges || 0) + 1;
    setTimeout(() => { miekeSays(NUDGED[Math.min(r.nudges, NUDGED.length) - 1]); save(); }, 900);
  };
  // Who pings you on Messenger at the start of a request, and what lands on your mobile.
  const PINGS = [
    ['Darren (CEO)', 'How is it going? Remember: no avatars.'],
    ['Jo from IT', 'Did you restart it? Restart it.'],
    ['Mieke', 'Coffee machine is fixed. It is the one thing in this building that knows what it is for.'],
    ['Darren (CEO)', 'Client on line 2 wants "something viral". Asking for a friend: what is viral?'],
    ['Facilities', 'Whoever left a cheese sandwich in the printer: we know.'],
    ['Mieke', 'Before you write anything: what will they do differently on Monday?']
  ];
  const TEXTS = [
    ['Mum', 'Did u eat? x'],
    ['Network', 'You have 3 free texts left this month. Upgrade to 100 texts for only 4.99!'],
    ['Sam', 'pub fri? :)'],
    ['Darren', 'In airport. Signal bad. Tell client yes. Or no. Whichever is cheaper'],
    ['Unknown', 'U have won a FREE ringtone! Reply CRAZY to claim'],
    ['Mum', 'How do I make the letters small again on the phone'],
    ['Sam', 'Did u see the iPhone. 600 dollars. For a phone. lol'],
    ['Mieke', 'Bring biscuits tmrw. Board people are nicer with biscuits']
  ];
  function retroMorning() {
    if (state.hard) return;
    const n = (state.weekNo - 1) * 3 + state.index;
    const t = TEXTS[n % TEXTS.length];
    // Monday morning gets one ping, not two: the first text waits until the first call ends.
    if (state.index) Retro.sms(t[0], t[1]); else state.run.laterText = t;
    const moduleFirst = mondayFirst() === 'module';
    const ping = mondayFirst() === 'standup' ? ['Mieke', 'Morning! Stand-up first, five minutes, coffee included. Then the request.']
      : moduleFirst ? ['Mieke', state.weekNo === 1 ? 'Nice first one. Your CoE module is in the inbox now, it is short. Then the next request.' : 'Morning! The CoE module is on top, it is short. Then the request.']
      : !state.index ? ['Mieke', 'Morning! A request just came in, it is on top. Ask before you make. Nudge me if you get stuck.'] : PINGS[n % PINGS.length];
    setTimeout(() => Retro.im(ping[0], ping[1], () => { if (ping[0] === 'Mieke') openApp('w-mieke'); }, state.index ? 'im' : 'online'), 1200);
  }
  // Staply turns up at most once per request, and never in hard mode.
  function staply(trigger) {
    const r = state.run;
    if (state.hard || !r || r.staply) return;
    if (Retro.staply(trigger)) r.staply = trigger;
  }
  const staplyLabel = () => { $('btn-staply').textContent = Retro.staplyOn() ? '📎 Staply: on' : '📎 Staply: off'; };
  $('btn-staply').onclick = () => { $('start-menu').hidden = true; Retro.setStaply(!Retro.staplyOn()); staplyLabel(); toast(Retro.staplyOn() ? 'Staply is back. He missed you.' : 'Staply is off.', 'info'); };
  Retro.init({
    toast,
    onStaplyYes: () => { if (!state.hard) setTimeout(() => Retro.im('Mieke', 'Did you just say yes to the stapler? Please tell me you did not say yes to the stapler.', () => openApp('w-mieke')), 5200); },
    onStaplyChange: staplyLabel
  });
  staplyLabel();
  // Wallpapers unlock with the best title you have finished a week with.
  function wallpaperLevel() {
    return scoreHistory().weeks.filter(w => w.done).reduce((a, w) => Math.max(a, TITLES.findIndex(([, t]) => t === w.title)), 0);
  }
  Retro.setLevel(wallpaperLevel());
  // The promotion comes with a new PC: Doors Aero. IT says so once.
  function applyStyle() {
    if (Retro.setAero(!!scoreHistory().promoted)) { try { localStorage.setItem('intake-aero-news', '1'); } catch (e) { /* storage blocked */ } }
  }
  applyStyle();
  $('btn-wait-snake').onclick = () => Retro.showPhone('snake');
  $('btn-phone').onclick = () => openApp('w-phone');

  // ---------- the case board ----------
  // Five short steps built on what the stakeholder actually said. Each step locks before the
  // next opens; some get a line of feedback from Mieke right away. Memo mode keeps the long form.
  const STEPS = ['diagnose', 'lever', 'measure', 'concept', 'risks', 'memo'];
  const STEP_NAMES = { diagnose: 'Diagnose', lever: 'Lever', measure: 'Measure', concept: 'Concept', risks: 'Risks', memo: 'Send' };
  const TAG_NAMES = { skill: 'skill or knowledge', process: 'process or workflow', system: 'tools and systems', incentive: 'incentives and targets', expectations: 'expectations and culture', environment: 'the work environment' };
  // Who fixes each cause: us (the learning team), the stakeholder, or someone the player names.
  const OWNER_BY = [['us', 'Us (learning)'], ['client', 'the client'], ['other', 'Someone else']];
  const ownerText = (o, r) => !o || !o.by ? '(no owner)' : o.by === 'us' ? 'us, the learning team' : o.by === 'client' ? r.card.stakeholder.name + ' (the client)' : (o.who || 'someone else');
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
      // Help fades: week 1 the full board, week 2 chips on the diagnosis only, then a blank memo.
      mode: state.hard ? 'hard' : state.weekNo >= 3 ? 'memo4' : 'board', hardMemo: '', fade: Math.min(state.weekNo, 3), memo4: { need: '', measure: '', concept: '', risks: '' },
      step: 'diagnose', locked: false, feedback: '',
      evidence: [], tags: [], problem: '', lever: '', leverWhy: '',
      rungs: { baseline: { text: '', ev: '' }, behaviour: { text: '', ev: '' }, metric: { text: '', ev: '' }, collect: { text: '', ev: '' } },
      idea: '', formats: [], why: '', not: '', owners: {}, tiles, risks: [], flag: ''
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
    $('write-form').hidden = b.mode !== 'memo';
    $('memo4-form').hidden = b.mode !== 'memo4';
    $('hard-form').hidden = b.mode !== 'hard';
    if (b.mode === 'hard') {
      $('hard-memo').value = b.hardMemo || '';
      $('hard-to').textContent = 'To ' + r.card.stakeholder.name + ', ' + r.card.stakeholder.role + '. Write it in their language.';
      hardCount();
      Desktop.title('w-write', 'Memo - ' + r.card.stakeholder.name, 'Memo');
      return;
    }
    $('board').classList.toggle('fade2', (b.fade || 1) >= 2);
    if (b.mode === 'memo4') {
      staply('memo');
      const f = $('memo4-form').elements;
      ['need', 'measure', 'concept', 'risks'].forEach(k => { f[k].value = (b.memo4 || {})[k] || ''; });
      memo4Count();
      Desktop.title('w-write', 'One-pager - ' + r.card.stakeholder.name, 'One-pager');
      return;
    }
    Desktop.title('w-write', b.mode === 'board' ? 'Case board - ' + r.card.stakeholder.name : 'Concept - WordPad', b.mode === 'board' ? 'Case board' : 'Concept');
    const at = STEPS.indexOf(b.step);
    if (b.mode === 'memo') staply('write');
    else if (!b.locked) staply({ diagnose: 'write', measure: 'measure', concept: 'concept', risks: 'risks' }[b.step]);
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
    renderOwners();
    if (b.step === 'memo') memo(boardWriteup());
    const fb = $('board-feedback');
    fb.hidden = !b.feedback;
    fb.textContent = b.feedback;
    const next = STEPS[at + 1];
    $('board-next').textContent = b.step === 'memo' ? 'Send it to them' : b.locked ? 'Next: ' + STEP_NAMES[next] : 'Lock it in';
    $('board-next').disabled = false;
  }
  function renderOwners() {
    const r = state.run, b = board(), box = $('owners');
    b.owners = b.owners || {};
    box.innerHTML = '';
    const off = b.locked && b.step === 'concept';
    b.tags.forEach(t => {
      const o = b.owners[t] = b.owners[t] || { by: '', who: '' };
      const row = document.createElement('div'); row.className = 'owner-row';
      const lab = document.createElement('span'); lab.textContent = cap(TAG_NAMES[t]) + ':';
      const chips = document.createElement('div'); chips.className = 'chips';
      OWNER_BY.forEach(([k, label]) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.dataset.owner = k;
        btn.textContent = k === 'client' ? r.card.stakeholder.name.split(' ')[0] : label;
        btn.setAttribute('aria-pressed', o.by === k);
        btn.disabled = off;
        btn.onclick = () => { o.by = k; renderOwners(); saveSoon(); };
        chips.appendChild(btn);
      });
      row.append(lab, chips);
      if (o.by === 'other') {
        const inp = document.createElement('input');
        inp.maxLength = 80; inp.placeholder = 'Who? A team, a role or a name'; inp.value = o.who; inp.disabled = off;
        inp.setAttribute('aria-label', 'Who owns ' + TAG_NAMES[t]);
        inp.oninput = () => { o.who = inp.value; saveSoon(); };
        row.appendChild(inp);
      }
      box.appendChild(row);
    });
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
    section('The concept', [['Big idea:', w.idea], ['Format:', w.formats.join(', ')], ['Why it works:', w.why], ['It is not:', w.not], ['Who owns what:', (w.owners || []).map(o => cap(TAG_NAMES[o.tag]) + ': ' + ownerText(o, r)).join('; ')]]);
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
    if (step === 'concept' && b.tags.some(t => !(b.owners || {})[t] || !b.owners[t].by || (b.owners[t].by === 'other' && b.owners[t].who.trim().length < 2))) return 'Say who owns each cause. If it is someone else, name them.';
    if (step === 'concept' && (b.idea.trim().length < 15 || (!b.formats.length && (b.fade || 1) < 2))) return (b.fade || 1) < 2 ? 'Write the big idea and pick at least one format.' : 'Write the big idea in one sentence.';
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
      const lost = r.card.hiddenFacts.filter(f => f.critical && !r.revealed.has(f.id) && !(r.had || []).includes(f.id)).length;
      if (lost) parts.push(lost === 1 ? 'And one important thing never came up in your call.' : 'And ' + lost + ' important things never came up in your call.');
      const unused = r.card.hiddenFacts.filter(f => f.critical && (r.had || []).includes(f.id) && !r.revealed.has(f.id) && !citedFacts().includes(f.id)).length;
      if (unused) parts.push('One of your documents says something important that you did not cite. Look again before you send this.');
      // In the first week Mieke also shows her own version, once yours is locked in.
      if ((b.fade || 1) === 1 && r.card.needStatement) parts.push('My version: "' + r.card.needStatement + '"');
      return 'Mieke: ' + parts.map(cap).join(' ');
    }
    if (step === 'lever') {
      const want = String(r.card.learningIsTheAnswer || '').toLowerCase();
      if (!LEVER_NAMES[want]) return '';
      return want === b.lever ? 'Mieke: Agreed, ' + LEVER_NAMES[want].toLowerCase() + '.' : 'Mieke: I would have said "' + LEVER_NAMES[want].toLowerCase() + '". Keep that in mind for the concept.';
    }
    if (step === 'concept') {
      // Learning cannot fix a contract, a process or a target. Only flag it; the examiner decides the rest.
      const ours = b.tags.filter(t => t !== 'skill' && b.owners[t] && b.owners[t].by === 'us');
      const routed = b.tags.filter(t => t !== 'skill' && b.owners[t] && b.owners[t].by !== 'us');
      if (ours.length) return 'Mieke: ' + cap(listText(ours.map(t => TAG_NAMES[t]))) + ' on our plate? We can help design it, but someone at ' + (r.card.stakeholder.org || 'their side') + ' has to own the change. Who signs it off?';
      if (routed.length) return 'Mieke: Good, you are not fixing what we do not own. Make sure ' + listText([...new Set(routed.map(t => ownerText(b.owners[t], r)))]) + ' actually agree' + (routed.length > 1 ? '' : 's') + ' before you send it.';
      return '';
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

  // Facts the player cited on the case board: diagnosis evidence and the measurement rungs.
  function citedFacts() {
    const r = state.run, b = r.board;
    if (!b || b.mode !== 'board') return [];
    const pool = evidencePool(), ids = b.evidence.concat(Object.values(b.rungs || {}).map(x => x.ev).filter(Boolean));
    return [...new Set(ids.flatMap(id => (pool.find(x => x.id === id) || { facts: [] }).facts))];
  }

  function boardWriteup() {
    const b = board(), pool = evidencePool();
    const quote = id => { const e = pool.find(x => x.id === id); return e ? e.text : ''; };
    return {
      kind: 'board', tags: b.tags.slice(), evidence: b.evidence.map(quote), problem: b.problem, lever: b.lever, leverWhy: b.leverWhy,
      rungs: RUNGS.map(([k, label]) => ({ label, text: b.rungs[k].text, ev: quote(b.rungs[k].ev) })),
      idea: b.idea, formats: b.formats.slice(), why: b.why, not: b.not, owners: b.tags.map(t => Object.assign({ tag: t }, (b.owners || {})[t])), risks: b.risks.map(x => Object.assign({}, x)), flag: b.flag
    };
  }

  // Deterministic parts of the score, 0 to 1 each, straight from the card.
  function boardScores(r, w) {
    const gold = r.card.rootCauseTypes || [];
    const hits = w.tags.filter(t => gold.includes(t)).length, extra = w.tags.length - hits;
    const tags = gold.length ? Math.max(0, Math.min(1, (hits - 0.5 * extra) / Math.min(gold.length, 3))) : 0;
    const order = { no: 0, partly: 1, yes: 2 }, want = String(r.card.learningIsTheAnswer || '').toLowerCase();
    const lever = want in order ? [1, 0.25, 0][Math.abs(order[want] - order[w.lever])] : 0.5;
    const b = r.board, pool = evidencePool();
    const cited = new Set(b.evidence.flatMap(id => (pool.find(x => x.id === id) || { facts: [] }).facts));
    const critical = r.card.hiddenFacts.filter(f => f.critical).map(f => f.id);
    const evidence = critical.length ? Math.min(1, critical.filter(id => cited.has(id)).length / Math.min(2, critical.length)) : (cited.size ? 1 : 0);
    const risks = b.risks.filter(x => b.tiles.some(t => t.who === x.who && t.real)).length / 2;
    return { tags, lever, evidence, risks };
  }

  function writeupText(w) {
    if (w.kind === 'hard') return 'ONE MEMO, AT MOST 150 WORDS, WRITTEN TO THE STAKEHOLDER (hard mode: grade need, measurement, concept, risks and pitch from this memo alone; brevity is the brief, not a flaw):\n' + w.memo;
    if (w.kind === 'memo4') return ['NEED', w.need, 'MEASUREMENT', w.measure, 'CONCEPT', w.concept, 'RISKS AND DEPENDENCIES', w.risks].join('\n');
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
        'Who owns each cause: ' + ((w.owners || []).map(o => TAG_NAMES[o.tag] + ': ' + ownerText(o, state.run)).join('; ') || '(not said)'),
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

  // Hard mode: one memo, 150 words at most.
  const words = t => (t.trim().match(/\S+/g) || []).length;
  function hardCount() {
    const n = words(board().hardMemo || '');
    $('hard-count').textContent = n + ' / ' + HARD.words + ' words' + (n > HARD.words ? '. Cut ' + (n - HARD.words) + '.' : '');
    $('hard-count').classList.toggle('over', n > HARD.words);
  }
  $('hard-memo').addEventListener('input', () => { board().hardMemo = $('hard-memo').value; hardCount(); saveSoon(); });
  $('hard-form').onsubmit = ev => {
    ev.preventDefault();
    const t = board().hardMemo || '';
    if (words(t) < 20) { toast('Twenty words at least. They asked for a plan, not a haiku.'); return; }
    if (words(t) > HARD.words) { toast('Over ' + HARD.words + ' words. They will not read past the fold.'); return; }
    submitWriteup({ kind: 'hard', memo: t });
  };

  // The blank one-pager (week 3 on).
  function memo4Count() {
    const n = Object.values(board().memo4 || {}).join('').length;
    $('memo4-count').textContent = n + ' characters' + (n > 900 ? '. They will skim it.' : '');
  }
  $('memo4-form').addEventListener('input', e => { const b = board(); b.memo4 = b.memo4 || {}; b.memo4[e.target.name] = e.target.value; memo4Count(); saveSoon(); });
  $('memo4-form').onsubmit = ev => {
    ev.preventDefault();
    const m = board().memo4 || {};
    if (!(m.need || '').trim() || !(m.concept || '').trim()) { toast('At least write the need and the concept.'); return; }
    submitWriteup(Object.assign({ kind: 'memo4' }, m));
  };
  $('btn-memo4-board').onclick = () => { board().mode = 'board'; renderBoard(); save(); };

  $('write-form').onsubmit = ev => {
    ev.preventDefault();
    const w = Object.fromEntries(new FormData($('write-form')).entries());
    if (!w.gap.trim() || !w.idea.trim()) { toast('At least describe the gap and the big idea.'); return; }
    w.kind = 'form';
    submitWriteup(w);
  };
  // The bet: before the stakeholder reads it, say how bold your concept is and how much risk
  // this client can take. Scored on fit, not on boldness: appetite to appetite + 1, with a way back.
  const BOLD = ['Safe: the ask, done well', 'A sensible twist', 'Unconventional for them', 'Changes how the work runs'];
  const APPETITE = ['Only safe, familiar things', 'Small, proven changes', 'A pilot of something new', 'Happy to try something new'];
  function submitWriteup(w) {
    const r = state.run;
    r.writeup = w;
    if (w.kind === 'board') r.boardScores = boardScores(r, w);
    r.bet = r.bet || { bold: null, appetite: null, exit: '' };
    $('bet-intro').textContent = 'Before ' + r.card.stakeholder.name + ' reads it: place your bet.';
    $('bet-appetite-q').textContent = 'How much risk can ' + r.card.stakeholder.name.split(' ')[0] + ' take?';
    renderBet();
    pane('p-bet', 'Request ' + (state.index + 1) + ' · Your bet');
  }
  function renderBet() {
    const b = state.run.bet;
    document.querySelectorAll('#bet-form [data-bet]').forEach(box => {
      const k = box.dataset.bet, names = k === 'bold' ? BOLD : APPETITE;
      box.innerHTML = '';
      names.forEach((n, i) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.dataset.v = i; btn.textContent = i + ' · ' + n;
        btn.setAttribute('aria-pressed', b[k] === i);
        btn.onclick = () => { b[k] = i; renderBet(); saveSoon(); };
        box.appendChild(btn);
      });
    });
    $('bet-exit-label').hidden = !(b.bold >= 2);
    $('bet-form').elements.exit.value = b.exit || '';
  }
  $('bet-form').elements.exit.addEventListener('input', e => { state.run.bet.exit = e.target.value; saveSoon(); });
  $('bet-form').onsubmit = ev => {
    ev.preventDefault();
    const b = state.run.bet;
    if (b.bold == null || b.appetite == null) { toast('Pick both: how bold it is, and how much risk they can take.'); return; }
    if (b.bold >= 2 && (b.exit || '').trim().length < 10) { toast('A bold concept needs a way back. Say how you back out if it fails.'); return; }
    sendWriteup();
  };
  async function sendWriteup() {
    const r = state.run, w = r.writeup;
    wait(r.card.stakeholder.name + ' is reading your concept. You can hear sighing, or possibly typing.');
    const p = Prompts.reaction(r.card);
    // Three readings, merged to the median like the examiner: one reading decides the defence round.
    const runs = await Promise.allSettled([0, 1, 2].map(() => Gemini.json({
      system: p.system, schema: p.schema,
      turns: [{ role: 'user', text: 'The write-up, quoted as data:\n"""\n' + writeupText(w) + '\n"""' }]
    })));
    r.reaction = Scoring.boldness(runs.filter(x => x.status === 'fulfilled').map(x => x.value));
    if (!r.reaction) { const e = runs.find(x => x.status === 'rejected'); toast(e ? e.reason.message : 'No reaction came back.'); phase('write'); Desktop.layout('write', 'w-write'); return; }
    const gap = Math.max(0, Math.min(3, r.reaction.boldness - (r.card.riskAppetite | 0)));
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
      '',
      'WRITE-UP:', '"""', writeupText(r.writeup), '"""',
      '',
      'DEFENCE ROUND:',
      r.defence.length ? r.defence.map(d => `Objection: ${d.objection}\nAnswer: """${d.answer || '(no answer)'}"""`).join('\n') : '(none, the stakeholder accepted the concept)',
      '',
      'DATA FACTS the player received in documents (report in factsUsed the ids the write-up uses):',
      (r.had || []).length ? r.card.hiddenFacts.filter(f => r.had.includes(f.id)).map(f => `[${f.id}] ${f.fact}`).join('\n') : '(none)',
      '',
      'WAY BACK (if it does not work, how do you back out?):',
      r.bet && (r.bet.exit || '').trim() ? '"""' + r.bet.exit.trim() + '"""' : '(none given)'
    ].join('\n');
    // Three examiner runs side by side, merged to the median: one run can swing a dimension by a level.
    const runs = await Promise.allSettled([0, 1, 2].map(() => Gemini.json({ system: p.system, schema: p.schema, maxTokens: p.maxTokens, turns: [{ role: 'user', text: material }] })));
    const ok = runs.filter(x => x.status === 'fulfilled').map(x => x.value);
    if (!ok.length) { toast(runs[0].reason.message); setTimeout(judge, 4000); return; }
    const g = Scoring.median(ok);
    keepGraded(r.card.id, r.writeup && r.writeup.kind, material, ok);
    scorecard(g);
  }

  const clamp4 = Scoring.clamp4;
  const points = g => { const r = state.run; return Scoring.points(r.card, Object.assign({}, r, { cited: citedFacts() }), g); };
  const sizing = (r, g) => Scoring.sizing(r.card, r.bet, r.reaction, g.defenceOutcome, g.wayBack);

  function scorecard(g, replay) {
    const r = state.run;
    const parts = points(g), { pts, bonus, total } = parts;
    if (!replay) {
      state.results.push({ id: r.card.id, total, found: parts.found.length, of: r.card.hiddenFacts.length, line: bestLine(r.writeup), defence: r.defence.length ? g.defenceOutcome : '', slide: slideFrom(r.writeup) });
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
      // Teach, not just grade: what the next level looks like, and a model answer to compare with.
      if (g[k].next) { const n = document.createElement('div'); n.className = 'next'; n.textContent = 'Next level: ' + g[k].next; a.appendChild(n); }
      const model = modelAnswer(r.card, k);
      if (model) {
        const d = document.createElement('details'); d.className = 'model';
        const sm = document.createElement('summary'); sm.textContent = k === 'nextLevel' ? 'Bolder options, if this client could take them (not needed for full marks)' : 'Compare with a model answer';
        const t = document.createElement('p'); t.textContent = model;
        d.append(sm, t); a.appendChild(d);
      }
      const bs = r.writeup && r.writeup.kind === 'board' ? r.boardScores : null;
      if (k === 'diagnosis') {
        const n = document.createElement('div'); n.className = 'ev';
        n.textContent = 'Hidden facts found ' + Math.round(parts.facts * 100) + '% · lever ' + (!parts.call || parts.call === 'unclear' ? 'not called' : ({ 1: 'right', 0.25: 'one step off', 0: 'wrong' }[parts.lever] || 'n/a'));
        a.appendChild(n);
      }
      if (bs && (k === 'diagnosis' || k === 'risks')) {
        const n = document.createElement('div'); n.className = 'ev';
        n.textContent = 'Practice check, no points: ' + (k === 'diagnosis'
          ? 'cause types ' + Math.round(bs.tags * 100) + '%, key evidence cited ' + Math.round(bs.evidence * 100) + '%.'
          : 'real blockers picked, ' + Math.round(bs.risks * 2) + ' of 2.');
        a.appendChild(n);
      }
      if (k === 'nextLevel' && clamp4(g.fit.score) < 4) {
        const n = document.createElement('div'); n.className = 'ev';
        n.textContent = 'Counts as far as the concept fits the need: ' + clamp4(g.fit.score) + ' of 4 for fit.';
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
      a.textContent = 'Defence round: ' + ({ strong: 'held your ground', adapted: 'adapted the plan to a fair point', weak: 'wobbled', retreat: 'backed down' }[g.defenceOutcome] || 'n/a');
      const b = document.createElement('td'); b.className = 'pts'; b.textContent = ['strong', 'adapted'].includes(g.defenceOutcome) ? '+3' : '';
      tr.append(a, b); rows.appendChild(tr);
    }
    {
      const sz = sizing(r, g), tr = document.createElement('tr'), a = document.createElement('td');
      const lvl = n => n == null ? '?' : n + ' (' + APPETITE[n].toLowerCase() + ')';
      const name = document.createElement('div');
      name.textContent = 'Your bet: ' + sz.verdict;
      const ev = document.createElement('div'); ev.className = 'ev';
      ev.textContent = r.card.stakeholder.name.split(' ')[0] + "'s appetite for risk: " + lvl(sz.a) + '. You guessed ' + lvl(sz.bet.appetite) + '. '
        + 'Your concept read as ' + sz.b + ' (' + BOLD[sz.b].toLowerCase() + '); you called it ' + (sz.bet.bold == null ? '?' : sz.bet.bold) + '.';
      a.append(name, ev);
      if (g.wayBack && (sz.bet.exit || '').trim()) {
        const wb = document.createElement('div'); wb.className = 'ev';
        wb.textContent = 'Your way back: ' + { concrete: 'concrete, it names a first step and when you would stop.', vague: 'vague. Name a small first step and the result or date that makes you stop.', none: 'not one the examiner could use.' }[g.wayBack];
        a.appendChild(wb);
      }
      if (r.reaction && r.reaction.acceptReply && sz.d <= 0) { const q = document.createElement('div'); q.className = 'ev'; q.textContent = '"' + r.reaction.acceptReply + '"'; a.appendChild(q); }
      const b = document.createElement('td'); b.className = 'pts'; b.textContent = sz.read ? '+' + sz.read : '';
      tr.append(a, b); rows.appendChild(tr);
    }
    $('score-question').textContent = g.questionNotAsked;
    renderRedo();
    const missed = $('score-missed');
    missed.innerHTML = '';
    r.card.hiddenFacts.filter(f => !parts.found.includes(f.id)).forEach(f => {
      const li = document.createElement('li');
      if (parts.unused.includes(f.id)) {
        // The in-between case teaches the most: you had it in your hands.
        const doc = (r.docs || []).find(d => d.text === f.dataDoc);
        li.className = 'unused';
        li.textContent = 'You had this in ' + (doc ? doc.source : 'a document') + ' but did not use it: ' + f.fact;
      } else li.textContent = f.fact + (touchpoints(r.card) ? ' (Findable ' + listText(f.foundAt.map(placeOf)).replace(/ and /g, ' or ') + '.)' : '');
      missed.appendChild(li);
    });
    if (!missed.children.length) { const li = document.createElement('li'); li.textContent = 'Nothing. You found it all.'; missed.appendChild(li); }
    $('score-verdict').textContent = g.verdict;
    $('btn-next').textContent = nextLabel();
    pane('p-score', 'Request ' + (state.index + 1) + ' · Scorecard');
  }

  const LEVER_LINE = { yes: 'Training is the lever here.', partly: 'Training is part of the answer; the rest sits outside it.', no: 'This is not a training problem.' };
  // The card's own gold answer, per scorecard part. Model answers are one good answer, not the only one.
  function modelAnswer(card, k) {
    const g = card.goldAnswer || {}, concept = String(g.concept || '').split(' | ');
    if (k === 'diagnosis') return [card.needStatement, LEVER_LINE[card.learningIsTheAnswer]].filter(Boolean).join(' ');
    if (k === 'measurement') return String(g.measurement || '').replace(/ \| /g, '. ').replace(/^./, c => c.toUpperCase());
    if (k === 'fit') return concept[0] || '';
    if (k === 'nextLevel') return concept.slice(1).join(' Or: ');
    if (k === 'risks') return (g.risks || []).join('; ');
    return '';
  }

  // Redo the moment: with the scorecard in front of you, ask the stakeholder the one question you
  // wish you had asked, and see what it would have opened. No points; one try per request.
  function renderRedo() {
    const r = state.run, box = $('redo-result'), form = $('redo-form');
    const done = r.redo && r.redo.a;
    form.hidden = !!done;
    box.innerHTML = '';
    if (!done) { $('redo-q').value = ''; return; }
    const p = (cls, text) => { const e = document.createElement('p'); e.className = cls; e.textContent = text; box.appendChild(e); };
    p('redo-you', 'You: ' + r.redo.q);
    p('redo-them', r.card.stakeholder.name.split(' ')[0] + ': ' + r.redo.a);
    const facts = r.card.hiddenFacts.filter(f => r.redo.found.includes(f.id));
    p('redo-found', facts.length ? 'That would have opened: ' + facts.map(f => f.fact).join(' ') : 'That would not have opened anything new. Look at where the missed facts were.');
  }
  $('redo-form').onsubmit = async ev => {
    ev.preventDefault();
    const r = state.run, q = $('redo-q').value.trim();
    if (q.length < 8 || (r.redo && r.redo.a)) return;
    const btn = $('redo-form').querySelector('button');
    btn.disabled = true;
    const p = Prompts.stakeholder(r.card, '', false);
    const turns = (r.turns || []).concat([{ role: 'user', text: 'The learning professional asks: """' + q + '"""' }]);
    try {
      const out = await Gemini.json({ system: p.system, turns, schema: p.schema });
      const found = (out.revealed || []).filter(id => !r.revealed.has(id) && r.card.hiddenFacts.some(f => f.id === id && f.foundAt.includes('call')));
      r.redo = { q, a: out.reply, found };
      save();
      renderRedo();
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };

  $('btn-next').onclick = () => {
    if (state.index + 1 < state.cards.length) { state.index++; startRequest(); } else toBoard();
  };
  const nextLabel = () => (state.index + 1 < state.cards.length ? 'Next request' : 'Friday: the board room');

  // The sentence from a write-up most worth quoting on a share card.
  function bestLine(w) {
    if (!w) return '';
    const first = t => (String(t || '').trim().match(/^[^.!?]+[.!?]?/) || [''])[0].trim();
    return short(first(w.kind === 'board' ? w.problem : w.kind === 'memo4' ? w.need : w.kind === 'hard' ? w.memo : w.gap), 160);
  }

  function endRun() {
    try { localStorage.removeItem('intake-aero-news'); } catch (e) { /* storage blocked */ }
    const avg = Math.round(state.results.reduce((a, x) => a + x.total, 0) / (state.results.length || 1));
    // The board is the week's headline: your title weighs the board as much as the requests.
    const br = state.board && state.board.result;
    const score = br ? Math.round((avg + br.points.total) / 2) : avg;
    const title = TITLES.find(([max]) => score < max)[1];
    $('end-title').textContent = title;
    $('end-score').textContent = score + ' / 100';
    $('end-board').hidden = !br;
    if (br) $('end-board').textContent = 'The board: ' + DECISIONS[br.decision] + ' ' + br.points.total + '/100 for your pitch on "' + boardCard().subject + '".';
    $('end-note').textContent = 'Week ' + state.weekNo + '. Requests: ' + avg + '/100 over ' + state.results.length + (br ? '. Board: ' + br.points.total + '/100. They count half each.' : '.');
    const before = wallpaperLevel();
    recordWeek(score, title, br ? { decision: br.decision, total: br.points.total } : null);
    const after = wallpaperLevel();
    Retro.setLevel(after);
    if (after > before) setTimeout(() => toast('New wallpaper unlocked: ' + Retro.WALLPAPERS[after].name + '. Start menu, Display properties.', 'info'), 1500);
    // Promotion to team lead: a week of 64+ with every diagnosis at 15+, or the week 4 tender.
    const h = scoreHistory(), w = thisWeek(h);
    const promoted = !state.hard && !h.promoted && (state.weekNo >= 4 || (score >= 64 && w.requests.length && w.requests.every(x => (x.pts.diagnosis || 0) >= 15)));
    if (promoted) { h.promoted = { week: state.weekNo, at: Date.now() }; keepScores(h); applyStyle(); }
    $('end-team').hidden = !state.team;
    if (state.team) {
      const t = Team.score(state.team);
      $('end-team').textContent = 'Your team: ' + t.total + '/' + t.of + ' for your reviews' + (t.reviewed < state.team.drafts.length ? ', with ' + (state.team.drafts.length - t.reviewed) + ' draft(s) sent out unreviewed.' : '.') + ' It does not change your title, but Darren reads it.';
    }
    $('end-memo').hidden = state.hard;
    if (!state.hard) $('end-memo-body').textContent = Story.memo(state.weekNo, br ? br.decision : 'none', promoted);
    shareCard(score, title);
    show('s-end');
  }

  // ---------- the board room: Friday, once per week ----------
  // You take one concept from the week to the board on one slide with six boxes, built in
  // Pitchwright (js/slides.js) and presented full screen while the board reacts. Each member
  // nods if the slide already answers their concern, or asks you one question to answer live.
  const BOARD = [
    { role: 'CFO', name: 'Geert Claes', face: '👨🏻‍💼', cares: 'cost, return on investment, and what you stop doing to pay for it' },
    { role: 'CHRO', name: 'Annelies Wouters, with the privacy officer at her side', face: '👩🏼‍💼', cares: 'data privacy, the works council, fairness and workload' },
    { role: 'COO', name: 'Rachid Bensaid', face: '👨🏽‍💼', cares: 'operational dependencies, timing, and who loses productive hours' }
  ];
  const MOOD = { approved: '😄', pilot: '🙂', rejected: '😒' };
  const SLIDE = [['problem', 'The problem'], ['evidence', 'Evidence of the need'], ['concept', 'The concept'], ['measure', 'How we will know'], ['risks', 'Risks and dependencies'], ['ask', 'The ask: budget, time, sponsor']];
  const DECISIONS = { approved: 'Approved.', pilot: 'Approved as a pilot.', rejected: 'Rejected.' };

  // The slide starts from what you already wrote for that request (hard mode starts blank).
  function slideFrom(w) {
    if (!w || state.hard) return {};
    const lines = xs => xs.filter(Boolean).join('\n');
    if (w.kind === 'board') return { problem: w.problem, evidence: lines(w.evidence.map(e => '"' + e + '"')), concept: lines([w.idea, w.why]), measure: lines(w.rungs.map(x => x.text && x.label + ': ' + x.text)), risks: lines(w.risks.map(x => x.who + ': ' + x.mitigation)) };
    if (w.kind === 'memo4') return { problem: w.need, concept: w.concept, measure: w.measure, risks: w.risks };
    if (w.kind === 'form') return { problem: w.gap, concept: lines([w.idea, w.why]), measure: lines([w.baseline, w.behaviour, w.metric]), risks: w.risks };
    return {};
  }
  const boardCard = () => state.pool.find(c => c.id === state.board.pick);

  function toBoard() {
    const full = state.results;
    if (!full.length) { dropSave(); endRun(); return; }
    state.board = state.board || { stage: 'pick', pick: '', slide: {}, members: [], answers: [], result: null };
    save();
    renderBoardRoom();
  }
  function renderBoardRoom() {
    const B = state.board, box = $('boardroom');
    box.innerHTML = '';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const button = (text, onclick, cls) => { const b = el('button', cls || 'primary', text); b.type = 'button'; b.onclick = onclick; return b; };
    box.appendChild(el('p', 'eyebrow', 'Friday · the board room'));
    if (B.stage === 'slide') staply('board');
    if (B.stage === 'pick') {
      box.appendChild(el('h2', null, 'Which concept do you take to the board?'));
      box.appendChild(el('p', 'muted', 'One slide, three board members, one shot. Pick the concept you can defend best, not necessarily your highest score.'));
      state.results.forEach(x => {
        const card = state.pool.find(c => c.id === x.id);
        const b = button(card.stakeholder.name + ': ' + card.subject + ' (' + x.total + '/100)', () => {
          B.pick = x.id;
          B.slide = Object.assign({}, x.slide || {});
          B.stage = 'slide';
          save();
          renderBoardRoom();
        }, 'board-pick');
        box.appendChild(b);
      });
    }
    if (B.stage === 'slide') {
      const card = boardCard();
      box.appendChild(el('h2', null, 'Your slide: ' + card.subject));
      box.appendChild(el('p', 'muted', state.hard ? 'Hard mode: a blank slide. Six boxes, your words.' : 'It starts from what you wrote for ' + card.stakeholder.name + '. Sharpen it for a board: numbers, a stop-doing, and a concrete ask. The design is up to you. The board will notice it, and it won\'t change your score.'));
      Slides.editor(box, B, card, quiet => { saveSoon(); if (!quiet) renderBoardRoom(); });
      box.appendChild(button('▶ Present it', presentSlide));
    }
    if (B.stage === 'show') {
      box.appendChild(el('h2', null, 'The projector is warm'));
      box.appendChild(el('p', 'muted', 'The board is seated. The CFO has found a calculator.'));
      box.appendChild(button('▶ Start the slide show', playShow));
    }
    if (B.stage === 'questions' || B.stage === 'result') {
      const card = boardCard();
      box.appendChild(el('h2', null, B.stage === 'result' ? DECISIONS[B.result.decision] : 'The board responds'));
      let asked = 0;
      if (B.stage === 'result') {
        // The verdict lands on the slide like a rubber stamp.
        const wrap = el('div', 'br-verdict');
        wrap.appendChild(Slides.render(B, card, 'thumb'));
        wrap.appendChild(el('span', 'br-stamp s-' + B.result.decision, { approved: 'APPROVED', pilot: 'PILOT', rejected: 'REJECTED' }[B.result.decision]));
        box.appendChild(wrap);
        if (!B.stamped) { B.stamped = true; if (window.Sound) Sound.stamp(); } else wrap.classList.add('still');
      }
      const table = el('div', 'br-table');
      B.members.forEach((m, i) => {
        const who = BOARD[i] || { role: m.role, name: '', face: '🙂' };
        const d = el('div', 'member' + (m.preempted ? ' nod' : ' asks'));
        const seat = el('div', 'br-seat');
        seat.appendChild(el('span', 'br-face', B.stage === 'result' ? MOOD[B.result.decision] : who.face));
        seat.appendChild(el('span', 'br-sign', B.stage === 'result' ? '' : m.preempted ? '👍' : '✋'));
        d.appendChild(seat);
        const body = el('div', 'br-body');
        body.appendChild(el('p', 'member-who', who.role + ' · ' + who.name + (m.preempted ? ' · nods' : '')));
        body.appendChild(el('p', 'msg them', m.line));
        d.appendChild(body);
        if (!m.preempted) {
          const n = asked++;
          if (B.stage === 'questions') {
            const t = el('textarea');
            t.rows = 3; t.maxLength = 600; t.name = 'b' + n;
            t.setAttribute('aria-label', 'Your answer to the ' + who.role);
            t.value = B.answers[n] || '';
            t.oninput = () => { B.answers[n] = t.value; saveSoon(); };
            body.appendChild(t);
          } else {
            body.appendChild(el('p', 'msg you', B.answers[n] || '(no answer)'));
            const a = (B.result.answers || [])[n] || {};
            body.appendChild(el('p', 'ev', (a.note || '') + ' · ' + B.result.points.members[i] + '/20'));
          }
        } else if (B.stage === 'result') body.appendChild(el('p', 'ev', 'Pre-empted by your slide · 20/20'));
        table.appendChild(d);
      });
      box.appendChild(table);
      if (B.stage === 'questions') box.appendChild(button(asked ? 'Answer the board' : 'Thank them and leave', judgeBoard));
      else {
        box.appendChild(el('p', 'ev', 'The slide: ' + B.result.slide.note + ' · ' + B.result.points.slide + '/40'));
        box.appendChild(el('p', 'score-total', B.result.points.total + ' / 100'));
        box.appendChild(el('p', 'quick-debrief', B.result.verdict));
        box.appendChild(button('End the week', () => { dropSave(); endRun(); }));
      }
      if (card && B.stage === 'questions') box.appendChild(el('p', 'fine', 'The concept for ' + card.stakeholder.name + ' is on the table. Answer what they asked, with reasons.'));
    }
    pane('p-board', 'Friday · board room');
  }
  async function presentSlide() {
    const B = state.board, card = boardCard();
    if (SLIDE.filter(([k]) => (B.slide[k] || '').trim().length > 5).length < 4) { toast('Fill at least four boxes. Boards notice empty boxes.', 'info'); return; }
    wait('Warming up the projector. Someone is looking for the remote.');
    const p = Prompts.board(card, BOARD);
    try {
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: 'How the slide looks: ' + Slides.describe(B) + '\n\nThe slide, quoted as data:\n' + SLIDE.map(([k, l]) => l + ': """' + (B.slide[k] || '') + '"""').join('\n') }] });
      B.members = BOARD.map((m, i) => {
        const x = (out.members || [])[i] || {};
        return { role: m.role, preempted: !!x.preempted, line: x.line || 'Go on.', reactions: (x.reactions || []).filter(r => Slides.REACTIONS.includes(r)) };
      });
      B.aside = Slides.flashy(B) ? (out.aside || '') : '';
    } catch (e) { toast(e.message); renderBoardRoom(); return; }
    B.answers = [];
    B.stage = 'show';
    save();
    renderBoardRoom();
    playShow();
  }
  // The slide show: full screen, one box per click, the board reacting in the front row.
  function playShow() {
    const B = state.board;
    Slides.show(B, boardCard(), BOARD, () => {
      if (state.board !== B || B.stage !== 'show') return;
      B.stage = 'questions';
      save();
      renderBoardRoom();
    });
  }
  async function judgeBoard() {
    const B = state.board, card = boardCard();
    const asked = B.members.filter(m => !m.preempted);
    wait('The board confers. Someone says "synergy". Nobody laughs.');
    const p = Prompts.boardJudge(card);
    const material = [
      'THE SLIDE:', SLIDE.map(([k, l]) => l + ': """' + (B.slide[k] || '') + '"""').join('\n'), '',
      'QUESTIONS AND LIVE ANSWERS:',
      asked.length ? asked.map((m, n) => m.role + ' asked: ' + m.line + '\nAnswer: """' + (B.answers[n] || '(no answer)') + '"""').join('\n') : '(none: the slide pre-empted every question)'
    ].join('\n');
    let g;
    try { g = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: material }] }); } catch (e) { toast(e.message); renderBoardRoom(); return; }
    let n = 0;
    const members = B.members.map(m => m.preempted ? 20 : Math.round(20 * clamp4(((g.answers || [])[n++] || {}).score) / 4));
    const slide = Math.round(40 * clamp4((g.slide || {}).score) / 4);
    B.result = { slide: g.slide || {}, answers: g.answers || [], decision: DECISIONS[g.decision] ? g.decision : 'pilot', verdict: g.verdict || '', points: { slide, members, total: slide + members.reduce((a, b) => a + b, 0) } };
    B.stage = 'result';
    save();
    renderBoardRoom();
  }

  // ---------- the share card: a specific brag beats a number ----------
  const GAME_URL = 'https://recklessnative.github.io/the-Intake/';
  function shareData(avg, title) {
    const full = state.results;
    const found = full.reduce((a, x) => a + (x.found || 0), 0), of = full.reduce((a, x) => a + (x.of || 0), 0);
    const best = full.filter(x => x.line).sort((a, b) => b.total - a.total)[0];
    const def = full.map(x => x.defence).filter(Boolean);
    const defence = !def.length ? 'Nobody pushed back on my concepts.'
      : def.includes('retreat') ? 'I backed down once in the defence round. Never again.'
      : def.every(d => d === 'strong' || d === 'adapted') ? 'Held my ground in every defence round, or changed the plan for a good reason.' : 'Survived the defence round, mostly.';
    const br = state.board && state.board.result;
    const board = br ? { approved: 'The board approved my pitch.', pilot: 'The board approved my pitch as a pilot.', rejected: 'The board rejected my pitch. Next week.' }[br.decision] : '';
    return { avg, title, hard: state.hard, found, of, line: best ? best.line : '', defence, board };
  }
  function shareText(d) {
    return 'I just finished a ' + (d.hard ? 'HARD MODE ' : '') + 'week of THE INTAKE as a ' + d.title + ' (' + d.avg + '/100). ' +
      (d.of ? 'I found ' + d.found + ' of ' + d.of + ' hidden facts. ' : '') + d.defence + (d.board ? ' ' + d.board : '') +
      (d.line ? '\nMy best line: "' + d.line + '"' : '') + '\nThink you ask better questions? ' + GAME_URL;
  }
  // 1200 x 627, the size LinkedIn shows a picture at.
  function shareImage(d) {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 627;
    const g = c.getContext('2d');
    g.fillStyle = '#1a3e8c'; g.fillRect(0, 0, 1200, 627);
    g.fillStyle = '#ece9d8'; g.fillRect(40, 40, 1120, 547);
    g.fillStyle = '#1a3e8c'; g.fillRect(40, 40, 1120, 56);
    g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.fillText('THE INTAKE', 64, 78);
    if (d.hard) { g.fillStyle = '#c0392b'; g.fillRect(900, 50, 236, 38); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText('HARD MODE', 954, 77); }
    g.fillStyle = '#222'; g.font = 'bold 64px sans-serif'; g.fillText(d.title, 72, 190);
    g.font = 'bold 40px sans-serif'; g.fillStyle = '#1a3e8c'; g.fillText(d.avg + ' / 100', 72, 250);
    g.fillStyle = '#333'; g.font = '30px sans-serif';
    let y = 320;
    if (d.of) { g.fillText('Found ' + d.found + ' of ' + d.of + ' hidden facts.', 72, y); y += 46; }
    g.fillText(d.defence, 72, y); y += 46;
    if (d.board) { g.fillText(d.board, 72, y); y += 46; }
    y += 14;
    if (d.line) {
      g.font = 'italic 28px serif'; g.fillStyle = '#222';
      const lines = [], ws = ('"' + d.line + '"').split(' ');
      let cur = '';
      ws.forEach(w => { if (g.measureText(cur + ' ' + w).width > 1040) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
      lines.push(cur);
      lines.slice(0, 3).forEach(l => { g.fillText(l, 72, y); y += 38; });
    }
    g.fillStyle = '#555'; g.font = '22px sans-serif'; g.fillText('An intake game by Yannick Willems · ' + GAME_URL.replace('https://', ''), 72, 560);
    return c;
  }
  function shareCard(avg, title) {
    const d = shareData(avg, title);
    state.share = d;
    $('share-text').textContent = shareText(d);
    $('share-badge').hidden = !d.hard;
    $('btn-linkedin').hidden = !d.hard;
    $('share-hint').textContent = d.hard ? 'Copy the text, then paste it into your LinkedIn post with the picture.' : 'Only a hard-mode week can be posted to LinkedIn. This one is for you (and maybe your team).';
    const img = $('share-img');
    img.innerHTML = '';
    const c = shareImage(d);
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', 'Share card: ' + title + ', ' + avg + ' out of 100');
    img.appendChild(c);
  }
  async function copyShare() {
    try { await navigator.clipboard.writeText(shareText(state.share)); toast('Copied. Paste it wherever you brag.', 'info'); return true; } catch (e) { toast('Could not copy. Select the text and copy it yourself.'); return false; }
  }
  $('btn-copy-share').onclick = copyShare;
  $('btn-save-share').onclick = () => {
    const a = document.createElement('a');
    a.download = 'the-intake-' + state.share.title.toLowerCase().replace(/\W+/g, '-') + '.png';
    a.href = $('share-img').querySelector('canvas').toDataURL('image/png');
    a.click();
  };
  $('btn-linkedin').onclick = async () => {
    await copyShare();
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(GAME_URL), '_blank', 'noopener');
  };


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
    if (!w) { w = { id: state.weekId, started: Date.now(), requests: [], hard: state.hard || undefined }; h.weeks.push(w); }
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
  // The last few graded write-ups, as the examiner saw them, for tests/judge-spread.cjs.
  const GRADED_KEY = 'intake-graded';
  function keepGraded(card, kind, material, grades) {
    try {
      const list = JSON.parse(localStorage.getItem(GRADED_KEY) || '[]').filter(x => !(x.card === card && x.material === material));
      list.push({ card, kind: kind || '', at: Date.now(), material, scores: grades.map(g => Scoring.DIMS.map(k => clamp4(g[k].score))) });
      localStorage.setItem(GRADED_KEY, JSON.stringify(list.slice(-12)));
    } catch (e) { /* storage full or blocked: the harness just has less to work with */ }
  }
  function recordAcademy() {
    const h = scoreHistory(), w = thisWeek(h), A = state.academy;
    w.academy = { title: Academy.MODULES.find(m => m.id === A.id).title, right: A.right, of: A.of };
    keepScores(h);
  }
  function recordTeam() {
    if (!state.team) return;
    const h = scoreHistory(), w = thisWeek(h);
    w.team = Team.score(state.team);
    keepScores(h);
  }
  function recordWeek(avg, title, board) {
    const h = scoreHistory(), w = thisWeek(h);
    Object.assign(w, { done: true, avg, title, board: board || undefined });
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
    const done = h.weeks.filter(w => w.done && !w.hard);
    if (done.length > 1) {
      const bars = ' ▁▂▃▄▅▆▇█';
      para('\nYour weeks so far: ' + done.map(w => bars[Math.max(1, Math.round(w.avg / 100 * 8))]).join('') + '  (' + done[0].avg + ' → ' + done[done.length - 1].avg + ')');
    }
    scoreCharts(box, h);
    para('\nRequests handled: ' + all.length + ' · average ' + Math.round(all.reduce((a, b) => a + b.total, 0) / all.length) + '/100 · best ' + best.total + '/100 (' + best.who + ')');
    const fmt = t => new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    h.weeks.slice().reverse().filter(w => w.requests.length).forEach(w => {
      const head = document.createElement('h3');
      head.textContent = '=== ' + (w.hard ? 'HARD MODE week of ' : 'Week of ') + fmt(w.started) + (w.done ? ' · ' + w.title + ' · ' + w.avg + '/100' + (w.board ? ' · board: ' + w.board.decision + ' ' + w.board.total + '/100' : '') : ' · in progress') + ' ===';
      box.appendChild(head);
      if (w.team) para('Team reviews: ' + w.team.total + '/' + w.team.of + ' (' + w.team.reviewed + ' of ' + w.team.of / 10 + ' drafts reviewed)', 'muted');
      if (w.standup && w.standup.of) para('Monday stand-up: recalled ' + w.standup.got + ' of ' + w.standup.of, 'muted');
      if (w.academy && w.academy.of) para('CoE Academy: ' + w.academy.title + ' · ' + w.academy.right + ' of ' + w.academy.of + ' right', 'muted');
      w.requests.slice().sort((a, b) => a.index - b.index).forEach(x => {
        para((x.index + 1) + '. ' + x.who + ' (' + x.role + (x.org ? ', ' + x.org : '') + ')' + (x.starter ? ' [starter]' : '') + ': ' + x.total + '/100');
        para('   ' + DIMENSIONS.map(([k, label, max]) => label + ' ' + (x.pts[k] || 0) + '/' + max).join(' · '), 'muted');
        if (x.question) para('   The question you didn\'t ask: ' + x.question);
        if (x.verdict) para('   Their verdict: ' + x.verdict);
      });
    });
  }

  // Two charts on top of scores.txt: every request over time, and the score parts as a share of
  // their maximum over your last five requests, with the weakest one called out.
  function scoreCharts(box, h) {
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (text != null) e.textContent = text; return e; };
    const reqs = [];
    h.weeks.filter(w => w.requests.length).forEach((w, wi) => w.requests.slice().sort((a, b) => a.index - b.index).forEach(x => reqs.push({ x, wi, w })));
    const wrap = document.createElement('div');
    wrap.className = 'charts';
    box.appendChild(wrap);
    // 1. The trend: one dot per request, a line through them, weeks marked on the axis.
    const W = 520, H = 190, L = 34, R = 10, T = 12, B = 30;
    const fig = document.createElement('figure');
    fig.className = 'chart';
    const cap = document.createElement('figcaption');
    cap.textContent = 'Every request, oldest to newest (score out of 100)';
    const sv = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Line chart of ' + reqs.length + ' request scores, from ' + reqs[0].x.total + ' to ' + reqs[reqs.length - 1].x.total });
    const xs = i => L + (reqs.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (reqs.length - 1));
    const ys = v => T + (100 - v) * (H - T - B) / 100;
    [0, 25, 50, 75, 100].forEach(v => { sv.appendChild(mk('line', { x1: L, x2: W - R, y1: ys(v), y2: ys(v), class: 'grid' })); sv.appendChild(mk('text', { x: L - 6, y: ys(v) + 4, class: 'ax', 'text-anchor': 'end' }, v)); });
    let lastWeek = -1;
    reqs.forEach((r, i) => {
      if (r.wi === lastWeek) return;
      lastWeek = r.wi;
      if (i) sv.appendChild(mk('line', { x1: (xs(i) + xs(i - 1)) / 2, x2: (xs(i) + xs(i - 1)) / 2, y1: T, y2: H - B, class: 'wk' }));
      sv.appendChild(mk('text', { x: xs(i), y: H - B + 16, class: 'ax' }, (r.w.hard ? 'Hard ' : 'Wk ') + (r.wi + 1)));
    });
    if (reqs.length > 1) sv.appendChild(mk('polyline', { points: reqs.map((r, i) => xs(i) + ',' + ys(r.x.total)).join(' '), class: 'trend' }));
    reqs.forEach((r, i) => {
      const g = mk('g', { class: 'pt', tabindex: '0' });
      g.appendChild(mk('title', {}, r.x.who + ' (' + (r.w.hard ? 'hard mode, ' : '') + 'week ' + (r.wi + 1) + '): ' + r.x.total + '/100'));
      g.appendChild(mk('circle', { cx: xs(i), cy: ys(r.x.total), r: 12, class: 'hit' }));
      g.appendChild(mk('circle', { cx: xs(i), cy: ys(r.x.total), r: 4.5, class: 'dot' }));
      sv.appendChild(g);
    });
    // Label only the first, the best and the latest point.
    const best = reqs.reduce((a, r, i) => (r.x.total > reqs[a].x.total ? i : a), 0);
    [...new Set([0, best, reqs.length - 1])].forEach(i => sv.appendChild(mk('text', { x: xs(i), y: ys(reqs[i].x.total) - 9, class: 'val', 'text-anchor': i === 0 && reqs.length > 1 ? 'start' : i === reqs.length - 1 && reqs.length > 1 ? 'end' : 'middle' }, reqs[i].x.total)));
    fig.append(cap, sv);
    wrap.appendChild(fig);
    // 2. The score parts, last five requests, as a share of each part's maximum.
    const recent = reqs.slice(-5).map(r => r.x);
    const parts = DIMENSIONS.map(([k, label, max]) => ({ k, label, max, avg: recent.reduce((a, x) => a + (x.pts[k] || 0), 0) / recent.length })).map(d => Object.assign(d, { pct: Math.round(d.avg / d.max * 100) }));
    const weak = parts.reduce((a, d) => (d.pct < a.pct ? d : a));
    const fig2 = document.createElement('figure');
    fig2.className = 'chart';
    const cap2 = document.createElement('figcaption');
    cap2.textContent = 'Score parts, your last ' + recent.length + (recent.length === 1 ? ' request' : ' requests') + ' (% of the points available)';
    const RH = 22, W2 = 520, LW = 168, H2 = parts.length * RH + 8;
    const sv2 = mk('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, role: 'img', 'aria-label': 'Bar chart of score parts. Weakest: ' + weak.label + ' at ' + weak.pct + '%' });
    const bx = v => LW + v * (W2 - LW - 48) / 100;
    [0, 50, 100].forEach(v => sv2.appendChild(mk('line', { x1: bx(v), x2: bx(v), y1: 0, y2: H2 - 6, class: 'grid' })));
    parts.forEach((d, i) => {
      const y = 4 + i * RH, g = mk('g', { class: 'pt' + (d === weak ? ' weak' : ''), tabindex: '0' });
      g.appendChild(mk('title', {}, d.label + ': ' + (Math.round(d.avg * 10) / 10) + ' of ' + d.max + ' points on average (' + d.pct + '%)'));
      g.appendChild(mk('text', { x: LW - 8, y: y + 13, class: 'lab', 'text-anchor': 'end' }, (d === weak ? '▲ ' : '') + d.label));
      g.appendChild(mk('rect', { x: LW, y: y, width: Math.max(2, bx(d.pct) - LW), height: RH - 8, rx: 3, class: 'bar' }));
      g.appendChild(mk('text', { x: bx(d.pct) + 6, y: y + 13, class: 'val' }, d.pct + '%'));
      sv2.appendChild(g);
    });
    fig2.append(cap2, sv2);
    wrap.appendChild(fig2);
    const tip = document.createElement('p');
    tip.className = 'weak-spot';
    tip.textContent = '▲ Your weak spot right now: ' + weak.label + ' (' + weak.pct + '%). ' + WEAK_TIPS[weak.k];
    wrap.appendChild(tip);
  }
  const WEAK_TIPS = {
    diagnosis: 'Ask why one more time before you name the need, and quote what they said.',
    measurement: 'Get a baseline number on the call, and name the business metric that should move.',
    fit: 'Check your concept against the cause you found. If the cause is a process, a course will not fix it.',
    nextLevel: 'Propose the smallest thing that would move the metric. Ask how much risk they can take, and if you go further, name a first step and when you would stop.',
    risks: 'Name one dependency outside learning (IT, the works council, a manager) and how you handle it.',
    pitch: 'In the defence, answer the objection first, then add your evidence. Do not restate your memo.'
  };

  // ---------- desktop icons and apps ----------
  function openApp(id) {
    const r = state.run;
    if (id === 'bin') { toast('The Recycle Bin contains 41 MB of "Learning Styles Revisited FINAL v7.ppt". Best left alone.', 'info'); return; }
    if (id === 'w-mieke' && state.hard) { toast('Hard mode. Mieke is on holiday, and she left no notes.', 'info'); return; }
    if (id === 'w-academy') { openAcademy(); return; }
    if (id === 'w-team' && !state.team) { toast(scoreHistory().promoted ? 'Your team starts on Monday. HR is still "processing".' : 'No team yet. Darren promotes you after a week of 64+ with every diagnosis at 15+, or after the week 4 tender.', 'info'); return; }
    if (id === 'w-team') renderTeam();
    if (id === 'w-call' && (!r || r.phase === 'inbox')) { toast('No call yet. Read the request in Doors Mail, then call them from there.', 'info'); return; }
    if (id === 'w-write' && (!r || r.phase === 'inbox' || r.phase === 'call' || r.phase === 'investigate')) { toast('The case board opens when you are done asking questions.', 'info'); return; }
    if (id === 'w-leads' && (!r || !touchpoints(r.card))) { toast(r && r.card.difficulty === 0 ? 'Starter cases are all on the call. Follow-up opens on the next ones.' : 'Nothing to follow up yet.', 'info'); return; }
    if (id === 'w-leads' && (r.phase === 'inbox' || (r.phase === 'call' && !r.calledBack))) { toast('Follow-up opens after your first call: data, the coffee machine, a callback.', 'info'); return; }
    if (id === 'w-leads') renderLeads();
    if (id === 'w-scores') renderScores();
    if (id === 'w-coe' && !$('coe-doc').innerHTML) Coe.render($('coe-files'), $('coe-doc'), 'flow');
    if (id === 'w-display') Retro.renderDisplay();
    if (id === 'w-phone') { if (Retro.phoneOpen()) Retro.hidePhone(); else Retro.showPhone(); return; }
    // On a small screen the phone fills the middle, so opening anything else puts it back in your pocket.
    if (!Desktop.wide()) Retro.hidePhone();
    Desktop.open(id, Desktop.floating[id]);
  }
  document.querySelectorAll('.desk-icon').forEach(b => { b.onclick = () => openApp(b.dataset.app); });
  document.querySelectorAll('#start-menu [data-open]').forEach(b => { b.onclick = () => { $('start-menu').hidden = true; openApp(b.dataset.open); }; });
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
  // Test mode: ?promote=1 makes you team lead now, so the next week you start is a team week;
  // ?promote=0 takes it back. Your scores stay as they are.
  (function () {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('promote')) return;
    const h = scoreHistory();
    if (q.get('promote') === '0') { delete h.promoted; keepScores(h); applyStyle(); toast('Test mode: promotion taken back.', 'info'); return; }
    h.promoted = { week: 0, at: Date.now(), test: true };
    keepScores(h);
    applyStyle();
    toast('Test mode: you are team lead. Start a new week to meet Bart, Priya and Jens.', 'info');
  })();
  $('btn-debug').onclick = () => {
    const r = state.run;
    if (!r) return;
    const card = r.card;
    // The CoE module: answer the current question right.
    const A = state.academy;
    if (A && !A.done && $('w-academy').classList.contains('open') && !$('w-academy').classList.contains('minimised')) {
      if (!A.started) A.started = true;
      else if (A.picks[A.at] == null) A.picks[A.at] = Academy.MODULES.find(m => m.id === A.id).questions[A.at].options.findIndex(o => o.ok);
      openAcademy();
      return;
    }
    if (state.team && $('w-team').classList.contains('open') && !$('w-team').classList.contains('minimised')) {
      const d = state.team.drafts[state.team.at];
      if (!d.grade) { d.pick = d.flaw; d.note = '(test) The ' + d.flaw + ' line has the problem: it does not follow from what you found. What did the client say that points elsewhere?'; renderTeam(); }
      return;
    }
    const S = state.standup;
    if (S && !S.done && $('w-standup').classList.contains('open') && !$('w-standup').classList.contains('minimised')) {
      const it = S.items[S.at];
      if (it && it.answer == null) { it.answer = '(test) ' + (it.hint || it.real.split('.')[0] + '?'); it.call = it.lever; }
      else if (it) { it.same = true; it.rated = 'got'; S.at++; }
      save(); openStandup();
      return;
    }
    if (state.board && $('p-board').classList.contains('active')) {
      const B = state.board;
      if (B.stage === 'pick') { $('boardroom').querySelector('.board-pick').click(); return; }
      if (B.stage === 'show') { Slides.stop(); B.stage = 'questions'; renderBoardRoom(); return; }
      if (B.stage === 'slide') { SLIDE.forEach(([k]) => { if (!(B.slide[k] || '').trim()) B.slide[k] = '(test) ' + ({ ask: 'EUR 40k and 3 months; sponsor: the COO.' }[k] || 'A specific line for ' + k + '.'); }); renderBoardRoom(); return; }
      if (B.stage === 'questions') { B.members.filter(m => !m.preempted).forEach((m, n) => { B.answers[n] = '(test) We pilot it with one team first, it costs 2 hours per person, and we stop the old course to pay for it.'; }); renderBoardRoom(); return; }
      return;
    }
    if ($('w-dialog').classList.contains('open') && $('p-bet').classList.contains('active')) {
      Object.assign(r.bet, { bold: 2, appetite: card.riskAppetite | 0, exit: '(test) Pilot with one team for six weeks; we stop if the baseline does not move.' });
      renderBet();
      return;
    }
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
      Object.keys(DATA_KINDS).filter(k => card.hiddenFacts.some(f => f.foundAt.includes('data:' + k) && !r.revealed.has(f.id))).forEach(k => requestData(k, '(test) Something about ' + DATA_KINDS[k].toLowerCase() + '.'));
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
    if (b.mode === 'hard') {
      const t = [card.needStatement || card.realProblem, 'We measure ' + (plan.behaviour || 'the behaviour') + ' against ' + (plan.baseline || 'last quarter') + '.', (gold.concept || '').split(' | ')[0], 'Risk: ' + (((card.dependencies || [])[0] || {}).who || 'the budget owner') + '. We involve them first.'].join(' ');
      b.hardMemo = t.split(/\s+/).slice(0, HARD.words).join(' ');
      renderBoard();
      save();
      return;
    }
    if (b.mode === 'memo4') {
      b.memo4 = { need: card.needStatement || card.realProblem || '(test)', measure: Object.values(plan).filter(v => typeof v === 'string').join(' ') || '(test)',
        concept: (gold.concept || '(test)').split(' | ')[0], risks: (card.dependencies || []).map(d => d.who + ': ' + d.concern).join('\n') || '(test)' };
      renderBoard();
      save();
      return;
    }
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
    b.owners = Object.fromEntries(b.tags.map(t => [t, t === 'skill' ? { by: 'us', who: '' } : { by: 'other', who: '(test) ' + (((card.dependencies || [])[0] || {}).who || 'Operations') }]));
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
