// The team: once you are promoted, three juniors each send you a draft for a request they took.
// Each draft has one flaw, built in code from the card's own traps (no Gemini). You find the flaw
// and coach them in one note; the note is graded as coaching. Static, trusted markup.
(function () {
  const PICS = ['bart', 'priya', 'jens'];
  const JUNIORS = [
    { id: 'bart', name: 'Bart', role: 'junior consultant', weak: 'risks', face: '🧔', voice: 'Eager, optimistic, a little defensive. Believes every client is "fully on board".' },
    { id: 'priya', name: 'Priya', role: 'junior consultant', weak: 'measure', face: '👩🏽', voice: 'Precise and quick, loves a dashboard, sometimes measures what is easy instead of what matters.' },
    { id: 'jens', name: 'Jens', role: 'junior consultant', weak: 'concept', face: '👨🏼‍🦱', voice: 'Creative, enthusiastic, reaches for the format he knows before checking the cause.' }
  ];
  const LINES = [['need', 'The need'], ['lever', 'Is learning the lever?'], ['measure', 'How we will know'], ['concept', 'The concept'], ['risks', 'Risks and dependencies']];
  const WHERE = { call: 'On the call', frontline: 'On the floor', data: 'In the data' };
  // Several wordings per answer, so a flawed line can't be spotted by its phrasing alone.
  const LEVER = {
    yes: ['Yes. A learning intervention fixes the core of this.', 'Yes. The gap is know-how, so learning is the right tool.', 'Yes, learning is the lever here; the rest of the setup supports it.'],
    partly: ['Partly. Learning helps, but part of the cause sits outside training.', 'Partly. Training covers one cause; the others need the client to change something.', 'Partly: learning plus a change in how the work is set up.'],
    no: ['No. This is not a learning problem; the fix sits elsewhere.', 'No. People already know how; something else stops them.', 'No, training would not move this. The cause is in the system around them.']
  };
  const lowerFirst = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;

  // A seeded random, so the same week shows the same drafts after a reload.
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const pick = (r, list) => list[Math.floor(r() * list.length)];

  function good(card, k, r) {
    const m = card.measurementPlan || {};
    const dep = card.dependencies[0];
    return {
      need: card.needStatement,
      lever: pick(r, LEVER[card.learningIsTheAnswer] || LEVER.partly),
      measure: [m.baseline && 'Baseline: ' + m.baseline, m.business_metric && 'Metric: ' + m.business_metric].filter(Boolean).join(' '),
      concept: (card.calibration.strong || '').split(' Plus: ')[0],
      risks: dep ? dep.who + ': ' + dep.concern : 'Check who signs off before we start.'
    }[k];
  }
  // Each flaw comes with the reason it is a flaw, which is what good coaching names.
  function flawed(card, k, r) {
    const s = card.stakeholder;
    const dep = card.dependencies[0];
    const ask = String(card.subject || '').replace(/\.$/, '');
    if (k === 'need') return { text: pick(r, ['They asked for it, so: ' + ask + '.', 'The need is what ' + s.name + ' asked for: ' + lowerFirst(ask) + '.', ask + '. The client knows their people best.', 'Deliver ' + lowerFirst(ask) + ', as requested, and make it engaging.']), why: (card.fair ? 'The request is fair this time, but this line only repeats it, with no evidence for why. ' : 'This repeats the request instead of the need. ') + card.needStatement };
    if (k === 'lever') {
      const right = card.learningIsTheAnswer in LEVER ? card.learningIsTheAnswer : 'partly';
      const wrong = pick(r, Object.keys(LEVER).filter(x => x !== right));
      return { text: pick(r, LEVER[wrong]), why: 'The lever call is wrong for this case: ' + card.realProblem };
    }
    if (k === 'measure') {
      const trap = card.measurementTraps.length ? pick(r, card.measurementTraps) : 'Satisfaction with the training.';
      return { text: trap.replace(/\.$/, '') + pick(r, ['. That will tell us if it worked.', '. Easy to collect, and the client likes the numbers.', '. We report it at the end of the pilot.', '.']), why: 'This measures the training, not the change at work. No baseline and no business metric.' };
    }
    if (k === 'concept') {
      const c = card.calibration.weak || pick(r, card.redFlags) || 'A one-day classroom course for everyone.';
      return { text: c, why: card.fair ? 'This refuses a request that was right. ' + card.fair.why : 'This is the conventional answer to the request. It does not fit the cause: ' + card.realProblem };
    }
    return { text: pick(r, ['None really. ' + s.name + ' is fully on board, so we can start next week.', s.name + ' will handle the internal side; we focus on the content.', 'Low risk: it is training, and nobody objects to training.', 'We inform the staff by mail once the content is ready.']), why: dep ? 'It ignores ' + dep.who + '. ' + (dep.if_ignored || dep.concern) : 'It names no dependency at all.' };
  }
  // The draft: four sound lines and one flaw. Mostly the junior's usual weak spot, sometimes not.
  // A junior you coached well on their weak spot twice has learned it (grown): their flaw is now
  // somewhere else, and they say so.
  function draft(card, junior, seed, grown) {
    const r = rng(seed + junior.id + card.id);
    const atypical = grown || r() < 0.3;
    const flawAt = atypical ? pick(r, LINES.map(([k]) => k).filter(k => k !== junior.weak)) : junior.weak;
    const f = flawed(card, flawAt, r);
    // The junior did a thorough intake: every fact, with where they found it, so you can check
    // each line of the draft against the evidence instead of guessing what they assumed.
    const found = card.hiddenFacts.map(x => ({ fact: x.fact, at: WHERE[(x.foundAt[0] || 'call').split(':')[0]] || 'On the call' }));
    return {
      junior: junior.id, card: card.id, flaw: flawAt, atypical: atypical && !grown, grown: !!grown, why: f.why,
      found,
      lines: LINES.map(([k, label]) => ({ k, label, text: k === flawAt ? f.text : good(card, k, r) })),
      pick: null, note: '', grade: null
    };
  }
  // The story, week 7 (js/arc.js): Bart's draft is sound, generic and empty. No flaw in any line and
  // nothing from the client in it; only "Something else..." fits. Not scored, no Gemini.
  const EMPTY = {
    need: 'Staff need to strengthen the capabilities required to perform effectively in their role.',
    lever: 'Partly. A blended approach addresses knowledge, skills and attitudes.',
    measure: 'Completion rate, learner satisfaction and a knowledge check at the end of the module.',
    concept: 'An engaging, interactive module with realistic scenarios, a quiz and a certificate.',
    risks: 'Learner engagement and time to participate. Mitigation: visible management support.'
  };
  function emptyDraft(card, junior) {
    return {
      junior: junior.id, card: card.id, flaw: 'else', empty: true, atypical: false, why: '',
      found: [],
      lines: LINES.map(([k, label]) => ({ k, label, text: EMPTY[k] })),
      pick: null, note: '', grade: null
    };
  }
  function plan(cards, seed, empty, grown) { return JUNIORS.map((j, i) => empty && j.id === 'bart' ? emptyDraft(cards[i], j) : draft(cards[i], j, seed, (grown || []).includes(j.id))); }
  // What the team remembers: per junior, the drafts you reviewed (flaw, whether it was their weak
  // spot, spot and coaching points). `grownFrom` lists who has learned their weak spot.
  const WEAK_NAME = { risks: 'the risks', measure: 'how we will know', concept: 'the concept' };
  function memory(team) {
    return team.drafts.filter(d => d.grade && !d.empty).map(d => ({ junior: d.junior, flaw: d.flaw, weak: d.flaw === junior(d.junior).weak, spot: d.grade.spot, coach: d.grade.coach }));
  }
  function grownFrom(log) {
    return JUNIORS.filter(j => log.filter(x => x.junior === j.id && x.weak && x.spot > 0 && x.coach >= 4).length >= 2).map(j => j.id);
  }
  // A line for Darren's Friday memo about the team, from this week's reviews.
  function memoLine(team, grown) {
    const done = memory(team);
    if (!done.length) return 'P.S. Your team\'s drafts went out unreviewed. A client asked who "Bart" is. Please review them.';
    const best = done.slice().sort((a, b) => (b.spot + b.coach) - (a.spot + a.coach))[0], worst = done.slice().sort((a, b) => (a.spot + a.coach) - (b.spot + b.coach))[0];
    const name = id => junior(id).name;
    if (grown.length) return 'P.S. ' + grown.map(name).join(' and ') + (grown.length > 1 ? ' have' : ' has') + ' got noticeably sharper on ' + grown.map(id => WEAK_NAME[junior(id).weak]).join(' and ') + '. Whatever you are telling them, keep telling them.';
    if (worst.spot + worst.coach <= 3) return 'P.S. ' + name(worst.junior) + '\'s draft went out with a hole in it. The client noticed. Please talk to ' + name(worst.junior) + ', properly this time.';
    return 'P.S. ' + name(best.junior) + ' says your feedback was "actually useful". From a junior, that is a medal.';
  }
  // Reviewing the empty draft: what Bart and Mieke say. It goes in the notebook, not in the score.
  function reviewEmpty(d) {
    d.grade = { spot: 0, coach: 0, total: 0, unscored: true,
      reply: d.pick === 'else' ? 'Something else? ...Yes. I didn\'t write it. It was in my folder this morning, finished. I thought you had done it.' : 'That line? It\'s fine, isn\'t it? They are all fine. I didn\'t write any of them, to be honest. It was in my folder this morning.',
      note: 'Mieke, reading over your shoulder: "Bart didn\'t write this. Nobody did." She goes back to her desk without another word.' };
  }
  const junior = id => JUNIORS.find(j => j.id === id);

  // Points: 4 for finding the flaw, 6 for the coaching (Gemini scores it 0 to 3, doubled).
  function spotPoints(d) { return d.pick === d.flaw ? 4 : 0; }

  function render(box, team, cardOf, onChange, onSend, onNote) {
    box.innerHTML = '';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    // A junior's display picture, a thing from their desk; the emoji only for anyone without one.
    const named = (j, cls, text) => {
      const e = el(cls === 'team-reply' ? 'p' : 'button', cls, null);
      const i = el('img', 'team-pic');
      i.src = 'media/people/' + j.id + '.webp';
      i.alt = '';
      e.append(PICS.includes(j.id) ? i : j.face + ' ', text);
      return e;
    };
    const tabs = el('div', 'team-tabs');
    team.drafts.forEach((d, i) => {
      const j = junior(d.junior);
      const b = named(j, 'team-tab' + (i === team.at ? ' on' : '') + (d.grade ? ' done' : ''), j.name + (d.grade ? ' ✓' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === team.at));
      b.onclick = () => { team.at = i; onChange(); };
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    const d = team.drafts[team.at], j = junior(d.junior), card = cardOf(d.card);
    const page = el('div', 'team-page');
    page.appendChild(el('p', 'team-from', 'From: ' + j.name + ', ' + j.role + ' · Re: ' + card.stakeholder.name + ' (' + card.stakeholder.role + '), "' + card.subject + '"'));
    page.appendChild(el('p', 'team-ask', d.grown ? '"Hi! You told me twice about ' + WEAK_NAME[j.weak] + ', so I checked that part properly this time. Can you look at the rest?"'
      : '"Hi! Here is my one-pager. Can you check it before I send it? I think it\'s good to go. My notes are attached."'));
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
    if (d.empty) facts.appendChild(el('p', 'muted', 'No notes attached. No call log either.'));
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
    if (d.empty) {
      const li = el('li', d.pick === 'else' ? 'picked' : ''), b = el('button');
      b.type = 'button'; b.disabled = !!d.grade; b.setAttribute('aria-pressed', String(d.pick === 'else'));
      b.append(el('b', null, 'Something else...'));
      b.onclick = () => { d.pick = d.pick === 'else' ? null : 'else'; onChange(); };
      li.appendChild(b);
      ol.appendChild(li);
    }
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
      if (g.unscored) {
        res.appendChild(named(j, 'team-reply', j.name + ': ' + g.reply));
        res.appendChild(el('p', null, g.note));
        res.appendChild(el('p', 'muted', 'Document properties: Author MODULEGEN. Not counted in your team score.'));
        if (onNote) { const n = el('button', 'link', 'Note it'); n.type = 'button'; n.onclick = () => { onNote(d); n.textContent = 'Noted'; n.disabled = true; }; res.appendChild(n); }
        page.appendChild(res);
        box.appendChild(page);
        return;
      }
      res.appendChild(el('p', 'team-score', g.total + ' / 10 · ' + (d.pick === d.flaw ? 'You found the flaw' : 'You missed the flaw') + ' (' + g.spot + '/4) · Coaching ' + g.coach + '/6'));
      if (d.pick !== d.flaw) res.appendChild(el('p', null, 'The problem was in "' + LINES.find(([k]) => k === d.flaw)[1] + '". ' + d.why));
      else res.appendChild(el('p', 'muted', d.why));
      if (d.atypical) res.appendChild(el('p', 'muted', 'Not ' + j.name + '\'s usual weak spot. Read every line, not just the one you expect.'));
      res.appendChild(named(j, 'team-reply', j.name + ': ' + g.reply));
      if (g.note) res.appendChild(el('p', 'muted', 'On your coaching: ' + g.note));
      page.appendChild(res);
    }
    box.appendChild(page);
  }
  function score(team) {
    const scored = team.drafts.filter(d => !d.empty), done = scored.filter(d => d.grade);
    return { total: done.reduce((a, d) => a + d.grade.total, 0), of: scored.length * 10, reviewed: done.length };
  }

  window.Team = { JUNIORS, plan, draft, render, score, spotPoints, junior, LINES, reviewEmpty, memory, grownFrom, memoLine };
})();
