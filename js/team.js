// The team: once you are promoted, three juniors each send you a draft for a request they took.
// Each draft has one flaw, built in code from the card's own traps (no Gemini). You find the flaw
// and coach them in one note; the note is graded as coaching. Static, trusted markup.
(function () {
  const JUNIORS = [
    { id: 'bart', name: 'Bart', role: 'junior consultant', weak: 'risks', face: '🧔', voice: 'Eager, optimistic, a little defensive. Believes every client is "fully on board".' },
    { id: 'priya', name: 'Priya', role: 'junior consultant', weak: 'measure', face: '👩🏽', voice: 'Precise and quick, loves a dashboard, sometimes measures what is easy instead of what matters.' },
    { id: 'jens', name: 'Jens', role: 'junior consultant', weak: 'concept', face: '👨🏼‍🦱', voice: 'Creative, enthusiastic, reaches for the format he knows before checking the cause.' }
  ];
  const LINES = [['need', 'The need'], ['lever', 'Is learning the lever?'], ['measure', 'How we will know'], ['concept', 'The concept'], ['risks', 'Risks and dependencies']];
  const WHERE = { call: 'On the call', frontline: 'On the floor', data: 'In the data' };
  const LEVER = { yes: 'Yes. A learning intervention fixes the core of this.', partly: 'Partly. Learning helps, but part of the cause sits outside training.', no: 'No. This is not a learning problem; the fix sits elsewhere.' };

  // A seeded random, so the same week shows the same drafts after a reload.
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const pick = (r, list) => list[Math.floor(r() * list.length)];

  function good(card, k) {
    const m = card.measurementPlan || {};
    const dep = card.dependencies[0];
    return {
      need: card.needStatement,
      lever: LEVER[card.learningIsTheAnswer] || LEVER.partly,
      measure: [m.baseline && 'Baseline: ' + m.baseline, m.business_metric && 'Metric: ' + m.business_metric].filter(Boolean).join(' '),
      concept: (card.calibration.strong || '').split(' Plus: ')[0],
      risks: dep ? dep.who + ': ' + dep.concern : 'Check who signs off before we start.'
    }[k];
  }
  // Each flaw comes with the reason it is a flaw, which is what good coaching names.
  function flawed(card, k, r) {
    const s = card.stakeholder;
    const dep = card.dependencies[0];
    if (k === 'need') return { text: 'They asked for it, so: ' + card.subject + '.', why: 'This repeats the request instead of the need. ' + card.needStatement };
    if (k === 'lever') {
      const wrong = card.learningIsTheAnswer === 'yes' ? LEVER.no : 'Yes. Training will fix this.';
      return { text: wrong, why: 'The lever call is wrong for this case: ' + card.realProblem };
    }
    if (k === 'measure') {
      const trap = card.measurementTraps.length ? pick(r, card.measurementTraps) : 'Satisfaction with the training.';
      return { text: trap.replace(/\.$/, '') + '. That will tell us if it worked.', why: 'This measures the training, not the change at work. No baseline and no business metric.' };
    }
    if (k === 'concept') {
      const c = card.calibration.weak || pick(r, card.redFlags) || 'A one-day classroom course for everyone.';
      return { text: c, why: 'This is the conventional answer to the request. It does not fit the cause: ' + card.realProblem };
    }
    return { text: 'None really. ' + s.name + ' is fully on board, so we can start next week.', why: dep ? 'It ignores ' + dep.who + '. ' + (dep.if_ignored || dep.concern) : 'It names no dependency at all.' };
  }
  // The draft: four sound lines and one flaw. Mostly the junior's usual weak spot, sometimes not.
  function draft(card, junior, seed) {
    const r = rng(seed + junior.id + card.id);
    const atypical = r() < 0.3;
    const flawAt = atypical ? pick(r, LINES.map(([k]) => k).filter(k => k !== junior.weak)) : junior.weak;
    const f = flawed(card, flawAt, r);
    // The junior did a thorough intake: every fact, with where they found it, so you can check
    // each line of the draft against the evidence instead of guessing what they assumed.
    const found = card.hiddenFacts.map(x => ({ fact: x.fact, at: WHERE[(x.foundAt[0] || 'call').split(':')[0]] || 'On the call' }));
    return {
      junior: junior.id, card: card.id, flaw: flawAt, atypical, why: f.why,
      found,
      lines: LINES.map(([k, label]) => ({ k, label, text: k === flawAt ? f.text : good(card, k) })),
      pick: null, note: '', grade: null
    };
  }
  function plan(cards, seed) { return JUNIORS.map((j, i) => draft(cards[i], j, seed)); }
  const junior = id => JUNIORS.find(j => j.id === id);

  // Points: 4 for finding the flaw, 6 for the coaching (Gemini scores it 0 to 3, doubled).
  function spotPoints(d) { return d.pick === d.flaw ? 4 : 0; }

  function render(box, team, cardOf, onChange, onSend) {
    box.innerHTML = '';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const tabs = el('div', 'team-tabs');
    team.drafts.forEach((d, i) => {
      const j = junior(d.junior);
      const b = el('button', 'team-tab' + (i === team.at ? ' on' : '') + (d.grade ? ' done' : ''), j.face + ' ' + j.name + (d.grade ? ' ✓' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === team.at));
      b.onclick = () => { team.at = i; onChange(); };
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    const d = team.drafts[team.at], j = junior(d.junior), card = cardOf(d.card);
    const page = el('div', 'team-page');
    page.appendChild(el('p', 'team-from', 'From: ' + j.name + ', ' + j.role + ' · Re: ' + card.stakeholder.name + ' (' + card.stakeholder.role + '), "' + card.subject + '"'));
    page.appendChild(el('p', 'team-ask', '"Hi! Here is my one-pager. Can you check it before I send it? I think it\'s good to go. My notes are attached."'));
    // The case file: the request as it came in, the briefing, what the junior found and who is involved.
    const file = el('details', 'team-file');
    file.open = true;
    file.appendChild(el('summary', null, 'Case file: ' + (card.stakeholder.org || card.stakeholder.name)));
    file.appendChild(el('p', 'team-request', 'The request: "' + card.surfaceAsk + '"'));
    if (card.briefing) {
      file.appendChild(el('b', null, card.briefing.headline));
      const bl = el('ul');
      (card.briefing.points || []).forEach(p => bl.appendChild(el('li', null, p)));
      if (card.briefing.text) bl.appendChild(el('li', null, card.briefing.text));
      file.appendChild(bl);
    }
    page.appendChild(file);
    const facts = el('div', 'team-facts');
    facts.appendChild(el('b', null, j.name + '\'s notes: what the intake turned up'));
    const ul = el('ul');
    d.found.forEach(f => {
      const li = el('li');
      if (typeof f === 'string') li.textContent = f;
      else li.append(el('span', 'team-where', f.at), ' ' + f.fact);
      ul.appendChild(li);
    });
    facts.appendChild(ul);
    const who = (card.dependencies || []).map(x => x.who);
    if (who.length) facts.appendChild(el('p', 'team-who', 'Also involved: ' + who.join('; ') + '.'));
    page.appendChild(facts);
    const ol = el('ol', 'draft team-draft' + (d.grade ? ' done' : ''));
    d.lines.forEach(line => {
      const li = el('li', d.grade && line.k === d.flaw ? 'flaw' : d.pick === line.k ? 'picked' : '');
      const b = el('button');
      b.type = 'button';
      b.disabled = !!d.grade;
      b.setAttribute('aria-pressed', String(d.pick === line.k));
      const s = el('b', null, line.label + ': ');
      b.append(s, line.text);
      b.onclick = () => { d.pick = d.pick === line.k ? null : line.k; onChange(); };
      li.appendChild(b);
      ol.appendChild(li);
    });
    page.appendChild(el('p', 'fine', d.grade ? '' : 'Click the line with the problem. Then coach ' + j.name + ' in a few sentences: what is wrong, why, and a question that gets them to fix it. Don\'t rewrite it for them.'));
    page.appendChild(ol);
    if (!d.grade) {
      const ta = el('textarea');
      ta.id = 'team-note';
      ta.rows = 4;
      ta.maxLength = 700;
      ta.placeholder = 'Your note to ' + j.name;
      ta.value = d.note || '';
      ta.oninput = () => { d.note = ta.value; };
      page.appendChild(ta);
      const send = el('button', 'primary', 'Send feedback to ' + j.name);
      send.type = 'button';
      send.id = 'btn-team-send';
      send.onclick = () => onSend(d);
      page.appendChild(send);
    } else {
      const g = d.grade;
      const res = el('div', 'team-result');
      res.appendChild(el('p', 'team-score', g.total + ' / 10 · ' + (d.pick === d.flaw ? 'You found the flaw' : 'You missed the flaw') + ' (' + g.spot + '/4) · Coaching ' + g.coach + '/6'));
      if (d.pick !== d.flaw) res.appendChild(el('p', null, 'The problem was in "' + LINES.find(([k]) => k === d.flaw)[1] + '". ' + d.why));
      else res.appendChild(el('p', 'muted', d.why));
      if (d.atypical) res.appendChild(el('p', 'muted', 'Not ' + j.name + '\'s usual weak spot. Read every line, not just the one you expect.'));
      res.appendChild(el('p', 'team-reply', j.face + ' ' + j.name + ': ' + g.reply));
      if (g.note) res.appendChild(el('p', 'muted', 'On your coaching: ' + g.note));
      page.appendChild(res);
    }
    box.appendChild(page);
  }
  function score(team) {
    const done = team.drafts.filter(d => d.grade);
    return { total: done.reduce((a, d) => a + d.grade.total, 0), of: team.drafts.length * 10, reviewed: done.length };
  }

  window.Team = { JUNIORS, plan, draft, render, score, spotPoints, junior, LINES };
})();
