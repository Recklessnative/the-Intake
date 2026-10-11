// Doors OS sounds, synthesised in the browser (no audio files): the startup chime and a
// small "ding". Muting is remembered in this browser.
(function () {
  const KEY = 'intake-sound';
  let ctx = null;
  let on = true;
  try { on = window.localStorage.getItem(KEY) !== 'off'; } catch (e) { /* storage blocked */ }

  function audio() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // One soft voice: two slightly detuned oscillators through a gentle envelope.
  function voice(c, out, note, start, dur, gain, type) {
    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.08);
    g.gain.setTargetAtTime(gain * 0.6, start + 0.25, 0.4);
    g.gain.setTargetAtTime(0, start + dur, 0.5);
    g.connect(out);
    [-5, 5].forEach(cents => {
      const o = c.createOscillator();
      o.type = type || 'triangle';
      o.frequency.value = hz(note);
      o.detune.value = cents;
      o.connect(g);
      o.start(start);
      o.stop(start + dur + 2.5);
    });
  }

  // The chime: a rising four-note figure over a warm pad, with an echo.
  function chime() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.05;
    const master = c.createGain();
    master.gain.value = 0.22;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const delay = c.createDelay();
    delay.delayTime.value = 0.28;
    const fb = c.createGain();
    fb.gain.value = 0.28;
    lp.connect(master);
    lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
    master.connect(c.destination);
    // Pad: A-flat major seven, swelling in.
    [56, 63, 67, 72].forEach(n => voice(c, lp, n, t, 2.6, 0.12, 'sine'));
    // Figure: E-flat, B-flat, G, then a high E-flat that rings out.
    [[63, 0.0], [70, 0.32], [79, 0.64], [75, 0.96]].forEach(([n, d], i) => voice(c, lp, n, t + d, i === 3 ? 2.2 : 0.5, 0.2, 'triangle'));
  }

  // A short notification ding.
  function ding() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.15;
    g.connect(c.destination);
    voice(c, g, 84, t, 0.15, 0.5, 'sine');
    voice(c, g, 79, t + 0.12, 0.3, 0.4, 'sine');
  }

  function toggle() {
    on = !on;
    try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    return on;
  }

  window.Sound = { chime, ding, toggle, get on() { return on; } };
})();
