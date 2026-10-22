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
  let look = id => {};
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
  // The mask's place ids, in tools/office/post.py order; ORDER is how the taskbar lists them.
  const IDS = ['desk', 'mieke', 'darren', 'tv', 'meeting', 'coffee', 'window', 'bart', 'priya', 'jens', 'canteen', 'lift'];
  const ORDER = ['desk', 'mieke', 'bart', 'priya', 'jens', 'darren', 'meeting', 'canteen', 'tv', 'coffee', 'lift'];
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
    const id = IDS[Math.round(mask[(y * maskW + x) * 4] / 20) - 1];
    return id && current && current.spots[id] ? id : null;
  }

  // ---------- the floor ----------
  function build() {
    const s = $('s-office');
    if (s.dataset.built) return;
    s.dataset.built = '1';
    s.innerHTML = '';
    // The render fills the screen; the controls on top of it are the PC's own: a taskbar with the
    // places, a tray with the notebook and the clock, and a balloon tip for what is going on.
    const when = el('span', 'office-when'); when.id = 'office-when';
    const line = el('p', 'office-line'); line.id = 'office-line';
    const nb = el('button', 'office-notebook'); nb.id = 'office-notebook'; nb.type = 'button'; nb.hidden = true;
    nb.onclick = () => notebook();
    const tray = el('div', 'office-tray');
    const vol = el('button', 'tray-sound'); vol.type = 'button'; vol.setAttribute('aria-label', 'Sound');
    vol.textContent = window.Sound && !Sound.on ? '🔇' : '🔊';
    tray.append(nb, vol, when);
    const stage = el('div', 'office-stage'); stage.id = 'office-stage';
    const pic = el('picture');
    const src = el('source'); src.media = '(max-width: 900px)'; src.srcset = MEDIA + 'hub-960.webp';
    const img = el('img', 'office-pic'); img.src = MEDIA + 'hub.webp'; img.id = 'office-pic';
    img.alt = 'The Synergix office floor from above: reception by the lift, two rows of cubicles, the glass board room, Darren\'s office and the canteen.';
    img.onerror = () => s.classList.add('no-pic');
    pic.append(src, img);
    // The weather goes behind the picture: the window glass is see-through, the mullions stay in front.
    const w = MAP.spots.window;
    if (w) {
      const rain = el('div', 'office-rain');
      rain.setAttribute('aria-hidden', 'true');
      Object.assign(rain.style, { left: w.rect[0] + '%', top: w.rect[1] + '%', width: (w.rect[2] - w.rect[0]) + '%', height: (w.rect[3] - w.rect[1]) + '%' });
      stage.appendChild(rain);
    }
    stage.appendChild(pic);
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
    stage.addEventListener('pointermove', ev => { if (looking) return; if (ev.target.classList.contains('office-tag')) return; const id = placeAt(ev, stage); light(id); stage.style.cursor = id ? 'pointer' : ''; });
    stage.addEventListener('pointerleave', () => light(null));
    // A click inside a card that redrew itself (a notebook tab) lands on a detached element: not the floor.
    stage.addEventListener('click', ev => { if (looking || !ev.target.isConnected || ev.target.closest('.office-tag, .office-card')) return; const id = placeAt(ev, stage); if (id) go(id); else closeCard(); });
    const card = el('div', 'office-card'); card.id = 'office-card'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    stage.appendChild(card);
    // The same places as a list: for phones, keyboards and screen readers.
    const list = el('nav', 'office-list'); list.id = 'office-list'; list.setAttribute('aria-label', 'Where to go');
    const bar = el('div', 'office-bar');
    bar.append(list, tray);
    s.append(stage, line, bar);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('s-office').classList.contains('active')) { const c = $('office-card'); if (c && !c.hidden) closeCard(); else if (looking) closeLook(); } });
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
    if (sp.look && (MAP.shots || {})[sp.look.shot]) { openLook(id); return; }
    say(id, sp);
  }
  // Open the card for a place, with what it has to say.
  function say(id, sp, rect, backLabel) {
    const c = $('office-card');
    c.innerHTML = '';
    const head = el('div', 'office-card-head titlebar');
    const x = el('button', 'tb close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = closeCard;
    head.append(el('span', 'office-face', sp.face || '•'), el('span', 'tt', sp.who || sp.label), x);
    c.appendChild(head);
    if (sp.title) c.appendChild(el('p', 'office-card-title', sp.title));
    String(sp.text || '').split('\n\n').filter(Boolean).forEach(t => c.appendChild(el('p', null, t)));
    const row = el('div', 'row');
    // Something odd can go in the notebook's "Doesn't add up" page.
    if (sp.note) {
      const nb = el('button', 'note-it', sp.note.done() ? '📌 Noted' : '📌 Note it'); nb.type = 'button'; nb.disabled = sp.note.done();
      nb.onclick = () => { sp.note.add(); nb.textContent = '📌 Noted'; nb.disabled = true; };
      row.appendChild(nb);
    }
    const back = el('button', null, backLabel || 'Back to the floor'); back.type = 'button'; back.onclick = closeCard;
    row.appendChild(back);
    // A place with a choice (the lift, once button 5 works): one button per way to go.
    (sp.actions || []).forEach(a => { const b = el('button', 'primary', a.label); b.type = 'button'; b.onclick = () => { closeCard(); a.go(); }; row.appendChild(b); });
    const main = Object.entries(current.spots).find(([, v]) => v.primary);
    if (main && main[0] !== id && !looking) { const b = el('button', 'primary', main[1].label); b.type = 'button'; b.onclick = () => go(main[0]); row.appendChild(b); }
    c.appendChild(row);
    // Beside the place, inside the picture.
    const r = rect || (MAP.spots[id] || {}).rect || [40, 40, 60, 60];
    const cx = (r[0] + r[2]) / 2;
    c.className = 'office-card ' + (cx > 55 ? 'left' : 'right');
    c.style.left = (cx > 55 ? Math.max(2, r[0] - 1) : Math.min(98, r[2] + 1)) + '%';
    c.style.top = Math.min(70, Math.max(4, r[1])) + '%';
    c.hidden = false;
    back.focus();
  }

  // ---------- a closer look: one place, rendered close up, with things to find ----------
  // spot.look = { shot, title, things: [{ id, label, text, fresh }] }; opts.onFind(shot, id) records a find.
  let looking = null;
  function openLook(id) {
    const sp = current.spots[id], L = sp.look, shot = MAP.shots[L.shot];
    looking = id;
    closeCard(); light(null);
    const stage = $('office-stage');
    stage.classList.add('looking');
    let lay = $('office-look');
    if (!lay) { lay = el('div', 'office-look'); lay.id = 'office-look'; stage.insertBefore(lay, $('office-card')); }
    lay.innerHTML = '';
    const img = el('img', 'office-look-pic'); img.alt = L.title; img.src = MEDIA + 'shot-' + L.shot + '.webp';
    lay.appendChild(img);
    const back = el('button', 'office-look-back', '← Back to the floor'); back.type = 'button'; back.onclick = closeLook;
    lay.appendChild(back);
    L.things.forEach(t => {
      const m = shot.things[t.id];
      if (!m) return;
      const b = el('button', 'office-tag thing' + (t.fresh ? ' fresh' : ''), t.label); b.type = 'button'; b.dataset.thing = t.id;
      b.style.left = m.tag[0] + '%'; b.style.top = m.tag[1] + '%';
      b.onclick = () => find(t);
      lay.appendChild(b);
    });
    $('office-line').textContent = L.title + (L.things.some(t => t.fresh) ? ' · something you have not seen before' : '');
    const list = $('office-list');
    list.innerHTML = '';
    L.things.forEach(t => {
      const b = el('button', t.fresh ? 'fresh' : null); b.type = 'button'; b.dataset.thing = t.id;
      b.append(el('b', null, t.label)); b.onclick = () => find(t);
      list.appendChild(b);
    });
    const bk = el('button'); bk.type = 'button'; bk.append(el('b', null, 'Back to the floor')); bk.onclick = closeLook; list.appendChild(bk);
    untangleIn(lay);
    // Whoever works here still has their line, as a note left on the desk.
    if (sp.text) say(id, Object.assign({}, sp, { who: sp.look.note || sp.who }), [70, 4, 72, 10], 'Have a look around');
    else back.focus({ preventScroll: true });
  }
  function find(t) {
    const shot = current.spots[looking].look.shot;
    const r = (MAP.shots[shot].things[t.id] || {}).rect;
    say('thing', { face: '🔍', who: t.label, text: t.text, note: t.odd && current.noteThing ? current.noteThing(shot, t) : null }, r, 'Keep looking');
    if (t.fresh) {
      t.fresh = false;
      document.querySelectorAll('#office-look [data-thing="' + t.id + '"], #office-list [data-thing="' + t.id + '"]').forEach(b => b.classList.remove('fresh'));
      if (current.onFind) current.onFind(shot, t.id);
    }
  }
  // What you have found so far, by whose it is. Once something odd is noted, a second page:
  // "Doesn't add up" (drawn by N.odd, see js/arc.js).
  function notebook(tab) {
    const N = current.notebook;
    const text = N.entries.length ? N.entries.map(e => e.who + ' · ' + e.label + '\n' + e.text).join('\n\n')
      : 'Nothing yet. Have a closer look at people\'s desks between requests.';
    const odd = N.odd && N.odd.count() > 0;
    look('notebook');
    if (!odd || tab !== 'odd') say('notebook', { face: '📓', who: 'Your notebook', title: N.entries.length + ' of ' + N.of + ' found', text }, [30, 4, 32, 10], 'Close');
    else { say('notebook', { face: '📓', who: 'Your notebook' }, [30, 4, 32, 10], 'Close'); const c = $('office-card'), box = el('div', 'nb-page'); c.insertBefore(box, c.querySelector('.row')); N.odd.draw(box); }
    if (!odd) return;
    const c = $('office-card'), tabs = el('div', 'nb-tabs'); tabs.setAttribute('role', 'tablist');
    [['found', 'Found'], ['odd', 'Doesn\'t add up']].forEach(([k, t]) => {
      const b = el('button', null, t); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = k;
      const on = (tab === 'odd') === (k === 'odd');
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.onclick = () => { if (!on) notebook(k); };
      tabs.appendChild(b);
    });
    c.insertBefore(tabs, c.querySelector('.office-card-head').nextSibling);
  }
  function closeLook() {
    looking = null;
    closeCard();
    const lay = $('office-look'); if (lay) lay.remove();
    $('office-stage').classList.remove('looking');
    current.intro = null;
    showFloor(current);
  }

  // opts: { when, line, spots: { id: { label, sub, primary, go } or { label, who, face, title, text } } }
  function showFloor(opts) {
    build();
    if (looking) { looking = null; const lay = $('office-look'); if (lay) lay.remove(); $('office-stage').classList.remove('looking'); }
    current = opts;
    const fresh = sp => !!(sp && sp.look && sp.look.things.some(t => t.fresh));
    $('office-when').textContent = opts.when || '';
    const nb = $('office-notebook');
    nb.hidden = !opts.notebook || !opts.notebook.of;
    if (opts.notebook) nb.textContent = '📓 Notebook ' + opts.notebook.entries.length + '/' + opts.notebook.of;
    $('office-line').textContent = opts.line || '';
    // At the end of a day the same floor at 17:40: most lights off, dusk behind the rain.
    const eve = !!(opts.evening && MAP.evening);
    if (window.Sound) Sound.scene(opts.evening ? 'evening' : 'floor');
    const stage = $('office-stage');
    if (stage.classList.contains('evening') !== eve) {
      stage.classList.toggle('evening', eve);
      const name = eve ? 'hub-evening' : 'hub';
      $('office-pic').src = MEDIA + name + '.webp';
      document.querySelector('#office-stage picture source').srcset = MEDIA + name + '-960.webp';
    }
    closeCard();
    light(null);
    document.querySelectorAll('#s-office .office-tag').forEach(t => {
      const sp = opts.spots[t.dataset.spot];
      t.hidden = !sp;
      t.textContent = sp ? sp.label : '';
      t.classList.toggle('primary', !!(sp && sp.primary));
      t.classList.toggle('fresh', fresh(sp));
    });
    const list = $('office-list');
    list.innerHTML = '';
    ORDER.filter(id => opts.spots[id]).sort((a, b) => !!opts.spots[b].primary - !!opts.spots[a].primary).forEach(id => {
      const sp = opts.spots[id];
      const b = el('button', (sp.primary ? 'primary' : '') + (fresh(sp) ? ' fresh' : '')); b.type = 'button'; b.dataset.spot = id;
      b.append(el('b', null, sp.label));
      if (sp.sub || sp.look) b.append(el('span', null, sp.sub || (fresh(sp) ? 'Something new to look at' : 'Have a closer look')));
      b.title = sp.label + (sp.sub ? ': ' + sp.sub : '');
      b.onclick = () => go(id);
      list.appendChild(b);
    });
    show('s-office');
    untangle();
    const first = document.querySelector('#s-office .office-tag.primary:not([hidden])');
    if (first) first.focus({ preventScroll: true });
    if (opts.intro) say(opts.intro.at, opts.intro);
  }

  // Labels that land on top of each other (the TV and the coffee machine share a wall): the
  // later one moves up until it is clear.
  function untangle() { untangleIn(document.querySelector('#office-stage')); }
  function untangleIn(root) {
    const tags = [...root.querySelectorAll(':scope > .office-tag:not([hidden])')];
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

  // ---------- standing up and sitting down ----------
  // A short film over the page: from your monitor you stand up and the view rises into the floor
  // picture (stand), or the same shot backwards (sit). `under` swaps the screen beneath while the
  // last frame is still up, then the film fades away into it. Any key or click skips.
  function film(name, under, rate) {
    if (reduced() || saveData() || !document.createElement('video').canPlayType) { under(false); return; }
    const old = $('office-film');
    if (old) old.remove();
    const f = el('div', 'office-film'); f.id = 'office-film'; f.setAttribute('aria-hidden', 'true');
    const v = el('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = MEDIA + name + '-poster.jpg';
    [[name + '.webm', 'video/webm'], [name + '.mp4', 'video/mp4']].forEach(([n, t]) => { const so = el('source'); so.src = MEDIA + n; so.type = t; v.appendChild(so); });
    f.appendChild(v);
    document.body.appendChild(f);
    document.body.dataset.film = name + '-playing';
    let over = false;
    const finish = played => {
      if (over) return;
      over = true;
      clearTimeout(stall);
      document.removeEventListener('keydown', key, true);
      document.body.dataset.film = name + (played ? '-played' : '-failed');
      under(played);
      f.classList.add('out');
      setTimeout(() => f.remove(), 700);
    };
    const key = ev => { if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); finish(true); } };
    document.addEventListener('keydown', key, true);
    f.addEventListener('click', () => finish(true));
    const stall = setTimeout(() => { if (!v.currentTime) finish(false); }, 2500);
    v.querySelectorAll('source')[1].addEventListener('error', () => finish(false));
    v.addEventListener('ended', () => finish(true));
    requestAnimationFrame(() => f.classList.add('in'));
    v.playbackRate = rate || 1;
    const p = v.play();
    if (p && p.catch) p.catch(() => finish(false));
  }
  // From your desk to the floor.
  // `between`: anything that happens after you stand and before the floor shows (going home overnight).
  function standUp(opts, between) {
    film('stand', played => { showFloor(opts); if (between) between(); if (!played) { const st = $('office-stage'); st.classList.remove('arrive'); void st.offsetWidth; st.classList.add('arrive'); } });
  }
  // From the floor back to your desk: the same shot backwards, a little quicker.
  function sitDown(then) { closeCard(); film('sit', () => then(), 1.25); }

  window.Office = { init: o => { show = o.show; look = o.look || (() => {}); }, show: showFloor, standUp, sitDown, walkIn, close: closeCard };
})();
