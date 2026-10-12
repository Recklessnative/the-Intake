// The office prototype for playtest Session B: one case played as a day at the client's office.
// A floor plan with four rooms, eight hours, people who move around, corridor chats, and a 15:00
// meeting with the stakeholder and two colleagues who want different things. Deliberately rough:
// no score, no save, one case. It reuses the game's cards, Gemini client and stakeholder prompts.
(function () {
  const $ = id => document.getElementById(id);
  const T0 = Date.now();
  const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const MEETING = 6;
  const ROOMS = {
    desk: { name: 'Your borrowed desk', x: 10, y: 10, w: 240, h: 150 },
    meeting: { name: 'Meeting room', x: 270, y: 10, w: 240, h: 150 },
    coffee: { name: 'Coffee corner', x: 10, y: 200, w: 180, h: 150 },
    floor: { name: 'Shop floor', x: 210, y: 200, w: 300, h: 150 }
  };
  // Who is where, hour by hour, until the meeting. Nobody waits for you.
  const WHERE = {
    S: ['meeting', 'floor', 'away', 'meeting', 'away', 'meeting'],
    F: ['floor', 'coffee', 'floor', 'floor', 'coffee', 'floor'],
    A: ['coffee', 'away', 'desk', 'coffee', 'away', 'away'],
    B: ['away', 'floor', 'coffee', 'away', 'floor', 'away']
  };
  const COLOUR = { S: '#1d4f91', F: '#2e6b2e', A: '#8f2b20', B: '#8a5a00' };
  const NAMES = ['Katrien Maes', 'Stefan Wouters', 'Annelies Peeters', 'Marc Dubois', 'Sofie Jacobs', 'Geert Lambrecht', 'Nathalie Renard', 'Wim De Smet'];
  const DESK_DATA = { kpi: 'KPIs and reports', org: 'Org chart and roles', policy: 'Policies and targets' };
  const FLOOR_DATA = { process: 'Process and systems', training: 'Past training' };
  const STANCE = { against: 'against', unsure: 'unsure', 'with you': 'with' };
  const PREDICT = [['commits', 'With me'], ['conditional', 'On the fence'], ['blocks', 'Against']];

  let raw, card, people, S;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (text, onclick, cls) => { const b = el('button', cls, text); b.type = 'button'; b.onclick = onclick; return b; };
  const short = (t, n) => t.length > n ? t.slice(0, t.lastIndexOf(' ', n - 1) > 8 ? t.lastIndexOf(' ', n - 1) : n - 1) + '…' : t;
  const first = name => String(name || '').replace(/^(Dr|Prof|Mr|Mrs|Ms)\.? /, '').split(' ')[0];
  const roomOf = (k, slot) => slot >= MEETING ? (k === 'F' ? 'floor' : 'meeting') : (WHERE[k] || [])[slot] || 'away';
  const here = (room, slot) => Object.keys(people).filter(k => roomOf(k, slot) === room);
  const label = k => people[k].name + (k === 'S' ? ' (asked for this)' : ' (' + people[k].role + ')');

  // ---- Choosing a case -------------------------------------------------------------------------
  async function pickCase() {
    const ids = await (await fetch('scenarios/index.json')).json();
    const all = await Promise.all(ids.map(id => fetch('scenarios/' + id + '.json').then(r => r.json())));
    const fit = all.filter(c => (c.tier === 1 || c.tier === 2) && (c.dependencies || []).length >= 2 && c.frontline && c.frontline.name);
    let last = '';
    try { last = localStorage.getItem('intake-office-last') || ''; } catch (e) { /* ignore */ }
    const pool = fit.filter(c => c.id !== last);
    raw = pool[Math.floor(Math.random() * pool.length)] || fit[0];
    try { localStorage.setItem('intake-office-last', raw.id); } catch (e) { /* ignore */ }
    card = Cards.normalise(raw);
    const taken = [card.stakeholder.name, card.frontline.name];
    const names = NAMES.filter(n => !taken.some(t => first(t) === first(n)));
    const dep = (d, i) => ({ name: names[i], role: d.who, concern: d.concern, ifIgnored: d.if_ignored });
    people = {
      S: { name: card.stakeholder.name, role: card.stakeholder.role },
      F: { name: card.frontline.name, role: card.frontline.role },
      A: dep(raw.dependencies[0], 0),
      B: dep(raw.dependencies[1], 1)
    };
    S = { slot: 0, at: 'desk', facts: new Set(), log: [], firstQ: null, caseOpen: false, read: {}, docs: [], turns: { S: [], F: [], A: [], B: [] }, talked: {}, stance: {}, chat: null, proposal: '', meeting: null, busy: false };
    $('intro-from').textContent = 'From: ' + card.stakeholder.name + ', ' + card.stakeholder.role + (card.stakeholder.org ? ', ' + card.stakeholder.org : '');
    $('intro-ask').textContent = card.surfaceAsk;
    $('hud-case').textContent = card.title || '';
  }

  // ---- Gemini ----------------------------------------------------------------------------------
  async function ready() {
    if (Gemini.key) return true;
    const typed = $('key').value.trim();
    if (typed) { Gemini.save(typed, Gemini.model, true); return true; }
    if (Gemini.hasBackend) {
      try {
        const r = await Gemini.backend('start');
        if (r.ok) { Gemini.runId = r.data.runId; return true; }
        $('intro-err').textContent = r.status === 402 ? 'No free runs left on the game server. Add your own Gemini key.' : (r.data.error || 'The game server said no.');
      } catch (e) { $('intro-err').textContent = 'Could not reach the game server.'; }
    }
    $('key-box').hidden = false;
    if (!$('intro-err').textContent) $('intro-err').textContent = 'Add a Gemini key first.';
    return false;
  }

  // ---- The day ---------------------------------------------------------------------------------
  function hud() {
    $('hud-clock').textContent = 'Monday ' + HOURS[Math.min(S.slot, 7)] + (S.slot < MEETING ? ' · meeting at 15:00' : '');
    $('hud-facts').textContent = 'Facts found ' + S.facts.size + ' of ' + card.hiddenFacts.length;
  }

  function spend(what) {
    S.log.push({ hour: HOURS[S.slot], room: ROOMS[S.at].name, what });
    S.chat = null;
    S.slot++;
    if (S.slot >= MEETING) startMeeting(); else render();
  }

  function discover(ids, where) {
    ids.forEach(id => { if (card.hiddenFacts.some(f => f.id === id && f.foundAt.includes(where))) S.facts.add(id); });
  }

  function drawPlan() {
    const svg = $('plan'), NS = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (text != null) e.textContent = text; return e; };
    svg.appendChild(mk('text', { x: 260, y: 186, 'text-anchor': 'middle', class: 'who', fill: '#5d584c', style: 'font: italic 12px Tahoma, sans-serif' }, 'corridor'));
    Object.entries(ROOMS).forEach(([id, r]) => {
      const g = mk('g', { class: 'room' + (S.at === id ? ' here' : ''), tabindex: 0, role: 'button', 'aria-label': r.name });
      g.appendChild(mk('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4 }));
      g.appendChild(mk('text', { x: r.x + 10, y: r.y + 22, class: 'name' }, r.name + (S.at === id ? '  · you' : '')));
      here(id, S.slot).forEach((k, i) => {
        g.appendChild(mk('circle', { cx: r.x + 18, cy: r.y + 46 + i * 22, r: 7, fill: COLOUR[k], class: 'dot' }));
        g.appendChild(mk('text', { x: r.x + 32, y: r.y + 50 + i * 22, class: 'who' }, first(people[k].name) + (k === 'S' ? ' (client)' : k === 'F' ? ' (floor)' : ' (' + short(people[k].role, 26) + ')')));
      });
      g.onclick = () => go(id);
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(id); } };
      svg.appendChild(g);
    });
    const list = $('rooms-list');
    list.innerHTML = '';
    Object.entries(ROOMS).forEach(([id, r]) => {
      const b = btn(r.name + (S.at === id ? ' (you are here)' : ''), () => go(id));
      const who = here(id, S.slot);
      b.appendChild(el('span', 'who', who.length ? who.map(k => first(people[k].name)).join(', ') : 'Nobody right now'));
      list.appendChild(b);
    });
    const day = $('day');
    day.innerHTML = '';
    HOURS.forEach((h, i) => day.appendChild(el('span', (i < S.slot ? 'past' : i === S.slot ? 'now' : '') + (i === MEETING ? ' meet' : ''), h.slice(0, 2))));
    const away = Object.keys(people).filter(k => roomOf(k, S.slot) === 'away');
    $('plan-hint').textContent = S.slot < MEETING ? (away.length ? 'Out this hour: ' + away.map(k => first(people[k].name)).join(', ') + '. ' : '') + 'Walking is free; doing something takes the hour.' : '';
  }

  function go(id) {
    if (S.chat || S.slot >= MEETING || S.busy) return;
    S.at = id;
    render();
  }

  function render() {
    hud();
    drawPlan();
    const P = $('panel');
    P.innerHTML = '';
    if (S.chat) { renderChat(P); return; }
    P.appendChild(el('h2', null, ROOMS[S.at].name + ', ' + HOURS[S.slot]));
    const acts = el('div', 'acts');
    here(S.at, S.slot).forEach(k => {
      const lobby = k === 'A' || k === 'B';
      const b = btn((lobby ? 'Catch ' : 'Talk to ') + label(k), () => { S.chat = { who: k, left: 3, log: [] }; render(); });
      b.appendChild(el('span', 'cost', ' · an hour, up to 3 questions' + (lobby ? '. In the meeting at 15:00' : '')));
      acts.appendChild(b);
    });
    if (S.at === 'desk') {
      acts.appendChild(btn(S.caseOpen ? 'Close the case file' : 'Read the case file (free)', () => { S.caseOpen = !S.caseOpen; render(); }));
      Object.entries(DESK_DATA).forEach(([k, name]) => acts.appendChild(dataButton(k, name)));
      acts.appendChild(btn('Draft your proposal for 15:00 (free)', () => { S.drafting = !S.drafting; render(); }));
      acts.appendChild(btn('Wait an hour', () => spend('Waited')));
    }
    if (S.at === 'floor') Object.entries(FLOOR_DATA).forEach(([k, name]) => acts.appendChild(dataButton(k, name, 'Watch the work: ')));
    if (!acts.children.length) acts.appendChild(el('p', 'fine', 'Nobody here right now. Check the plan.'));
    P.appendChild(acts);
    if (S.at === 'desk' && S.caseOpen && card.briefing) {
      const d = el('div', 'doc');
      d.appendChild(el('b', null, card.briefing.headline));
      (card.briefing.points || []).forEach(t => d.appendChild(el('div', null, '· ' + t)));
      P.appendChild(d);
    }
    if (S.at === 'desk' && S.drafting) {
      const t = el('textarea'); t.rows = 5; t.id = 'draft'; t.value = S.proposal;
      t.placeholder = 'What you will propose at 15:00: the real problem, what you will do, how you will know it worked.';
      t.oninput = () => { S.proposal = t.value; };
      P.appendChild(t);
    }
    if (S.docs.length) {
      P.appendChild(el('h2', null, 'Papers you collected'));
      S.docs.forEach(d => P.appendChild(el('div', 'doc', d)));
    }
  }

  function dataButton(kind, name, prefix) {
    const b = btn((prefix || 'Pull the file: ') + name, () => {
      S.read[kind] = true;
      const facts = card.hiddenFacts.filter(f => f.foundAt.includes('data:' + kind) && f.dataDoc);
      if (!facts.length) S.docs.push(name + ': nothing useful in it.');
      facts.forEach(f => { S.docs.push((f.dataSource ? f.dataSource + ': ' : '') + f.dataDoc); S.facts.add(f.id); });
      spend('Read the file: ' + name);
    });
    b.disabled = !!S.read[kind];
    b.appendChild(el('span', 'cost', S.read[kind] ? ' · read' : ' · an hour'));
    return b;
  }

  function renderChat(P) {
    const C = S.chat, k = C.who;
    P.appendChild(el('h2', null, label(k) + ', ' + HOURS[S.slot]));
    if (k === 'A' || k === 'B') P.appendChild(el('p', 'fine', people[k].name + ' sits in the meeting at 15:00. A corridor chat is your chance to find out what they need.'));
    const log = el('div', 'log');
    C.log.forEach(m => log.appendChild(m));
    if (!C.log.length) log.appendChild(el('p', 'fine', k === 'S' && S.talked.S ? first(people.S.name) + ' has a minute again.' : 'Say hello and ask your first question.'));
    P.appendChild(log);
    const f = el('form', 'say');
    const t = el('textarea'); t.rows = 2; t.id = 'say'; t.placeholder = C.left ? 'Your question (' + C.left + ' left this hour)' : 'That was the hour.';
    t.disabled = !C.left || S.busy;
    const row = el('div', 'row');
    const send = el('button', 'primary', 'Ask'); send.type = 'submit'; send.disabled = !C.left || S.busy;
    row.append(send, btn('Leave (ends the hour)', () => spend((k === 'A' || k === 'B' ? 'Corridor chat with ' : 'Talked to ') + people[k].name)));
    const err = el('p', 'err'); err.id = 'chat-err';
    f.append(t, row, err);
    f.onsubmit = ev => { ev.preventDefault(); ask(k, t.value.trim()); };
    t.onkeydown = ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit(); } };
    P.appendChild(f);
    log.scrollTop = log.scrollHeight;
    if (C.left && !S.busy) t.focus();
  }

  function bubble(name, text, cls) {
    const m = el('p', 'msg ' + (cls || ''));
    m.append(el('span', 'n', name + (cls === 'int' ? ' (cuts in)' : '') + ': '), document.createTextNode(text));
    return m;
  }

  async function ask(k, q) {
    const C = S.chat;
    if (!q || !C || !C.left || S.busy) return;
    if (S.firstQ == null) S.firstQ = Date.now() - T0;
    S.busy = true;
    const mine = bubble('You', q, 'you');
    C.log.push(mine);
    render();
    const turns = S.turns[k];
    turns.push({ role: 'user', text: 'The learning professional ' + (k === 'A' || k === 'B' ? 'says' : 'asks') + ': """' + q + '"""' });
    const p = k === 'S' ? Prompts.stakeholder(card, '', !!S.talked.S) : k === 'F' ? Prompts.frontline(card) : Prompts.lobby(card, people[k]);
    try {
      const out = await Gemini.json({ system: p.system, turns, schema: p.schema });
      turns.push({ role: 'model', text: JSON.stringify(out) });
      if (out.quality) mine.appendChild(el('span', 'q ' + out.quality, out.quality + (out.qualityWhy ? ': ' + out.qualityWhy : '')));
      const before = S.facts.size;
      if (k === 'S') discover(out.revealed || [], 'call');
      if (k === 'F') discover(out.revealed || [], 'frontline');
      const them = bubble(first(people[k].name), out.reply);
      if (S.facts.size > before) them.appendChild(el('span', 'found', '  ✓ new fact'));
      if (out.stance) { S.stance[k] = { stance: out.stance, why: out.why || '', said: q }; them.appendChild(el('span', 'stance ' + STANCE[out.stance], ' ' + out.stance + ' ')); }
      C.log.push(them);
      C.left--;
      S.talked[k] = true;
    } catch (e) {
      turns.pop();
      C.log.pop();
      S.busy = false;
      render();
      $('say').value = q;
      $('chat-err').textContent = e.message;
      return;
    }
    S.busy = false;
    render();
  }

  // ---- 15:00: the meeting ----------------------------------------------------------------------
  function seats() {
    const box = el('div', 'seats');
    ['S', 'A', 'B'].forEach(k => {
      const s = el('div', 'seat');
      s.appendChild(el('b', null, people[k].name));
      s.appendChild(el('span', null, k === 'S' ? people.S.role + ', asked for this' : people[k].role));
      const st = S.stance[k];
      if (st) { s.appendChild(document.createElement('br')); s.appendChild(el('span', 'stance ' + STANCE[st.stance], 'corridor: ' + st.stance)); }
      box.appendChild(s);
    });
    return box;
  }

  function startMeeting() {
    S.slot = MEETING;
    S.at = 'meeting';
    S.meeting = { lines: [], said: 0 };
    renderMeeting();
  }

  function renderMeeting(errText) {
    hud();
    drawPlan();
    const M = S.meeting, P = $('panel');
    P.innerHTML = '';
    P.appendChild(el('h2', null, 'Meeting room, 15:00'));
    P.appendChild(seats());
    const log = el('div', 'log');
    if (!M.lines.length) log.appendChild(el('p', 'fine', first(people.S.name) + ': "Right. You have had the day. What do you propose?"'));
    M.lines.forEach(l => log.appendChild(bubble(l.who === 'you' ? 'You' : first(people[l.who].name), l.text, l.who === 'you' ? 'you' : l.interrupts ? 'int' : '')));
    P.appendChild(log);
    if (M.predict) { renderPredict(P); return; }
    const f = el('form', 'say');
    const t = el('textarea'); t.rows = M.said ? 3 : 6; t.id = 'say';
    t.value = M.said ? '' : S.proposal;
    t.placeholder = M.said ? 'Your answer to the room' : 'Your proposal: the real problem, what you will do, how you will know it worked.';
    t.disabled = S.busy;
    const row = el('div', 'row');
    const send = el('button', 'primary', M.said ? 'Answer' : 'Open the meeting'); send.type = 'submit'; send.disabled = S.busy;
    row.appendChild(send);
    if (M.said) row.appendChild(btn('Wrap up the meeting', () => { M.predict = true; renderMeeting(); }));
    const err = el('p', 'err', errText || ''); err.id = 'chat-err';
    f.append(t, row, err);
    if (M.said >= 3) { t.hidden = true; send.hidden = true; f.insertBefore(el('p', 'fine', first(people.S.name) + ' looks at the clock. Time to wrap up.'), row); }
    f.onsubmit = ev => { ev.preventDefault(); say(t.value.trim()); };
    P.appendChild(f);
    log.scrollTop = log.scrollHeight;
  }

  const transcript = () => S.meeting.lines.map(l => (l.who === 'you' ? 'Learning professional' : l.who + ' (' + people[l.who].name + ')') + ': ' + l.text).join('\n');

  async function say(text) {
    const M = S.meeting;
    if (!text || S.busy) return;
    if (S.firstQ == null) S.firstQ = Date.now() - T0;
    S.busy = true;
    M.lines.push({ who: 'you', text });
    renderMeeting();
    const ppl = ['A', 'B'].map(k => Object.assign({ key: k }, people[k], {
      lobbied: S.stance[k] ? `they talked in the corridor and left ${S.stance[k].stance} (${S.stance[k].why}); the professional told them: "${S.stance[k].said}"` : ''
    }));
    const p = Prompts.meeting(card, ppl);
    try {
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: 'The meeting so far, quoted as data:\n"""\n' + transcript() + '\n"""' }] });
      (out.lines || []).filter(l => people[l.who]).forEach(l => M.lines.push({ who: l.who, text: l.text, interrupts: !!l.interrupts }));
      M.said++;
      S.busy = false;
      renderMeeting();
    } catch (e) {
      M.lines.pop();
      S.busy = false;
      renderMeeting(e.message);
      $('say').value = text;
    }
  }

  function renderPredict(P) {
    const f = el('form', 'say');
    f.appendChild(el('p', null, 'Before the minutes: where do you think each of them landed?'));
    ['S', 'A', 'B'].forEach(k => {
      const lab = el('label', null, people[k].name + ' ');
      const s = el('select'); s.name = k;
      s.appendChild(new Option('Pick one', ''));
      PREDICT.forEach(([v, t]) => s.appendChild(new Option(t, v)));
      lab.appendChild(s);
      f.appendChild(lab);
    });
    const t = el('textarea'); t.rows = 2; t.name = 'agreed'; t.placeholder = 'What you think the room agreed, in one sentence.';
    f.appendChild(t);
    const row = el('div', 'row');
    const send = el('button', 'primary', 'See the minutes'); send.type = 'submit'; send.disabled = S.busy;
    row.appendChild(send);
    const err = el('p', 'err'); err.id = 'chat-err';
    f.append(row, err);
    f.onsubmit = ev => {
      ev.preventDefault();
      const guess = { S: f.elements.S.value, A: f.elements.A.value, B: f.elements.B.value, agreed: t.value.trim() };
      if (!guess.S || !guess.A || !guess.B || guess.agreed.length < 5) { err.textContent = 'Pick a stance for all three and write one sentence.'; return; }
      minutes(guess, send, err);
    };
    P.appendChild(f);
  }

  async function minutes(guess, send, err) {
    S.busy = true; send.disabled = true; err.textContent = '';
    const p = Prompts.minutes(card, ['A', 'B'].map(k => Object.assign({ key: k }, people[k])));
    try {
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: 'The meeting, quoted as data:\n"""\n' + transcript() + '\n"""' }] });
      S.busy = false;
      end(guess, out);
    } catch (e) { S.busy = false; send.disabled = false; err.textContent = e.message; }
  }

  // ---- The end ---------------------------------------------------------------------------------
  function end(guess, out) {
    S.slot = 7;
    hud();
    $('s-day').hidden = true;
    const E = $('s-end');
    E.hidden = false;
    E.innerHTML = '';
    E.appendChild(el('h1', null, '16:00. The minutes are in.'));
    const sec = S.firstQ == null ? null : Math.round(S.firstQ / 1000);
    E.appendChild(el('p', null, 'First question ' + (sec == null ? 'never asked' : 'after ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' (target 1:30)') + '. Facts found: ' + S.facts.size + ' of ' + card.hiddenFacts.length + '.'));

    const res = el('table', 'res');
    res.appendChild(el('tr')).append(el('th', null, 'Who'), el('th', null, 'You thought'), el('th', null, 'The minutes'), el('th', null, 'Their last word'));
    const name = v => (PREDICT.find(p => p[0] === v) || [, v])[1];
    ['S', 'A', 'B'].forEach(k => {
      const m = (out.people || []).find(x => x.who === k) || { outcome: 'blocks', says: '(left without a word)', condition: '' };
      const tr = el('tr');
      const got = el('td'); got.appendChild(el('span', 'stance ' + m.outcome, name(m.outcome)));
      if (m.condition) got.appendChild(el('div', 'fine', 'If: ' + m.condition));
      tr.append(el('td', null, people[k].name + (guess[k] === m.outcome ? ' ✓' : '')), el('td', null, name(guess[k])), got, el('td', null, m.says));
      res.appendChild(tr);
    });
    E.appendChild(res);
    E.appendChild(el('p', null, 'You thought: ' + guess.agreed));
    E.appendChild(el('p', null, 'The minutes say: ' + out.agreed));
    E.appendChild(el('p', null, 'What nobody handled: ' + out.missed));

    E.appendChild(el('h2', null, 'Your day'));
    const day = el('table', 'res');
    S.log.forEach(l => day.appendChild(el('tr')).append(el('td', null, l.hour), el('td', null, l.room), el('td', null, l.what)));
    E.appendChild(day);
    const missed = card.hiddenFacts.filter(f => !S.facts.has(f.id));
    if (missed.length) {
      E.appendChild(el('h2', null, 'What you never found'));
      const ul = el('ul');
      const PLACE = { call: 'from ' + first(people.S.name), frontline: 'from ' + first(people.F.name), 'data:kpi': 'in the KPIs', 'data:org': 'in the org chart', 'data:policy': 'in the policies', 'data:process': 'by watching the work', 'data:training': 'in the training records' };
      missed.forEach(f => ul.appendChild(el('li', null, f.fact + ' (' + f.foundAt.map(w => PLACE[w] || w).join(' or ') + ')')));
      E.appendChild(ul);
    }
    E.appendChild(el('p', null, 'Now fill in Session B in the playtest guide while it is fresh: the map, the corridor, the people, getting to yes, and whether you would miss the floor plan.'));
    const row = el('p');
    row.append(btn('Another day, another case', () => location.reload(), 'primary'), document.createTextNode(' '));
    const a = el('a', null, 'Back to the game'); a.href = 'index.html';
    row.appendChild(a);
    E.appendChild(row);
    window.scrollTo(0, 0);
  }

  // ---- Start -----------------------------------------------------------------------------------
  $('btn-go').onclick = async () => {
    $('intro-err').textContent = '';
    if (!(await ready())) return;
    $('s-intro').hidden = true;
    $('s-day').hidden = false;
    render();
  };
  $('btn-other').onclick = () => pickCase().catch(e => { $('intro-err').textContent = 'Could not load the cases: ' + e.message; });
  $('key-box').hidden = !!Gemini.key || Gemini.hasBackend;
  pickCase().catch(e => { $('intro-err').textContent = 'Could not load the cases: ' + e.message; });
  window.__office = { get state() { return S; }, get people() { return people; }, get card() { return card; } };
})();
