// The 2041 arc (STORY.md, spoilers): small things in the office that don't add up. Act 1 is
// weeks 1 to 4 and has to work as plain 2007 office jokes. Rules: at most one new hint lands per
// in-game day, none is scored, and hard mode and Try one case never show one. A week counts only
// when its Friday is done in the normal game, so `week` here is not the same as the game's weekNo.
(function () {
  const KEY = 'intake-arc';
  // When each hint may first land: arc week and day of the week (0 = Monday). One slot per day.
  const HINTS = [
    { id: 'badge', week: 1, day: 0 },     // your desk, evening: badge No. 1207, "Photo: to follow"
    { id: 'tape', week: 1, day: 1 },      // morning: lift button 5 taped over, the building has four floors
    { id: 'floor5', week: 2, day: 0 },    // inbox: Facilities about the floor 5 button
    { id: 'planner', week: 2, day: 2 },   // Darren's planner: "NEW HIRE!!" again
    { id: 'morning', week: 3, day: 0 },   // Mieke: "Morning again!", word for word every Monday
    { id: 'rain', week: 3, day: 1 },      // morning: the rain started at 08:56, like every day
    { id: 'flicker', week: 3, day: 3 }    // end of the week: the lift indicator flickers 4, 5, 4
  ];
  const slot = (week, day) => week * 7 + day;

  function read() {
    try { return Object.assign({ shown: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { shown: {} }; }
  }
  function keep(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

  // May this hint show now? Once it has landed it stays (a mail stays in the inbox, a planner stays
  // open). A new one lands only when it is due and nothing else landed today; otherwise it waits
  // for the next day that is free.
  function offer(id, now) {
    const h = HINTS.find(x => x.id === id);
    if (!h || !now || now.off) return false;
    const st = read();
    if (st.shown[id] != null) return true;
    const today = slot(now.week, now.day);
    if (slot(h.week, h.day) > today) return false;
    if (Object.values(st.shown).includes(today)) return false;
    st.shown[id] = today;
    keep(st);
    return true;
  }
  // For a hint that is a moment, not a thing that stays: true only the time it lands.
  function once(id, now) { return read().shown[id] == null && offer(id, now); }
  const shown = () => Object.keys(read().shown);

  // ---------- Doesn't add up: a notebook page ----------
  // Odd things can be noted (some note themselves: you can't click a morning). Pin two that go
  // together, write a one-line guess first, and a pair we wrote clicks into a lead. Leads never
  // gate anything; later they add lines to the reveal. No Gemini, no points.
  // What a hint looks like in the notebook. Floor things bring their own text from LOOKS.
  const NOTES = {
    badge: { who: 'Your desk', label: 'Badge 1207', text: 'SYNERGIX · STAFF · No. 1207. "Photo: to follow."' },
    tape: { who: 'The lift', label: 'Button 5', text: 'Grey tape over button 5: OUT OF ORDER. The building has four floors.' },
    floor5: { who: 'Facilities', label: 'Floor 5 mail', text: '"There is no floor 5. Please stop pressing it."' },
    morning: { who: 'Mieke', label: '"Morning again!"', text: 'The same line every Monday, word for word.' },
    rain: { who: 'The weather', label: '08:56', text: 'It starts raining at 08:56. Every morning.' },
    flicker: { who: 'The lift', label: '4, 5, 4', text: 'The numbers went 4, 5, 4. The doors opened on dark and a hum.' }
  };
  // Pairs we wrote. Order does not matter.
  const PAIRS = [
    { a: 'floor5', b: 'tape', lead: 'The building has four floors. Facilities has a ticket for a fifth.' },
    { a: 'flicker', b: 'tape', lead: 'The lift goes to a floor that isn\'t there.' },
    { a: 'flicker', b: 'floor5', lead: 'Somebody keeps pressing 5. The lift keeps going.' },
    { a: 'darren:umbrella', b: 'rain', lead: 'It starts raining at 08:56. Every day. To the minute.' },
    { a: 'darren:planner', b: 'badge', lead: 'A new hire every Monday, and nobody\'s photo ever arrives.' },
    { a: 'darren:planner', b: 'morning', lead: 'Every Monday starts like the first one.' },
    { a: 'mieke:cds', b: 'priya:chart', lead: 'Everybody counts who finished. Nobody checks what changed.' }
  ];
  const ODD_LINES = ['Could be a coincidence. Mieke says most things are.', 'You stare at them side by side. Nothing. Maybe another day.', 'Not those two. Not yet, anyway.'];
  const notes = () => { const st = read(); return { noted: st.noted || [], leads: st.leads || [], tries: st.tries || 0 }; };
  const noted = id => (read().noted || []).some(n => n.id === id);
  // `entry` for floor things: { who, label, text }; arc hints use NOTES.
  function note(id, entry) {
    const st = read();
    st.noted = st.noted || [];
    if (st.noted.some(n => n.id === id)) return false;
    const e = entry || NOTES[id];
    if (!e) return false;
    st.noted.push({ id, who: e.who, label: e.label, text: e.text });
    keep(st);
    return true;
  }
  const pairOf = (a, b) => PAIRS.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  // Returns { ok, line }: a lead, or why not.
  function connect(a, b, guess) {
    guess = String(guess || '').trim();
    if (!a || !b || a === b) return { ok: false, line: 'Pick two things first.' };
    if (guess.length < 8) return { ok: false, line: 'Write down what you think connects them first. One line is enough.' };
    const st = read();
    st.leads = st.leads || [];
    const p = pairOf(a, b);
    if (p && st.leads.some(l => pairOf(l.a, l.b) === p)) return { ok: false, line: 'You worked that one out already.' };
    if (!p) { st.tries = (st.tries || 0) + 1; keep(st); return { ok: false, line: ODD_LINES[(st.tries - 1) % ODD_LINES.length] }; }
    st.leads.push({ a, b, guess: guess.slice(0, 200), lead: p.lead });
    keep(st);
    return { ok: true, line: p.lead };
  }

  // The page itself, drawn into the notebook card. XP controls only.
  function page(box) {
    const N = notes();
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    box.innerHTML = '';
    box.appendChild(el('p', 'nb-intro', 'Things that don\'t add up. Tick two that go together and write down what you think connects them.'));
    const list = el('ul', 'nb-odd');
    const picked = [];
    const go = el('button', 'primary', 'Pin them together'); go.type = 'button'; go.disabled = true;
    const guess = el('input'); guess.type = 'text'; guess.maxLength = 200; guess.placeholder = 'What I think connects them'; guess.setAttribute('aria-label', 'What I think connects them');
    const out = el('p', 'nb-out'); out.setAttribute('aria-live', 'polite');
    const sync = () => { go.disabled = picked.length !== 2; };
    N.noted.forEach(n => {
      const li = el('li');
      const lab = el('label');
      const cb = el('input'); cb.type = 'checkbox'; cb.value = n.id;
      cb.onchange = () => {
        if (cb.checked) { picked.push(n.id); if (picked.length > 2) { const old = picked.shift(); const o = list.querySelector('input[value="' + CSS.escape(old) + '"]'); if (o) o.checked = false; } }
        else picked.splice(picked.indexOf(n.id), 1);
        sync();
      };
      lab.append(cb, el('b', null, n.label), el('span', null, ' · ' + n.who));
      li.append(lab, el('small', null, n.text));
      list.appendChild(li);
    });
    box.appendChild(list);
    if (N.noted.length >= 2) {
      const row = el('div', 'nb-pin');
      row.append(guess, go);
      box.append(row, out);
      go.onclick = () => {
        const r = connect(picked[0], picked[1], guess.value);
        out.textContent = r.line;
        out.classList.toggle('lead', r.ok);
        if (r.ok) { guess.value = ''; picked.length = 0; list.querySelectorAll('input:checked').forEach(x => { x.checked = false; }); sync(); drawLeads(); }
      };
    } else box.appendChild(el('p', 'nb-out', 'One thing on its own is just a thing. Note another.'));
    const leads = el('div', 'nb-leads');
    box.appendChild(leads);
    function drawLeads() {
      const L = notes().leads;
      leads.innerHTML = '';
      if (!L.length) return;
      leads.appendChild(el('p', 'office-card-title', 'Leads (' + L.length + ')'));
      L.forEach(l => { const p = el('p', 'nb-lead', l.lead); p.appendChild(el('small', null, 'Your guess: "' + l.guess + '"')); leads.appendChild(p); });
    }
    drawLeads();
  }

  window.Arc = { HINTS, offer, once, shown, NOTES, PAIRS, note, noted, notes, connect, page };
})();
