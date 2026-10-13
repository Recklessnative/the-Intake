// Measurement drill: one case, measurement only, in about three minutes. The real need is given,
// so the whole round goes on the part good players drop: what would show it worked. First you sort
// measures from the card into "would show it worked", "looks good, proves nothing" and "they don't
// have the data"; then you write the rule that stops or scales the pilot and check it against the
// four things it needs. Everything comes from the card, so no Gemini call and no points.
// Static, trusted markup.
(function () {
  const BINS = [['works', 'Shows it worked'], ['trap', 'Looks good, proves nothing'], ['nodata', 'They don\'t have it']];
  const SLOT = { baseline: 'the baseline', behaviour: 'the behaviour to watch', business_metric: 'the business metric' };
  // Words that give a satisfaction or completion measure away.
  const TRAP_WORDS = /satisf|survey|happy|smile|complet|attend|certif|exam|quiz|test score|feedback form|evaluation form|participants (liked|rated)/i;
  const CHECKS = [
    ['small', 'A limited first step: one team, site, line or group', t => /\b(pilot|one|two|three|first|single|only|just)\b/i.test(t)],
    ['measure', 'A behaviour or business measure, not satisfaction or completions', t => !TRAP_WORDS.test(t) && t.length >= 20],
    ['result', 'The result that makes you stop or change', t => /\b(if|unless|below|under|less than|fewer|more than|halv|double)\b|%|\d/i.test(t)],
    ['when', 'When you decide', t => /\b(by|after|within|weeks?|months?|days?|end of|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(t)]
  ];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // A tile shows the measure, not the card's reason for it: cut at a colon or a "which ..." clause,
  // and keep every tile about the same length so length gives nothing away.
  function head(t) {
    let s = String(t || '').trim();
    s = s.split(/:\s|;\s/)[0];
    s = s.split(/,\s(?:which|because|since|so|as)\b/)[0];
    if (s.length > 90) { const cut = Math.max(s.lastIndexOf(', ', 90), s.lastIndexOf(' and ', 90)); s = (cut > 35 ? s.slice(0, cut) : s.slice(0, 87)).replace(/[\s,;]+$/, '') + '…'; }
    return s.replace(/[.,;]$/, '');
  }

  function build(card) {
    const m = card.measurementPlan || {}, who = card.stakeholder.name.split(' ')[0];
    const tiles = [];
    Object.keys(SLOT).forEach(k => { if (m[k]) tiles.push({ text: head(m[k]), full: m[k], bin: 'works', why: 'This is ' + SLOT[k] + '.' }); });
    (card.measurementTraps || []).forEach(t => tiles.push({ text: head(t), full: t, bin: 'trap', why: 'A trap.' }));
    String(card.constraints.dataMissing || '').split('; ').filter(Boolean).slice(0, 2)
      .forEach(t => tiles.push({ text: head(t), full: t, bin: 'nodata', why: who + ' does not have this. Measuring it means building it first.' }));
    return { card: card.id, who, org: card.stakeholder.org || '', need: card.needStatement || card.realProblem, have: card.constraints.dataAvailable || '', tiles: shuffle(tiles), picks: {}, checked: false, rule: '', ticks: null, rating: null };
  }

  // R = a round from build(); `card` the full card; save() keeps R; done(R) when rated.
  function render(box, R, card, save, done) {
    box.innerHTML = '';
    const top = el('div', 'su-top');
    top.append(el('b', null, 'Measurement drill'), el('span', null, card.stakeholder.name + (R.org ? ', ' + R.org.split(',')[0] : '')));
    box.appendChild(top);
    const body = el('div', 'su-body drill');
    box.appendChild(body);
    body.appendChild(el('p', 'su-mieke', 'Mieke: "Diagnosis done, I wrote it for you. Now only the part everyone rushes: how would you know it worked?"'));
    const need = el('p', 'su-case'); need.textContent = 'The need: ' + R.need; body.appendChild(need);
    if (R.have) body.appendChild(el('p', 'fine', 'Data ' + R.who + ' has: ' + R.have + '.'));

    // Step 1: sort.
    body.appendChild(el('p', 'su-q', '1. Sort each measure.'));
    const list = el('ol', 'drill-tiles');
    R.tiles.forEach((t, i) => {
      const li = el('li', R.checked ? (R.picks[i] === t.bin ? 'ok' : 'no') : null);
      li.appendChild(el('span', 'drill-text', t.text));
      const row = el('div', 'chips');
      BINS.forEach(([k, label]) => {
        const b = el('button', null, label);
        b.type = 'button'; b.dataset.bin = k;
        b.setAttribute('aria-pressed', R.picks[i] === k);
        b.disabled = R.checked;
        b.onclick = () => { R.picks[i] = k; save(); row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
        row.appendChild(b);
      });
      li.appendChild(row);
      if (R.checked) {
        const label = BINS.find(b => b[0] === t.bin)[1];
        li.appendChild(el('p', 'drill-why', (R.picks[i] === t.bin ? '✓ ' : '✗ ' + label + '. ') + t.why + (t.full !== t.text ? ' ' + t.full : '')));
      }
      list.appendChild(li);
    });
    body.appendChild(list);
    const why = el('p', 'su-why');
    if (!R.checked) {
      const b = el('button', 'primary', 'Check my sort');
      b.type = 'button'; b.id = 'drill-check';
      b.onclick = () => {
        if (R.tiles.some((t, i) => !R.picks[i])) { why.textContent = 'Sort every measure first. A guess counts.'; return; }
        R.checked = true; save(); render(box, R, card, save, done);
      };
      body.append(b, why);
      return;
    }
    const right = R.tiles.filter((t, i) => R.picks[i] === t.bin).length;
    body.appendChild(el('p', 'drill-score', right + ' of ' + R.tiles.length + ' sorted right.'));

    // Step 2: the rule that stops or scales it.
    body.appendChild(el('p', 'su-q', '2. Write the rule that stops or scales the pilot, in one or two sentences.'));
    const t = el('textarea');
    t.name = 'rule'; t.rows = 3; t.maxLength = 500;
    t.placeholder = 'For example: Pilot on line 3 and line 5. If changeover minutes have not dropped by a fifth by the end of March, we stop and look again.';
    t.value = R.rule;
    body.appendChild(t);
    if (R.ticks == null) {
      const b = el('button', 'primary', 'Check my rule');
      b.type = 'button'; b.id = 'drill-rule';
      b.onclick = () => {
        const v = t.value.trim();
        if (v.length < 20) { t.focus(); why.textContent = 'One real sentence first.'; return; }
        R.rule = v; R.ticks = Object.fromEntries(CHECKS.map(([k, , test]) => [k, test(v)])); save(); render(box, R, card, save, done);
      };
      body.append(b, why);
      return;
    }
    t.readOnly = true;
    body.appendChild(el('p', 'fine', 'A rule needs all four. The ticks are a guess from your wording: untick what is not really there, tick what is.'));
    const checks = el('ul', 'drill-checks');
    CHECKS.forEach(([k, label]) => {
      const li = el('li'), cb = el('input');
      cb.type = 'checkbox'; cb.checked = !!R.ticks[k]; cb.disabled = !!R.rating; cb.id = 'drill-' + k;
      cb.onchange = () => { R.ticks[k] = cb.checked; save(); };
      const lab = el('label', null, label); lab.htmlFor = cb.id;
      li.append(cb, lab); checks.appendChild(li);
    });
    body.appendChild(checks);
    if (TRAP_WORDS.test(R.rule)) body.appendChild(el('p', 'su-why', 'Your rule leans on satisfaction, completions or a test. That tells you people came, not that anything changed.'));
    const m = card.measurementPlan || {};
    const ans = el('div', 'su-answer');
    ans.appendChild(el('p', null, 'What would show it worked here:'));
    [['Behaviour', m.behaviour], ['Business metric', m.business_metric], ['Collection', m.collection]].forEach(([l, v]) => { if (v) ans.appendChild(el('p', null, l + ': ' + v)); });
    body.appendChild(ans);
    if (!R.rating) {
      body.appendChild(el('p', 'su-q', 'Would your rule have told ' + R.who + ' whether to stop or scale?'));
      const row = el('div', 'chips su-same');
      [['got', 'Yes'], ['partly', 'Partly'], ['missed', 'Not really']].forEach(([k, label]) => {
        const b = el('button', null, label);
        b.type = 'button'; b.dataset.rate = k;
        b.onclick = () => { R.rating = k; save(); done(R, right); render(box, R, card, save, done); };
        row.appendChild(b);
      });
      body.appendChild(row);
      return;
    }
    body.appendChild(el('p', 'su-mieke', R.rating === 'got' ? 'Mieke: "That one would survive a finance director. Next time, write it before the concept."'
      : 'Mieke: "Write the stop rule before the concept next time. It changes which concept you pick."'));
    const again = el('button', 'primary', 'Another case');
    again.type = 'button'; again.id = 'drill-again';
    again.onclick = () => done(R, right, true);
    body.appendChild(again);
  }

  // Which card to drill: the one you name, else a case you played with the weakest measurement
  // share, else any non-starter case; never the one you just drilled.
  function pickCard(history, pool, last) {
    const share = new Map();
    (history.weeks || []).forEach(w => (w.requests || []).forEach(r => {
      if (r.starter || !r.pts || r.pts.measurement == null) return;
      const s = r.pts.measurement / 20;
      if (!share.has(r.card) || s < share.get(r.card)) share.set(r.card, s);
    }));
    const ok = c => c.difficulty >= 1 && c.id !== last && c.measurementPlan && c.measurementPlan.business_metric;
    const played = pool.filter(c => ok(c) && share.has(c.id) && share.get(c.id) < 0.75).sort((a, b) => share.get(a.id) - share.get(b.id));
    if (played.length) return played[0];
    const rest = pool.filter(ok);
    return rest[Math.floor(Math.random() * rest.length)] || null;
  }

  function record(history, R, right) {
    history.drills = (history.drills || []).concat({ at: Date.now(), card: R.card, right, of: R.tiles.length, rating: R.rating, ticks: Object.values(R.ticks || {}).filter(Boolean).length }).slice(-30);
  }

  window.Drill = { build, render, pickCard, record, head, CHECKS };
})();
