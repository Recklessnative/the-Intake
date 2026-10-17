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

  // ---------- ambience: the place you are in ----------
  // Each place has a slow score and a few real moments, all made here in the browser.
  // The score is a handful of soft electric-piano notes, each repeating on its own long cycle
  // (17 to 53 seconds), so they keep drifting into new chords and never quite loop; under it a
  // warm held pad. The moments: someone typing two rows away, a phone ringing far off, the
  // printer; raindrops on the glass, a gust round the building, thunder over Lindeveld; the lift;
  // the board room's clock and projector. Everything goes through one room reverb, in stereo.
  const SCENES = {
    // The desk: warm and unhurried, F major with a raised fourth.
    desk: { notes: [[65, 19.7, 2], [69, 23.3, 9], [72, 29.1, 5], [76, 31.7, 15], [79, 37.9, 22], [71, 43.3, 30]], pad: [41, 48, 57], bed: { room: 1, hvac: 1, rain: 0.25 },
      moments: { typing: [5, 14], phone: [55, 120], printer: [90, 200] } },
    // The floor: open and airy, D with the weather on the glass.
    floor: { notes: [[62, 17.9, 1], [69, 21.7, 6], [74, 26.3, 3], [76, 31.1, 12], [81, 35.3, 18], [64, 41.9, 25]], pad: [38, 45, 52], bed: { room: 0.8, hvac: 0.5, rain: 1 },
      drops: 7, moments: { gust: [14, 30], typing: [9, 22], thunder: [60, 140] } },
    // 17:40: the same rain, lower and slower, in A minor. The office has nearly emptied.
    evening: { notes: [[57, 25.1, 3], [64, 31.7, 10], [67, 37.3, 6], [72, 44.9, 20], [60, 52.7, 28]], pad: [33, 40, 48], padLevel: 1.5, bed: { room: 0.6, hvac: 0.2, rain: 0.8 },
      drops: 4, moments: { gust: [18, 36], lift: [50, 110], thunder: [70, 160] } },
    // The board room: sparse and a little tense, a clock you can hear and the projector's fan.
    board: { notes: [[64, 27.3, 4], [71, 33.1, 12], [66, 41.9, 20]], pad: [40, 47], padLevel: 0.7, bed: { room: 0.7, projector: 1 },
      clock: true, moments: { paper: [25, 60] } },
    // The title screen follows the arc, one stage at a time: the business park on a Monday
    // morning (traffic on the ring road), then rain on the glass, then rain under the evening's
    // low note, then 2041: rain, and server racks humming where the desks were.
    title1: { notes: [[67, 23.9, 3], [74, 29.3, 9], [71, 37.1, 16]], pad: [43, 50], padLevel: 0.6, bed: { room: 0.4, traffic: 1 },
      moments: { car: [6, 15] } },
    title2: { notes: [[62, 21.7, 2], [69, 27.9, 8], [74, 33.1, 14]], pad: [38, 45], padLevel: 0.8, bed: { room: 0.4, rain: 1 }, drops: 6 },
    title3: { notes: [[57, 29.3, 4], [64, 37.7, 12]], pad: [33, 40, 48], padLevel: 1.5, bed: { room: 0.4, rain: 0.8 }, drops: 4 },
    title4: { notes: [[56, 41.3, 6], [63, 53.9, 20]], pad: [32, 39], padLevel: 0.9, bed: { rain: 0.7, servers: 1 }, drops: 3 }
  };
  const BED = { room: 0.05, hvac: 0.008, rain: 0.03, projector: 0.012, traffic: 0.028, servers: 0.024 };
  let amb = null, place = null;

  function noiseBuffer(c, seconds, channels) {
    const b = c.createBuffer(channels || 1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
    for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; }
    return b;
  }
  function filter(c, type, freq, q) { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q == null ? 0.7 : q; return f; }
  function chain(nodes) { for (let k = 0; k < nodes.length - 1; k++) nodes[k].connect(nodes[k + 1]); return nodes[nodes.length - 1]; }
  function wobble(c, param, rate, depth) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param); o.start();
  }
  // A room: a stereo tail of about three seconds that darkens as it dies away.
  function room(c) {
    const len = Math.ceil(c.sampleRate * 3.2), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let k = 0; k < len; k++) {
        const x = k / len, cut = 0.5 - 0.42 * x;
        lp += cut * ((Math.random() * 2 - 1) - lp);
        d[k] = lp * Math.pow(1 - x, 2.4) * (k < c.sampleRate * 0.012 ? k / (c.sampleRate * 0.012) : 1);
      }
    }
    const v = c.createConvolver();
    v.buffer = b;
    return v;
  }

  function build(c) {
    const out = c.createGain(), comp = c.createDynamicsCompressor();
    out.gain.value = 0;
    comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    out.connect(comp); comp.connect(c.destination);
    const verb = room(c), wet = c.createGain();
    wet.gain.value = 0.9;
    verb.connect(wet); wet.connect(out);
    const A = { c, out, verb, noise: noiseBuffer(c, 2), bed: {}, pads: {}, next: {} };
    // The beds: the building's low rumble, the air conditioning, rain washing down the glass.
    const loop = seconds => { const n = c.createBufferSource(); n.buffer = noiseBuffer(c, seconds, 2); n.loop = true; n.start(); return n; };
    const bed = (name, nodes, send) => {
      const g = c.createGain(); g.gain.value = 0;
      chain(nodes).connect(g); g.connect(out);
      if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(verb); }
      A.bed[name] = g;
    };
    bed('room', [loop(4.1), filter(c, 'lowpass', 90), filter(c, 'lowpass', 140)]);
    bed('hvac', [loop(3.7), filter(c, 'bandpass', 380, 0.5), filter(c, 'lowpass', 700)]);
    const swell = c.createGain(); swell.gain.value = 0.8; wobble(c, swell.gain, 0.07, 0.2);
    bed('rain', [loop(5.3), filter(c, 'bandpass', 1100, 0.4), filter(c, 'lowpass', 2600), filter(c, 'highshelf', 3000, 0), swell], 0.4);
    // The projector: a soft fan and its transformer's 100 Hz hum (Belgian mains are 50 Hz).
    const proj = c.createGain();
    chain([loop(3.1), filter(c, 'bandpass', 520, 0.8), proj]);
    [[100, 0.35], [200, 0.12]].forEach(([f, v]) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(proj); o.start(); });
    bed('projector', [proj, filter(c, 'lowpass', 700)]);
    // The ring road behind the business park: a far, low wash of tyres.
    const road = c.createGain(); road.gain.value = 0.8; wobble(c, road.gain, 0.03, 0.2);
    bed('traffic', [loop(4.7), filter(c, 'lowpass', 500), filter(c, 'highpass', 70), road], 0.3);
    // Server racks: a steady fan roar, mains hum and one thin, high whine.
    const rack = c.createGain();
    chain([loop(3.3), filter(c, 'bandpass', 300, 0.6), rack]);
    [[100, 0.25], [300, 0.08], [7400, 0.012]].forEach(([f, v]) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(rack); o.start(); });
    bed('servers', [rack, filter(c, 'lowpass', 9000)], 0.3);
    return A;
  }

  // The pad: each note two detuned saws, through a slowly breathing low-pass filter.
  function pad(name) {
    const A = amb, c = A.c, S = SCENES[name];
    if (A.pads[name]) return A.pads[name];
    const g = c.createGain(), lp = filter(c, 'lowpass', 420, 0.5), send = c.createGain();
    g.gain.value = 0; send.gain.value = 0.8;
    wobble(c, lp.frequency, 0.045, 160);
    lp.connect(g); g.connect(A.out); g.connect(send); send.connect(A.verb);
    S.pad.forEach((n, k) => [-7, 7].forEach(cents => {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = cents;
      v.gain.value = k ? 0.5 : 0.8;
      o.connect(v); v.connect(lp); o.start();
    }));
    return (A.pads[name] = g);
  }

  // One soft electric-piano note: a sine carrier with a little FM shine that fades first.
  function keyNote(t, note, gain, pan) {
    const A = amb, c = A.c, f = hz(note);
    const car = c.createOscillator(), mod = c.createOscillator(), idx = c.createGain(), env = c.createGain(), p = c.createStereoPanner(), send = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 2; mod.connect(idx); idx.connect(car.frequency);
    idx.gain.setValueAtTime(f * 1.1, t); idx.gain.exponentialRampToValueAtTime(f * 0.02, t + 1.6);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(gain, t + 0.012);
    env.gain.setTargetAtTime(gain * 0.35, t + 0.05, 0.6); env.gain.setTargetAtTime(0, t + 1.2, 1.6);
    p.pan.value = pan; send.gain.value = 0.9;
    chain([car, env, p]); p.connect(A.out); p.connect(send); send.connect(A.verb);
    [car, mod].forEach(o => { o.start(t); o.stop(t + 9); });
  }

  // A short burst of filtered noise: clicks, ticks, drops, rustles and thunder are all this.
  function burst(t, dur, type, freq, q, gain, pan, send, opt) {
    const A = amb, c = A.c, n = c.createBufferSource(), f = filter(c, type, freq, q), g = c.createGain(), p = c.createStereoPanner();
    n.buffer = A.noise;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + ((opt && opt.attack) || 0.002));
    g.gain.setTargetAtTime(0, t + ((opt && opt.hold) || 0), dur / 4);
    if (opt && opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
    p.pan.value = pan;
    chain([n, f, g, p]); p.connect(A.out);
    if (send) { const s = c.createGain(); s.gain.value = send; p.connect(s); s.connect(A.verb); }
    n.start(t, Math.random() * 1.5); n.stop(t + dur * 1.5 + 0.1);
  }
  // A raindrop on glass: a tiny falling ping, now and then a heavier tap.
  function drop(t, level) {
    const A = amb, c = A.c, o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner(), s = c.createGain();
    const f = 1700 + Math.random() * 3200, big = Math.random() < 0.12;
    o.frequency.setValueAtTime(big ? f * 0.4 : f, t); o.frequency.exponentialRampToValueAtTime((big ? f * 0.4 : f) * 0.78, t + 0.03);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((big ? 0.02 : 0.008) * level * (0.4 + Math.random() * 0.6), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.06 : 0.025));
    p.pan.value = Math.random() * 1.6 - 0.8; s.gain.value = 0.5;
    chain([o, g, p]); p.connect(A.out); p.connect(s); s.connect(A.verb);
    o.start(t); o.stop(t + 0.1);
  }

  const MOMENTS = {
    // Someone two rows away, typing a sentence, stopping, typing again.
    typing(t) {
      const pan = Math.random() * 1.4 - 0.7;
      let at = t;
      const n = 8 + Math.floor(Math.random() * 22);
      for (let k = 0; k < n; k++) {
        at += 0.07 + Math.random() * 0.11 + (Math.random() < 0.08 ? 0.35 : 0);
        burst(at, 0.03, 'bandpass', 1900 + Math.random() * 900, 1.6, 0.05 * (0.6 + Math.random() * 0.4), pan, 0.5);
        if (Math.random() < 0.06) burst(at + 0.05, 0.05, 'bandpass', 900, 1.2, 0.06, pan, 0.5); // the space bar
      }
    },
    // A desk phone ringing at the far end of the floor: two short trills, then someone picks up.
    phone(t) {
      const c = amb.c, pan = Math.random() < 0.5 ? -0.6 : 0.6, rings = 1 + Math.floor(Math.random() * 2);
      for (let r = 0; r < rings; r++) {
        const at = t + r * 3, o = c.createOscillator(), trill = c.createOscillator(), tg = c.createGain(), g = c.createGain(), p = c.createStereoPanner(), s = c.createGain(), lp = filter(c, 'lowpass', 1800);
        o.type = 'triangle'; o.frequency.value = 1180; trill.type = 'square'; trill.frequency.value = 17;
        tg.gain.value = 0.5; g.gain.value = 0.5; trill.connect(tg); tg.connect(g.gain);
        const env = c.createGain();
        env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(0.012, at + 0.02); env.gain.setValueAtTime(0.012, at + 1.1); env.gain.linearRampToValueAtTime(0, at + 1.15);
        p.pan.value = pan; s.gain.value = 1.4;
        chain([o, g, env, lp, p]); p.connect(amb.out); p.connect(s); s.connect(amb.verb);
        [o, trill].forEach(x => { x.start(at); x.stop(at + 1.3); });
      }
    },
    // The laser printer by the copier warming up and pulling a page through.
    printer(t) {
      burst(t, 2.6, 'bandpass', 420, 2.5, 0.025, 0.55, 0.6, { attack: 0.4, hold: 1.8 });
      burst(t + 0.6, 1.6, 'bandpass', 1500, 4, 0.01, 0.55, 0.6, { attack: 0.3, hold: 1, sweep: 1900 });
    },
    // A gust against the building: a band of air that rises and falls, with a faint whistle.
    gust(t) {
      const d = 4 + Math.random() * 3, pan = Math.random() * 1.2 - 0.6;
      burst(t, d, 'bandpass', 260, 3, 0.07, pan, 0.6, { attack: d * 0.4, hold: d * 0.2, sweep: 520 });
      if (Math.random() < 0.5) burst(t + d * 0.25, d * 0.6, 'bandpass', 950 + Math.random() * 300, 30, 0.05, -pan, 0.8, { attack: d * 0.3, hold: d * 0.1, sweep: 1300 });
    },
    // Thunder a long way off: a soft crack, then a low roll.
    thunder(t) {
      burst(t, 0.8, 'lowpass', 700, 0.7, 0.03, 0.3, 1);
      burst(t + 0.15, 7, 'lowpass', 120, 0.9, 0.14, -0.2, 0.7, { attack: 0.8, hold: 1.4, sweep: 60 });
    },
    // The lift arriving: its two-note chime, down the corridor.
    lift(t) { keyNote(t, 84, 0.035, -0.7); keyNote(t + 0.45, 81, 0.035, -0.7); },
    // A page turned somewhere at the table.
    // A car going past on the ring road, left to right or back, its pitch falling as it passes.
    car(t) {
      const A = amb, c = A.c, d = 3 + Math.random() * 2.5, dir = Math.random() < 0.5 ? 1 : -1;
      const n = c.createBufferSource(), f = filter(c, 'bandpass', 700, 1.1), g = c.createGain(), p = c.createStereoPanner(), s = c.createGain();
      n.buffer = A.noise; n.loop = true;
      f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(950, t + d * 0.45); f.frequency.exponentialRampToValueAtTime(420, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + d * 0.5); g.gain.linearRampToValueAtTime(0, t + d);
      p.pan.setValueAtTime(-0.9 * dir, t); p.pan.linearRampToValueAtTime(0.9 * dir, t + d);
      s.gain.value = 0.4;
      chain([n, f, g, p]); p.connect(A.out); p.connect(s); s.connect(A.verb);
      n.start(t); n.stop(t + d + 0.1);
    },
    paper(t) { burst(t, 0.5, 'bandpass', 3200, 0.8, 0.012, Math.random() * 1.2 - 0.6, 0.4, { attack: 0.08, hold: 0.25 }); }
  };

  // The scheduler: book everything due in the next stretch of time for the place you are in.
  function plan(until) {
    const A = amb, S = SCENES[place];
    if (!A || !S) return;
    const N = A.next;
    S.notes.forEach(([note, period], k) => {
      while (N['n' + k] < until) { keyNote(N['n' + k], note, 0.05, ((k * 0.37) % 1.2) - 0.6); N['n' + k] += period; }
    });
    Object.entries(S.moments || {}).forEach(([m, [lo, hi]]) => {
      while (N[m] < until) { MOMENTS[m](N[m]); N[m] += lo + Math.random() * (hi - lo); }
    });
    if (S.drops) while (N.drop < until) { drop(N.drop, 1); N.drop += -Math.log(1 - Math.random()) / S.drops; }
    if (S.clock) while (N.clock < until) { const tock = Math.round(N.clock) % 2; burst(N.clock, 0.02, 'bandpass', tock ? 2400 : 3100, 9, 0.03, 0.65, 0.3); N.clock += 1; }
  }
  function start(name) {
    const A = amb, S = SCENES[name], t = A.c.currentTime, N = (A.next = {});
    // The first note comes soon after you arrive; the rest find their own places.
    S.notes.forEach(([, , off], k) => { N['n' + k] = t + 0.8 + off * 0.35; });
    Object.entries(S.moments || {}).forEach(([m, [lo, hi]]) => { N[m] = t + lo * (0.3 + Math.random() * 0.7); });
    N.drop = t + 0.3; N.clock = Math.ceil(t + 0.5);
  }

  function fade() {
    if (!amb) return;
    const t = amb.c.currentTime, S = SCENES[place] || { bed: {} };
    Object.entries(amb.bed).forEach(([name, g]) => g.gain.setTargetAtTime((S.bed[name] || 0) * BED[name], t, 0.9));
    Object.keys(SCENES).forEach(name => { if (amb.pads[name] || name === place) pad(name).gain.setTargetAtTime(name === place ? 0.006 * (SCENES[name].padLevel || 1) : 0, t, 1.4); });
    amb.out.gain.setTargetAtTime(on && place && !document.hidden ? 1 : 0, t, place ? 0.6 : 0.3);
  }

  // Where you are now: 'desk', 'floor', 'evening', 'board', 'title1' to 'title4', or null for silence.
  function scene(name) {
    const was = amb ? place : null;
    place = SCENES[name] ? name : null;
    if (!place && !amb) return;
    if (!amb) {
      if (!on) return;
      const c = audio();
      if (!c) return;
      amb = build(c);
      setInterval(() => { if (on && !document.hidden) plan(amb.c.currentTime + 1.5); }, 500);
      // Browsers only play sound after a click or a key; wake the audio on the next one.
      if (c.state !== 'running') {
        const wake = () => { c.resume(); window.removeEventListener('pointerdown', wake, true); window.removeEventListener('keydown', wake, true); };
        window.addEventListener('pointerdown', wake, true);
        window.addEventListener('keydown', wake, true);
      }
    }
    if (place && place !== was) start(place);
    fade();
  }
  // For a recording or a test: book the next `seconds` of the current place in one go.
  function preview(seconds) { if (amb) plan(amb.c.currentTime + seconds); }
  document.addEventListener('visibilitychange', fade);

  function toggle() {
    on = !on;
    try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    if (on && place && !amb) scene(place); else fade();
    document.dispatchEvent(new CustomEvent('intake-sound', { detail: on }));
    return on;
  }

  window.Sound = { chime, ding, found, im, nudge, online, sms, click, whoosh, stamp, scene, preview, toggle, get on() { return on; }, get place() { return place; } };
})();
