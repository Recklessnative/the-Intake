// Your desk, pre-rendered in Blender (tools/office: scene.py shot desk, map in js/desk-map.js). Sitting
// down lands here first: the desk by day, with the screen on. You look at the screen to work, and lean
// back from it to the desk again; from the desk you can stand up and go. The things on the desk each
// say one thing. Same chrome as the floor: the picture fills the screen above an XP taskbar.
(function () {
  const $ = id => document.getElementById(id);
  const MEDIA = 'media/office/';
  const MAP = () => window.DESK_MAP || { things: {} };
  let cur = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build() {
    const s = $('s-seat');
    if (s.dataset.built) return;
    s.dataset.built = '1';
    const stage = el('div', 'fd-stage seat-stage');
    const pic = el('div', 'fd-pic seat-pic'); pic.id = 'seat-pic';
    const img = el('img'); img.alt = 'Your desk: the screen on, a mug, a pen pot and a tray of printouts, the phone, a plant on its last legs, the calendar, your coat on the side panel.';
    img.onerror = () => s.classList.add('no-pic');
    pic.appendChild(img);
    const card = el('div', 'office-card'); card.id = 'seat-card'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    pic.appendChild(card);
    stage.appendChild(pic);
    const line = el('p', 'office-line seat-line'); line.id = 'seat-line';
    const bar = el('div', 'office-bar');
    const list = el('nav', 'office-list'); list.id = 'seat-list'; list.setAttribute('aria-label', 'At your desk');
    const tray = el('div', 'office-tray');
    const vol = el('button', 'tray-sound'); vol.type = 'button'; vol.setAttribute('aria-label', 'Sound');
    vol.textContent = window.Sound && !Sound.on ? '🔇' : '🔊';
    const when = el('span', 'office-when'); when.id = 'seat-when';
    tray.append(vol, when);
    bar.append(list, tray);
    s.append(stage, line, bar);
    document.addEventListener('keydown', ev => {
      if (!s.classList.contains('active')) return;
      if (ev.key === 'Escape') { if (!card.hidden) closeCard(); }
      // Enter or space with nothing in focus: look at the screen, as most people will want.
      else if ((ev.key === 'Enter' || ev.key === ' ') && (document.activeElement === document.body || !s.contains(document.activeElement))) { ev.preventDefault(); screen(); }
    });
    pic.addEventListener('click', ev => { if (!ev.target.closest('.fd-hot, .office-tag, .office-card')) closeCard(); });
  }
  function closeCard() { const c = $('seat-card'); if (c) c.hidden = true; }
  function say(id, t) {
    const c = $('seat-card');
    c.innerHTML = '';
    const head = el('div', 'office-card-head titlebar');
    const x = el('button', 'tb close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = closeCard;
    head.append(el('span', 'office-face', t.face || '•'), el('span', 'tt', t.label), x);
    c.appendChild(head);
    String(t.text || '').split('\n\n').filter(Boolean).forEach(p => c.appendChild(el('p', null, p)));
    const row = el('div', 'row');
    (t.actions || []).forEach(a => { const b = el('button', a.primary ? 'primary' : null, a.label); b.type = 'button'; b.onclick = () => { closeCard(); a.go(); }; row.appendChild(b); });
    const back = el('button', null, 'OK'); back.type = 'button'; back.onclick = closeCard;
    row.appendChild(back);
    c.appendChild(row);
    const r = (MAP().things[id] || {}).rect || [40, 40, 60, 60];
    const cx = (r[0] + r[2]) / 2;
    c.className = 'office-card ' + (cx > 55 ? 'left' : 'right');
    c.style.left = (cx > 55 ? Math.max(2, r[0] - 1) : Math.min(98, r[2] + 1)) + '%';
    c.style.top = Math.min(60, Math.max(4, r[1])) + '%';
    c.hidden = false;
    back.focus({ preventScroll: true });
  }
  function go(id) {
    if (id === 'screen') { screen(); return; }
    const t = cur.things[id];
    if (!t) return;
    if (t.go) { closeCard(); t.go(); return; }
    say(id, t);
  }
  function screen() { if (cur && cur.screen) { closeCard(); cur.screen.go(); } }

  // The screen's box on the page, in pixels: where the zoom starts or ends.
  function screenBox() {
    const r = (MAP().things.screen || {}).rect, pic = $('seat-pic');
    if (!r || !pic) return null;
    const b = pic.getBoundingClientRect();
    if (!b.width) return null;
    // The CRT's glass only, not its beige front.
    const x0 = b.left + b.width * (r[0] + (r[2] - r[0]) * 0.074) / 100, x1 = b.left + b.width * (r[2] - (r[2] - r[0]) * 0.074) / 100;
    const y0 = b.top + b.height * (r[1] + (r[3] - r[1]) * 0.146) / 100, y1 = b.top + b.height * (r[3] - (r[3] - r[1]) * 0.091) / 100;
    return { x0, y0, x1, y1 };
  }
  // Scale and origin that take the whole window onto box `z` (and the inverse for the desk behind it).
  function zoomVars(node, z) {
    const W = window.innerWidth, H = window.innerHeight;
    const sx = (z.x1 - z.x0) / W, sy = (z.y1 - z.y0) / H;
    node.style.setProperty('--zsx', sx); node.style.setProperty('--zsy', sy);
    node.style.setProperty('--zox', (z.x0 / (1 - sx)) + 'px'); node.style.setProperty('--zoy', (z.y0 / (1 - sy)) + 'px');
    node.style.setProperty('--zix', 1 / sx); node.style.setProperty('--ziy', 1 / sy);
  }
  // Into the screen: the desktop grows out of the CRT while the desk pushes in behind it.
  // `open` shows the screen underneath (it must make #s-desk or #s-cubicle the active screen).
  function zoomIn(open) {
    const z = !reduced() && screenBox();
    const seat = $('s-seat');
    if (!z) { open(); return; }
    zoomVars(seat, z);
    seat.classList.add('leaving', 'push-in');
    open();
    const scr = document.querySelector('.screen.active');
    if (scr && scr !== seat) { zoomVars(scr, z); scr.classList.add('zoom-in'); }
    setTimeout(() => { seat.classList.remove('leaving', 'push-in'); if (scr) scr.classList.remove('zoom-in'); }, 360);
  }
  // Out of the screen, back to the desk: the reverse.
  function zoomOut(from) {
    const z = !reduced() && screenBox();
    if (!z || !from) return;
    const seat = $('s-seat');
    zoomVars(seat, z); zoomVars(from, z);
    from.classList.add('leaving', 'zoom-out');
    seat.classList.add('pull-out');
    setTimeout(() => { from.classList.remove('leaving', 'zoom-out'); seat.classList.remove('pull-out'); }, 360);
  }

  // opts: { when, line, screen: { label, sub, go }, stand: { label, sub, go } | null,
  //         things: { id: { label, face, text, actions?, go? } }, from: the screen element to zoom out of }
  function show(opts) {
    build();
    cur = opts;
    const s = $('s-seat'), pic = $('seat-pic'), map = MAP();
    const img = pic.querySelector('img');
    const src = MEDIA + (window.innerWidth < 1100 ? 'desk-960.webp' : 'desk.webp');
    if (img.getAttribute('src') !== src) img.src = src;
    pic.querySelectorAll('.fd-hot, .office-tag').forEach(b => b.remove());
    closeCard();
    // Bigger things first, so a smaller one on top of them stays clickable.
    const area = id => { const r = (map.things[id] || {}).rect || [0, 0, 0, 0]; return (r[2] - r[0]) * (r[3] - r[1]); };
    const ids = Object.keys(map.things).filter(id => id === 'screen' ? opts.screen : opts.things[id]);
    ids.sort((a, b) => area(b) - area(a)).forEach(id => {
      const t = map.things[id], label = id === 'screen' ? opts.screen.label : opts.things[id].label;
      const hot = el('button', 'fd-hot'); hot.type = 'button'; hot.dataset.thing = id; hot.setAttribute('aria-label', label);
      Object.assign(hot.style, { left: t.rect[0] + '%', top: t.rect[1] + '%', width: (t.rect[2] - t.rect[0]) + '%', height: (t.rect[3] - t.rect[1]) + '%' });
      hot.onclick = () => go(id);
      const tag = el('button', 'office-tag' + (id === 'screen' ? ' primary' : ''), label); tag.type = 'button'; tag.dataset.thing = id;
      Object.assign(tag.style, { left: t.tag[0] + '%', top: t.tag[1] + '%' });
      tag.onclick = () => go(id);
      hot.onmouseenter = () => tag.classList.add('hot'); hot.onmouseleave = () => tag.classList.remove('hot');
      pic.append(hot, tag);
    });
    $('seat-when').textContent = opts.when || '';
    $('seat-line').textContent = opts.line || '';
    const list = $('seat-list');
    list.innerHTML = '';
    [['screen', opts.screen, true], ['stand', opts.stand, false]].forEach(([k, a, primary]) => {
      if (!a) return;
      const b = el('button', primary ? 'primary' : null); b.type = 'button'; b.dataset.go = k;
      b.append(el('b', null, a.label));
      if (a.sub) b.append(el('span', null, a.sub));
      b.title = a.label + (a.sub ? ': ' + a.sub : '');
      b.onclick = () => { closeCard(); if (k === 'screen') screen(); else a.go(); };
      list.appendChild(b);
    });
    if (opts.show) opts.show('s-seat'); else document.querySelectorAll('.screen').forEach(x => x.classList.toggle('active', x.id === 's-seat'));
    if (opts.from) zoomOut(opts.from);
    const first = list.querySelector('button.primary');
    if (first) first.focus({ preventScroll: true });
  }

  window.Seat = { show, zoomIn, close: closeCard, get open() { const s = $('s-seat'); return !!(s && s.classList.contains('active')); } };
})();
