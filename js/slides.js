// Pitchwright 2007: the board room slide as a real 2007 slide. You edit it on a 4:3 canvas
// with a design, a transition, WordArt and clip art, then present it full screen, one box per
// click, while the board reacts in the front row. Style never changes a score; the board may
// still have something to say about a star wipe. Static, trusted markup.
(function () {
  const BOXES = [['problem', 'The problem'], ['evidence', 'Evidence of the need'], ['concept', 'The concept'], ['measure', 'How we will know'], ['risks', 'Risks and dependencies'], ['ask', 'The ask: budget, time, sponsor']];
  const THEMES = [['blue', 'Corporate Blue'], ['ocean', 'Ocean Gradient'], ['beige', 'Beige Professional'], ['night', 'Midnight Synergy']];
  const TRANSITIONS = [['none', 'No transition'], ['fade', 'Fade smoothly'], ['wipe', 'Wipe right'], ['star', 'Star wipe'], ['spin', 'Spin and zoom']];
  const CLIPART = [['', 'None'], ['🤝', 'Handshake'], ['📈', 'Chart going up'], ['💡', 'Light bulb'], ['🏆', 'Trophy'], ['🧩', 'Puzzle piece'], ['🚀', 'Rocket']];
  const REACT = { nod: '👍', note: '📝', frown: '😒', eyebrow: '🤨', yawn: '🥱', calculator: '🧮' };
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

  // The show: full screen, the transition, one box per click, the board in the front row.
  let showing = null;
  function show(B, card, board, done) {
    stop();
    const s = style(B);
    const ov = el('div', 'slideshow');
    ov.id = 'slideshow';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Slide show');
    const stage = el('div', 'ss-stage');
    const slide = render(B, card, 'in-' + s.transition);
    slide.querySelectorAll('.ss-box').forEach(b => b.classList.add('later'));
    stage.appendChild(slide);
    ov.appendChild(stage);
    const row = el('div', 'ss-audience');
    const heads = board.map((m, i) => {
      const h = el('div', 'ss-head-' + i + ' ss-member');
      const bubble = el('span', 'ss-react');
      h.append(bubble, el('span', 'ss-face', m.face), el('span', 'ss-plate', m.role));
      row.appendChild(h);
      return { h, bubble };
    });
    ov.appendChild(row);
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

  window.Slides = { BOXES, REACTIONS, editor, render, fit, show, stop, describe, flashy, style };
})();
