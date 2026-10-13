// The Synergix office floor, pre-rendered in Blender (see office/ in the repo history and the
// map in js/office-map.js). Two things live here:
//  - walkIn(): your first morning, a short film from the lift to your monitor. Skippable, and
//    skipped by itself when motion is reduced, data is saved, or the video cannot play.
//  - show(): the floor between requests. Places light up on hover; each one either moves the
//    game on (your desk, the board room) or says one thing (Mieke, Darren's door, the TV).
// No WebGL anywhere: a picture and a video play on any locked-down laptop.
(function () {
  const $ = id => document.getElementById(id);
  const MEDIA = 'media/office/';
  const MAP = window.OFFICE_MAP || { spots: {} };
  let show = id => {};
  let mask = null, maskW = 0, maskH = 0, current = null, hover = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = () => !!(navigator.connection && navigator.connection.saveData);

  // ---------- the hit mask: one grey level per place ----------
  const ORDER = ['desk', 'mieke', 'darren', 'tv', 'meeting', 'coffee', 'window'];
  function loadMask() {
    if (mask) return;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = maskW = img.naturalWidth; c.height = maskH = img.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        mask = g.getImageData(0, 0, maskW, maskH).data;
      } catch (e) { mask = null; }   // a tainted canvas (file://): the labels still work
    };
    img.src = MEDIA + 'mask.png';
  }
  function placeAt(ev, stage) {
    if (!mask) return null;
    const r = stage.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / r.width * maskW), y = Math.floor((ev.clientY - r.top) / r.height * maskH);
    if (x < 0 || y < 0 || x >= maskW || y >= maskH) return null;
    const id = ORDER[Math.round(mask[(y * maskW + x) * 4] / 32) - 1];
    return id && current && current.spots[id] ? id : null;
  }

  // ---------- the floor ----------
  function build() {
    const s = $('s-office');
    if (s.dataset.built) return;
    s.dataset.built = '1';
    s.innerHTML = '';
    const head = el('header', 'office-head');
    const when = el('p', 'office-when'); when.id = 'office-when';
    const line = el('p', 'office-line'); line.id = 'office-line';
    head.append(when, line);
    const stage = el('div', 'office-stage'); stage.id = 'office-stage';
    const pic = el('picture');
    const src = el('source'); src.media = '(max-width: 900px)'; src.srcset = MEDIA + 'hub-960.webp';
    const img = el('img', 'office-pic'); img.src = MEDIA + 'hub.webp'; img.id = 'office-pic';
    img.alt = 'The Synergix office floor from above: reception by the lift, two rows of cubicles, the glass board room, Darren\'s office and the canteen.';
    img.onerror = () => s.classList.add('no-pic');
    pic.append(src, img);
    stage.appendChild(pic);
    // Rain on the window band, masked to the glass.
    const w = MAP.spots.window;
    if (w) {
      const rain = el('div', 'office-rain');
      rain.setAttribute('aria-hidden', 'true');
      Object.assign(rain.style, { left: w.rect[0] + '%', top: w.rect[1] + '%', width: (w.rect[2] - w.rect[0]) + '%', height: (w.rect[3] - w.rect[1]) + '%' });
      stage.appendChild(rain);
    }
    Object.entries(MAP.spots).forEach(([id, sp]) => {
      if (!sp.tag) return;
      const g = el('img', 'office-glow'); g.alt = ''; g.dataset.spot = id; g.src = MEDIA + 'glow-' + id + '.webp';
      Object.assign(g.style, { left: sp.rect[0] + '%', top: sp.rect[1] + '%', width: (sp.rect[2] - sp.rect[0]) + '%', height: (sp.rect[3] - sp.rect[1]) + '%' });
      stage.appendChild(g);
      const t = el('button', 'office-tag'); t.type = 'button'; t.dataset.spot = id;
      t.style.left = sp.tag[0] + '%'; t.style.top = sp.tag[1] + '%';
      t.onclick = () => go(id);
      t.onmouseenter = t.onfocus = () => light(id);
      t.onmouseleave = t.onblur = () => light(null);
      stage.appendChild(t);
    });
    stage.addEventListener('pointermove', ev => { if (ev.target.classList.contains('office-tag')) return; const id = placeAt(ev, stage); light(id); stage.style.cursor = id ? 'pointer' : ''; });
    stage.addEventListener('pointerleave', () => light(null));
    stage.addEventListener('click', ev => { if (ev.target.closest('.office-tag, .office-card')) return; const id = placeAt(ev, stage); if (id) go(id); else closeCard(); });
    const card = el('div', 'office-card'); card.id = 'office-card'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    stage.appendChild(card);
    // The same places as a list: for phones, keyboards and screen readers.
    const list = el('nav', 'office-list'); list.id = 'office-list'; list.setAttribute('aria-label', 'Where to go');
    s.append(head, stage, list);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('s-office').classList.contains('active')) closeCard(); });
    loadMask();
  }
  function light(id) {
    hover = id;
    document.querySelectorAll('#s-office .office-glow').forEach(g => g.classList.toggle('on', g.dataset.spot === id));
    document.querySelectorAll('#s-office .office-tag').forEach(t => t.classList.toggle('hot', t.dataset.spot === id));
  }
  function closeCard() { const c = $('office-card'); if (c) c.hidden = true; }
  function go(id) {
    const sp = current && current.spots[id];
    if (!sp) return;
    if (sp.go) { closeCard(); sp.go(); return; }
    const c = $('office-card');
    c.innerHTML = '';
    const head = el('div', 'office-card-head');
    head.append(el('span', 'office-face', sp.face || '•'), el('b', null, sp.who || sp.label));
    c.appendChild(head);
    if (sp.title) c.appendChild(el('p', 'office-card-title', sp.title));
    String(sp.text || '').split('\n\n').forEach(t => c.appendChild(el('p', null, t)));
    const row = el('div', 'row');
    const back = el('button', null, 'Back to the floor'); back.type = 'button'; back.onclick = closeCard;
    row.appendChild(back);
    const main = Object.entries(current.spots).find(([, v]) => v.primary);
    if (main && main[0] !== id) { const b = el('button', 'primary', main[1].label); b.type = 'button'; b.onclick = () => go(main[0]); row.appendChild(b); }
    c.appendChild(row);
    // Beside the place, inside the picture.
    const r = (MAP.spots[id] || {}).rect || [40, 40, 60, 60];
    const cx = (r[0] + r[2]) / 2;
    c.className = 'office-card ' + (cx > 55 ? 'left' : 'right');
    c.style.left = (cx > 55 ? Math.max(2, r[0] - 1) : Math.min(98, r[2] + 1)) + '%';
    c.style.top = Math.min(70, Math.max(4, r[1])) + '%';
    c.hidden = false;
    back.focus();
  }

  // opts: { when, line, spots: { id: { label, sub, primary, go } or { label, who, face, title, text } } }
  function showFloor(opts) {
    build();
    current = opts;
    $('office-when').textContent = opts.when || '';
    $('office-line').textContent = opts.line || '';
    closeCard();
    light(null);
    document.querySelectorAll('#s-office .office-tag').forEach(t => {
      const sp = opts.spots[t.dataset.spot];
      t.hidden = !sp;
      t.textContent = sp ? sp.label : '';
      t.classList.toggle('primary', !!(sp && sp.primary));
    });
    const list = $('office-list');
    list.innerHTML = '';
    ORDER.filter(id => opts.spots[id]).sort((a, b) => !!opts.spots[b].primary - !!opts.spots[a].primary).forEach(id => {
      const sp = opts.spots[id];
      const b = el('button', sp.primary ? 'primary' : null); b.type = 'button'; b.dataset.spot = id;
      b.append(el('b', null, sp.label));
      if (sp.sub) b.append(el('span', null, sp.sub));
      b.onclick = () => go(id);
      list.appendChild(b);
    });
    show('s-office');
    untangle();
    const first = document.querySelector('#s-office .office-tag.primary:not([hidden])');
    if (first) first.focus({ preventScroll: true });
  }

  // Labels that land on top of each other (the TV and the coffee machine share a wall): the
  // later one moves up until it is clear.
  function untangle() {
    const tags = [...document.querySelectorAll('#s-office .office-tag:not([hidden])')];
    tags.forEach(t => { t.style.marginTop = ''; });
    const placed = [];
    tags.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top).forEach(t => {
      for (let n = 0; n < 6; n++) {
        const r = t.getBoundingClientRect();
        const hit = placed.find(q => r.left < q.right + 4 && r.right > q.left - 4 && r.top < q.bottom + 4 && r.bottom > q.top - 4);
        if (!hit) break;
        t.style.marginTop = (parseFloat(t.style.marginTop || 0) - (r.bottom - hit.top + 6)) + 'px';
      }
      placed.push(t.getBoundingClientRect());
    });
  }
  window.addEventListener('resize', () => { if ($('s-office') && $('s-office').classList.contains('active')) untangle(); });

  // ---------- the walk-in ----------
  function walkIn(onDone, captions) {
    if (reduced() || saveData() || !document.createElement('video').canPlayType) { onDone(false); return; }
    const s = $('s-walkin');
    s.innerHTML = '';
    const v = el('video', 'walkin-video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = MEDIA + 'walkin-poster.jpg';
    [['walkin.webm', 'video/webm'], ['walkin.mp4', 'video/mp4']].forEach(([f, t]) => { const so = el('source'); so.src = MEDIA + f; so.type = t; v.appendChild(so); });
    const cap = el('p', 'walkin-cap'); cap.setAttribute('aria-live', 'polite');
    const skip = el('button', 'walkin-skip', 'Skip'); skip.type = 'button'; skip.id = 'btn-walkin-skip';
    const fade = el('div', 'walkin-fade');
    s.append(v, fade, cap, skip);
    s.setAttribute('aria-label', 'You walk from the lift to your desk');
    let over = false, shown = -1;
    const finish = played => {
      if (over) return;
      over = true;
      clearTimeout(stall);
      v.pause();
      document.removeEventListener('keydown', key, true);
      document.body.dataset.walkin = played ? 'played' : 'failed';
      onDone(played);
    };
    const key = ev => { if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); finish(true); } };
    skip.onclick = () => finish(true);
    document.addEventListener('keydown', key, true);
    // The film never holds anyone up: if it has not started within four seconds, the boot screen takes over.
    const stall = setTimeout(() => { if (!v.currentTime) finish(false); }, 4000);
    v.addEventListener('error', () => finish(false), true);
    v.querySelectorAll('source')[1].addEventListener('error', () => finish(false));
    v.addEventListener('timeupdate', () => {
      const t = v.currentTime;
      const i = (captions || []).reduce((k, c, n) => (t >= c[0] ? n : k), -1);
      if (i !== shown) { shown = i; cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = i >= 0 ? captions[i][1] : ''; if (i >= 0) cap.classList.add('in'); }
      // The last half second fades into the black of your monitor.
      if (v.duration && t > v.duration - 0.6) fade.classList.add('on');
    });
    v.addEventListener('ended', () => finish(true));
    show('s-walkin');
    skip.focus({ preventScroll: true });
    const p = v.play();
    if (p && p.catch) p.catch(() => finish(false));
  }

  window.Office = { init: o => { show = o.show; }, show: showFloor, walkIn, close: closeCard };
})();
