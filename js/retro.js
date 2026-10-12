// The 2000s layer: wallpapers, Doors Messenger pop-ups and nudges, the brick phone (texts and
// Snake) and Staply, the office assistant with confidently bad advice. Static, trusted markup.
(function () {
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  const svg = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';

  // ---------- wallpapers: our own paintings, unlocked by your best title ----------
  const SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">';
  const cloud = (x, y, s, o) => `<g opacity="${o}" filter="url(#b)"><ellipse cx="${x}" cy="${y}" rx="${120 * s}" ry="${34 * s}" fill="#fff"/><ellipse cx="${x + 60 * s}" cy="${y - 22 * s}" rx="${80 * s}" ry="${36 * s}" fill="#fff"/><ellipse cx="${x - 70 * s}" cy="${y - 10 * s}" rx="${60 * s}" ry="${26 * s}" fill="#fff"/></g>`;
  const WALLPAPERS = [
    { id: 'hill', name: 'Green Hill', level: 0, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b5fd6"/><stop offset=".55" stop-color="#5d9df0"/><stop offset="1" stop-color="#bcd9f7"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#8fd14f"/><stop offset=".45" stop-color="#4f9e22"/><stop offset="1" stop-color="#2c6a10"/></linearGradient><radialGradient id="l" cx=".35" cy=".1" r=".6"><stop offset="0" stop-color="#d9f59c" stop-opacity=".7"/><stop offset="1" stop-color="#d9f59c" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="1600" height="1000" fill="url(#s)"/>${cloud(330, 210, 1.4, .85)}${cloud(1050, 150, 1.1, .7)}${cloud(1380, 330, .8, .6)}${cloud(720, 360, .7, .5)}<path d="M-50 720 C 300 520, 760 520, 1100 640 S 1500 720, 1650 690 L1650 1000 L-50 1000 Z" fill="url(#g)"/><path d="M-50 720 C 300 520, 760 520, 1100 640 S 1500 720, 1650 690 L1650 1000 L-50 1000 Z" fill="url(#l)"/></svg>` },
    { id: 'azure', name: 'Azure Swoosh', level: 1, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#062a6e"/><stop offset="1" stop-color="#1c7fd8"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="1600" height="1000" fill="url(#s)"/><g filter="url(#b)" fill="none" stroke-linecap="round"><path d="M-100 700 C 300 400, 900 900, 1700 420" stroke="#7fd3ff" stroke-width="70" opacity=".55"/><path d="M-100 780 C 400 520, 1000 980, 1700 560" stroke="#b8f06a" stroke-width="40" opacity=".45"/><path d="M-100 600 C 500 300, 1000 760, 1700 300" stroke="#ffffff" stroke-width="16" opacity=".6"/></g></svg>` },
    { id: 'aquarium', name: 'Aquarium', level: 2, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fa4d8"/><stop offset="1" stop-color="#03264f"/></linearGradient><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><g fill="url(#r)"><path d="M300 0 L420 0 L260 1000 L140 1000Z"/><path d="M800 0 L880 0 L980 1000 L860 1000Z"/><path d="M1250 0 L1330 0 L1180 1000 L1100 1000Z"/></g><g fill="#fff" opacity=".5"><circle cx="220" cy="700" r="10"/><circle cx="240" cy="620" r="6"/><circle cx="210" cy="540" r="4"/><circle cx="1380" cy="760" r="12"/><circle cx="1400" cy="660" r="7"/><circle cx="1370" cy="580" r="4"/></g><g fill="#ff9f1c"><path d="M600 520 q60 -40 120 0 q-60 40 -120 0z M600 520 l-30 -22 v44z"/><path d="M1000 380 q45 -30 90 0 q-45 30 -90 0z M1000 380 l-24 -17 v34z"/></g><path d="M0 930 C 300 880, 600 960, 900 910 S 1400 900, 1600 940 L1600 1000 L0 1000Z" fill="#e2c98f"/></svg>` },
    { id: 'autumn', name: 'Autumn Road', level: 3, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c36b"/><stop offset=".6" stop-color="#f08a4b"/><stop offset="1" stop-color="#7a3b1d"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><circle cx="1150" cy="380" r="90" fill="#fff3c4" opacity=".8"/><path d="M0 640 L1600 600 L1600 1000 L0 1000Z" fill="#5b2c14"/><path d="M760 620 L840 620 L1250 1000 L350 1000Z" fill="#3a3a3a"/><path d="M797 640 L803 640 L820 1000 L780 1000Z" fill="#f2d16b" opacity=".8"/><g fill="#b4441c"><circle cx="200" cy="520" r="120"/><circle cx="380" cy="560" r="90"/><circle cx="1350" cy="520" r="130"/><circle cx="1500" cy="580" r="90"/></g><g fill="#3d1e0e"><rect x="195" y="600" width="14" height="60"/><rect x="1345" y="610" width="14" height="60"/></g></svg>` },
    { id: 'skyline', name: 'Night Skyline', level: 4, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b2b"/><stop offset="1" stop-color="#2b2f7a"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><g fill="#fff">${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 263) % 1600}" cy="${(i * 137) % 520}" r="${i % 3 ? 1.5 : 2.5}" opacity="${.4 + (i % 5) / 10}"/>`).join('')}</g><g fill="#0b0f26">${[[0, 640, 140], [130, 560, 110], [230, 700, 120], [340, 480, 90], [420, 620, 160], [570, 520, 100], [660, 660, 140], [790, 420, 80], [860, 600, 150], [1000, 540, 110], [1100, 680, 130], [1220, 470, 100], [1310, 600, 160], [1460, 540, 140]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${1000 - y}"/>`).join('')}</g><g fill="#ffd86b" opacity=".75">${Array.from({ length: 70 }, (_, i) => `<rect x="${20 + (i * 97) % 1560}" y="${560 + (i * 53) % 400}" width="8" height="12"/>`).join('')}</g></svg>` }
  ];
  WALLPAPERS.push(
    // Doors Aero (team lead only): sky glass, light rays, bubbles and a glossy green swoosh.
    { id: 'aurora', name: 'Aero Aurora', level: 0, aero: true, svg: SVG_HEAD + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a6fb8"/><stop offset=".5" stop-color="#36b4d8"/><stop offset="1" stop-color="#bff0e4"/></linearGradient><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6f24a"/><stop offset=".5" stop-color="#4fbf2a"/><stop offset="1" stop-color="#1d7a17"/></linearGradient><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="bu" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#e8fbff" stop-opacity=".35"/><stop offset=".85" stop-color="#9fe6ff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></radialGradient><radialGradient id="sun" cx=".78" cy=".12" r=".45"><stop offset="0" stop-color="#fffbe0" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="1600" height="1000" fill="url(#s)"/><rect width="1600" height="1000" fill="url(#sun)"/><g fill="url(#r)" filter="url(#b)"><path d="M1250 0 L1340 0 L900 1000 L700 1000Z"/><path d="M1380 0 L1430 0 L1200 1000 L1080 1000Z"/><path d="M1100 0 L1160 0 L520 1000 L420 1000Z"/></g><path d="M-100 760 C 300 600, 800 700, 1100 640 S 1500 560, 1700 600 L1700 1000 L-100 1000Z" fill="url(#g)"/><path d="M-100 760 C 300 600, 800 700, 1100 640 S 1500 560, 1700 600 L1700 640 C 1500 610, 1200 690, 1000 700 S 400 680, -100 800Z" fill="url(#gl)"/><g fill="none" stroke="#fff" stroke-linecap="round" opacity=".55"><path d="M-50 860 C 400 700, 1000 900, 1650 700" stroke-width="10"/><path d="M-50 900 C 450 760, 1050 960, 1650 760" stroke-width="4"/></g>${[[220, 380, 70], [340, 250, 38], [520, 470, 26], [980, 300, 54], [1120, 470, 30], [1420, 420, 82], [760, 200, 20], [1300, 220, 24], [140, 560, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bu)" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>`).join('')}</svg>` }
  );
  const UNLOCK = ['', 'Course Builder', 'Learning Consultant', 'Learning Strategist', 'Board Whisperer'];
  let level = 0, aero = false;
  const open = w => w.level <= level && (!w.aero || aero);
  function wallpaper(id) {
    const w = WALLPAPERS.find(x => x.id === id && open(x)) || WALLPAPERS[0];
    $('desktop').style.backgroundImage = svg(w.svg);
    $('desktop').style.backgroundSize = 'cover';
    $('desktop').style.backgroundPosition = 'center bottom';
    return w;
  }
  function setLevel(n) { level = Math.max(0, n | 0); wallpaper(store.get('intake-wallpaper', 'hill')); renderDisplay(); }
  // Doors Aero: the glossy new look, unlocked by the promotion to team lead. Returns true the
  // first time, so the game can say so.
  function setAero(unlocked) {
    aero = !!unlocked;
    let fresh = false;
    if (aero && !store.get('intake-aero-seen')) {
      store.set('intake-aero-seen', '1');
      store.set('intake-style', 'aero');
      store.set('intake-wallpaper', 'aurora');
      fresh = true;
    }
    document.body.classList.toggle('aero', aero && store.get('intake-style', 'aero') === 'aero');
    wallpaper(store.get('intake-wallpaper', 'hill'));
    renderDisplay();
    return fresh;
  }
  function renderDisplay() {
    const styles = $('display-style');
    if (styles) {
      styles.innerHTML = '';
      const cur = document.body.classList.contains('aero') ? 'aero' : 'classic';
      [['classic', 'Doors Classic'], ['aero', 'Doors Aero']].forEach(([id, name]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'style-pick' + (cur === id ? ' on' : '') + (id === 'aero' && !aero ? ' locked' : '');
        b.textContent = id === 'aero' && !aero ? '🔒 ' + name : name;
        b.setAttribute('aria-pressed', String(cur === id));
        b.onclick = () => {
          if (id === 'aero' && !aero) { toastFn('Locked. Doors Aero comes with the new PC you get as team lead.', 'info'); return; }
          store.set('intake-style', id);
          document.body.classList.toggle('aero', id === 'aero');
          renderDisplay();
        };
        styles.appendChild(b);
      });
    }
    const box = $('display-grid');
    if (!box) return;
    box.innerHTML = '';
    const cur = store.get('intake-wallpaper', 'hill');
    WALLPAPERS.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      const locked = !open(w);
      b.className = 'wp' + (locked ? ' locked' : '') + (w.id === cur && !locked ? ' on' : '');
      const thumb = document.createElement('span');
      thumb.className = 'wp-thumb';
      thumb.style.backgroundImage = svg(w.svg);
      const label = document.createElement('span');
      label.className = 'wp-name';
      label.textContent = locked ? '🔒 ' + w.name : w.name;
      b.append(thumb, label);
      b.title = !locked ? 'Use ' + w.name : w.aero ? 'Comes with Doors Aero, when you are team lead' : 'Unlocks when you finish a week as ' + UNLOCK[w.level];
      b.setAttribute('aria-label', b.title);
      b.onclick = () => {
        if (locked) { toastFn(w.aero ? 'Locked. ' + w.name + ' comes with Doors Aero, when you are team lead.' : 'Locked. Finish a week as ' + UNLOCK[w.level] + ' to unlock ' + w.name + '.', 'info'); return; }
        store.set('intake-wallpaper', w.id);
        wallpaper(w.id);
        renderDisplay();
      };
      box.appendChild(b);
    });
  }

  // ---------- Doors Messenger: pop-ups and nudges ----------
  let toastFn = () => {};
  function im(from, text, onOpen, sound) {
    const box = $('im-pop');
    box.querySelector('.im-from').textContent = from + ' says:';
    box.querySelector('.im-text').textContent = text;
    box.hidden = false;
    box.classList.remove('in');
    void box.offsetWidth;
    box.classList.add('in');
    if (window.Sound && Sound[sound || 'im']) Sound[sound || 'im']();
    box.onclick = () => { box.hidden = true; if (onOpen) onOpen(); };
    clearTimeout(im.t);
    im.t = setTimeout(() => { box.hidden = true; }, 8000);
  }
  function nudge(winId) {
    const w = $(winId);
    if (!w) return;
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
    if (window.Sound && Sound.nudge) Sound.nudge();
  }

  // ---------- the brick phone: texts and Snake ----------
  // The inbox survives a reload, like a real SIM card (the last eight texts).
  let texts = [];
  try { texts = JSON.parse(store.get('intake-texts', '[]')) || []; } catch (e) { texts = []; }
  function sms(from, text) {
    texts.unshift({ from, text });
    texts = texts.slice(0, 8);
    store.set('intake-texts', JSON.stringify(texts));
    const n = $('phone-unread');
    if (n) { n.textContent = '✉ ' + texts.length; n.hidden = false; }
    const t = $('tray-sms');
    if (t) { t.textContent = String((+t.textContent || 0) + 1); t.hidden = false; }
    if (window.Sound && Sound.sms) Sound.sms();
    if (phone.view === 'texts') renderPhone();
  }
  const phone = { view: 'menu', snake: null };
  function renderPhone() {
    const scr = $('phone-screen');
    if (!scr) return;
    stopSnake();
    scr.innerHTML = '';
    const line = (t, cls) => { const p = document.createElement('p'); p.textContent = t; if (cls) p.className = cls; scr.appendChild(p); return p; };
    if (phone.view === 'menu') {
      line('Menu', 'ph-title');
      [['snake', '1 Snake'], ['texts', '2 Messages' + (texts.length ? ' (' + texts.length + ')' : '')]].forEach(([v, t]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ph-item';
        b.textContent = t;
        b.onclick = () => { phone.view = v; renderPhone(); };
        scr.appendChild(b);
      });
      line('Hi-score ' + store.get('intake-snake', '0'), 'ph-foot');
    } else if (phone.view === 'texts') {
      // One text per screen, newest first. 2 / 8 (or the arrows) to page through them.
      phone.msg = Math.max(0, Math.min(texts.length - 1, phone.msg || 0));
      line('Messages' + (texts.length ? ' ' + (phone.msg + 1) + '/' + texts.length : ''), 'ph-title');
      if (!texts.length) line('No messages.', 'ph-foot');
      else {
        const m = texts[phone.msg];
        line(m.from + ':', 'ph-from');
        line(m.text, 'ph-msg');
        const nav = document.createElement('div');
        nav.className = 'ph-nav';
        [['2', '▲ newer', phone.msg > 0], ['8', '▼ older', phone.msg < texts.length - 1]].forEach(([k, t, on]) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ph-item';
          b.textContent = t;
          b.disabled = !on;
          b.onclick = () => key(k);
          nav.appendChild(b);
        });
        scr.appendChild(nav);
      }
      const n = $('phone-unread');
      if (n) n.hidden = true;
      const t = $('tray-sms');
      if (t) { t.hidden = true; t.textContent = ''; }
    } else {
      const c = document.createElement('canvas');
      c.width = 84; c.height = 48;
      c.className = 'ph-snake';
      c.setAttribute('aria-label', 'Snake. Use the arrow keys or the phone keys 2, 4, 6 and 8.');
      scr.appendChild(c);
      startSnake(c);
    }
  }
  function startSnake(c) {
    const g = c.getContext('2d');
    const W = 21, H = 12, S = 4;
    const s = { body: [[5, 6], [4, 6], [3, 6]], dir: [1, 0], next: [1, 0], food: [14, 6], score: 0, dead: false };
    const place = () => { do { s.food = [Math.floor(Math.random() * W), Math.floor(Math.random() * H)]; } while (s.body.some(([x, y]) => x === s.food[0] && y === s.food[1])); };
    const draw = () => {
      g.fillStyle = '#9fb84a'; g.fillRect(0, 0, 84, 48);
      g.fillStyle = '#1e2a0e';
      s.body.forEach(([x, y]) => g.fillRect(x * S, y * S, S - 1, S - 1));
      g.fillRect(s.food[0] * S + 1, s.food[1] * S + 1, 2, 2);
      if (s.dead) { g.fillStyle = '#9fb84a'; g.fillRect(14, 16, 56, 16); g.fillStyle = '#1e2a0e'; g.font = '8px monospace'; g.fillText('GAME OVER ' + s.score, 16, 27); }
    };
    const tick = () => {
      if (s.dead || $('phone').hidden) return;
      s.dir = s.next;
      const head = [(s.body[0][0] + s.dir[0] + W) % W, (s.body[0][1] + s.dir[1] + H) % H];
      if (s.body.some(([x, y]) => x === head[0] && y === head[1])) {
        s.dead = true;
        if (s.score > +store.get('intake-snake', '0')) store.set('intake-snake', String(s.score));
        draw();
        return;
      }
      s.body.unshift(head);
      if (head[0] === s.food[0] && head[1] === s.food[1]) { s.score++; place(); } else s.body.pop();
      draw();
    };
    phone.snake = { s, timer: setInterval(tick, 170) };
    draw();
  }
  function stopSnake() { if (phone.snake) { clearInterval(phone.snake.timer); phone.snake = null; } }
  // The phone sits on top of the desk, not in a window. Drag it around by its body.
  const phoneOpen = () => !$('phone').hidden;
  function showPhone(view) {
    const el = $('phone');
    if (view) phone.view = view;
    if (el.hidden || view) renderPhone();
    el.hidden = false;
    el.classList.remove('pickup');
    void el.offsetWidth;
    el.classList.add('pickup');
  }
  function hidePhone() { $('phone').hidden = true; stopSnake(); phone.view = 'menu'; }
  function dragPhone(el) {
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || !window.matchMedia('(min-width: 900px)').matches) return;
      const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      el.setPointerCapture(e.pointerId);
      el.classList.add('held');
      const move = ev => {
        el.style.left = Math.max(-r.width / 2, Math.min(window.innerWidth - r.width / 2, ev.clientX - dx)) + 'px';
        el.style.top = Math.max(0, Math.min(window.innerHeight - 80, ev.clientY - dy)) + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
      };
      const up = () => { el.classList.remove('held'); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }
  function key(k) {
    if (k === 'away') { hidePhone(); return; }
    if (k === 'back') { phone.view = 'menu'; renderPhone(); return; }
    if (phone.view === 'menu') { if (k === '1') { phone.view = 'snake'; renderPhone(); } if (k === '2') { phone.view = 'texts'; phone.msg = 0; renderPhone(); } return; }
    if (phone.view === 'texts') {
      const step = { 2: -1, 4: -1, 8: 1, 6: 1 }[k];
      if (step) { phone.msg = (phone.msg || 0) + step; renderPhone(); }
      return;
    }
    if (!phone.snake) return;
    const s = phone.snake.s;
    if (s.dead && (k === '5' || k === 'ok')) { renderPhone(); return; }
    const d = { 2: [0, -1], 8: [0, 1], 4: [-1, 0], 6: [1, 0] }[k];
    if (d && !(d[0] === -s.dir[0] && d[1] === -s.dir[1])) s.next = d;
  }

  // ---------- Staply: an office assistant with confidently bad advice ----------
  const TIPS = {
    write: 'It looks like you\'re writing a needs analysis! Would you like me to add a learning styles questionnaire?',
    measure: 'It looks like you\'re measuring impact! Shall I add a smiley-face happy sheet? Everyone loves a happy sheet.',
    concept: 'It looks like you\'re designing a solution! Most people pick a three-day classroom with 80 slides. Shall I book a room?',
    risks: 'Risks? Nobody reads that part. Shall I just write "TBD"?',
    memo: 'It looks like you\'re writing a memo! Shall I make it longer? Longer looks more professional.',
    board: 'Presenting to the board? Try fourteen bullet points per slide and a star wipe!'
  };
  const YES = [
    'Great! I\'ve added a 45-minute learning styles questionnaire. (Not really. Mieke would staple us both.)',
    'Done! Everything is now in Comic Sans. (Not really. You\'re welcome.)',
    'Wonderful! I\'ve booked the big room for three days. (I haven\'t. I can\'t. I\'m a stapler.)'
  ];
  const seen = new Set();
  const staplyOn = () => store.get('intake-staply', 'on') === 'on';
  function staply(trigger) {
    if (!staplyOn() || seen.has(trigger) || !TIPS[trigger]) return false;
    seen.add(trigger);
    const box = $('staply');
    box.querySelector('.st-text').textContent = TIPS[trigger];
    box.querySelector('.st-actions').hidden = false;
    box.hidden = false;
    box.classList.remove('in');
    void box.offsetWidth;
    box.classList.add('in');
    // Ignored long enough, he wanders off.
    clearTimeout(staplySay.t);
    staplySay.t = setTimeout(() => { box.hidden = true; }, 20000);
    return true;
  }
  function staplySay(t) {
    const box = $('staply');
    box.querySelector('.st-text').textContent = t;
    box.querySelector('.st-actions').hidden = true;
    clearTimeout(staplySay.t);
    staplySay.t = setTimeout(() => { box.hidden = true; }, 5000);
  }
  function setStaply(on) { store.set('intake-staply', on ? 'on' : 'off'); if (!on) $('staply').hidden = true; }

  function init(opts) {
    toastFn = opts.toast || toastFn;
    const box = $('staply');
    box.querySelector('[data-st="yes"]').onclick = () => { staplySay(YES[Math.floor(Math.random() * YES.length)]); if (opts.onStaplyYes) opts.onStaplyYes(); };
    box.querySelector('[data-st="no"]').onclick = () => { box.hidden = true; };
    box.querySelector('[data-st="off"]').onclick = () => { setStaply(false); toastFn('Staply is off. Turn him back on from the start menu, if you miss him.', 'info'); if (opts.onStaplyChange) opts.onStaplyChange(); };
    document.querySelectorAll('#phone-keys [data-k]').forEach(b => { b.onclick = () => key(b.dataset.k); });
    $('phone-away').onclick = hidePhone;
    dragPhone($('phone'));
    document.addEventListener('keydown', ev => {
      if (!phoneOpen() || !$('s-desk').classList.contains('active')) return;
      // Only when you are on the phone (or nowhere in particular), so Enter still works in the windows.
      if (ev.target !== document.body && !ev.target.closest('#phone')) return;
      const k = { ArrowUp: '2', ArrowDown: '8', ArrowLeft: '4', ArrowRight: '6', Enter: 'ok', Escape: 'back' }[ev.key] || (/^[1-9]$/.test(ev.key) ? ev.key : '');
      if (k) { ev.preventDefault(); key(k); }
    });
    renderPhone();
  }

  window.Retro = { WALLPAPERS, setLevel, setAero, wallpaper, renderDisplay, im, nudge, sms, renderPhone, stopSnake, phone, showPhone, hidePhone, phoneOpen, staply, staplyOn, setStaply, init, resetStaply: () => seen.clear() };
})();
