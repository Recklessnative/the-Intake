// Mieke's welcome tour: on your very first morning she calls over from two cubicles away,
// then walks you round the desk in speech bubbles, one shortcut at a time. Replayable from
// the start menu. Steps come from app.js: { target, text, alt, altText, last }.
// `target` and `alt` are selectors; when the target is not on screen (phones hide the desk
// icons), the bubble points at `alt` with `altText`, or sits in the middle with no spotlight.
(function () {
  const $ = id => document.getElementById(id);
  let steps = [], i = 0, done = null, root = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function visible(sel) {
    const e = sel && document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' ? e : null;
  }
  function avatar() {
    const a = document.querySelector('#w-mieke .im-avatar');
    const c = a ? a.cloneNode(true) : el('span', 'im-avatar', '☕');
    c.classList.add('tour-face');
    return c;
  }
  function build() {
    if (root) root.remove();
    root = el('div', 'tour');
    root.id = 'tour';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Mieke shows you around');
    document.body.appendChild(root);
    document.addEventListener('keydown', keys, true);
    window.addEventListener('resize', place);
    return root;
  }
  function close(finished) {
    document.removeEventListener('keydown', keys, true);
    window.removeEventListener('resize', place);
    if (root) root.remove();
    root = null;
    const d = done;
    done = null;
    if (d) d(finished);
  }
  function keys(ev) {
    if (!root) return;
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(false); return; }
    if (!root.querySelector('.tour-bubble')) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); ev.stopPropagation(); go(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); ev.stopPropagation(); go(-1); }
  }

  // The call: her desk phone rings before the tour starts.
  function ring(onAnswer) {
    const r = build();
    r.classList.add('ringing');
    const card = el('div', 'tour-call');
    card.append(avatar(), el('b', null, 'Mieke is calling'), el('span', 'fine', 'Desk 2 · two cubicles over'));
    const row = el('div', 'row');
    const yes = el('button', 'primary', 'Answer');
    yes.type = 'button'; yes.id = 'tour-answer';
    const no = el('button', 'link', 'Not now, I will find my way');
    no.type = 'button'; no.id = 'tour-skip';
    yes.onclick = () => { clearInterval(ring.t); onAnswer(); };
    no.onclick = () => { clearInterval(ring.t); close(false); };
    row.append(yes, no);
    card.appendChild(row);
    r.appendChild(card);
    const buzz = () => { if (window.Sound && Sound.im) Sound.im(); };
    buzz();
    ring.t = setInterval(() => { if (!root) clearInterval(ring.t); else buzz(); }, 2600);
    yes.focus();
  }

  function show() {
    const r = root;
    r.classList.remove('ringing');
    r.innerHTML = '';
    const s = steps[i];
    const spot = el('div', 'tour-spot');
    const b = el('div', 'tour-bubble');
    b.setAttribute('aria-live', 'polite');
    const head = el('div', 'tour-head');
    head.append(avatar(), el('b', null, 'Mieke'), el('span', 'tour-count', (i + 1) + ' of ' + steps.length));
    const target = visible(s.target) || visible(s.alt);
    const text = !visible(s.target) && visible(s.alt) && s.altText ? s.altText : s.text;
    const p = el('p', 'tour-text', text);
    p.id = 'tour-text';
    const row = el('div', 'row');
    if (i) { const back = el('button', null, 'Back'); back.type = 'button'; back.onclick = () => go(-1); row.appendChild(back); }
    const next = el('button', 'primary', s.last ? (s.cta || 'Let\'s go') : 'Next');
    next.type = 'button'; next.id = 'tour-next';
    next.onclick = () => go(1);
    row.appendChild(next);
    const skip = el('button', 'link', 'Skip the tour');
    skip.type = 'button'; skip.id = 'tour-skip';
    skip.onclick = () => close(false);
    if (!s.last) row.appendChild(skip);
    b.append(head, p, row);
    r.append(spot, b);
    r.dataset.target = target ? (target.id || target.dataset.app || '') : '';
    place();
    next.focus();
  }
  function go(d) {
    const n = i + d;
    if (n < 0) return;
    if (n >= steps.length) { close(true); return; }
    i = n;
    show();
  }
  // The spotlight hugs the target; the bubble sits beside it where there is room.
  function place() {
    if (!root || !steps[i]) return;
    const spot = root.querySelector('.tour-spot'), b = root.querySelector('.tour-bubble');
    if (!spot || !b) return;
    const s = steps[i];
    const t = visible(s.target) || visible(s.alt);
    const W = window.innerWidth, H = window.innerHeight, pad = 6, gap = 14;
    spot.classList.toggle('none', !t);
    if (!t) {
      b.className = 'tour-bubble mid';
      b.style.left = Math.max(12, (W - b.offsetWidth) / 2) + 'px';
      b.style.top = Math.max(12, (H - b.offsetHeight) / 2) + 'px';
      return;
    }
    const r = t.getBoundingClientRect();
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const bw = b.offsetWidth, bh = b.offsetHeight;
    // A window that fills most of the screen (an inbox on a phone): the bubble sits in its middle.
    if (r.width * r.height > 0.45 * W * H) {
      b.className = 'tour-bubble mid';
      b.style.left = Math.max(8, (W - bw) / 2) + 'px';
      b.style.top = Math.max(8, Math.min(H - bh - 8, r.top + r.height * 0.55 - bh / 2)) + 'px';
      return;
    }
    let side, x, y;
    if (r.right + gap + bw < W - 8) { side = 'right'; x = r.right + gap; y = r.top + r.height / 2 - bh / 2; }
    else if (r.left - gap - bw > 8) { side = 'left'; x = r.left - gap - bw; y = r.top + r.height / 2 - bh / 2; }
    else if (r.top - gap - bh > 8) { side = 'above'; x = r.left + r.width / 2 - bw / 2; y = r.top - gap - bh; }
    else { side = 'below'; x = r.left + r.width / 2 - bw / 2; y = r.bottom + gap; }
    x = Math.min(Math.max(8, x), W - bw - 8);
    y = Math.min(Math.max(8, y), H - bh - 8);
    b.className = 'tour-bubble ' + side;
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    // The tail points at the middle of the target, wherever the bubble was clamped to.
    const tail = side === 'right' || side === 'left' ? r.top + r.height / 2 - y : r.left + r.width / 2 - x;
    b.style.setProperty('--tail', Math.min(Math.max(16, tail), (side === 'right' || side === 'left' ? bh : bw) - 16) + 'px');
  }

  // start(steps, { call: true }) rings first; done(finished) runs when the tour closes.
  function start(list, opts, onDone) {
    steps = list; i = 0; done = onDone || null;
    if (opts && opts.call) ring(() => show());
    else { build(); show(); }
  }
  window.Tour = { start, close: () => close(false), get open() { return !!root; } };
})();
