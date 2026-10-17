// Doors OS sounds, synthesised in the browser (no audio files): the startup chime, a small
// "ding" and the quiet sound of each place. Muting is remembered in this browser.
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

  // A hidden fact turned up: a bright little arpeggio.
  function found() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.14;
    g.connect(c.destination);
    [76, 79, 83, 88].forEach((n, i) => voice(c, g, n, t + i * 0.07, 0.18, 0.45, 'square'));
  }

  // A bell: a sine with an inharmonic partial and a fast decay, the "glassy" messenger timbre.
  function bell(c, out, note, t, gain, len) {
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([mul, g0]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = hz(note) * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * g0, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len / mul);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + len + 0.1);
    });
  }
  // Doors Messenger, new message: a bright rising "ba-ding" in the spirit of the 2000s
  // messengers (our own notes, not a copy of anyone's sound).
  function im() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.22;
    g.connect(c.destination);
    bell(c, g, 81, t, 0.8, 0.5);
    bell(c, g, 88, t + 0.09, 1, 0.9);
  }
  // A nudge: a wooden rattle, then the window shakes.
  function nudge() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.18;
    g.connect(c.destination);
    for (let i = 0; i < 9; i++) {
      const len = 0.035, n = c.createBufferSource(), b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 3);
      n.buffer = b;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = i % 2 ? 900 : 1300; f.Q.value = 6;
      n.connect(f); f.connect(g);
      n.start(t + i * 0.055);
    }
    bell(c, g, 69, t + 0.5, 0.6, 0.4);
  }
  // Someone signs in: three soft rising notes.
  function online() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.16;
    g.connect(c.destination);
    [76, 81, 85].forEach((n, i) => bell(c, g, n, t + i * 0.12, 0.9, i === 2 ? 1.1 : 0.4));
  }
  // A text on the brick phone: the beep-beep everyone recognises (well, nearly).
  function sms() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const g = c.createGain();
    g.gain.value = 0.08;
    g.connect(c.destination);
    [0, 0.14, 0.42, 0.56].forEach(d => voice(c, g, 93, t + d, 0.07, 0.5, 'square'));
  }

  // Pitchwright: a burst of filtered noise, shaped. Used for the projector and the stamp.
  function noise(c, out, t, len, freq, q, gain, type) {
    const n = c.createBufferSource(), b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    n.buffer = b;
    const f = c.createBiquadFilter(), g = c.createGain();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(t);
    return f;
  }
  // The slide projector advancing: a mechanical clack.
  function click() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.01;
    noise(c, c.destination, t, 0.04, 2400, 3, 0.25);
    noise(c, c.destination, t + 0.06, 0.06, 700, 2, 0.2);
  }
  // A transition: a soft swoosh that rises.
  function whoosh() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.01;
    const f = noise(c, c.destination, t, 0.6, 300, 1.2, 0.12);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.5);
  }
  // The board's decision: a rubber stamp on paper.
  function stamp() {
    if (!on) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.25;
    noise(c, c.destination, t, 0.12, 180, 0.8, 0.6, 'lowpass');
    noise(c, c.destination, t, 0.05, 1500, 1, 0.2);
  }

  // ---------- ambience: the room you are in, very quietly ----------
  // No music. Each place is a mix of the same few layers, all made from noise and two sine
  // voices: the office's room tone and air conditioning at the desk; wind and rain on the glass
  // on the floor; the same rain at 17:40 under one low held note; the projector's fan and its
  // mains hum in the board room. Changing place fades from one mix to the next.
  const MIX = {
    desk: { room: 1, hvac: 1, rain: 0.15 },
    floor: { room: 0.7, hvac: 0.6, rain: 1, wind: 0.8 },
    evening: { room: 0.4, hvac: 0.2, rain: 0.8, wind: 1, note: 1 },
    board: { room: 0.6, hvac: 0.3, projector: 1 }
  };
  const LEVEL = { room: 0.15, hvac: 0.03, rain: 0.06, wind: 0.085, note: 0.02, projector: 0.04 };
  let amb = null, place = null;

  function loop(c, seconds) {
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate), d = b.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    const n = c.createBufferSource();
    n.buffer = b; n.loop = true;
    return n;
  }
  function filter(c, type, freq, q) { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7; return f; }
  // A slow wobble on an AudioParam: depth either side of where it is, `rate` times a second.
  function wobble(c, param, rate, depth) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param); o.start();
  }
  function chain(c, nodes) { for (let k = 0; k < nodes.length - 1; k++) nodes[k].connect(nodes[k + 1]); return nodes[nodes.length - 1]; }

  function build(c) {
    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    const layer = {};
    const add = (name, out) => { const g = c.createGain(); g.gain.value = 0; out.connect(g); g.connect(master); layer[name] = g; };
    // Room tone: a low, dark rumble, the building itself.
    const room = loop(c, 4.1);
    add('room', chain(c, [room, filter(c, 'lowpass', 180), filter(c, 'lowpass', 260)]));
    // Air conditioning: a soft, steady breath higher up.
    const hvac = loop(c, 3.7);
    add('hvac', chain(c, [hvac, filter(c, 'bandpass', 480, 0.6), filter(c, 'lowpass', 900)]));
    // Rain on the glass: a high hiss that comes and goes a little.
    const rain = loop(c, 5.3), rainSwell = c.createGain();
    rainSwell.gain.value = 0.85; wobble(c, rainSwell.gain, 0.09, 0.15);
    add('rain', chain(c, [rain, filter(c, 'highpass', 1600), filter(c, 'lowpass', 5200), rainSwell]));
    // Wind round the building: a band of noise that slowly rises and falls in pitch and strength.
    const wind = loop(c, 6.7), windBand = filter(c, 'bandpass', 320, 1.4), windSwell = c.createGain();
    wobble(c, windBand.frequency, 0.05, 140); wobble(c, windSwell.gain, 0.031, 0.45); windSwell.gain.value = 0.55;
    add('wind', chain(c, [wind, windBand, windSwell]));
    // 17:40: one low held note, an open fifth, breathing very slowly.
    const note = c.createGain();
    note.gain.value = 0.8; wobble(c, note.gain, 0.06, 0.2);
    [[110, 0.6], [164.8, 0.35], [220.4, 0.2]].forEach(([f, v]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = v;
      o.connect(g); g.connect(note); o.start();
    });
    add('note', chain(c, [note, filter(c, 'lowpass', 600)]));
    // The projector: its fan, and the 100 Hz hum of a transformer on Belgian 50 Hz mains.
    const fan = loop(c, 3.1), projector = c.createGain();
    chain(c, [fan, filter(c, 'bandpass', 950, 0.9), projector]);
    const hum = c.createOscillator(), humGain = c.createGain();
    hum.type = 'sawtooth'; hum.frequency.value = 100; humGain.gain.value = 0.18;
    chain(c, [hum, filter(c, 'lowpass', 320), humGain, projector]);
    add('projector', projector);
    [room, hvac, rain, wind, fan, hum].forEach(n => n.start());
    return { master, layer };
  }

  // A few drops tapping the window, now and then, while it rains.
  function drip() {
    if (!amb || !on || document.hidden) return;
    const mix = MIX[place] || {};
    if (!mix.rain || mix.rain < 0.5) return;
    const c = ctx, t = c.currentTime;
    for (let k = 0; k < 3; k++) {
      if (Math.random() < 0.55) continue;
      const at = t + Math.random() * 0.7, f = 2400 + Math.random() * 2600;
      noise(c, amb.master, at, 0.03, f, 6, 0.012 * mix.rain * (0.4 + Math.random()), 'bandpass');
    }
  }

  function fade() {
    if (!amb) return;
    const t = ctx.currentTime, mix = MIX[place] || {};
    Object.entries(amb.layer).forEach(([name, g]) => g.gain.setTargetAtTime((mix[name] || 0) * LEVEL[name], t, 0.9));
    amb.master.gain.setTargetAtTime(on && place && !document.hidden ? 1 : 0, t, place ? 0.6 : 0.3);
  }

  // Where you are now: 'desk', 'floor', 'evening', 'board', or null for silence.
  function scene(name) {
    place = MIX[name] ? name : null;
    if (!place && !amb) return;
    if (!amb) {
      if (!on) return;
      const c = audio();
      if (!c) return;
      amb = build(c);
      setInterval(drip, 700);
      // Browsers only play sound after a click or a key; wake the audio on the next one.
      if (c.state !== 'running') {
        const wake = () => { c.resume(); window.removeEventListener('pointerdown', wake, true); window.removeEventListener('keydown', wake, true); };
        window.addEventListener('pointerdown', wake, true);
        window.addEventListener('keydown', wake, true);
      }
    }
    fade();
  }
  document.addEventListener('visibilitychange', fade);

  function toggle() {
    on = !on;
    try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    if (on && place && !amb) scene(place); else fade();
    document.dispatchEvent(new CustomEvent('intake-sound', { detail: on }));
    return on;
  }

  window.Sound = { chime, ding, found, im, nudge, online, sms, click, whoosh, stamp, scene, toggle, get on() { return on; }, get place() { return place; } };
})();
