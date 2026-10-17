// The title screen: the Synergix building seen from its parking lot, one locked camera, four
// stages that follow your progress (tools/office/exterior.py renders them). The fourth-floor
// light stays on in every one of them.
//   1 day      no finished week yet
//   2 rain     at least one finished week
//   3 night    at least four finished weeks (after the tender)
//   4 2041     once the reveal has been seen; it never goes back
// Hard mode and Try one case never move the stage. ?title=1..4 forces one for testing.
// The first time a new stage is reached, the old picture shows for a moment and then fades over.
(function () {
  const $ = id => document.getElementById(id);
  const MEDIA = 'media/title/';
  const NAMES = ['', 'day', 'rain', 'night', '2041'];
  const SUB = ['',
    '"Can we make this mandatory?"',
    'Your answers are being recorded for training purposes.',
    'Everyone has gone home. Somebody still needs a course.',
    'Session 1207: resume?'];
  const FOOT = ['',
    'Lindeveld · Monday morning',
    'Lindeveld · it has rained since Tuesday',
    'Lindeveld · 19:40 · one light still on',
    'Lindeveld · 2041 · archive 71% recovered'];
  const KEY = 'intake-title-stage';
  let shown = 0, timer = 0;

  function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function forced() {
    const n = +new URLSearchParams(window.location.search).get('title');
    return n >= 1 && n <= 4 ? n : 0;
  }
  // `weeks` = finished normal weeks. The reveal key is read directly: told() would set it.
  function stage(weeks) {
    return forced() || (get('intake-told-reveal') ? 4 : weeks >= 4 ? 3 : weeks >= 1 ? 2 : 1);
  }
  function url(n) {
    const small = window.matchMedia('(max-width: 900px)').matches;
    return 'url("' + MEDIA + 'title-' + NAMES[n] + (small ? '-960' : '') + '.webp")';
  }
  function paint(n) {
    $('title-sub').textContent = SUB[n];
    $('title-foot').textContent = FOOT[n];
    $('s-title').dataset.stage = NAMES[n];
    Rain.toggle(n >= 2);
  }

  function show(weeks) {
    const n = stage(weeks);
    const last = +get(KEY) || 0;
    const now = $('title-now'), old = $('title-old');
    clearTimeout(timer);
    if (!forced()) set(KEY, String(n));
    if (last && last < n && shown !== n && !forced()) {
      // A new stage: hold the old picture, then let the new one come up over it.
      old.style.backgroundImage = url(last);
      now.style.backgroundImage = url(n);
      now.classList.remove('in');
      paint(last);
      timer = setTimeout(() => { now.classList.add('in'); paint(n); }, 1600);
    } else {
      now.style.backgroundImage = url(n);
      now.classList.add('in');
      paint(n);
    }
    shown = n;
  }

  // Rain on the lens: thin streaks drawn on a canvas, only while the title is on screen.
  const Rain = (function () {
    let on = false, raf = 0, drops = [];
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    function size(c) {
      const r = window.devicePixelRatio > 1 ? 1.5 : 1;
      c.width = c.clientWidth * r; c.height = c.clientHeight * r;
      drops = Array.from({ length: Math.round(c.width * c.height / 9000) }, () => drop(c, true));
    }
    function drop(c, anywhere) {
      return { x: Math.random() * c.width * 1.2, y: anywhere ? Math.random() * c.height : -40,
        len: 14 + Math.random() * 26, v: 9 + Math.random() * 9, a: 0.08 + Math.random() * 0.16 };
    }
    function frame() {
      const c = $('title-rain'), g = c.getContext('2d');
      if (!$('s-title').classList.contains('active')) { raf = 0; return; }
      g.clearRect(0, 0, c.width, c.height);
      g.lineWidth = 1;
      for (const d of drops) {
        g.strokeStyle = 'rgba(210,222,235,' + d.a + ')';
        g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - d.len * 0.18, d.y + d.len); g.stroke();
        d.y += d.v; d.x -= d.v * 0.18;
        if (d.y > c.height) Object.assign(d, drop(c));
      }
      raf = window.requestAnimationFrame(frame);
    }
    function toggle(want) {
      const c = $('title-rain');
      on = want && !still.matches;
      c.hidden = !on;
      if (!on) { window.cancelAnimationFrame(raf); raf = 0; return; }
      size(c);
      if (!raf) raf = window.requestAnimationFrame(frame);
    }
    window.addEventListener('resize', () => { if (on) size($('title-rain')); });
    return { toggle };
  })();

  window.Title = { show, stage };
})();
