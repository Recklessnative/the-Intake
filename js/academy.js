// CoE Academy: the learning team's own e-learning. One module is assigned each week (not in
// hard mode): four quick questions with instant feedback, then what to look out for in this
// week's cases. Scored in code, no Gemini, and it never counts toward the week's score.
// Static, trusted content written for the game.
(function () {
  const MODULES = [
    {
      id: 'ask-first', title: 'Ask before you make', minutes: 5,
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
      tips: ['Ask what changed, and since when. Dips have dates.', 'Find who does it well before you design for who does not.', 'Spend a question on who else to talk to. Then go and talk to them.']
    },
    {
      id: 'is-it-training', title: 'Is training the answer?', minutes: 5,
      intro: 'Training fixes skill and knowledge. It does not fix a broken tool, a bad incentive or a missing process. Asking for it anyway is the most common request we get.',
      questions: [
        { q: 'Drivers keep missing bins since the routes moved into a new app. They have driven for ten years. Train?',
          options: [
            { t: 'Train: a route refresher.', why: 'Ten years of driving says they can do it. Look at the app.' },
            { t: 'Don\'t train: check the app first.', ok: true, why: 'They follow the app. If the app is wrong, so are they.' },
            { t: 'Need more info.', why: 'Fair, but the new app is a strong enough clue to point at it.' }
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
      tips: ['Ask: could they do it if their job depended on it?', 'Look for what changed in the tools and processes, not only in the people.', 'If it is not a training problem, say so with evidence and offer the real fix.']
    },
    {
      id: 'measure', title: 'How will you know?', minutes: 6,
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
      tips: ['Write the baseline as a number the business already tracks.', 'Name one behaviour you could see someone do on the job.', 'Measure with data they already have, or the plan will not survive.']
    },
    {
      id: 'read-the-room', title: 'Who can say no', minutes: 5,
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
      tips: ['Name who loses hours, and who signs off on budget.', 'If people or data are recorded, involve the DPO and the works council early.', 'Write each risk as who, what, and what you will do about it.']
    },
    {
      id: 'spot-the-flaw', title: 'Read the proposal like a reviewer', minutes: 5,
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
            { t: '"A blended programme with gamification."', why: 'That is a format, not an ask.' }
          ] }
      ],
      tips: ['Strike every line that mentions learning styles.', 'Replace "more confident" with what they will do.', 'Check that the concept fixes the cause you found, not the one they asked about.']
    },
    {
      id: 'the-board', title: 'One slide for the board', minutes: 5,
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
      tips: ['Put a number in every box of your slide.', 'Name what you stop doing to pay for it.', 'When you do not know, answer with how you will de-risk it.']
    }
  ];

  const moduleFor = weekNo => MODULES[(Math.max(1, weekNo) - 1) % MODULES.length];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, onclick, cls) {
    const b = el('button', cls || 'primary', text);
    b.type = 'button';
    b.onclick = onclick;
    return b;
  }

  // Draws module m into box. p is the saved progress {started, at, picks[], done}; onChange saves.
  function render(box, m, p, onChange, onDone) {
    const redraw = () => render(box, m, p, onChange, onDone);
    box.innerHTML = '';
    const head = el('div', 'ac-head');
    head.append(el('span', 'ac-brand', 'CoE Academy'), el('span', 'ac-meta', m.minutes + ' min · ' + m.questions.length + ' questions · no avatars'));
    box.appendChild(head);
    box.appendChild(el('h2', 'ac-title', m.title));
    const right = p.picks.filter((x, i) => x != null && m.questions[i].options[x].ok).length;
    if (!p.started) {
      box.appendChild(el('p', 'ac-intro', m.intro));
      box.appendChild(el('p', 'fine', 'Made by the Center of Excellence. You will not be asked to click a picture to reveal text.'));
      box.appendChild(btn('Start', () => { p.started = true; onChange(); redraw(); }));
      return;
    }
    if (p.at < m.questions.length) {
      const i = p.at, q = m.questions[i], picked = p.picks[i];
      const bar = el('div', 'ac-progress');
      m.questions.forEach((x, n) => bar.appendChild(el('span', n < i ? 'done' : n === i ? 'now' : '')));
      bar.setAttribute('aria-label', 'Question ' + (i + 1) + ' of ' + m.questions.length);
      box.appendChild(bar);
      box.appendChild(el('p', 'ac-q', q.q));
      const ol = el('div', 'ac-options');
      q.options.forEach((o, n) => {
        const b = el('button', 'ac-opt' + (picked != null ? (o.ok ? ' right' : n === picked ? ' wrong' : '') : ''));
        b.type = 'button';
        b.disabled = picked != null;
        b.setAttribute('aria-pressed', picked === n);
        b.appendChild(el('span', 'ac-opt-t', o.t));
        if (picked != null && (o.ok || n === picked)) b.appendChild(el('span', 'ac-why', o.why));
        b.onclick = () => { p.picks[i] = n; onChange(); redraw(); };
        ol.appendChild(b);
      });
      box.appendChild(ol);
      if (picked != null) {
        box.appendChild(el('p', 'ac-verdict ' + (q.options[picked].ok ? 'right' : 'wrong'), q.options[picked].ok ? 'Right.' : 'Not quite.'));
        const next = btn(i + 1 < m.questions.length ? 'Next question' : 'See what to look out for', () => {
          p.at++;
          if (p.at >= m.questions.length && !p.done) { p.done = true; onDone(right, m.questions.length); }
          onChange();
          redraw();
        });
        next.id = 'ac-next';
        box.appendChild(next);
      }
      return;
    }
    box.appendChild(el('p', 'ac-score', right + ' of ' + m.questions.length + ' right'));
    box.appendChild(el('h3', null, 'Look out for this in your cases'));
    const ul = el('ul', 'ac-tips');
    m.tips.forEach(t => ul.appendChild(el('li', null, t)));
    box.appendChild(ul);
    box.appendChild(el('p', 'fine', 'These tips are pinned to the top of every case file this week.'));
    const back = btn('Back to work', () => onDone(null));
    back.id = 'ac-close';
    box.appendChild(back);
  }

  window.Academy = { MODULES, moduleFor, render };
})();
