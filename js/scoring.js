// The score for one request, out of 100, from the examiner's grades plus what code can count.
// One measure in every mode (case board, memo, hard): the case board's scaffolds change what
// the player writes, never how it is scored. Hidden facts count once, here, and the examiner is
// told not to count them. Also loads in Node for tests/judge-spread.cjs.
(function (root) {
  const DIMS = ['diagnosis', 'measurement', 'fit', 'nextLevel', 'risks', 'pitch'];
  const ORDER = { no: 0, partly: 1, yes: 2 };
  const OUTCOMES = ['retreat', 'weak', 'none', 'adapted', 'strong'];
  const WAYBACK = ['none', 'vague', 'concrete'];

  const clamp4 = n => Math.max(0, Math.min(4, Number(n) || 0));
  const middle = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };

  // Lever call against the card: right 1, one step off 0.25, opposite or no call 0.
  function lever(card, call) {
    const want = String(card.learningIsTheAnswer || '').toLowerCase();
    if (!(want in ORDER)) return 0.5;
    return call in ORDER ? [1, 0.25, 0][Math.abs(ORDER[want] - ORDER[call])] : 0;
  }

  // How well the concept's size fits this client. Judged boldness against the card's appetite:
  // on target or one step above (with a way back) is right-sized; too timid or reckless is not.
  // The way back counts only when the examiner read it as concrete; grades from before that
  // field existed fall back to "something was written".
  // `read` is the calibration bonus for reading the client and your own concept correctly.
  function sizing(card, bet, reaction, outcome, wayBack) {
    bet = bet || {};
    const a = card.riskAppetite | 0;
    const b = reaction ? Math.max(0, Math.min(3, reaction.boldness | 0)) : a, d = b - a;
    const exit = wayBack ? wayBack === 'concrete' : (bet.exit || '').trim().length >= 10;
    const fit = d === 0 ? 1 : d === 1 ? (exit ? 1 : 0.6) : d === -1 ? 0.6 : d <= -2 ? 0.3 : (exit && ['strong', 'adapted'].includes(outcome) ? 0.7 : 0.4);
    const verdict = d === 0 || (d === 1 && exit) ? 'Right-sized.' : d === 1 ? 'One step too far without a concrete way back.' : d < 0 ? 'Too timid for this client.' : 'Too much for this client.';
    const read = (bet.appetite === a ? 2 : 0) + (bet.bold === b ? 1 : 0);
    return { fit, read, a, b, d, verdict, bet };
  }

  // Which facts count as found. Asked for and heard (call, coffee machine) counts. A data document
  // only counts once it is used: cited on the case board, or used in the write-up per the examiner.
  // `unused`: documents you had and did not use.
  function credit(card, run, g) {
    const used = new Set((run.cited || []).concat(g.factsUsed || []));
    const had = (run.had || []).filter(id => card.hiddenFacts.some(f => f.id === id));
    const found = new Set([...(run.revealed || []), ...had.filter(id => used.has(id))]);
    return { found, unused: had.filter(id => !found.has(id)) };
  }

  // run: { revealed (Set or array of fact ids), had, cited, writeup, bet, reaction, defence }; g: the examiner's grade.
  function points(card, run, g) {
    const cr = credit(card, run, g), revealed = cr.found;
    const weight = f => f.weight || 1;
    const total = card.hiddenFacts.reduce((a, f) => a + weight(f), 0) || 1;
    const facts = card.hiddenFacts.filter(f => revealed.has(f.id)).reduce((a, f) => a + weight(f), 0) / total;
    // The case board asks for the lever outright; in a memo the examiner reads it from the text.
    const call = run.writeup && run.writeup.kind === 'board' ? run.writeup.lever : g.leverCall;
    const lv = lever(card, call);
    const pts = {};
    pts.diagnosis = 13 * clamp4(g.diagnosis.score) / 4 + 8 * facts + 4 * lv;
    pts.measurement = 20 * clamp4(g.measurement.score) / 4;
    pts.fit = 20 * clamp4(g.fit.score) / 4;
    const sz = sizing(card, run.bet, run.reaction, g.defenceOutcome, g.wayBack);
    // A ramp, not a gate: a concept counts as right-sized only as far as it fits the need.
    pts.nextLevel = 15 * clamp4(g.fit.score) / 4 * (0.5 * clamp4(g.nextLevel.score) / 4 + 0.5 * sz.fit);
    pts.risks = 10 * clamp4(g.risks.score) / 4;
    pts.pitch = 10 * clamp4(g.pitch.score) / 4;
    let bonus = sz.read;
    if ((run.defence || []).length) {
      if (g.defenceOutcome === 'strong' || g.defenceOutcome === 'adapted') bonus += 3;
      else if (g.defenceOutcome === 'weak') pts.nextLevel /= 2;
      else if (g.defenceOutcome === 'retreat') pts.nextLevel = 0;
    }
    Object.keys(pts).forEach(k => { pts[k] = Math.round(pts[k]); });
    const sum = Math.min(100, Object.values(pts).reduce((a, b) => a + b, 0) + bonus);
    return { pts, bonus, total: sum, sz, facts, found: [...revealed], unused: cr.unused, lever: lv, call: call || '' };
  }

  // Several examiner runs on the same material, merged into one grade: the median score per
  // dimension (with that run's evidence quote), the most common defence outcome and lever call,
  // and the comments of the run closest to the median overall. `spread` is max minus min per dimension.
  function median(grades) {
    grades = grades.filter(g => g && g.diagnosis);
    if (grades.length < 2) return Object.assign({ runs: grades.length, spread: {} }, grades[0]);
    const out = { runs: grades.length, spread: {} };
    DIMS.forEach(k => {
      const scores = grades.map(g => clamp4(g[k].score)), m = middle(scores);
      out[k] = Object.assign({}, grades.find(g => clamp4(g[k].score) === m)[k], { score: m });
      out.spread[k] = Math.max(...scores) - Math.min(...scores);
    });
    const vote = (key, order) => {
      const n = {};
      grades.forEach(g => { n[g[key]] = (n[g[key]] || 0) + 1; });
      const best = Math.max(...Object.values(n)), tied = Object.keys(n).filter(v => n[v] === best);
      if (tied.length === 1 || !order) return tied[0];
      return order[middle(grades.map(g => order.indexOf(g[key])))];
    };
    out.defenceOutcome = vote('defenceOutcome', OUTCOMES);
    out.leverCall = vote('leverCall', ['no', 'partly', 'yes', 'unclear']);
    // A data fact counts as used when most runs say so.
    const seen = {};
    grades.forEach(g => new Set(g.factsUsed || []).forEach(id => { seen[id] = (seen[id] || 0) + 1; }));
    out.factsUsed = Object.keys(seen).filter(id => seen[id] * 2 > grades.length);
    if (grades.some(g => g.wayBack)) out.wayBack = vote('wayBack', WAYBACK);
    const sum = g => DIMS.reduce((a, k) => a + clamp4(g[k].score), 0), target = DIMS.reduce((a, k) => a + out[k].score, 0);
    const closest = grades.slice().sort((a, b) => Math.abs(sum(a) - target) - Math.abs(sum(b) - target))[0];
    out.questionNotAsked = closest.questionNotAsked;
    out.verdict = closest.verdict;
    return out;
  }

  // The stakeholder's boldness reading, run several times: the median value and the run that gave it
  // (its objections and reply go with it).
  function boldness(reactions) {
    reactions = reactions.filter(x => x && Array.isArray(x.objections));
    if (!reactions.length) return null;
    const b = x => Math.max(0, Math.min(3, x.boldness | 0));
    const m = middle(reactions.map(b));
    return Object.assign({}, reactions.find(x => b(x) === m), { boldness: m, runs: reactions.length, spread: Math.max(...reactions.map(b)) - Math.min(...reactions.map(b)) });
  }

  const Scoring = { DIMS, clamp4, lever, sizing, credit, points, median, boldness };
  if (typeof module !== 'undefined' && module.exports) module.exports = Scoring;
  else root.Scoring = Scoring;
})(typeof window !== 'undefined' ? window : globalThis);
