// Turns a scenario card file (schema_version 1, as written for THE INTAKE)
// into the shape the game and prompts use.
(function () {
  const list = v => (Array.isArray(v) ? v : v ? [v] : []);

  function normalise(raw) {
    if (!raw.schema_version) return raw; // already in game shape
    const s = raw.stakeholder || {};
    const g = raw.gold || {};
    const c = raw.constraints || {};
    const m = (raw.measurement || {}).gold_plan || {};
    const k = raw.concepts || {};
    return {
      id: raw.id,
      sector: raw.sector,
      title: raw.title,
      difficulty: raw.tier == null ? 1 : raw.tier,
      stakeholder: {
        name: s.name,
        role: s.role,
        org: s.org || '',
        voice: s.voice || ''
      },
      surfaceAsk: raw.opening_message || raw.surface_ask,
      subject: (raw.surface_ask || 'Request: can you help?').replace(/\.$/, ''),
      realProblem: g.real_problem,
      rootCause: list(g.root_cause_types).join(', '),
      rootCauseTypes: list(g.root_cause_types),
      learningIsTheAnswer: g.is_training_the_lever,
      needStatement: g.need_statement,
      hiddenFacts: list(raw.hidden_facts).map(f => ({
        id: f.id, fact: f.fact, unlockedBy: f.unlocks_when, revealLine: f.reveal_line,
        weight: f.weight || 1, critical: !!f.critical,
        // Where it can be found: 'call', 'frontline' or 'data:<kind>'. Untagged facts are on the call.
        foundAt: list(f.found_at).length ? list(f.found_at) : ['call'],
        dataDoc: f.data_doc || '', dataSource: f.data_source || '', frontlineLine: f.frontline_line || ''
      })),
      frontline: raw.frontline && raw.frontline.name ? { name: raw.frontline.name, role: raw.frontline.role || '', voice: raw.frontline.voice || '' } : null,
      volunteered: list(raw.volunteered_facts),
      constraints: {
        budget: c.budget,
        deadline: c.deadline,
        audience: [c.audience, c.schedule, c.languages].filter(Boolean).join(' '),
        dataAvailable: list(c.data_available).join('; '),
        dataMissing: list(c.data_not_available).join('; ')
      },
      politics: list(raw.dependencies).map(d => `${d.who}: ${d.concern}`),
      dependencies: list(raw.dependencies),
      patience: s.patience || 3,
      riskAppetite: s.risk_appetite == null ? 1 : s.risk_appetite,
      likelyObjections: list(raw.defence_objections),
      goldAnswer: {
        need: g.need_statement,
        measurement: ['baseline', 'behaviour', 'leading_indicators', 'business_metric', 'collection']
          .filter(x => m[x]).map(x => `${x.replace('_', ' ')}: ${m[x]}`).join(' | '),
        concept: [k.solid].concat(list(k.next_level_examples)).filter(Boolean).join(' | '),
        risks: list(raw.dependencies).map(d => `${d.who} (${d.if_ignored})`)
      },
      measurementPlan: m,
      measurementTraps: list((raw.measurement || {}).traps),
      calibration: {
        strong: list(k.next_level_examples)[0] ? `${k.solid} Plus: ${list(k.next_level_examples)[0]}` : k.solid,
        passable: [k.solid ? 'Targets the right group but without measurement baseline or dependencies.' : '', list(k.also_valid)[0] || ''].filter(Boolean).join(' '),
        weak: k.conventional
      },
      alsoValid: list(k.also_valid),
      redFlags: list(k.red_flags),
      briefing: !raw.briefing ? null
        : typeof raw.briefing === 'string' ? { headline: 'Case file', points: [], text: raw.briefing }
        : Array.isArray(raw.briefing) ? { headline: 'Case file', points: raw.briefing }
        : { headline: raw.briefing.headline || 'Case file', points: list(raw.briefing.points) },
      questionHint: raw.question_you_didnt_ask,
      actorNotes: list(raw.actor_notes),
      flavourLines: list(raw.flavour_lines)
    };
  }

  // A quick intake (scenarios/quick/): a 2-to-4-minute mini-card that trains one skill.
  // It gets the fields the desk needs (mail, case file) next to its own.
  function quick(raw) {
    const f = raw.from || {};
    return {
      id: raw.id, quick: true, kind: raw.kind, sector: raw.sector,
      difficulty: raw.tier == null ? 1 : raw.tier,
      stakeholder: { name: f.name, role: f.role || '', org: f.org || '' },
      subject: raw.subject, surfaceAsk: raw.mail,
      briefing: { headline: 'What you already know', points: list(raw.snippets) },
      hiddenFacts: list(raw.hidden_facts).map(h => ({ id: h.id, fact: h.fact, unlockedBy: h.unlocks_when, revealLine: h.reveal_line, foundAt: ['call'] })),
      debrief: raw.debrief || '',
      bestQuestion: raw.best_question || '', weakPatterns: list(raw.weak_patterns),
      answer: raw.answer || '', why: raw.why || '',
      diagnosis: raw.diagnosis || '', gold: raw.gold || {}, traps: list(raw.traps), dataAvailable: list(raw.data_available),
      draftTitle: raw.draft_title || '', draft: list(raw.draft), flawIndex: raw.flaw_index == null ? -1 : raw.flaw_index,
      flawWhy: raw.flaw_why || '', fix: raw.fix || ''
    };
  }

  window.Cards = { normalise, quick };
})();
