// Pitchwright 2007: the board room slide as a real 2007 slide. You edit it on a 4:3 canvas
// with a design, a transition, WordArt and clip art, then present it full screen, one box per
// click, while the board reacts in the front row. Style never changes a score; the board may
// still have something to say about a star wipe. Static, trusted markup.
(function () {
  const BOXES = [['problem', 'The problem'], ['evidence', 'Evidence of the need'], ['concept', 'The concept'], ['measure', 'How we will know'], ['risks', 'Risks and dependencies'], ['ask', 'The ask: budget, time, sponsor']];
  const THEMES = [['blue', 'Corporate Blue'], ['ocean', 'Ocean Gradient'], ['beige', 'Beige Professional'], ['night', 'Midnight Synergy']];
  const TRANSITIONS = [['none', 'No transition'], ['fade', 'Fade smoothly'], ['wipe', 'Wipe right'], ['star', 'Star wipe'], ['spin', 'Spin and zoom']];
  const CLIPART = [['', 'None'], ['🤝', 'Handshake'], ['📈', 'Chart going up'], ['💡', 'Light bulb'], ['🏆', 'Trophy'], ['🧩', 'Puzzle piece'], ['🚀', 'Rocket']];
  // Nobody in the building has a face, so the board reacts with things, not expressions.
  const REACT = { nod: '👍', note: '📝', frown: '👎', eyebrow: '❓', yawn: '💤', calculator: '🧮' };
  const REACTIONS = Object.keys(REACT);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const label = (list, k) => (list.find(x => x[0] === k) || list[0])[1];
  function style(B) {
    // Fill in defaults in place: the editor holds on to this object.
    const d = { theme: 'blue', transition: 'fade', wordart: false, clip: '', title: '' };
    B.look = B.look || {};
    Object.keys(d).forEach(k => { if (B.look[k] == null) B.look[k] = d[k]; });
    return B.look;
  }
  const titleOf = (B, card) => (style(B).title || '').trim() || 'A proposal for ' + (card.stakeholder.org || card.stakeholder.name).split(',')[0];
  // For the board prompt: how the slide looks, in words.
  function describe(B) {
    const s = style(B);
    return 'Design "' + label(THEMES, s.theme) + '", transition "' + label(TRANSITIONS, s.transition) + '"' + (s.wordart ? ', the title in WordArt' : '') + (s.clip ? ', clip art of a ' + label(CLIPART, s.clip).toLowerCase() : '') + '.';
  }
  const flashy = B => { const s = style(B); return s.transition === 'star' || s.transition === 'spin' || s.wordart || !!s.clip; };

  // The editor: a ribbon and the slide itself, typed into in place.
  function editor(box, B, card, onChange) {
    const s = style(B);
    const app = el('div', 'pw');
    const bar = el('div', 'pw-bar');
    bar.appendChild(el('span', 'pw-name', 'Pitchwright 2007'));
    const pickers = el('div', 'pw-ribbon');
    const select = (name, list, value, set) => {
      const l = el('label', 'pw-pick', name + ' ');
      const sel = el('select');
      sel.name = 'pw-' + name.toLowerCase().replace(/\W+/g, '');
      list.forEach(([k, t]) => { const o = el('option', null, t); o.value = k; sel.appendChild(o); });
      sel.value = value;
      sel.onchange = () => { set(sel.value); onChange(); };
      l.appendChild(sel);
      return l;
    };
    const themes = el('div', 'pw-themes');
    themes.appendChild(el('span', null, 'Design'));
    THEMES.forEach(([k, t]) => {
      const b = el('button', 'pw-theme t-' + k + (s.theme === k ? ' on' : ''));
      b.type = 'button'; b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-pressed', String(s.theme === k));
      b.onclick = () => { s.theme = k; onChange(); };
      themes.appendChild(b);
    });
    pickers.appendChild(themes);
    pickers.appendChild(select('Transition', TRANSITIONS, s.transition, v => { s.transition = v; }));
    pickers.appendChild(select('Clip art', CLIPART, s.clip, v => { s.clip = v; }));
    const wa = el('label', 'pw-pick');
    const cb = el('input');
    cb.type = 'checkbox'; cb.name = 'pw-wordart'; cb.checked = s.wordart;
    cb.onchange = () => { s.wordart = cb.checked; onChange(); };
    wa.append(cb, ' WordArt title');
    pickers.appendChild(wa);
    bar.appendChild(pickers);
    app.appendChild(bar);

    const slide = el('div', 'pw-slide t-' + s.theme);
    const head = el('div', 'pw-head');
    const title = el('input', 'pw-title' + (s.wordart ? ' wordart' : ''));
    title.name = 'pw-title'; title.maxLength = 70; title.value = s.title; title.placeholder = titleOf(B, card);
    title.setAttribute('aria-label', 'Slide title');
    title.oninput = () => { s.title = title.value; onChange(true); };
    head.appendChild(title);
    if (s.clip) head.appendChild(el('span', 'pw-clip', s.clip));
    slide.appendChild(head);
    const grid = el('div', 'slide');
    BOXES.forEach(([k, l]) => {
      const lab = el('label', 'pw-box', l);
      const t = el('textarea');
      t.rows = 4; t.maxLength = 500; t.name = k; t.placeholder = 'Click to add text';
      t.value = B.slide[k] || '';
      t.oninput = () => { B.slide[k] = t.value; onChange(true); };
      lab.appendChild(t);
      grid.appendChild(lab);
    });
    slide.appendChild(grid);
    app.appendChild(slide);
    box.appendChild(app);
  }

  // The slide as it is projected (also used small, as a thumbnail on the result).
  function render(B, card, cls) {
    const s = style(B);
    const slide = el('div', 'ss-slide t-' + s.theme + (cls ? ' ' + cls : ''));
    const head = el('div', 'ss-head');
    head.appendChild(el('h2', 'ss-title' + (s.wordart ? ' wordart' : ''), titleOf(B, card)));
    if (s.clip) head.appendChild(el('span', 'ss-clip', s.clip));
    slide.appendChild(head);
    const grid = el('div', 'ss-grid');
    BOXES.forEach(([k, l]) => {
      const b = el('div', 'ss-box');
      b.dataset.k = k;
      b.appendChild(el('b', null, l));
      b.appendChild(el('p', null, (B.slide[k] || '').trim() || '(empty)'));
      if (!(B.slide[k] || '').trim()) b.classList.add('empty');
      grid.appendChild(b);
    });
    slide.appendChild(grid);
    return slide;
  }
  // Long boxes shrink until they fit, like PowerPoint's autofit (and just as ugly when overdone).
  function fit(slide) {
    slide.querySelectorAll('.ss-box p').forEach(p => {
      let size = 100;
      p.style.fontSize = '';
      while (p.scrollHeight > p.clientHeight + 1 && size > 55) { size -= 5; p.style.fontSize = size + '%'; }
    });
  }

  // ---------- the slide on the board room's screen ----------
  // The board room is a render; the slide is drawn by the page and bent onto the screen in it, so
  // whatever you wrote shows without rendering anything again. MAP.board.show / .room hold the
  // screen's corners (top left, top right, bottom right, bottom left) in % of the picture.
  const MEDIA = 'media/office/';
  const MAP = () => (window.OFFICE_MAP || {}).board || {};
  const BASE_W = 800, BASE_H = 600;
  // The 2D projective transform taking the base rectangle onto four points, as a CSS matrix3d.
  function warp(pts) {
    const src = [[0, 0], [BASE_W, 0], [BASE_W, BASE_H], [0, BASE_H]];
    const A = [], b = [];
    src.forEach(([x, y], i) => {
      const [u, v] = pts[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    });
    for (let c = 0; c < 8; c++) {   // Gaussian elimination with partial pivoting
      let m = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      [A[c], A[m]] = [A[m], A[c]]; [b[c], b[m]] = [b[m], b[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const h = b.map((v, i) => v / A[i][i]);
    return 'matrix3d(' + [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1].join(',') + ')';
  }
  // The slide keeps its own size and transitions; the screen around it does the bending.
  function onScreen(frame, slide, corners) {
    const scr = el('div', 'ss-screen');
    slide.parentNode.insertBefore(scr, slide);
    scr.appendChild(slide);
    const place = () => {
      const w = frame.clientWidth, h = frame.clientHeight;
      if (!w || !h) return;
      scr.style.transform = warp(corners.map(([x, y]) => [x / 100 * w, y / 100 * h]));
    };
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(frame);
    else window.addEventListener('resize', place);
    requestAnimationFrame(place);
  }
  function picture(name, cls) {
    const pic = el('picture', cls);
    const src = el('source'); src.media = '(max-width: 900px)'; src.srcset = MEDIA + name + '-800.webp';
    const img = el('img'); img.src = MEDIA + name + '.webp'; img.alt = '';
    pic.append(src, img);
    return pic;
  }
  // The wide room with the slide on the screen: light = 'lit' (approved), 'dim' (presenting, pilot), 'off' (rejected).
  function room(B, card, light, alt) {
    const corners = MAP().room;
    const frame = el('div', 'br-room');
    if (!corners) { frame.classList.add('flat'); frame.appendChild(render(B, card, 'thumb')); return frame; }
    const pic = picture('board-' + light);
    pic.querySelector('img').alt = alt || 'The board room, with your slide on the screen.';
    frame.appendChild(pic);
    const slide = render(B, card, 'thumb');
    frame.appendChild(slide);
    onScreen(frame, slide, corners);
    return frame;
  }
  // A board member's place at the table, cut from the wide room: how you know who is talking.
  function seat(id, light) {
    const r = ((MAP().seats || {})[id] || {}).rect;
    const s = el('span', 'br-place');
    if (!r) return s;
    const pad = 1.5, x0 = Math.max(0, r[0] - pad), y0 = Math.max(0, r[1] - pad), cw = Math.min(100, r[2] + pad) - x0, ch = Math.min(100, r[3] + pad) - y0;
    s.style.backgroundImage = 'url(' + MEDIA + 'board-' + (light || 'lit') + '.webp)';
    s.style.backgroundSize = (10000 / cw) + '% ' + (10000 / ch) + '%';
    s.style.backgroundPosition = (cw < 100 ? x0 / (100 - cw) * 100 : 0) + '% ' + (ch < 100 ? y0 / (100 - ch) * 100 : 0) + '%';
    s.style.aspectRatio = (cw * 16) / (ch * 9);
    return s;
  }

  // The show: the board room in the dark, the slide on the screen, one box per click, the board at the table.
  let showing = null;
  function show(B, card, board, done) {
    stop();
    const s = style(B);
    const ov = el('div', 'slideshow');
    ov.id = 'slideshow';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Slide show');
    const corners = MAP().show;
    const stage = el('div', 'ss-stage' + (corners ? ' in-room' : ''));
    const slide = render(B, card, 'in-' + s.transition);
    slide.querySelectorAll('.ss-box').forEach(b => b.classList.add('later'));
    if (corners) {
      ov.classList.add('in-room');
      const pic = picture('board-show', 'ss-room');
      pic.querySelector('img').alt = 'The board room in the dark, the projector on the screen.';
      stage.appendChild(pic);
      stage.appendChild(slide);
      onScreen(stage, slide, corners);
    } else stage.appendChild(slide);
    ov.appendChild(stage);
    const row = el('div', 'ss-audience');
    const heads = board.map((m, i) => {
      const h = el('div', 'ss-head-' + i + ' ss-member');
      const bubble = el('span', 'ss-react');
      h.append(bubble, seat(m.seat, 'dim'), el('span', 'ss-plate', m.role));
      row.appendChild(h);
      return { h, bubble };
    });
    (corners ? stage : ov).appendChild(row);
    const hint = el('p', 'ss-hint', 'Click, Space or → for the next box · Esc ends the show');
    ov.appendChild(hint);
    document.body.appendChild(ov);
    requestAnimationFrame(() => fit(slide));
    if (s.transition !== 'none' && window.Sound) Sound.whoosh();

    const boxes = [...slide.querySelectorAll('.ss-box')];
    let at = -1, over = false;
    function react(k) {
      (B.members || []).forEach((m, i) => {
        const r = (m.reactions || [])[BOXES.findIndex(([x]) => x === k)];
        const { h, bubble } = heads[i] || {};
        if (!h) return;
        h.className = h.className.replace(/ r-\w+/g, '');
        if (!REACT[r]) { bubble.textContent = ''; return; }
        bubble.textContent = REACT[r];
        void h.offsetWidth;
        h.className += ' r-' + r;
      });
    }
    function next() {
      if (over) { finish(); return; }
      at++;
      if (at < boxes.length) {
        boxes[at].classList.remove('later');
        boxes[at].classList.add(s.transition === 'none' ? 'appear' : 'fly');
        if (window.Sound) Sound.click();
        react(boxes[at].dataset.k);
        return;
      }
      over = true;
      const end = el('div', 'ss-end');
      end.appendChild(el('p', null, 'End of slide show, click to exit.'));
      if (B.aside) end.appendChild(el('p', 'ss-aside', B.aside));
      ov.appendChild(end);
      heads.forEach(({ h, bubble }) => { bubble.textContent = ''; h.className = h.className.replace(/ r-\w+/g, ''); });
    }
    function finish() { stop(); done(); }
    const key = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish(); return; }
      if ([' ', 'Enter', 'ArrowRight', 'ArrowDown', 'PageDown', 'n'].includes(ev.key)) { ev.preventDefault(); next(); }
    };
    ov.onclick = next;
    document.addEventListener('keydown', key);
    showing = { ov, key };
    ov.tabIndex = -1;
    ov.focus();
    // The first click shows the problem: a slide with only a title is how every pitch opens.
  }
  function stop() {
    if (!showing) return;
    document.removeEventListener('keydown', showing.key);
    showing.ov.remove();
    showing = null;
  }

  window.Slides = { BOXES, REACTIONS, editor, render, fit, show, stop, describe, flashy, style, room, seat };
})();
