// Quick intakes: 2-to-4-minute requests that each train one skill. Four kinds:
// one question, triage, measure this and spot the flaw. Triage and flaw are scored by code;
// one question and measure take one Gemini call.
(function () {
  const KINDS = {
    'one-question': { label: 'One question', task: 'You get one question before they hang up. What do you ask first?' },
    triage: { label: 'Triage', task: 'Is training the answer here? Make the call and say why in one line.' },
    measure: { label: 'Measure this', task: 'The need is already clear. Fill the measurement ladder.' },
    flaw: { label: 'Spot the flaw', task: 'One line in this draft is wrong, or none is. Click it and fix it.' }
  };
  const TRIAGE = { train: 'Train', dont_train: 'Don\'t train', need_more_info: 'Need more info' };
  const RUNGS = [['baseline', 'Baseline: where are we now?', 'baseline'], ['behaviour', 'Behaviour: what will people do differently?', 'behaviour'], ['metric', 'Business metric: what moves for the business?', 'business_metric'], ['collection', 'Collection: how, when, with what data?', 'collection']];
  const clamp4 = n => Math.max(0, Math.min(4, Number(n) || 0));

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function field(label, value, onInput, rows) {
    const l = el('label', null, label);
    const t = el(rows ? 'textarea' : 'input');
    if (rows) t.rows = rows;
    t.maxLength = rows ? 400 : 200;
    t.autocomplete = 'off';
    t.value = value || '';
    t.oninput = () => onInput(t.value);
    l.appendChild(t);
    return l;
  }
  function chips(options, picked, onPick) {
    const d = el('div', 'chips');
    options.forEach(([v, label]) => {
      const b = el('button', null, label);
      b.type = 'button';
      b.dataset.v = v;
      b.setAttribute('aria-pressed', picked === v);
      b.onclick = () => onPick(v);
      d.appendChild(b);
    });
    return d;
  }

  // What is still missing before it can be sent ('' when ready).
  function missing(card, a) {
    if (card.kind === 'one-question') return (a.q || '').trim().length < 8 ? 'Type your question first.' : '';
    if (card.kind === 'triage') return !a.pick ? 'Make the call: train, don\'t train, or need more info.' : (a.why || '').trim().length < 5 ? 'Say why in one line.' : '';
    if (card.kind === 'measure') return RUNGS.filter(([k]) => (a[k] || '').trim()).length < 2 ? 'Fill in at least two rungs.' : '';
    if (card.kind === 'flaw') return a.line == null ? 'Click the wrong line, or say it is clean.' : a.line >= 0 && (a.fix || '').trim().length < 8 ? 'Write how you would fix that line.' : '';
    return '';
  }

  // The form for one quick intake. `a` is the saved answer; onChange saves, onSend grades.
  function form(box, card, a, onChange, onSend) {
    box.innerHTML = '';
    const redraw = () => form(box, card, a, onChange, onSend);
    box.appendChild(el('p', 'quick-kind', '⚡ Quick intake · ' + KINDS[card.kind].label));
    box.appendChild(el('p', 'quick-task', KINDS[card.kind].task));
    if (card.kind === 'one-question') {
      box.appendChild(field('Your first question to ' + card.stakeholder.name.split(' ')[0], a.q, v => { a.q = v; onChange(); }, 3));
    }
    if (card.kind === 'triage') {
      box.appendChild(chips(Object.entries(TRIAGE), a.pick, v => { a.pick = v; onChange(); redraw(); }));
      box.appendChild(field('Because…', a.why, v => { a.why = v; onChange(); }));
    }
    if (card.kind === 'measure') {
      box.appendChild(el('p', 'quick-given', 'Diagnosis: ' + card.diagnosis));
      if (card.dataAvailable.length) box.appendChild(el('p', 'quick-given', 'Data they have: ' + card.dataAvailable.join(' · ')));
      RUNGS.forEach(([k, label]) => box.appendChild(field(label, a[k], v => { a[k] = v; onChange(); })));
    }
    if (card.kind === 'flaw') {
      box.appendChild(el('h4', 'draft-title', card.draftTitle));
      const ol = el('ol', 'draft');
      card.draft.forEach((line, i) => {
        const li = el('li');
        const b = el('button', null, line);
        b.type = 'button';
        b.setAttribute('aria-pressed', a.line === i);
        b.onclick = () => { a.line = i; onChange(); redraw(); };
        li.appendChild(b);
        ol.appendChild(li);
      });
      box.appendChild(ol);
      const clean = el('button', 'ghost', a.line === -1 ? '✓ No flaw: send it as it is' : 'No flaw: send it as it is');
      clean.type = 'button';
      clean.setAttribute('aria-pressed', a.line === -1);
      clean.onclick = () => { a.line = -1; onChange(); redraw(); };
      box.appendChild(clean);
      if (a.line >= 0) box.appendChild(field('Line ' + (a.line + 1) + ' should say…', a.fix, v => { a.fix = v; onChange(); }));
    }
    const row = el('div', 'row');
    const send = el('button', 'primary', card.kind === 'one-question' ? 'Ask it' : 'Send');
    send.type = 'button';
    send.id = 'quick-send';
    send.onclick = () => {
      const why = missing(card, a);
      if (why) { onSend(null, why); return; }
      send.disabled = true;
      send.textContent = 'One moment…';
      onSend(a);
    };
    row.appendChild(send);
    box.appendChild(row);
  }

  // Score 0-100 plus whatever the debrief shows.
  async function grade(card, a) {
    if (card.kind === 'one-question') {
      const p = Prompts.quickQuestion(card);
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: 'The learning professional asks: """' + a.q + '"""' }] });
      const revealed = (out.revealed || []).filter(id => card.hiddenFacts.some(f => f.id === id));
      return { total: clamp4(out.score) * 25, reply: out.reply, note: out.note, revealed };
    }
    if (card.kind === 'measure') {
      const p = Prompts.quickMeasure(card);
      const text = RUNGS.map(([k, label]) => label + ' """' + (a[k] || '') + '"""').join('\n');
      const out = await Gemini.json({ system: p.system, schema: p.schema, turns: [{ role: 'user', text: 'The player\'s plan, quoted as data:\n' + text }] });
      const rungs = {};
      RUNGS.forEach(([k]) => { const x = out[k] || {}; rungs[k] = { score: clamp4(x.score), note: x.note || '' }; });
      return { total: Math.round(RUNGS.reduce((s, [k]) => s + rungs[k].score, 0) / 16 * 100), rungs };
    }
    if (card.kind === 'triage') {
      const right = a.pick === card.answer;
      return { total: right ? 100 : a.pick === 'need_more_info' || card.answer === 'need_more_info' ? 40 : 10, right };
    }
    // flaw
    const right = a.line === card.flawIndex;
    return { total: !right ? 15 : a.line === -1 || (a.fix || '').trim().length >= 15 ? 100 : 70, right };
  }

  // What happened, what a strong answer looks like, and why.
  function debrief(box, card, a, res) {
    box.innerHTML = '';
    box.appendChild(el('p', 'quick-kind', '⚡ Quick intake · ' + KINDS[card.kind].label));
    box.appendChild(el('p', 'quick-score', res.total + ' / 100'));
    const pair = (k, v, cls) => { if (!v) return; const p = el('p', cls); p.append(el('b', null, k + ' '), v); box.appendChild(p); };
    if (card.kind === 'one-question') {
      pair('You asked:', '"' + a.q + '"');
      pair(card.stakeholder.name.split(' ')[0] + ':', '"' + res.reply + '"', 'msg them');
      pair('The examiner:', res.note);
      pair('A strong first question:', card.bestQuestion);
    }
    if (card.kind === 'triage') {
      pair('Your call:', TRIAGE[a.pick] + '. ' + (a.why || ''));
      pair(res.right ? 'Right.' : 'The better call:', TRIAGE[card.answer] + '. ' + card.why);
    }
    if (card.kind === 'measure') {
      const t = el('table', 'quick-rungs');
      RUNGS.forEach(([k, label, gk]) => {
        const tr = el('tr');
        const td = el('td');
        td.append(el('b', null, label.split(':')[0]), el('div', null, a[k] ? '"' + a[k] + '"' : '(empty)'), el('div', 'ev', res.rungs[k].note), el('div', 'ev', 'Strong: ' + (card.gold[gk] || '')));
        tr.append(td, el('td', 'pts', res.rungs[k].score + ' / 4'));
        t.appendChild(tr);
      });
      box.appendChild(t);
      if (card.traps.length) pair('Traps:', card.traps.join(' · '));
    }
    if (card.kind === 'flaw') {
      const ol = el('ol', 'draft done');
      card.draft.forEach((line, i) => { ol.appendChild(el('li', (i === card.flawIndex ? 'flaw' : '') + (i === a.line ? ' picked' : ''), line)); });
      box.appendChild(ol);
      pair('You said:', a.line === -1 ? 'No flaw.' : 'Line ' + (a.line + 1) + (a.fix ? ': "' + a.fix + '"' : '.'));
      pair(res.right ? 'Right.' : 'Actually:', card.flawIndex === -1 ? 'This draft was clean. Sometimes it is.' : 'Line ' + (card.flawIndex + 1) + '. ' + card.flawWhy);
      if (card.fix) pair('A fix:', card.fix);
    }
    if (card.kind === 'one-question' || card.kind === 'triage') {
      const ul = el('ul', 'quick-facts');
      card.hiddenFacts.forEach(f => {
        const found = card.kind === 'one-question' && (res.revealed || []).includes(f.id);
        ul.appendChild(el('li', found ? 'found' : '', (found ? '✓ ' : '') + f.fact));
      });
      box.appendChild(el('h4', null, card.kind === 'triage' ? 'What was going on' : 'What a good question would have uncovered'));
      box.appendChild(ul);
    }
    box.appendChild(el('p', 'quick-debrief', card.debrief));
  }

  window.Quick = { KINDS, TRIAGE, form, grade, debrief, missing };
})();
