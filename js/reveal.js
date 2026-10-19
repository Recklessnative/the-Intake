// The reveal (STORY.md, spoilers): from the evening of the tender, lift button 5 works. Floor 5 is
// the same floor in 2041: no desks, GMS racks, one CRT on the carpet running Doors OS with the
// operator's mail open. Signing the waiver again strikes your name through into 1207 and sets
// `intake-told-reveal`. Nothing here is scored, nothing calls Gemini, and hard mode and Try one
// case never get here (Arc's `now.off`).
(function () {
  const KEY = 'intake-told-reveal';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const seen = () => !!get(KEY);
  // The tender is week 4; its evening is the first that counts as arc week 5.
  const open = now => !!now && !now.off && now.week >= 5 && !seen();
  // After week 7, 5 is the only button that lights.
  const forced = now => open(now) && now.week >= 8;
  // The CRT screen on the picture (left, top, right, bottom in %), from tools/office/out/floor5_screen.json.
  const SCREEN = [53.92, 61.99, 58.78, 69.0];
  const PIC = 'media/office/floor5';

  const MAIL = {
    from: 'operator@archive.lindeveld.be',
    date: 'Thu 14 Mar 2041',
    subject: 'Request: we need a course',
    body: ['We certify 4,000 team leads a year. The system keeps writing them courses on intake. We need someone who can tell us when it shouldn\'t.',
      'PS: you are cohort 12, seat 07. Sorry about the rain. It was in the archive, so it is in the build.']
  };
  const WAIVER = [
    'THE LEARNING HOUSE · Immersion waiver',
    'Programme: The Intake. Build: archive 2041.03. Source: the Synergix drives kept by the receiver in 2009, 71% recovered.',
    'I understand that the office, the town and the people in them are rebuilt from that archive, and repeat where it repeats. Where it was not recovered, it is fog.',
    'Nobody touches my memory. I can log off at any time.',
    'Signed once on Thu 14 Mar 2041. Sign again to resume the session.'
  ];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function win(title, icon, cls) {
    const w = el('div', 'rv-win ' + (cls || ''));
    const head = el('div', 'titlebar');
    head.append(el('span', null, icon), el('span', 'tt', title));
    w.appendChild(head);
    const body = el('div', 'rv-body');
    w.appendChild(body);
    return { w, body };
  }

  // What you noticed, as the session logged it. Leads add their lines; none of it gates anything.
  function log(notes) {
    const { w, body } = win('session_1207.log - Notepad', '📄', 'rv-log');
    const lines = ['Cohort 12, seat 07. Participant 1207.', ''];
    if (notes.noted.length) {
      lines.push('Flagged by participant: ' + notes.noted.length);
      notes.noted.forEach(n => lines.push('  ' + n.who + ' · ' + n.label));
    } else lines.push('Flagged by participant: 0');
    if (notes.leads.length) {
      lines.push('', 'Connections made:');
      notes.leads.forEach(l => lines.push('  "' + l.guess + '"', '    ' + l.line));
    }
    body.appendChild(el('pre', null, lines.join('\n')));
    return w;
  }

  // opts: { notes: Arc.notes(), onDone }
  function go(opts) {
    const notes = (opts && opts.notes) || { noted: [], leads: [] };
    if (window.Sound) Sound.scene(null);
    const lay = el('div', 'reveal');
    lay.id = 'reveal';
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', 'Floor 5');
    const stage = el('div', 'rv-stage');
    const pic = el('picture');
    const src = el('source'); src.media = '(max-width: 900px)'; src.srcset = PIC + '-960.webp';
    const img = el('img', 'rv-pic'); img.src = PIC + '.webp'; img.alt = 'Floor 5: no desks, rows of server racks with a GMS logo, and one old monitor on the carpet, still on.';
    pic.append(src, img);
    stage.appendChild(pic);
    const glow = el('div', 'rv-glow');
    Object.assign(glow.style, { left: SCREEN[0] + '%', top: SCREEN[1] + '%', width: (SCREEN[2] - SCREEN[0]) + '%', height: (SCREEN[3] - SCREEN[1]) + '%' });
    stage.appendChild(glow);
    const tag = el('button', 'office-tag primary', 'The monitor'); tag.type = 'button';
    tag.style.left = (SCREEN[0] + SCREEN[2]) / 2 + '%'; tag.style.top = SCREEN[1] + '%';
    stage.appendChild(tag);
    lay.appendChild(stage);
    const bar = el('div', 'rv-bar');
    const line = el('p', 'rv-line', 'Floor 5. The doors close behind you and the lift goes back down without you. No desks. Rows of racks, humming. One old monitor on the carpet, still on.');
    bar.appendChild(line);
    lay.appendChild(bar);
    document.body.appendChild(lay);
    requestAnimationFrame(() => lay.classList.add('in'));
    tag.focus({ preventScroll: true });
    tag.onclick = glow.onclick = () => crt();

    function crt() {
      tag.remove(); glow.onclick = null;
      line.textContent = 'You kneel on the carpet. Doors OS, like your desk. One mail open.';
      const screen = el('div', 'rv-crt');
      const desk = el('div', 'rv-desk');
      desk.appendChild(log(notes));
      const m = win('Doors Mail - ' + MAIL.subject, '✉', 'rv-mail');
      [['From', MAIL.from], ['Date', MAIL.date], ['Subject', MAIL.subject]].forEach(([k, v]) => {
        const p = el('p', 'rv-head'); p.append(el('b', null, k + ': '), document.createTextNode(v)); m.body.appendChild(p);
      });
      MAIL.body.forEach(t => m.body.appendChild(el('p', null, t)));
      const att = el('button', 'rv-att', '📎 waiver_1207.doc'); att.type = 'button';
      m.body.appendChild(att);
      desk.appendChild(m.w);
      screen.appendChild(desk);
      lay.appendChild(screen);
      att.focus({ preventScroll: true });
      att.onclick = () => waiver(desk, att);
    }

    function waiver(desk, att) {
      att.disabled = true;
      const v = win('waiver_1207.doc - Doors Write', '📝', 'rv-waiver');
      WAIVER.forEach((t, i) => v.body.appendChild(el(i ? 'p' : 'h3', null, t)));
      const row = el('div', 'rv-sign');
      const lab = el('label', null, 'Name ');
      const name = el('input'); name.type = 'text'; name.maxLength = 40; name.placeholder = 'your name'; name.autocomplete = 'off';
      lab.appendChild(name);
      const sign = el('button', 'primary', 'Sign'); sign.type = 'button';
      row.append(lab, sign);
      v.body.appendChild(row);
      desk.appendChild(v.w);
      name.focus({ preventScroll: true });
      const done = () => {
        sign.disabled = true; name.readOnly = true;
        if (!name.value.trim()) name.value = name.placeholder;
        name.classList.add('struck');
        setTimeout(() => {
          name.classList.remove('struck'); name.value = '1207'; name.classList.add('number');
          try { localStorage.setItem(KEY, '1'); } catch (e) { /* storage blocked */ }
          line.textContent = 'Session 1207: resumed. Behind you, the lift goes ding. Button 4 is lit.';
          const back = el('button', 'primary rv-back', 'Take the lift down'); back.type = 'button';
          back.onclick = () => { lay.classList.remove('in'); setTimeout(() => { lay.remove(); if (opts && opts.onDone) opts.onDone(); }, 600); };
          bar.appendChild(back);
          back.focus({ preventScroll: true });
        }, 1400);
      };
      sign.onclick = done;
      name.onkeydown = e => { if (e.key === 'Enter') done(); };
    }
  }

  // ---------- the ending (the week after the reveal) ----------
  // Your own lever call on the operator's request decides it: training means Clock in tomorrow,
  // anything else (someone who can say no and sign it) means Log off. Neither is the good one.
  const END_KEY = 'intake-ending';
  const ending = () => get(END_KEY) || '';
  // The fourth-floor window on the 2041 title picture (left, top, width, height in %).
  const WINDOW = [80.0, 39.6, 7.2, 4.4];
  const END_CARD = 'Asking why was never the hard part. Saying "not a course", with your name under it, is.';
  // opts: { lever: 'yes' | 'partly' | 'no', accountable, noticed, onDone(choice) }
  function end(opts) {
    const choice = opts.lever === 'no' ? 'logoff' : 'clockin';
    try {
      localStorage.setItem(END_KEY, choice);
      // The payslip's "Sign-offs": 1 only for "not a course" with a name under it.
      localStorage.setItem('intake-signoffs', choice === 'logoff' && opts.accountable ? '1' : '0');
    } catch (e) { /* storage blocked */ }
    if (window.Sound) Sound.scene(null);
    const lay = el('div', 'reveal ending ' + choice);
    lay.id = 'reveal';
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', choice === 'logoff' ? 'Log off' : 'Clock in tomorrow');
    const stage = el('div', 'rv-stage');
    const img = el('img', 'rv-pic');
    img.src = choice === 'logoff' ? 'media/title/title-2041.webp' : 'media/office/hub.webp';
    img.alt = choice === 'logoff' ? 'The Synergix building in 2041, at night, in the rain. One window on the fourth floor is lit.' : 'The office floor at 08:57.';
    stage.appendChild(img);
    let win = null;
    if (choice === 'logoff') {
      win = el('div', 'rv-window');
      Object.assign(win.style, { left: WINDOW[0] + '%', top: WINDOW[1] + '%', width: WINDOW[2] + '%', height: WINDOW[3] + '%' });
      stage.appendChild(win);
    }
    const card = el('div', 'rv-endcard');
    stage.appendChild(card);
    lay.appendChild(stage);
    const bar = el('div', 'rv-bar');
    const line = el('p', 'rv-line');
    bar.appendChild(line);
    lay.appendChild(bar);
    document.body.appendChild(lay);
    requestAnimationFrame(() => lay.classList.add('in'));
    const lines = choice === 'logoff'
      ? ['You write "not a course" under the operator\'s request' + (opts.accountable ? ', and your name: ' + opts.accountable + '.' : '.'),
        'In the start menu, Log off... is not grey any more.',
        'The lift goes down past four. Nobody gets in. Outside it is 2041, and it is raining. Not at 08:56. Just raining.',
        'Behind you, on the fourth floor, the window goes dark.']
      : ['You send the operator a course. It is a good course. Somebody signs it.',
        'Clock in tomorrow. 08:57. Mieke\'s lamp is on again.',
        'It starts raining at 08:56.'];
    let i = 0, t = 0, shown = false;
    const next = () => {
      clearTimeout(t);
      if (i < lines.length) {
        line.textContent = lines[i++];
        if (win && i === lines.length) win.classList.add('dark');
        t = setTimeout(next, i === lines.length ? 4200 : 3600);
        return;
      }
      if (shown) return;
      shown = true;
      const n = opts.noticed || 0;
      card.append(el('p', 'rv-end-big', END_CARD),
        el('p', null, 'You noticed ' + (n === 1 ? 'one thing' : n + ' things') + '. Most cohorts notice four. That is the skill, by the way.'),
        el('p', 'rv-end-small', choice === 'logoff' ? 'Final settlement: 0.00 (archive currency). Sign-offs: ' + (opts.accountable ? 1 : 0) + '.' : 'Session 1207 continues. Week ' + (opts.week || '') + ' starts Monday.'));
      card.classList.add('in');
      const done = el('button', 'primary rv-back', choice === 'logoff' ? 'Log off' : 'Clock in tomorrow'); done.type = 'button';
      done.onclick = () => { lay.classList.remove('in'); setTimeout(() => { lay.remove(); if (opts.onDone) opts.onDone(choice); }, 600); };
      bar.appendChild(done);
      done.focus({ preventScroll: true });
    };
    // A click moves the lines on, for readers who are quicker than the timer.
    lay.addEventListener('click', ev => { if (!ev.target.closest('button')) next(); });
    t = setTimeout(next, 900);
  }

  window.Reveal = { KEY, seen, open, forced, go, MAIL, END_KEY, ending, end, END_CARD };
})();
