// The Learning House (committee round 6, plan step 3; STORY.md, "The town and the money"): a
// converted textile mill on the canal, the fifth place on the Lindeveld map. Three things there:
//  - A phone call when you arrive: Mieke, the first evening of every visit.
//  - The Case Clinic, one handout a visit: a model from before 2007, a case you (probably) played,
//    and four moves. Sort the case's facts into the model, read the gap against what the client
//    asked for, change one line of the concept, then a near miss where the model changes nothing.
//    It is never scored and never counts towards a week.
//  - The grey reader in the corner, which prints index cards for books that are not out yet
//    (Gottfredson and Mosher, 2011; Weinbauer-Heidel, 2016). Year smudged in act 1, legible and
//    noteable in act 2, the operator's terminal leaking after the reveal.
// Every handout and card is filed in the Center of Excellence folder. A handout earns a stamp on a
// live call when a fact turns up that its question would have found (`LENS`, the field stamp).
// Static, trusted content written for the game.
(function () {
  const KEY = 'intake-clinic';
  const read = () => { try { return Object.assign({ handouts: [], printed: [], stamps: {}, visits: 0 }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { handouts: [], printed: [], stamps: {}, visits: 0 }; } };
  const keep = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } };

  // ---------- the diagrams ----------
  const MARK = '<defs><marker id="lh-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#1a3e8c"/></marker></defs>';
  const box = (x, y, w, h, title, sub, cls) => `<rect class="${cls || 'box'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>` +
    `<text class="h" x="${x + w / 2}" y="${y + 20}" text-anchor="middle">${title}</text>` +
    (sub || []).map((t, i) => `<text x="${x + w / 2}" y="${y + 38 + i * 15}" text-anchor="middle">${t}</text>`).join('');
  const line = (d) => `<path class="arr" d="${d}" marker-end="url(#lh-ah)"/>`;
  const svg = (vb, label, inner) => `<svg class="flow" viewBox="${vb}" role="img" aria-label="${label}">${MARK}${inner}</svg>`;

  const DIAGRAM = {
    inputs: svg('0 0 560 350', 'Baldwin and Ford: trainee, design and work environment feed learning, and transfer', [
      box(10, 10, 170, 74, 'The trainee', ['ability, personality,', 'motivation']),
      box(10, 128, 170, 74, 'The training design', ['how it is taught,', 'in what order, what']),
      box(10, 246, 170, 74, 'The work environment', ['support, and a chance', 'to use it'], 'ask'),
      box(220, 128, 140, 74, 'Learning', ['what they can do', 'at the end']),
      box(400, 128, 150, 74, 'Transfer', ['they use it at work,', 'and keep using it'], 'stop'),
      line('M180 60 L 236 128'), line('M180 165 H 214'), line('M360 165 H 394'),
      line('M180 40 C 330 20 430 40 470 122'), line('M180 290 C 330 300 440 280 474 208'),
      '<text x="375" y="342" text-anchor="middle">The work feeds transfer directly, not through the course.</text>'
    ].join('')),
    bem: svg('0 0 560 360', 'Gilbert: information, resources and incentives in the work; knowledge, capacity and motives in the person. Mager and Pipe: could they do it if their job depended on it?', [
      '<polygon class="ask" points="280,8 470,52 280,96 90,52"/>',
      '<text class="h" x="280" y="48" text-anchor="middle">Could they do it if their</text><text class="h" x="280" y="64" text-anchor="middle">job depended on it?</text>',
      '<text x="472" y="90">Yes: look at the work</text><text x="20" y="90">No: look at the person</text>',
      '<text class="h" x="10" y="140">The work</text>',
      box(90, 112, 150, 70, 'Information', ['what is expected,', 'feedback, where to find it'], 'ask'),
      box(250, 112, 150, 70, 'Tools and time', ['the system, the stuff,', 'the hours to do it'], 'ask'),
      box(410, 112, 140, 70, 'Incentives', ['what it pays,', 'what it costs you'], 'ask'),
      '<text class="h" x="10" y="232">The person</text>',
      box(90, 204, 150, 70, 'Knowledge and skill', ['the only cell a', 'course can fill']),
      box(250, 204, 150, 70, 'Capacity', ['the right person', 'for the job'], 'grey'),
      box(410, 204, 140, 70, 'Motives', ['why they would', 'want to'], 'grey'),
      '<text x="280" y="304" text-anchor="middle">Gilbert: start with the top row. It is cheaper to fix,</text>',
      '<text x="280" y="320" text-anchor="middle">and it is where most of the trouble starts.</text>',
      '<text x="280" y="344" text-anchor="middle">Grey cells: rarely the cause. Check them last.</text>'
    ].join('')),
    support: svg('0 0 560 300', 'Gery, Rossett and Gautier-Downes: in their head, at their elbow, or in the tool', [
      box(10, 10, 170, 92, 'In their head', ['learn it beforehand', 'and practise it'], 'box'),
      box(195, 10, 170, 92, 'At their elbow', ['a job aid, a card,', 'a checklist, a page'], 'ask'),
      box(380, 10, 170, 92, 'In the tool', ['the system does it,', 'or shows it when needed'], 'stop'),
      '<text class="h" x="95" y="132" text-anchor="middle">When</text><text class="h" x="280" y="132" text-anchor="middle">When</text><text class="h" x="465" y="132" text-anchor="middle">When</text>',
      '<text x="95" y="152" text-anchor="middle">it must be fast,</text><text x="95" y="168" text-anchor="middle">from memory, or in</text><text x="95" y="184" text-anchor="middle">front of a customer</text>',
      '<text x="280" y="152" text-anchor="middle">it is rare, long,</text><text x="280" y="168" text-anchor="middle">has steps in order,</text><text x="280" y="184" text-anchor="middle">or changes often</text>',
      '<text x="465" y="152" text-anchor="middle">the tool could just</text><text x="465" y="168" text-anchor="middle">do it, flag it or</text><text x="465" y="184" text-anchor="middle">fill it in for them</text>',
      line('M380 230 H 190'),
      '<text x="285" y="250" text-anchor="middle">Start on the right. Put in their head only</text>',
      '<text x="285" y="266" text-anchor="middle">what cannot live anywhere else.</text>'
    ].join('')),
    matrix: svg('0 0 560 300', 'Broad and Newstrom: manager, trainer and learner, before, during and after training', [
      '<text class="h" x="200" y="24" text-anchor="middle">Before</text><text class="h" x="340" y="24" text-anchor="middle">During</text><text class="h" x="480" y="24" text-anchor="middle">After</text>',
      ...['Manager', 'Trainer', 'Learner'].map((r, i) => `<text class="h" x="10" y="${80 + i * 80}">${r}</text>`),
      ...[0, 1, 2].flatMap(i => [0, 1, 2].map(j => {
        const strong = i === 0 && j !== 1;
        return `<rect class="${strong ? 'ask' : 'box'}" x="${135 + j * 140}" y="${40 + i * 80}" width="130" height="70" rx="6"/>` +
          (strong ? `<text x="${200 + j * 140}" y="${80 + i * 80}" text-anchor="middle">${j === 0 ? 'agrees what for' : 'asks, sees, coaches'}</text>` : '');
      })),
      '<text x="200" y="157" text-anchor="middle">plans it with</text><text x="200" y="172" text-anchor="middle">the work</text>',
      '<text x="340" y="157" text-anchor="middle">practice on</text><text x="340" y="172" text-anchor="middle">the real task</text>',
      '<text x="340" y="237" text-anchor="middle">where most</text><text x="340" y="252" text-anchor="middle">budgets go</text>',
      '<text x="280" y="290" text-anchor="middle">Yellow: the manager, before and after. Strong, and the least used.</text>'
    ].join('')),
    levers: svg('0 0 420 330', 'Weinbauer-Heidel: twelve levers in three groups', [
      ['The trainee', ['transfer motivation, self-efficacy,', 'transfer volition'], 'box'],
      ['The training design', ['clarity of expectations, content relevance,', 'active practice, transfer planning'], 'ask'],
      ['The organisation', ['opportunity to use, personal transfer capacity,', 'support from supervisors and from peers,', 'transfer expectations'], 'stop']
    ].map(([t, sub, cls], i) => box(10, 10 + i * 92, 400, i === 2 ? 98 : 82, t, sub, cls)).join('') +
      '<text x="210" y="304" text-anchor="middle">Baldwin and Ford\'s three inputs, as twelve levers.</text>' +
      '<text x="210" y="321" text-anchor="middle">Five sit in the organisation, outside the classroom.</text>'),
    moments: svg('0 0 560 270', 'Gottfredson and Mosher: five moments of need, two for learning and three at work', [
      box(10, 30, 120, 74, 'New', ['learning it for', 'the first time']),
      box(140, 30, 120, 74, 'More', ['learning more', 'of it']),
      box(290, 30, 82, 74, 'Apply', ['doing it'], 'ask'),
      box(382, 30, 82, 74, 'Solve', ['it went', 'wrong'], 'ask'),
      box(474, 30, 82, 74, 'Change', ['the way', 'it\'s done'], 'ask'),
      '<text class="h" x="135" y="20" text-anchor="middle">Before the work: courses</text>',
      '<text class="h" x="423" y="20" text-anchor="middle">During the work: support</text>',
      '<text x="280" y="150" text-anchor="middle">Most training budgets go to the first two.</text>',
      '<text x="280" y="168" text-anchor="middle">Most of the trouble happens in the last three.</text>',
      '<text x="280" y="200" text-anchor="middle">Gery\'s performance support, with a name for each moment.</text>'
    ].join(''))
  };

  // ---------- the handouts ----------
  // `slots` for the card sort. The matrix sorts on two rows of chips (who and when).
  const MODELS = [
    { id: 'inputs', no: 1, title: 'Three inputs to transfer', by: 'Baldwin and Ford, 1988', future: 'levers',
      cite: 'Baldwin, T. T. and Ford, J. K. (1988). Transfer of training: a review and directions for future research. Personnel Psychology, 41(1), 63-105. Holton, Bates and Ruona (2000) built a questionnaire on the work environment side: the Learning Transfer System Inventory.',
      gist: 'People learn in a course and use it at work. Three things decide whether they do: who the trainees are, how the training is designed, and the work they go back to. The work environment feeds transfer directly, so a perfect course can still change nothing.',
      question: 'What in their work stops them using what they already know?',
      slots: [['trainee', 'The trainee'], ['design', 'The training design'], ['work', 'The work environment']] },
    { id: 'bem', no: 2, title: 'Could they do it?', by: 'Mager and Pipe, 1970; Gilbert, 1978',
      cite: 'Mager, R. F. and Pipe, P. (1970). Analyzing Performance Problems, or You Really Oughta Wanna. Gilbert, T. F. (1978). Human Competence: Engineering Worthy Performance.',
      gist: 'Mager and Pipe ask one question first: could they do it if their job depended on it? If yes, it is not a skill problem. Gilbert splits performance into six cells: information, tools and incentives in the work; knowledge, capacity and motives in the person. A course can only fill one of the six.',
      question: 'Could they do it if their job depended on it?',
      slots: [['info', 'Information'], ['tools', 'Tools and time'], ['incentive', 'Incentives'], ['knowledge', 'Knowledge and skill']] },
    { id: 'support', no: 3, title: 'Put it in the work', by: 'Gery, 1991; Rossett and Gautier-Downes, 1991', future: 'moments',
      cite: 'Gery, G. (1991). Electronic Performance Support Systems. Rossett, A. and Gautier-Downes, J. (1991). A Handbook of Job Aids.',
      gist: 'Not everything people need belongs in their heads. Some of it can sit at their elbow (a card, a checklist, one page), and some of it in the tool (the system flags it, fills it in or does it). Teach by heart only what has to be fast, from memory, or done in front of someone.',
      question: 'Does this have to be in their head, or could it be at their elbow?',
      slots: [['head', 'In their head'], ['aid', 'At their elbow'], ['tool', 'In the tool']] },
    { id: 'matrix', no: 4, title: 'Who does what, when', by: 'Broad and Newstrom, 1992',
      cite: 'Broad, M. L. and Newstrom, J. W. (1992). Transfer of Training: Action-Packed Strategies to Ensure High Payoff from Training Investments.',
      gist: 'Three people can make training stick: the manager, the trainer and the learner, before, during and after it. Nine cells. Most plans fill one (the trainer, during). Broad and Newstrom found the manager\'s part before and after among the strongest, and the least used.',
      question: 'What will their manager do the week after?',
      who: [['manager', 'Manager'], ['trainer', 'Trainer'], ['learner', 'Learner']], when: [['before', 'Before'], ['during', 'During'], ['after', 'After']] }
  ];
  MODELS.forEach(m => { if (m.who) m.slots = m.who.flatMap(([a, A]) => m.when.map(([b, B]) => [a + '-' + b, A + ', ' + B.toLowerCase()])); });

  // The reader's cards: books that are not out yet.
  const FUTURE = {
    levers: { title: '12 levers of transfer effectiveness', by: 'Ina Weinbauer-Heidel', year: 2016, after: 'inputs',
      cite: 'Weinbauer-Heidel, I. (2016; English edition 2018). What Makes Training Really Work: 12 Levers of Transfer Effectiveness.',
      gist: 'It takes the three inputs from handout 1 and turns them into twelve levers anyone can pull. Three sit with the trainee, four in the design, five in the organisation. Pick the weakest lever on a case before you design anything.' },
    moments: { title: 'Five moments of need', by: 'Conrad Gottfredson and Bob Mosher', year: 2011, after: 'support',
      cite: 'Gottfredson, C. and Mosher, B. (2011). Innovative Performance Support: Strategies and Practices for Learning in the Workflow.',
      gist: 'Two moments are for learning: something new, and more of it. Three happen at work: applying it, solving it when it goes wrong, and coping when something changes. Courses serve the first two. Most requests you get are about the last three.' }
  };

  // ---------- the cases ----------
  // Each model: two cases to sort (the one you played comes first) and one near miss. Cards point at a
  // hidden fact (`f`) or a dependency (`d`) of the card, so tests/check-clinic.cjs can check them.
  // `asked`: the cells the client's own request works on. Edits: one `ok`; the last option is always
  // "this model changes nothing here", with its own `why`.
  const CASES = {
    inputs: {
      main: [
        { card: 'mfg-green-belts', asked: ['design', 'trainee'],
          cards: [
            { f: 'green_belt_2006', t: 'All 22 passed the Green Belt exam in 2006, and 19 of the 22 course projects hit their target.', s: 'design', why: 'The course did its job: they learned it. Design is not the gap.' },
            { f: 'audience_profile', t: 'Promoted operators, 14 years on the floor on average. Several prefer talking to writing.', s: 'trainee', why: 'Who the trainees are. Worth designing for, but it didn\'t stop 19 projects from working.' },
            { f: 'firefighting', t: 'Team leads firefight about 70% of a shift. No protected time, no floater to cover the line.', s: 'work', why: 'No chance to use it: the work environment.' },
            { f: 'no_sponsor', t: 'Nobody picks or reviews projects. The ideas from the course sit in a binder in Marc\'s office.', s: 'work', why: 'No support after the course: the work environment.' },
            { f: 'targets', t: 'Targets count tonnes, absence and safety. An hour on a project shows up as lower tonnage.', s: 'work', why: 'The work punishes using it. Still the work environment.' }
          ],
          gap: 'Three of the five cards land in the work environment, and the card about the course says it worked. A refresher pushes on the two inputs that are fine.',
          edits: [
            { t: 'Keep the refresher, but redesign it: more practice on the real lines, fewer slides.', why: 'Better design for the input that already worked. They will still have no time and no sponsor.' },
            { t: 'Swap the refresher for a monthly project review Marc chairs, two protected hours a week covered by a floater, and projects in the team leads\' targets.', ok: true, why: 'That moves the work environment, where the cards landed.' },
            { t: 'Send only the team leads who scored lowest on the exam.', why: 'The trainee input is fine: everyone passed, and the top scorers aren\'t running projects either.' },
            { t: 'This model changes nothing here.', why: 'It changes the lever call. The course already worked once; another one can\'t be the answer.' }
          ] },
        { card: 'newspaper-going-online', asked: ['design', 'trainee'],
          cards: [
            { f: 'already_trained', t: 'In 2006, 55 of the 64 journalists did a two-day internet course. Good evaluations; online publishing didn\'t move.', s: 'design', why: 'They have had the course. Design was tried.' },
            { f: 'scoop_rule', t: 'The editor-in-chief praises print scoops: "we don\'t give our scoops away to the website".', s: 'work', why: 'What the boss praises is the work environment.' },
            { f: 'separate_systems', t: 'The web system runs on two PCs in the web room with one shared login. Every story is retyped by hand.', s: 'work', why: 'No chance to use it at their own desk: the work environment.' },
            { f: 'deadline_day', t: 'Everyone is planned and judged on the 21:30 paper deadline. Nobody\'s evaluation mentions the website.', s: 'work', why: 'The job has no place for the web. Work environment.' }
          ],
          gap: 'Every card but one lands in the work environment, and that one is the course they already had. Another course is a second push on design.',
          edits: [
            { t: 'Make it a hands-on course in the web system instead of a lecture on search engines.', why: 'Better design, same problem: two PCs, one login, and a boss who keeps the scoops for print.' },
            { t: 'Train the journalists who are good with computers first, so they can help the others.', why: 'Their skill was never the problem.' },
            { t: 'Drop the course. Get the web system onto the desks, settle online rights with the union, and agree in the morning meeting which stories go online when.', ok: true, why: 'Work environment: access, rules, and what the boss praises.' },
            { t: 'This model changes nothing here.', why: 'It changes the lever call. A course, then nothing, then another course is exactly what this model predicts.' }
          ] }
      ],
      near: { card: 'construction-cost-reports', facts: ['new_managers', 'copy_last_month', 'accuracy_tracked'],
        options: [
          { t: 'Yes: a course will fail unless the work environment changes first.', why: 'Only if something in the work stops them. Here finance even checks every forecast, so practice gets feedback.' },
          { t: 'Hardly. The newer managers don\'t know how to estimate what is left, and nothing in their work stops them. Train the six on their own figures.', ok: true, why: 'Right. The model was worth asking, and it confirms the plan: the gap is in the learning, and the work lets them use it.' },
          { t: 'Yes: redesign the Excel course with more practice.', why: 'Excel isn\'t the gap. They estimate badly, not type badly.' }
        ] }
    },
    bem: {
      main: [
        { card: 'telecom-first-call', asked: ['knowledge'],
          cards: [
            { f: 'credit_limit', t: 'New agents may give a goodwill credit of up to 25 euro, but most don\'t know they may.', s: 'info', why: 'Nobody told them. Gilbert puts that in the work: information.' },
            { f: 'since_march', t: 'The credit limit dropped off the quick-reference card when the policies moved in March.', s: 'info', why: 'The place the information lived broke in March. Still information.' },
            { f: 'new_agents_billing', t: 'Most transfers come from agents in their first three months, on billing complaints, not products.', s: 'knowledge', why: 'Partly a person gap: new agents haven\'t handled a billing complaint with that authority yet.' },
            { f: 'fcr_tracked', t: 'The telephony system tracks transfers per agent and per call reason.', s: 'tools', why: 'A tool that works. Good for measuring, not a cause.' }
          ],
          gap: 'Product training only fills knowledge and skill, and no card says they lack product knowledge. The two cards that matter most sit in information.',
          edits: [
            { t: 'More product modules, but shorter, with a quiz.', why: 'Still the knowledge cell, still products.' },
            { t: 'Pay agents a bonus for fewer transfers.', why: 'Incentives aren\'t the gap: they don\'t know they\'re allowed.' },
            { t: 'Put the 25-euro limit back on the quick-reference card, then practise billing calls with that authority.', ok: true, why: 'Information first, then a short practice for the part that really is skill.' },
            { t: 'This model changes nothing here.', why: 'It changes the plan: half the fix isn\'t training at all.' }
          ] },
        { card: 'car-dealer-aftersales', asked: ['knowledge'],
          cards: [
            { f: 'full_booking', t: 'Advisors must book the workshop at 100% of mechanic hours, with no room for surprises.', s: 'tools', why: 'No slack in the hours: tools and time.' },
            { f: 'upsell_bonus', t: 'Advisors get a monthly bonus on extra labour sold at the desk, with no check that the customer agreed.', s: 'incentive', why: 'What it pays: incentives.' },
            { f: 'quiet_days', t: 'On quiet Saturdays the same 14 advisors hand back over 90% of cars on time.', s: 'knowledge', why: 'This card is about the person cell, and it says it\'s full: they can do it when the target lets them.' },
            { f: 'csi_breakdown', t: 'Customers rate welcome and friendliness above the regional average, and "ready at the promised time" far below.', s: 'knowledge', why: 'Friendliness is a skill they have. The person cell isn\'t where the score drops.' }
          ],
          gap: 'A friendliness training sits in knowledge and skill, and both cards there say it\'s full. The empty cells are in the top row: time and incentives.',
          edits: [
            { t: 'Book the workshop at about 80%, and pay the bonus only on extra work the customer approved, with on-time hand-over counted.', ok: true, why: 'The top row: time, and what it pays.' },
            { t: 'Keep the training, but add a module on promising realistic times.', why: 'They already promise well on quiet days. The target stops them, not the skill.' },
            { t: 'Coach advisors to tell customers how the survey is scored.', why: 'That is score begging, and the importer is watching for it.' },
            { t: 'This model changes nothing here.', why: 'It changes the lever call to "no": they could do it if their job depended on it, and on Saturdays they do.' }
          ] }
      ],
      near: { card: 'insurance-claims-backlog', facts: ['parking_folder', 'authority_limits', 'system_fixed'],
        options: [
          { t: 'Yes: raise the ex-motor handlers\' authority limits again.', why: 'Raised to 5,000 euro in August. Not the bottleneck any more.' },
          { t: 'Yes: pay handlers per file closed.', why: 'That rewards closing, not deciding cover well. Nothing says they don\'t want to.' },
          { t: 'Not the call. The work was fixed this year (limits up, system repaired). What\'s left is knowledge: they park water claims they can\'t assess. Train them.', ok: true, why: 'Right. Asking the question was worth it, and the answer is "yes, train". A model that confirms a course is still doing its job.' }
        ] }
    },
    support: {
      main: [
        { card: 'healthcare-sepsis', asked: ['head'],
          cards: [
            { f: 'paper_ews', t: 'Spotting a rising early warning score on 4B and 5A, where it is still on paper.', s: 'tool', why: 'The tool should flag it. Until IT delivers, a trigger card on the chart does the job.' },
            { f: 'knowledge_ok', t: 'Knowing the protocol (the nurses scored 88% on the quiz).', s: 'head', why: 'It\'s already in their heads.' },
            { t: 'Working through the bundle\'s steps in order at 3 a.m., with a sick patient.', s: 'aid', why: 'Steps in order, at night: a card on the trolley beats memory.' },
            { f: 'fear_of_calling', t: 'Calling an on-call doctor who asks "why are you bothering me with this".', s: 'head', why: 'Nothing at your elbow makes that call for you. That takes practice, with the doctors in the room.' }
          ],
          gap: 'An e-learning only fills "in their head", which is mostly full already. The alert belongs in the tool and the steps at their elbow; the call to the doctor is the one thing worth practising.',
          edits: [
            { t: 'A longer e-learning with harder quiz questions.', why: 'They score 88% already. The quiz isn\'t the gap.' },
            { t: 'A paper trigger card on 4B and 5A until the electronic alert arrives, and short escalation practice with nurses and doctors together.', ok: true, why: 'Tool, elbow, and practice for the one part that has to be in their heads.' },
            { t: 'A protocol poster in every staff room.', why: 'At the wrong elbow: the staff room isn\'t the bedside.' },
            { t: 'This model changes nothing here.', why: 'It changes the plan: most of the fix isn\'t in their heads.' }
          ] },
        { card: 'pharma-read-and-sign', asked: ['head'],
          cards: [
            { f: 'sop_length', t: 'Following the 41-page intervention SOP during an intervention.', s: 'aid', why: 'Nobody runs an intervention from 41 pages. One visual page at the isolator does.' },
            { f: 'quiz_scores', t: 'Knowing what the SOP says (over 90% on the quizzes).', s: 'head', why: 'Already in their heads, on paper.' },
            { f: 'mockup', t: 'The glove-port moves at the isolator (a mock-up sits unused in a storage room).', s: 'head', why: 'Hands have to learn that by doing: practice on the mock-up, not reading.' },
            { t: 'Checking the sequence before each intervention, every time.', s: 'aid', why: 'A check in order, every time: a checklist at the line.' }
          ],
          gap: 'Read-and-sign fills "in their head" with words they already know. The hands need practice, and the sequence belongs on a page at the isolator.',
          edits: [
            { t: 'Read-and-sign again, with a harder quiz.', why: 'They score over 90% already.' },
            { t: 'Shorten the SOP to 20 pages.', why: 'Still a document to read beforehand, not help at the moment.' },
            { t: 'Hands-on practice on the mock-up with an observed sign-off, and a one-page visual job aid at the isolator.', ok: true, why: 'Head for the hands, elbow for the sequence.' },
            { t: 'This model changes nothing here.', why: 'It changes the format: from reading to practice and a page at the line.' }
          ] }
      ],
      near: { card: 'port-crane-safety', facts: ['twistlocks_skipped', 'move_bonus', 'double_shifts'],
        options: [
          { t: 'Yes: a laminated twistlock checklist on every crane.', why: 'They skip a check they know, under time pressure. A checklist is one more thing to skip.' },
          { t: 'No. They know the twistlock check by heart. The bonus and the double shifts make them skip it, and a job aid won\'t slow down a bonus.', ok: true, why: 'Right. Support helps people who don\'t know or can\'t remember. These people know.' },
          { t: 'Yes: a reminder on the crane\'s screen before each lift.', why: 'The same checklist on a screen. The bonus still says hurry.' }
        ] }
    },
    matrix: {
      main: [
        { card: 'logistics-night-shift', asked: ['learner-during'],
          cards: [
            { f: 'agency_newcomers', t: '9 of the 11 near-misses involved agency drivers in their first six weeks.', s: 'learner-before', why: 'Who the learners are before any training: new to this site.' },
            { f: 'video_induction', t: 'Agency induction: a 20-minute video and a paper licence check. No practical on this site\'s aisles.', s: 'trainer-during', why: 'What the training does during: no practice in it.' },
            { f: 'no_supervisor', t: 'After 1:00 one shift lead covers two buildings. Nights are effectively unsupervised.', s: 'manager-after', why: 'The manager\'s part after training: nobody there to see or correct.' },
            { d: 'Temp agency', t: 'The agency contract decides who pays for training hours and supervised first shifts.', s: 'manager-before', why: 'Before anyone trains, someone with a budget has to agree to it.' }
          ],
          gap: 'The module on the canteen PC is one cell: the learner, during. The cards land before and after, with the manager, where the night shift has nobody.',
          edits: [
            { t: 'Make the refresher 30 minutes and add a quiz.', why: 'The same cell, longer.' },
            { t: 'A practical sign-off on this site\'s aisles before an agency driver works nights, a buddy for the first shifts, and cover for the gap after 1:00.', ok: true, why: 'Manager before and after, trainer during: the cells the cards filled.' },
            { t: 'Play the video at the start of every night shift.', why: 'Still the learner, during, on one shared PC.' },
            { t: 'This model changes nothing here.', why: 'It changes the plan: almost nothing in the fix is the module.' }
          ] },
        { card: 'law-firm-juniors', asked: ['trainer-during'],
          cards: [
            { f: 'write_offs', t: 'The seven corporate juniors hired since 2005 have 53% of their drafting hours written off.', s: 'learner-before', why: 'Who the learners are: one group, hired after something stopped.' },
            { f: 'memo_clinic', t: 'Until mid-2005 a senior associate ran a memo clinic for every new junior, on their own files. Then it stopped.', s: 'trainer-during', why: 'What the trainer did during training. It worked, and it stopped.' },
            { f: 'litigation_partner', t: 'Anne, the litigation partner, sits with each draft for twenty minutes in a junior\'s first months.', s: 'manager-after', why: 'A manager after training. Her juniors don\'t have the problem.' },
            { f: 'no_feedback', t: 'Drafts come back with "Where is the answer?" in the margin, and nothing else.', s: 'manager-after', why: 'The manager\'s part after: comments without showing how.' }
          ],
          gap: 'A professor\'s course is one cell: the trainer, during. The cards say what worked was a clinic during, and a partner who sat with drafts after.',
          edits: [
            { t: 'Book the professor, for all 22 juniors so nobody feels singled out.', why: 'The wrong group, and the same single cell.' },
            { t: 'Ask the partners to write longer comments.', why: 'They write comments already. Comments without practice didn\'t teach it.' },
            { t: 'Bring back the memo clinic for the seven corporate juniors, on their own files and the model memo, with a partner reading the rewrites.', ok: true, why: 'Trainer during and manager after, for the right seven.' },
            { t: 'This model changes nothing here.', why: 'It changes who and how: seven juniors, a clinic, and a partner after.' }
          ] }
      ],
      near: { card: 'hotel-upgrades', facts: ['new_hires', 'two_screens_deep', 'since_april'],
        options: [
          { t: 'Yes: managers brief the receptionists before a session and review after.', why: 'Nice, but the upgrade offer is two screens deep. Move it, and show them where to click.' },
          { t: 'Yes: train all 24 receptionists so everyone is involved.', why: 'The longer-serving ones still sell at the old rate.' },
          { t: 'Hardly. It\'s a system setting and a short demo at the desk. You could fill all nine cells; it wouldn\'t change what you do.', ok: true, why: 'Right. A transfer plan for a two-screen problem is overkill. Not every case needs this model.' }
        ] }
    }
  };

  // The field stamp: which handout's question finds each fact on a live call. One per fact, or none.
  const LENS = {
    'airport-ground-handling': { type_change: 'support', seasonal_starters: 'matrix', lead_moved: 'matrix', lmc_unreported: 'bem', course_content: 'inputs' },
    'car-dealer-aftersales': { full_booking: 'bem', upsell_bonus: 'bem', quiet_days: 'bem', wavre_exception: 'inputs', workshop_owner_son: 'matrix' },
    'construction-cost-reports': { new_template: 'support', copy_last_month: 'bem' },
    'education-ai-cheating': { regulations: 'bem', induction_gap: 'inputs', tried_and_failed: 'bem', pioneers: 'inputs' },
    'energy-tablet-resistance': { no_signal: 'bem', double_paper: 'bem', skills_fine: 'bem', pilot_passed: 'inputs', job_norm: 'bem', board_kpi: 'bem' },
    'fashion-retail-shrinkage': { trusted_delivery: 'bem', tagging_and_gates: 'inputs', past_training: 'inputs' },
    'finance-tied-selling': { double_count: 'bem', pre_ticked: 'support', knowledge_gap: 'bem', cco_vs_network: 'matrix' },
    'food-hygiene-audit': { dutch_only: 'support', operators_know: 'bem', window_overrun: 'inputs', no_handover_check: 'matrix' },
    'healthcare-sepsis': { knowledge_ok: 'bem', fear_of_calling: 'inputs', paper_ews: 'support', doctors_excluded: 'matrix' },
    'home-care-turnover': { exit_reasons: 'bem', unpaid_travel: 'bem', sms_changes: 'support', no_team: 'matrix', resilience_before: 'inputs' },
    'hotel-upgrades': { two_screens_deep: 'support' },
    'insurance-claims-backlog': { parking_folder: 'bem', authority_limits: 'bem', reorg_training: 'inputs', system_fixed: 'bem' },
    'it-helpdesk-reopen': { sla_per_close: 'bem', empty_kb: 'support', close_after_one_try: 'matrix', top_three: 'support', already_certified: 'inputs' },
    'law-firm-juniors': { no_feedback: 'matrix', memo_clinic: 'inputs', four_styles: 'support', hours_target: 'bem', litigation_partner: 'matrix' },
    'logistics-night-shift': { video_induction: 'inputs', no_supervisor: 'matrix', night_bonus: 'bem', day_staff_trained: 'inputs', phones_banned: 'support' },
    'mfg-green-belts': { other_code: 'bem', firefighting: 'inputs', line3_project: 'matrix', green_belt_2006: 'inputs', no_sponsor: 'matrix', targets: 'bem', sister_plant: 'inputs' },
    'newspaper-going-online': { scoop_rule: 'matrix', separate_systems: 'bem', already_trained: 'inputs', deadline_day: 'bem' },
    'ngo-volunteer-churn': { phone_line_rule: 'bem', coordinators_volunteers: 'inputs' },
    'pharma-read-and-sign': { trainer_left: 'matrix', sop_length: 'support', mockup: 'inputs', quiz_scores: 'bem' },
    'port-crane-safety': { move_bonus: 'bem', double_shifts: 'inputs', previous_programme: 'inputs' },
    'public-service-desk': { booking_access: 'bem', no_walkins_rule: 'bem', friendliness_rated: 'bem', letters: 'support' },
    'tech-sales-motivation': { comp_plan: 'bem', no_coaching: 'matrix', last_offsite: 'inputs' },
    'telecom-first-call': { credit_limit: 'bem', since_march: 'support' }
  };

  const model = id => MODELS.find(m => m.id === id);
  const slotName = (m, s) => (m.slots.find(x => x[0] === s) || [s, s])[1];
  // The handout for the next visit: in order, then round again with the other case.
  function nextModel(st) { return MODELS[st.visits % MODELS.length]; }
  // A future card the reader can print: unlocked by its handout, once.
  const printable = st => Object.keys(FUTURE).filter(k => st.handouts.includes(FUTURE[k].after) && !st.printed.includes(k));

  // A live call turned up these facts. Returns the handouts that got a stamp, as [{ title, n }].
  function stamp(cardId, ids) {
    const lens = LENS[cardId];
    if (!lens) return [];
    const st = read(), got = [];
    ids.forEach(id => {
      const k = lens[id];
      if (!k || !st.handouts.includes(k)) return;
      st.stamps[k] = (st.stamps[k] || 0) + 1;
      got.push({ id: k, title: model(k).title, question: model(k).question, n: st.stamps[k] });
    });
    if (got.length) keep(st);
    return got;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, onclick, cls) { const b = el('button', cls || 'ac-btn', text); b.type = 'button'; b.onclick = onclick; return b; }

  // ---------- the Center of Excellence folder ----------
  // act: 1, 2 or 3 (after the reveal), for the reader's cards.
  function docs(act) {
    const st = read(), out = [];
    st.handouts.forEach(id => {
      const m = model(id); if (!m) return;
      const n = st.stamps[id] || 0;
      out.push({ id: 'lh-' + id, icon: '📑', name: 'Learning House ' + m.no + '. ' + m.title + '.pdf',
        html: () => `<h2>${m.title}</h2><p class="doc-meta">Learning House · Case Clinic handout ${m.no} · ${m.by}</p>${DIAGRAM[id]}<p>${m.gist}</p>`
          + `<h3>The question it gives you on a call</h3><p><b>${m.question}</b></p>`
          + `<p class="doc-meta">${n ? 'Stamped on your calls: ' + n + (n === 1 ? ' time' : ' times') + '. Each stamp is a fact this question would have found.' : 'No stamps yet. When a fact turns up on a call that this question would have found, the handout gets a stamp.'}</p>`
          + `<p class="lh-cite">${m.cite}</p>` });
    });
    st.printed.forEach(k => {
      const c = FUTURE[k];
      out.push({ id: 'lh-' + k, icon: '🖨', name: 'Reader card. ' + c.title + '.txt', html: () => futureHtml(k, act) });
    });
    return out;
  }
  function futureHtml(k, act) {
    const c = FUTURE[k];
    const year = act >= 2 ? String(c.year) : '<span class="lh-smudge">[smudged]</span>';
    return `<h2>${c.title}</h2><p class="doc-meta">${act >= 3 ? 'Operator terminal 3 · reference material, session 1207' : 'Printed by the grey reader at the Learning House'} · ${c.by} · ${year}</p>${DIAGRAM[k]}<p>${c.gist}</p>`
      + `<p class="lh-cite">Outside the game: ${c.cite}</p>`;
  }

  // ---------- the phone call ----------
  const CALLS = {
    first: ['You found the Learning House! Good. Ask for the Case Clinic at the desk.',
      'One handout a visit. You lay one of your old cases on the long table, sort what you found into the model, and see whether it would have changed your call.',
      'Sometimes it doesn\'t. Knowing when a model doesn\'t help is half the trick.',
      'Oh, and the grey machine in the corner. Read what it prints. Don\'t quote it to Darren.'],
    again: [['Learning House again? Darren will think you\'re after my job.'], ['Take the case you liked least. That\'s the one with something in it.'],
      ['Tell the archivist I still have her stapler.'], ['If the model doesn\'t fit, say so. That counts too.']],
    act2: [['The machine? A university donated it. Never ask a university where they got something.'], ['Same handouts, same table, same rain. Isn\'t it nice when things don\'t change?']],
    act3: ['It\'s me. Off the record.', 'You know what this place is now. It\'s still the one room in the build I like.', 'The clinic isn\'t part of the course they ordered. I asked for it. Go on, sit down.']
  };
  function call(lines, done) {
    const lay = el('div', 'lh-call');
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', 'Incoming call');
    const w = el('div', 'lh-phone');
    const head = el('div', 'titlebar');
    head.append(el('span', null, '📞'), el('span', 'tt', 'Incoming call'));
    w.appendChild(head);
    const body = el('div', 'lh-phone-body');
    body.append(el('p', 'lh-caller', 'Mieke (mobile)'), el('p', 'lh-ring', 'Ring ring. Ring ring.'));
    const take = btn('Answer', () => {
      body.innerHTML = '';
      body.appendChild(el('p', 'lh-caller', 'Mieke'));
      lines.forEach(t => body.appendChild(el('p', 'lh-line', '"' + t + '"')));
      const end = btn('Hang up', close, 'primary');
      body.appendChild(end);
      end.focus({ preventScroll: true });
    }, 'primary');
    const close = () => { lay.remove(); if (done) done(); };
    body.appendChild(take);
    w.appendChild(body);
    lay.appendChild(w);
    document.body.appendChild(lay);
    if (window.Sound && Sound.ring) Sound.ring();
    take.focus({ preventScroll: true });
  }
  // Once per evening, the first time you click the Learning House.
  function arrive(ctx) {
    const st = read();
    if (st.called === ctx.dayKey) return;
    st.called = ctx.dayKey;
    keep(st);
    const n = st.visits;
    const lines = ctx.act >= 3 ? CALLS.act3 : !n && !st.handouts.length ? CALLS.first
      : ctx.act === 2 ? CALLS.act2[n % CALLS.act2.length] : CALLS.again[n % CALLS.again.length];
    call(lines);
  }

  // ---------- the clinic ----------
  // S: one session { m, main, near, picks: {}, checked, edit, nearPick, step }
  function session(ctx) {
    const st = read(), m = nextModel(st), C = CASES[m.id];
    const played = ctx.played || [];
    // Your own case first; past the first round, the one you didn't get last time.
    const mine = C.main.filter(x => played.includes(x.card));
    const round = Math.floor(st.visits / MODELS.length);
    const main = mine.length === 1 && round === 0 ? mine[0] : C.main[round % C.main.length];
    return { dayKey: ctx.dayKey, m, main, near: C.near, mine: played.includes(main.card), picks: {}, checked: false, edit: null, nearPick: null, step: 0 };
  }
  const STEPS = ['The handout', '1. Sort the facts', '2. Read the gap', '3. Change one line', '4. A near miss', 'Filed'];

  function openClinic(ctx) {
    const S = session(ctx);
    const lay = el('div', 'lh');
    lay.id = 'clinic';
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', 'The Case Clinic');
    const w = el('div', 'lh-win');
    const head = el('div', 'titlebar');
    head.append(el('span', null, '📑'), el('span', 'tt', 'The Learning House · Case Clinic'));
    const x = el('button', 'lh-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = () => close(false);
    head.appendChild(x);
    w.appendChild(head);
    const box = el('div', 'lh-box');
    w.appendChild(box);
    lay.appendChild(w);
    document.body.appendChild(lay);
    const close = finished => { lay.remove(); if (ctx.onClose) ctx.onClose(finished); };
    const draw = () => render(box, S, ctx, draw, close);
    draw();
    requestAnimationFrame(() => lay.classList.add('in'));
  }

  function caseLine(ctx, id) {
    const c = ctx.card && ctx.card(id);
    if (!c) return id;
    return c.stakeholder.name + ', ' + String(c.stakeholder.org || '').split(',')[0];
  }
  function askOf(ctx, id) { const c = ctx.card && ctx.card(id); return c ? c.subject : ''; }

  function render(box, S, ctx, redraw, close) {
    const m = S.m, M = S.main;
    box.innerHTML = '';
    const top = el('div', 'ac-top');
    const logo = el('span', 'ac-logo'); logo.innerHTML = '<b>Learning</b>House';
    top.append(logo, el('span', 'ac-course', 'Case Clinic: ' + m.title), el('span', 'ac-mod', 'Handout ' + m.no + ' of ' + MODELS.length));
    box.appendChild(top);
    const main = el('div', 'ac-main');
    const nav = el('nav', 'ac-menu');
    nav.setAttribute('aria-label', 'Clinic steps');
    nav.appendChild(el('div', 'ac-menu-head', 'Tonight'));
    STEPS.forEach((label, i) => {
      const b = el('button', 'ac-menu-item' + (i === S.step ? ' now' : '') + (i < S.step ? ' done' : ''), (i < S.step ? '✔ ' : '') + label);
      b.type = 'button'; b.disabled = true;
      nav.appendChild(b);
    });
    nav.appendChild(el('div', 'ac-menu-foot', 'Not scored. Nobody here counts.'));
    main.appendChild(nav);
    const stage = el('div', 'ac-stage');
    main.appendChild(stage);
    box.appendChild(main);
    const bar = el('div', 'ac-bar');
    const go = to => { S.step = to; redraw(); const s = box.querySelector('.ac-stage'); if (s) s.scrollTop = 0; };
    let next = null;

    if (S.step === 0) {
      stage.append(el('p', 'ac-kicker', 'On the long table tonight'), el('h2', 'ac-title', m.title), el('p', 'lh-by', m.by + ' · a ring-bound photocopy'));
      const d = el('div', 'lh-diagram'); d.innerHTML = DIAGRAM[m.id]; stage.appendChild(d);
      stage.appendChild(el('p', 'ac-intro', m.gist));
      const q = el('div', 'ac-box tips');
      q.append(el('h3', null, 'The question it gives you'), el('p', 'lh-q', m.question));
      stage.appendChild(q);
      stage.appendChild(el('p', 'lh-case', 'The case: ' + caseLine(ctx, M.card) + '. They asked for: ' + askOf(ctx, M.card) + '.'
        + (S.mine ? ' You had this one on your desk.' : ' Not one of yours: it comes from the Learning House\'s case box.')));
      next = btn('Sort the facts ▶', () => go(1));
    } else if (S.step === 1) {
      stage.appendChild(el('p', 'ac-q', 'Where does each fact sit in the model?'));
      stage.appendChild(el('p', 'lh-case', caseLine(ctx, M.card) + ' asked for: ' + askOf(ctx, M.card) + '.'));
      const list = el('ol', 'drill-tiles lh-tiles');
      M.cards.forEach((c, i) => {
        const pick = S.picks[i];
        const li = el('li', S.checked ? (pick === c.s ? 'ok' : 'no') : null);
        li.appendChild(el('span', 'drill-text', c.t));
        const rows = m.who ? [['who', m.who], ['when', m.when]] : [[null, m.slots]];
        rows.forEach(([part, opts]) => {
          const row = el('div', 'chips');
          opts.forEach(([k, label]) => {
            const cur = part ? (pick || '-').split('-')[part === 'who' ? 0 : 1] : pick;
            const b = el('button', null, label); b.type = 'button';
            b.setAttribute('aria-pressed', cur === k);
            b.disabled = S.checked;
            b.onclick = () => {
              if (part) { const p = (S.picks[i] || '-').split('-'); p[part === 'who' ? 0 : 1] = k; S.picks[i] = p.join('-'); } else S.picks[i] = k;
              redraw();
            };
            row.appendChild(b);
          });
          li.appendChild(row);
        });
        if (S.checked) li.appendChild(el('p', 'drill-why', (pick === c.s ? '✓ ' : '✗ ' + slotName(m, c.s) + '. ') + c.why));
        list.appendChild(li);
      });
      stage.appendChild(list);
      const full = M.cards.every((c, i) => S.picks[i] && !/^-|-$/.test(S.picks[i]));
      if (S.checked) {
        const right = M.cards.filter((c, i) => S.picks[i] === c.s).length;
        stage.appendChild(el('p', 'ac-verdict ' + (right === M.cards.length ? 'right' : 'wrong'), right + ' of ' + M.cards.length + ' where the handout puts them.'));
        S.sorted = right;
        next = btn('Read the gap ▶', () => go(2));
      } else {
        stage.appendChild(el('p', 'ac-hint', full ? 'All placed. Check them against the handout.' : 'Place every card. There is no penalty for a wrong one.'));
        next = btn('Check ▶', () => { S.checked = true; redraw(); });
        next.disabled = !full;
      }
    } else if (S.step === 2) {
      stage.appendChild(el('p', 'ac-q', 'Where the facts are, and where the request works'));
      stage.appendChild(grid(m, M, askOf(ctx, M.card)));
      stage.appendChild(el('p', 'ac-intro', M.gap));
      next = btn('Change one line ▶', () => go(3));
    } else if (S.step === 3) {
      stage.appendChild(el('p', 'ac-q', 'The concept on the table is what they asked for. Change one line.'));
      stage.appendChild(el('p', 'lh-case', 'Now: ' + askOf(ctx, M.card) + '.'));
      stage.appendChild(options(M.edits, S.edit, k => { S.edit = k; redraw(); }));
      if (S.edit != null) next = btn('A near miss ▶', () => go(4));
    } else if (S.step === 4) {
      const N = S.near, c = ctx.card && ctx.card(N.card);
      stage.appendChild(el('p', 'ac-q', 'Does "' + m.title + '" change the call on this one?'));
      stage.appendChild(el('p', 'lh-case', caseLine(ctx, N.card) + ' asked for: ' + askOf(ctx, N.card) + '.'));
      if (c) {
        const ul = el('ul', 'lh-facts');
        N.facts.forEach(id => { const f = c.hiddenFacts.find(x => x.id === id); if (f) ul.appendChild(el('li', null, f.fact)); });
        stage.appendChild(ul);
      }
      stage.appendChild(options(N.options, S.nearPick, k => { S.nearPick = k; redraw(); }));
      if (S.nearPick != null) next = btn('File the handout ▶', () => { finish(S); go(5); });
    } else {
      const st = read();
      stage.append(el('p', 'ac-kicker', 'Filed'), el('h2', 'ac-title', m.title));
      stage.appendChild(el('p', 'ac-intro', 'The handout is in the Center of Excellence folder on your desk. Its question goes on every call with you now:'));
      stage.appendChild(el('p', 'lh-q', m.question));
      stage.appendChild(el('p', 'ac-intro', 'When a fact turns up on a call that this question would have found, the handout gets a stamp.'
        + (st.stamps[m.id] ? ' It has ' + st.stamps[m.id] + ' already.' : '')));
      const t = el('div', 'ac-box tips');
      t.appendChild(el('h3', null, 'Tonight'));
      const ul = el('ul', 'ac-tips');
      ul.append(el('li', null, 'Sorted ' + (S.sorted || 0) + ' of ' + M.cards.length + ' facts where the handout puts them.'),
        el('li', null, M.edits[S.edit].ok ? 'Changed the right line.' : 'The line that changes it: ' + M.edits.find(e => e.ok).t),
        el('li', null, S.near.options[S.nearPick].ok ? 'Spotted the near miss: the model didn\'t change that call.' : 'The near miss got you. Not every case needs this model.'));
      t.appendChild(ul);
      t.appendChild(el('p', 'fine', 'Not scored, and it doesn\'t count towards your week.'));
      stage.appendChild(t);
      if (printable(st).length && ctx.act < 3) stage.appendChild(el('p', 'lh-case', 'In the corner, the grey reader starts to whirr.'));
      next = btn('Back to the map ▶', () => close(true));
    }
    const prog = el('div', 'ac-prog');
    const fill = el('span'); fill.style.width = Math.round(100 * S.step / (STEPS.length - 1)) + '%';
    prog.appendChild(fill);
    bar.append(btn('Leave', () => close(S.step === 5)), prog);
    if (next) { next.classList.add('go'); next.id = 'lh-next'; bar.appendChild(next); }
    box.appendChild(bar);
  }

  // The model as a grid: each card in the cell the handout puts it, the request's cells marked.
  function grid(m, M, ask) {
    const g = el('div', 'lh-grid' + (m.who ? ' nine' : ''));
    g.style.setProperty('--cols', m.who ? 3 : m.slots.length);
    m.slots.forEach(([k, label]) => {
      const cell = el('div', 'lh-cell' + (M.asked.includes(k) ? ' asked' : ''));
      cell.appendChild(el('b', null, label));
      const here = M.cards.filter(c => c.s === k);
      here.forEach(c => cell.appendChild(el('span', 'lh-chip', chip(c.t))));
      if (!here.length) cell.appendChild(el('span', 'lh-empty', 'empty'));
      if (M.asked.includes(k)) cell.appendChild(el('span', 'lh-asked', 'The request works here'));
      g.appendChild(cell);
    });
    const wrap = el('div');
    wrap.appendChild(g);
    wrap.appendChild(el('p', 'fine', 'Hatched: where "' + ask + '" would push.'));
    return wrap;
  }

  // An index card's first clause, cut at a word.
  function chip(t) {
    const s = t.split(/[.:(;]\s/)[0];
    if (s.length <= 64) return s;
    return s.slice(0, s.lastIndexOf(' ', 62)).replace(/[,\s]+$/, '') + '…';
  }

  function options(list, picked, pick) {
    const ol = el('div', 'ac-options');
    list.forEach((o, k) => {
      const b = el('button', 'ac-opt' + (picked != null ? (o.ok ? ' right' : k === picked ? ' wrong' : '') : ''));
      b.type = 'button';
      b.disabled = picked != null;
      b.setAttribute('aria-pressed', picked === k);
      b.append(el('span', 'ac-letter', 'ABCD'[k]), el('span', 'ac-opt-t', o.t));
      if (picked != null && (o.ok || k === picked)) b.appendChild(el('span', 'ac-why', o.why));
      b.onclick = () => pick(k);
      ol.appendChild(b);
    });
    return ol;
  }

  // A visit counts when the handout is filed.
  function finish(S) {
    const st = read();
    st.visits += 1;
    st.last = S.dayKey;
    if (!st.handouts.includes(S.m.id)) st.handouts.push(S.m.id);
    keep(st);
    if (window.Coe && Coe.refresh) Coe.refresh();
  }

  // ---------- the place on the map ----------
  // ctx (from Town): { act, now, dayKey, played, card(id), redraw }
  function place(ctx) {
    const st = read(), act = ctx.act;
    const tonight = st.last === ctx.dayKey;
    const m = nextModel(st);
    const items = [];
    items.push({ label: 'The Case Clinic', at: 'table', build: b => {
      b.textContent = '';
      if (tonight) { b.appendChild(el('p', null, 'You have had tonight\'s handout. The archivist is stacking chairs. Come back another evening.')); return; }
      b.appendChild(el('p', null, 'The long table under the strip lights. Tonight\'s handout: ' + m.title + ' (' + m.by + '). Lay a case on it, sort the facts, and see whether it would have changed your call.'));
      const s = btn('Sit down at the long table', () => {
        openClinic(Object.assign({}, ctx, { onClose: () => { if (ctx.redraw) ctx.redraw(); } }));
      }, 'primary');
      s.id = 'lh-sit';
      b.appendChild(s);
      b.appendChild(el('p', 'tw-small', 'About five minutes. Not scored.'));
    } });
    items.push({ label: 'The grey machine in the corner', at: 'reader', note: act === 2 && st.printed.length ? 'reader' : null, build: b => reader(b, ctx) });
    items.push({ label: 'Your handouts', at: 'handouts', text: st.handouts.length
      ? st.handouts.map(id => { const x = model(id), n = st.stamps[id] || 0; return x.no + '. ' + x.title + ' (' + x.by + ')' + (n ? ', stamped ' + n + 'x on your calls' : ''); }).join('\n') + '\n\nAll filed in the Center of Excellence folder on your desk.'
      : 'None yet. Each visit you take one home, and it goes in the Center of Excellence folder on your desk.' });
    items.push({ label: 'The corkboard', at: 'corkboard', text: act >= 3 ? 'Course flyers, every one for a course that ran in 2007. Under them, pinned flat, a printed page: COHORT 12 · SEATS 01 TO 24 · CLINIC ATTENDANCE: OPTIONAL.'
      : 'Course flyers and job ads. "Managing Change, 2 days, 395 euro". "Wanted: training coordinator, must like PowerPoint". A hand-written card: "Tuesday seminar cancelled. Lecturer\'s overhead projector bulb."' });
    return {
      title: 'The Learning House',
      intro: act >= 3 ? 'The mill on the canal. Same reading room, same strip lights, same long table. Somebody kept this room exactly as it was. It is the only place in town that is warm.'
        : 'A converted textile mill on the canal. Trainers and HR people come here after work: a reading room, a card catalogue, a long table under strip lights, and an overhead projector with a stack of hand-written transparencies.',
      items
    };
  }

  function reader(b, ctx) {
    const act = ctx.act;
    b.textContent = '';
    const st = read();
    b.appendChild(el('p', null, act >= 3 ? 'The label has peeled off. Under it, stencilled: OPERATOR TERMINAL 3. REFERENCE LEAK INTO SESSION 1207: PERMITTED.'
      : 'A grey box with a green screen and a slot, labelled MICROFICHE READER (DONATED). It prints index cards for books the archivist can\'t find in any catalogue.'
        + (act === 2 ? ' The ink on the year is fresh now. The years are after this one.' : ' The year on every card is smudged.')));
    const can = printable(st);
    if (can.length) {
      const p = btn('Print a card', () => {
        const s2 = read();
        s2.printed.push(can[0]);
        keep(s2);
        if (window.Coe && Coe.refresh) Coe.refresh();
        if (ctx.redraw) ctx.redraw();
      });
      b.appendChild(p);
    } else if (!st.printed.length) b.appendChild(el('p', 'tw-small', 'It hums. The slot is empty. The archivist says it only prints for people who have been to the clinic.'));
    st.printed.forEach(k => {
      const card = el('div', 'lh-card ex-doc');
      card.innerHTML = futureHtml(k, act);
      b.appendChild(card);
    });
    if (st.printed.length) b.appendChild(el('p', 'tw-small', 'Filed in the Center of Excellence folder on your desk.'));
  }

  window.Clinic = { place, arrive, docs, stamp, open: openClinic, MODELS, CASES, LENS, FUTURE, KEY, read };
})();
