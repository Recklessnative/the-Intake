// CoE Academy: the learning team's own e-learning. One module is assigned each week (not in
// hard mode): four quick questions with instant feedback, then what to look out for in this
// week's cases. Scored in code, no Gemini, and it never counts toward the week's score.
// Static, trusted content written for the game.
(function () {
  const MODULES = [
    {
      id: 'ask-first', art: 'ask', title: 'Ask before you make', minutes: 5,
      intro: 'Every request arrives with a solution attached. Your first job is to find the problem it is supposed to solve.',
      questions: [
        { q: 'A sales director asks for "a negotiation training for the whole team". What do you ask first?',
          options: [
            { t: 'Which negotiation model do you prefer?', why: 'That designs the solution before you know the problem.' },
            { t: 'What are they doing now that they should do differently?', ok: true, why: 'Start with the performance gap: who does what now, and what should they do instead.' },
            { t: 'How many days can they be off the road?', why: 'Useful later. Right now it locks you into a classroom.' }
          ] },
        { q: 'Which question is most likely to surface something the requester did not mention?',
          options: [
            { t: '"What changed around the time the numbers dipped?"', ok: true, why: 'A dip has a date. Something happened then: a new tool, a new manager, a new target.' },
            { t: '"Do you think they need more knowledge?"', why: 'Leading, and it invites a yes.' },
            { t: '"Is this urgent?"', why: 'It always is.' }
          ] },
        { q: 'The requester says "everyone" struggles. What do you do with that?',
          options: [
            { t: 'Plan for everyone. They know their team.', why: '"Everyone" is rarely everyone. You would train the ones who are fine too.' },
            { t: 'Ask who does it well, and what they do differently.', ok: true, why: 'Your bright spots show what good looks like and whether the others could do it already.' },
            { t: 'Send a survey to everyone first.', why: 'Slow, and people rate themselves generously. Ask a sharper question first.' }
          ] },
        { q: 'You have one question left on the call. Which one do you spend it on?',
          options: [
            { t: '"Who else should I talk to?"', ok: true, why: 'The person on the floor or the person with the data often knows what the requester does not.' },
            { t: '"What is your budget?"', why: 'You can get that by mail. A lead you cannot.' },
            { t: '"Shall I send you a proposal?"', why: 'They will say yes. You will know nothing more.' }
          ] }
      ],
      objectives: ["Tell a request from a need", "Ask questions that surface what the requester did not say", "Spend your last question well"],
      tips: ['Ask what changed, and since when. Dips have dates.', 'Find who does it well before you design for who does not.', 'Spend a question on who else to talk to. Then go and talk to them.']
    },
    {
      id: 'is-it-training', art: 'triage', title: 'Is training the answer?', minutes: 5,
      intro: 'Training fixes skill and knowledge. It does not fix a broken tool, a bad incentive or a missing process. Asking for it anyway is the most common request we get.',
      questions: [
        { q: 'Drivers keep missing bins since the routes moved into the new route software on their handhelds. They have driven for ten years. Train?',
          options: [
            { t: 'Train: a route refresher.', why: 'Ten years of driving says they can do it. Look at the software.' },
            { t: 'Don\'t train: check the route software first.', ok: true, why: 'They follow the handheld. If the route is wrong, so are they.' },
            { t: 'Need more info.', why: 'Fair, but the new software is a strong enough clue to point at it.' }
          ] },
        { q: 'Could they do it if their job depended on it? If the answer is yes, the problem is probably…',
          options: [
            { t: '…motivation, so a motivational training.', why: 'Motivation is mostly what the job rewards. Training rarely moves it.' },
            { t: '…not skill: look at process, tools, incentives and expectations.', ok: true, why: 'If they can do it under pressure, they know how. Something else stops them.' },
            { t: '…a refresher, because people forget.', why: 'They did not forget. They would do it if it mattered.' }
          ] },
        { q: 'New cashiers enter the wrong product codes. The codes changed last month and nobody told them. Train?',
          options: [
            { t: 'Train: a codes e-learning.', why: 'A job aid by the till fixes it this afternoon.' },
            { t: 'Don\'t train: a job aid and a change notice.', ok: true, why: 'It is information, not skill. Put it where they need it.' },
            { t: 'Need more info.', why: 'You already know the cause.' }
          ] },
        { q: 'Saying "this is not a training problem" to a director. How?',
          options: [
            { t: 'Politely, with the evidence, and what would fix it instead.', ok: true, why: 'You are still helping them. You are just helping with the real problem.' },
            { t: 'Build the training anyway and mention it in the evaluation.', why: 'You will spend their budget and your credibility.' },
            { t: 'Escalate to HR.', why: 'There is nothing to escalate. Just say it, with evidence.' }
          ] }
      ],
      objectives: ["Test whether training can fix the problem at all", "Spot tool, process and incentive causes", "Say \"not a training problem\" without losing the client"],
      tips: ['Ask: could they do it if their job depended on it?', 'Look for what changed in the tools and processes, not only in the people.', 'If it is not a training problem, say so with evidence and offer the real fix.']
    },
    {
      id: 'measure', art: 'measure', title: 'How will you know?', minutes: 6,
      intro: 'Happy sheets measure happiness. Before you design anything, decide what will be different and how you will see it.',
      questions: [
        { q: 'Which is a baseline?',
          options: [
            { t: '"Satisfaction score of the last training: 4.2/5"', why: 'That measures the last training, not the work.' },
            { t: '"Today 31% of calls are resolved first time."', ok: true, why: 'Where the work is now, in a number the business already tracks.' },
            { t: '"Staff feel unsure about the new system."', why: 'A feeling, not a number you can compare against later.' }
          ] },
        { q: 'Which is a behaviour?',
          options: [
            { t: 'Agents complete the module.', why: 'Completing a module is not doing the job differently.' },
            { t: 'Agents check the customer file before transferring a call.', ok: true, why: 'Specific, visible and on the job.' },
            { t: 'Agents understand the escalation policy.', why: 'Understanding is invisible. What would you see them do?' }
          ] },
        { q: 'You want to measure the behaviour. The data you have: ticket logs and a monthly QA sample. What do you use?',
          options: [
            { t: 'A new self-assessment survey.', why: 'Extra work for them, and people rate themselves kindly.' },
            { t: 'Add one check to the QA sample they already do.', ok: true, why: 'Use data they already collect. Plans that need new data rarely survive.' },
            { t: 'Ask managers how it is going after a month.', why: 'Useful colour, but not a measure.' }
          ] },
        { q: 'The business metric went up after your programme. What do you say?',
          options: [
            { t: '"The training worked."', why: 'Maybe. A price cut or a new manager could have done it too.' },
            { t: '"It went up, and behaviour changed in the teams we trained more than in the ones we didn\'t."', ok: true, why: 'Link the behaviour to the metric, and compare with a group that did not get it.' },
            { t: '"Participants rated it 4.6/5."', why: 'Nice for the trainer. Not the question.' }
          ] }
      ],
      objectives: ["Write a baseline the business already tracks", "Name a behaviour you can see", "Link behaviour to a business metric"],
      tips: ['Write the baseline as a number the business already tracks.', 'Name one behaviour you could see someone do on the job.', 'Measure with data they already have, or the plan will not survive.']
    },
    {
      id: 'read-the-room', art: 'people', title: 'Who can say no', minutes: 5,
      intro: 'Good concepts die in meetings you were not invited to. Know who can block it before they do.',
      questions: [
        { q: 'Your concept records customer calls to coach agents. Who must you involve before it starts?',
          options: [
            { t: 'The data protection officer and the works council.', ok: true, why: 'Recording and reviewing staff is personal data and a working condition. Both can stop it.' },
            { t: 'Marketing, for the launch.', why: 'Later, maybe. They cannot block it.' },
            { t: 'Nobody: coaching is a manager\'s right.', why: 'Coaching is. Recording people is not automatically.' }
          ] },
        { q: 'The plan takes two hours per nurse in a ward that is short-staffed. What is the risk?',
          options: [
            { t: 'The nurses will not like it.', why: 'They might, but that is not the risk.' },
            { t: 'The ward manager cannot free the hours, so nobody attends.', ok: true, why: 'Whoever loses productive hours decides whether it happens. Plan the cover with them.' },
            { t: 'The e-learning platform is slow.', why: 'Annoying, not blocking.' }
          ] },
        { q: 'The requester is enthusiastic. Their manager has not heard about it. What do you do?',
          options: [
            { t: 'Start: the requester asked for it.', why: 'The manager owns the budget and the hours. Find out now, not at the launch.' },
            { t: 'Ask who signs off on budget and time, and get them in the loop early.', ok: true, why: 'A sponsor who knows is a sponsor who defends it.' },
            { t: 'Go over the requester\'s head.', why: 'You just lost your requester.' }
          ] },
        { q: 'Which risk statement is useful?',
          options: [
            { t: '"There may be some resistance."', why: 'From whom, about what, and what will you do?' },
            { t: '"Team leads may not free the time: we agree cover with operations in week 1."', ok: true, why: 'Who, what, and the mitigation.' },
            { t: '"Risks: none."', why: 'The board will find some for you.' }
          ] }
      ],
      objectives: ["Name who can block your concept", "Know when the privacy officer and works council come in", "Write a risk with a mitigation"],
      tips: ['Name who loses hours, and who signs off on budget.', 'If people or data are recorded, involve the privacy officer and the works council early.', 'Write each risk as who, what, and what you will do about it.']
    },
    {
      id: 'spot-the-flaw', art: 'flaw', title: 'Read the proposal like a reviewer', minutes: 5,
      intro: 'Before a one-pager leaves your desk, read it like the CFO will. These are lines from real (anonymised) drafts.',
      questions: [
        { q: 'Which line would a reviewer strike?',
          options: [
            { t: '"Baseline: 12% of orders are returned for wrong size."', why: 'That one is fine: a number, now.' },
            { t: '"We will adapt the content to each employee\'s learning style."', ok: true, why: 'Learning styles have no evidence behind them. Adapt to the task and prior knowledge instead.' },
            { t: '"Pilot with one store, then decide."', why: 'Sensible.' }
          ] },
        { q: 'Which line promises something nobody can check?',
          options: [
            { t: '"Participants will be more confident."', ok: true, why: 'How would you see it? Name what they will do.' },
            { t: '"Complaints drop from 40 to under 25 a month by June."', why: 'Checkable: a number and a date.' },
            { t: '"Team leads review two calls per agent per week."', why: 'Checkable: you can count reviews.' }
          ] },
        { q: 'The draft says "a 3-day classroom for all 300 staff". The cause you found: a missing checklist. What is wrong?',
          options: [
            { t: 'Three days is too short.', why: 'It is too much, not too little.' },
            { t: 'The concept does not fix the cause you found.', ok: true, why: 'A checklist gap needs a checklist. The concept has to follow the cause.' },
            { t: 'It should be an e-learning.', why: 'Changing the format does not fix the mismatch.' }
          ] },
        { q: 'Which ask gets a yes from a board?',
          options: [
            { t: '"We need your support for our learning journey."', why: 'Support for what, costing what?' },
            { t: '"EUR 20k and 6 weeks for a pilot in one region; the COO sponsors it; we stop the old induction day to pay for part of it."', ok: true, why: 'Budget, time, sponsor, and what stops. A board can say yes to that.' },
            { t: '"A blended programme with an interactive CD-ROM."', why: 'That is a format, not an ask.' }
          ] }
      ],
      objectives: ["Strike myths and unmeasurable promises", "Check that the concept fixes the cause", "Write an ask a board can approve"],
      tips: ['Strike every line that mentions learning styles.', 'Replace "more confident" with what they will do.', 'Check that the concept fixes the cause you found, not the one they asked about.']
    },
    {
      id: 'the-board', art: 'board', title: 'One slide for the board', minutes: 5,
      intro: 'On Friday you pitch one concept to the board. They have twelve minutes and three concerns: money, people and operations.',
      questions: [
        { q: 'What does the CFO want to see on your slide?',
          options: [
            { t: 'The cost, the return, and what you stop doing to pay for it.', ok: true, why: 'New money is hard. Reallocated money is easy.' },
            { t: 'The learning objectives.', why: 'Useful for you. Not their question.' },
            { t: 'A testimonial from a participant.', why: 'Nice. Not a number.' }
          ] },
        { q: 'The COO asks "who covers the shifts?" You do not know yet. What do you say?',
          options: [
            { t: '"We will figure that out."', why: 'That is how pilots die.' },
            { t: '"We start with one team that has cover, and agree the rest with your planners before we scale."', ok: true, why: 'Answer with a de-risking step, even if you do not have the full answer.' },
            { t: '"That is for HR."', why: 'They asked you.' }
          ] },
        { q: 'Which evidence of need is strongest on a slide?',
          options: [
            { t: '"Managers tell us people struggle."', why: 'Hearsay.' },
            { t: '"6 of 9 new hires left in month one; exit interviews name the first week."', ok: true, why: 'Numbers and a source.' },
            { t: '"Industry research shows training matters."', why: 'They know. Why this, here, now?' }
          ] },
        { q: 'The board says "approved as a pilot". Good news?',
          options: [
            { t: 'No: they did not believe you.', why: 'They believed you enough to fund a test.' },
            { t: 'Yes: now measure against your baseline so the pilot earns the rest.', ok: true, why: 'A pilot is a yes with a deadline. Your measurement plan just became your next pitch.' },
            { t: 'Ask for the full budget again.', why: 'You just got a yes.' }
          ] }
      ],
      objectives: ["Answer the CFO, the CHRO and the COO before they ask", "Answer live questions with a de-risking step", "Turn a pilot into the next pitch"],
      tips: ['Put a number in every box of your slide.', 'Name what you stop doing to pay for it.', 'When you do not know, answer with how you will de-risk it.']
    }
  ];

  const moduleFor = weekNo => MODULES[(Math.max(1, weekNo) - 1) % MODULES.length];

  // Hero pictures in the style of a 2006 course player: a swoosh, a glossy orb, a clip-art symbol.
  const SYMBOL = {
    ask: '<path d="M88 66c0-14 12-24 26-24s26 9 26 23c0 18-22 19-22 36" class="ac-ink" fill="none" stroke-width="12" stroke-linecap="round"/><circle cx="118" cy="122" r="7" class="ac-inkf"/>',
    triage: '<path d="M80 92l20 20 36-44" class="ac-ink" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
    measure: '<rect x="78" y="100" width="16" height="26" rx="2" class="ac-inkf"/><rect x="102" y="82" width="16" height="44" rx="2" class="ac-inkf"/><rect x="126" y="62" width="16" height="64" rx="2" class="ac-inkf"/>',
    people: '<circle cx="92" cy="74" r="12" class="ac-inkf"/><path d="M70 122c0-18 10-28 22-28s22 10 22 28z" class="ac-inkf"/><circle cx="130" cy="70" r="14" class="ac-inkf"/><path d="M104 124c0-22 12-32 26-32s26 10 26 32z" class="ac-inkf"/>',
    flaw: '<circle cx="104" cy="84" r="24" class="ac-ink" fill="none" stroke-width="10"/><path d="M122 102l22 22" class="ac-ink" stroke-width="12" stroke-linecap="round"/>',
    board: '<rect x="72" y="58" width="76" height="50" rx="3" class="ac-inkf"/><rect x="78" y="64" width="64" height="38" fill="#fff"/><path d="M84 94l14-12 10 8 18-18" class="ac-ink" fill="none" stroke-width="5" stroke-linejoin="round"/><path d="M110 108v18M96 128h28" class="ac-ink" stroke-width="5" stroke-linecap="round"/>'
  };
  function hero(kind, small) {
    const id = 'g' + kind + (small ? 's' : '');
    return `<svg class="ac-hero${small ? ' small' : ''}" viewBox="0 0 220 170" aria-hidden="true">
      <defs>
        <radialGradient id="${id}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#8fd3ff"/><stop offset="1" stop-color="#1767c9"/></radialGradient>
        <linearGradient id="${id}w" x1="0" x2="1"><stop offset="0" stop-color="#9be15d" stop-opacity=".9"/><stop offset="1" stop-color="#00b4db" stop-opacity=".2"/></linearGradient>
      </defs>
      <path d="M0 140 C60 96 140 176 220 112 L220 170 L0 170Z" fill="url(#${id}w)"/>
      <path d="M0 120 C70 90 150 150 220 96" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none"/>
      <ellipse cx="110" cy="158" rx="58" ry="7" fill="#000" opacity=".15"/>
      <circle cx="110" cy="92" r="62" fill="url(#${id})" stroke="#0d4fa3" stroke-width="2"/>
      <ellipse cx="96" cy="58" rx="38" ry="20" fill="#fff" opacity=".55"/>
      ${SYMBOL[kind] || SYMBOL.ask}
    </svg>`;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, onclick, cls) {
    const b = el('button', cls || 'ac-btn', text);
    b.type = 'button';
    b.onclick = onclick;
    return b;
  }

  // The course player. p is the saved progress {started, at, picks[], done}: at is the slide
  // (0..n-1 a question, n the tips). onChange saves; onDone(right, of) once, onDone(null) to close.
  function render(box, m, p, onChange, onDone) {
    const redraw = () => render(box, m, p, onChange, onDone);
    const n = m.questions.length;
    const no = MODULES.indexOf(m) + 1;
    const right = p.picks.filter((x, i) => x != null && m.questions[i].options[x].ok).length;
    const slide = !p.started ? -1 : Math.min(p.at, n);           // -1 = the welcome slide
    const go = to => { p.at = to; onChange(); redraw(); };
    box.innerHTML = '';

    // Title bar
    const top = el('div', 'ac-top');
    const logo = el('span', 'ac-logo');
    logo.innerHTML = '<b>CoE</b>Academy<sup>®</sup>';
    top.append(logo, el('span', 'ac-course', m.title), el('span', 'ac-mod', 'Module ' + no + ' of ' + MODULES.length));
    box.appendChild(top);

    const main = el('div', 'ac-main');
    // Outline
    const nav = el('nav', 'ac-menu');
    nav.setAttribute('aria-label', 'Course outline');
    nav.appendChild(el('div', 'ac-menu-head', 'Outline'));
    const items = [['Welcome', -1]].concat(m.questions.map((q, i) => ['Question ' + (i + 1), i]), [['What to look out for', n]]);
    items.forEach(([label, at]) => {
      const done = at === -1 ? p.started : at < n ? p.picks[at] != null : p.done;
      const reachable = at === -1 || (p.started && (at === 0 || (at < n ? p.picks[at - 1] != null : p.done)));
      const b = el('button', 'ac-menu-item' + (at === slide ? ' now' : '') + (done ? ' done' : ''), (done ? '✔ ' : '') + label);
      b.type = 'button';
      b.disabled = !reachable || at === slide;
      b.onclick = () => { if (at === -1) { p.started = false; onChange(); redraw(); } else { p.started = true; go(at); } };
      nav.appendChild(b);
    });
    nav.appendChild(el('div', 'ac-menu-foot', 'Narration: off. You are welcome.'));
    main.appendChild(nav);

    // The slide
    const stage = el('div', 'ac-stage');
    if (slide === -1) {
      const wel = el('div', 'ac-welcome');
      const art = el('div', 'ac-art');
      art.innerHTML = hero(m.art);
      const txt = el('div', 'ac-wtext');
      txt.append(el('p', 'ac-kicker', 'Welcome to'), el('h2', 'ac-title', m.title), el('p', 'ac-intro', m.intro));
      wel.append(art, txt);
      stage.appendChild(wel);
      const obj = el('div', 'ac-box');
      obj.appendChild(el('h3', null, 'In this module you will learn to'));
      const ul = el('ul', 'ac-obj');
      m.objectives.forEach(t => ul.appendChild(el('li', null, t)));
      obj.appendChild(ul);
      stage.appendChild(obj);
      const facts = el('div', 'ac-facts');
      [['⏱', m.minutes + ' minutes'], ['❓', n + ' questions'], ['🚫', 'No avatars'], ['📌', 'Tips for your cases']].forEach(([i, t]) => { const f = el('span', 'ac-fact'); f.append(el('b', null, i), ' ' + t); facts.appendChild(f); });
      stage.appendChild(facts);
    } else if (slide < n) {
      const q = m.questions[slide], picked = p.picks[slide];
      const head = el('div', 'ac-qhead');
      const mini = el('div', 'ac-art small');
      mini.innerHTML = hero(m.art, true);
      head.append(mini, el('div', 'ac-qno', 'Question ' + (slide + 1) + ' of ' + n));
      stage.appendChild(head);
      stage.appendChild(el('p', 'ac-q', q.q));
      const ol = el('div', 'ac-options');
      q.options.forEach((o, k) => {
        const b = el('button', 'ac-opt' + (picked != null ? (o.ok ? ' right' : k === picked ? ' wrong' : '') : ''));
        b.type = 'button';
        b.disabled = picked != null;
        b.setAttribute('aria-pressed', picked === k);
        b.append(el('span', 'ac-letter', 'ABCD'[k]), el('span', 'ac-opt-t', o.t));
        if (picked != null && (o.ok || k === picked)) b.appendChild(el('span', 'ac-why', o.why));
        b.onclick = () => { p.picks[slide] = k; onChange(); redraw(); };
        ol.appendChild(b);
      });
      stage.appendChild(ol);
      if (picked != null) stage.appendChild(el('p', 'ac-verdict ' + (q.options[picked].ok ? 'right' : 'wrong'), q.options[picked].ok ? '✔ Correct!' : '✘ Not quite.'));
      else stage.appendChild(el('p', 'ac-hint', 'Click an answer. You get the reasoning straight away.'));
    } else {
      const end = el('div', 'ac-welcome');
      const art = el('div', 'ac-art');
      art.innerHTML = hero(m.art);
      const txt = el('div', 'ac-wtext');
      txt.append(el('p', 'ac-kicker', 'Module complete'), el('p', 'ac-score', right + ' of ' + n + ' right'), el('p', 'ac-intro', right === n ? 'Full marks. Mieke will pretend not to be impressed.' : 'Good enough to start. The cases will teach you the rest.'));
      end.append(art, txt);
      stage.appendChild(end);
      const tips = el('div', 'ac-box tips');
      tips.appendChild(el('h3', null, '📌 Look out for this in your cases'));
      const ul = el('ul', 'ac-tips');
      m.tips.forEach(t => ul.appendChild(el('li', null, t)));
      tips.appendChild(ul);
      tips.appendChild(el('p', 'fine', 'Keep them in your head, not on a sticky note: the case file will not remind you.'));
      stage.appendChild(tips);
    }
    main.appendChild(stage);
    box.appendChild(main);

    // Player controls
    const bar = el('div', 'ac-bar');
    const pct = slide === -1 ? 0 : Math.round(100 * (slide + (slide < n && p.picks[slide] == null ? 0 : 1)) / (n + 1));
    const prog = el('div', 'ac-prog');
    prog.setAttribute('role', 'progressbar');
    prog.setAttribute('aria-valuenow', pct);
    prog.setAttribute('aria-label', 'Course progress');
    const fill = el('span');
    fill.style.width = pct + '%';
    prog.appendChild(fill);
    const prev = btn('◀ Prev', () => { if (slide === 0) { p.started = false; onChange(); redraw(); } else go(slide - 1); });
    prev.disabled = slide === -1;
    let next;
    if (slide === -1) next = btn('Start ▶', () => { p.started = true; go(0); });
    else if (slide < n) {
      next = btn(slide + 1 < n ? 'Next ▶' : 'Finish ▶', () => {
        if (slide + 1 >= n && !p.done) { p.done = true; p.at = n; onDone(right, n); onChange(); redraw(); return; }
        go(slide + 1);
      });
      next.id = 'ac-next';
      next.disabled = p.picks[slide] == null;
    } else { next = btn('Back to work ▶', () => onDone(null)); next.id = 'ac-close'; }
    next.classList.add('go');
    bar.append(prev, prog, el('span', 'ac-pct', pct + '%'), next);
    box.appendChild(bar);
  }

  window.Academy = { MODULES, moduleFor, render };
})();
