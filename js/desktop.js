// A tiny window manager for the desk: title bars, focus, minimise, maximise, drag, taskbar.
// On wide screens windows float over the desktop; on narrow screens one window fills the
// screen and the taskbar switches between them.
(function () {
  const $ = id => document.getElementById(id);
  const wide = () => window.matchMedia('(min-width: 900px)').matches;

  // Where windows go per phase, in percent of the desktop: [left, top, width, height].
  const LAYOUTS = {
    inbox: { 'w-inbox': [2, 3, 55, 86], 'w-case': [59, 3, 39, 52], 'w-notes': [59, 57, 39, 32] },
    call: { 'w-call': [2, 3, 55, 92], 'w-case': [59, 3, 39, 46], 'w-notes': [59, 51, 39, 44] },
    write: { 'w-write': [2, 2, 54, 94], 'w-call': [58, 2, 40, 50], 'w-notes': [58, 54, 40, 23], 'w-case': [58, 79, 40, 17] },
    defence: { 'w-dialog': [2, 2, 54, 94], 'w-call': [58, 2, 40, 50], 'w-notes': [58, 54, 40, 23], 'w-case': [58, 79, 40, 17] },
    dialog: { 'w-dialog': [14, 4, 72, 90] }
  };
  const FLOATING = { 'w-mieke': [56, 6, 38, 66] };

  let z = 10;
  let current = null;
  const wins = () => [...document.querySelectorAll('#desktop .win')];

  // Build the title bar for every window from its data attributes.
  wins().forEach(w => {
    const body = document.createElement('div');
    body.className = 'win-body';
    while (w.firstChild) body.appendChild(w.firstChild);
    const bar = document.createElement('div');
    bar.className = 'titlebar';
    bar.innerHTML = '<span class="ti"></span><span class="tt"></span>' +
      '<button class="tb min" aria-label="Minimise">_</button><button class="tb max" aria-label="Maximise">□</button><button class="tb close" aria-label="Close">×</button>';
    bar.querySelector('.ti').textContent = w.dataset.icon || '';
    bar.querySelector('.tt').textContent = w.dataset.title;
    w.append(bar, body);
    bar.querySelector('.min').onclick = e => { e.stopPropagation(); minimise(w.id); };
    bar.querySelector('.close').onclick = e => { e.stopPropagation(); minimise(w.id); };
    bar.querySelector('.max').onclick = e => { e.stopPropagation(); w.classList.toggle('max'); };
    bar.ondblclick = () => w.classList.toggle('max');
    w.addEventListener('pointerdown', () => focus(w.id));
    drag(w, bar);
  });

  function drag(w, bar) {
    bar.addEventListener('pointerdown', e => {
      if (!wide() || e.target.closest('.tb') || w.classList.contains('max')) return;
      const desk = $('desktop').getBoundingClientRect();
      const r = w.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId);
      const move = ev => {
        const x = Math.max(-r.width + 80, Math.min(desk.width - 80, ev.clientX - desk.left - dx));
        const y = Math.max(0, Math.min(desk.height - 30, ev.clientY - desk.top - dy));
        w.style.left = x + 'px';
        w.style.top = y + 'px';
      };
      const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
  }

  function place(w, rect) {
    const [l, t, wd, h] = rect;
    Object.assign(w.style, { left: l + '%', top: t + '%', width: wd + '%', height: h + '%' });
  }

  function open(id, rect) {
    const w = $(id);
    if (!w) return;
    if (rect && !w.classList.contains('open')) place(w, rect);
    w.classList.add('open');
    w.classList.remove('minimised');
    focus(id);
    taskbar();
  }
  function minimise(id) {
    const w = $(id);
    w.classList.add('minimised');
    w.classList.remove('focused');
    const next = wins().filter(x => x.classList.contains('open') && !x.classList.contains('minimised'))
      .sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
    if (next) focus(next.id);
    taskbar();
  }
  function close(id) { $(id).classList.remove('open', 'minimised', 'focused', 'max'); taskbar(); }
  function focus(id) {
    const w = $(id);
    wins().forEach(x => x.classList.toggle('focused', x === w));
    w.style.zIndex = ++z;
    taskbar();
  }

  // Show a phase: its windows in their spots, the rest minimised (still on the taskbar).
  function layout(name, focusId) {
    current = name;
    const L = LAYOUTS[name];
    wins().forEach(w => {
      if (L[w.id]) { w.classList.remove('max'); place(w, L[w.id]); w.classList.add('open'); w.classList.remove('minimised'); }
      else if (w.classList.contains('open') && name !== 'dialog') { w.classList.add('minimised'); w.classList.remove('focused'); }
    });
    Object.keys(L).forEach(id => focus(id));
    if (focusId) focus(focusId);
    taskbar();
  }
  function tidy() {
    if (!current) return;
    const keep = Object.keys(LAYOUTS[current]);
    keep.forEach(id => { const w = $(id); w.classList.remove('max', 'minimised'); place(w, LAYOUTS[current][id]); });
    if ($('w-mieke').classList.contains('open') && !$('w-mieke').classList.contains('minimised')) place($('w-mieke'), FLOATING['w-mieke']);
    keep.forEach(id => focus(id));
  }

  function taskbar() {
    const bar = $('task-buttons');
    bar.innerHTML = '';
    wins().filter(w => w.classList.contains('open')).forEach(w => {
      const b = document.createElement('button');
      b.className = 'task' + (w.classList.contains('focused') && !w.classList.contains('minimised') ? ' active' : '');
      b.textContent = (w.dataset.icon || '') + ' ' + (w.dataset.task || w.dataset.title);
      b.onclick = () => {
        if (w.classList.contains('focused') && !w.classList.contains('minimised') && wide()) minimise(w.id);
        else open(w.id);
      };
      bar.appendChild(b);
    });
  }

  function title(id, text, task) {
    const w = $(id);
    w.dataset.title = text;
    if (task) w.dataset.task = task;
    w.querySelector('.tt').textContent = text;
    taskbar();
  }
  function reset() { wins().forEach(w => close(w.id)); current = null; }

  // Start menu.
  const menu = $('start-menu');
  $('btn-startmenu').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('#start-menu, #btn-startmenu')) menu.hidden = true; });
  menu.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => { menu.hidden = true; Desktop.open(b.dataset.open, FLOATING[b.dataset.open]); }; });
  $('btn-tidy').onclick = () => { menu.hidden = true; tidy(); };

  window.Desktop = { open, close, minimise, focus, layout, title, reset, floating: FLOATING, wide };
})();
