// Lindeveld (STORY.md, "The town and the money"; spoilers): the evening walk home from the lift.
// Four places on a Doors Maps window: The Junction (the station café, where your past clients drop
// in and tell you how it went three months later: the Monday check), your flat on Canal Street
// (answering machine, pay envelope, scrapbook, a catalogue), City Hall (Fatima's counter) and the
// streets. The town is faceless too: people are known by their things.
// Act 1 (arc weeks 1 to 4) is a plain 2007 town. Act 2 (weeks 5 to 7) shows the seams, each one a
// thing you can note. After the reveal it is the archive it always was.
// Pay is flat: the same for a 41 and a 91, derived from finished normal weeks, never stored.
// Money buys comfort for the flat, never points. Hard mode and Try one case never come here.
(function () {
  const OWN_KEY = 'intake-flat';
  const SIGN_KEY = 'intake-signoffs';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };

  // One week's pay, in euro. Everyone on your grade gets the same, whatever the score.
  const PAY = [['Gross pay', 640], ['Social security (13.07%)', -83.65], ['Withholding tax', -142.3], ['Rent, Canal Street 12 (staff housing)', -125]];
  const NET = PAY.reduce((a, [, v]) => a + v, 0);
  const REMARKS = ['Welcome to Synergix.', 'Your photo is to follow.', 'Please return the stapler to Facilities.', 'None.',
    'Your parking permit is to follow.', 'None.', 'Please do not microwave fish on floor 4.', 'None.'];
  const CATALOGUE = [
    { id: 'lamp', label: 'A reading lamp', price: 24.95, line: 'a reading lamp, on' },
    { id: 'kettle', label: 'A kettle that whistles', price: 19.99, line: 'a kettle that whistles' },
    { id: 'plant', label: 'A plant that survives anything', price: 12.5, line: 'a plant that is, against the odds, alive' },
    { id: 'radio', label: 'A radio with a cassette deck', price: 34.5, line: 'a radio playing quietly' },
    { id: 'rug', label: 'A rug for the cold floor', price: 49, line: 'a rug on the cold floor' },
    { id: 'armchair', label: 'A proper armchair', price: 189, line: 'a proper armchair by the window' }
  ];
  const owned = () => { try { return JSON.parse(get(OWN_KEY) || '[]').filter(id => CATALOGUE.some(c => c.id === id)); } catch (e) { return []; } };
  const spent = () => owned().reduce((a, id) => a + CATALOGUE.find(c => c.id === id).price, 0);
  const balance = weeks => Math.round((weeks * NET - spent()) * 100) / 100;
  const eur = n => (n < 0 ? '-' : '') + Math.abs(n).toFixed(2);

  // The Monday check: each client, known by a thing, at The Junction three months later.
  // `said` is what they always say; `right` when your lever call matched the case, `wrong` when it didn't.
  const CHECK = {
    'airport-ground-handling': { by: 'A hi-vis vest, KEMPAIR on the back', said: 'Different plane, same course. Cheers.',
      right: 'The 737-800 hold chart is taped inside every loader\'s cab now. The airline audit passed.',
      wrong: 'All 62 agents have a fresh certificate. A bag for Malaga went to Faro on Tuesday.' },
    'car-dealer-aftersales': { by: 'A key ring with five dealership tags', said: 'My customers do not want a smile. They want their car at five.',
      right: 'The advisors phone customers when a job runs late now. Complaints have halved.',
      wrong: 'The advisors smile beautifully. The cars are still not ready at five.' },
    'construction-cost-reports': { by: 'A yellow hard hat on a bar stool', said: 'It is not the Excel. It was never the Excel.',
      right: 'New site managers spend an afternoon with finance in their first month. The forecasts come in on time.',
      wrong: 'Twenty site managers can do pivot tables. The estimate-to-complete column is still empty.' },
    'education-ai-cheating': { by: 'A tote bag full of marked papers', said: 'Nine thousand students, and it is always the same three programmes.',
      right: 'The three business programmes rewrote their assignments. Fraud cases there are down by half.',
      wrong: 'All 9,000 students clicked through the honesty module. The fraud is in the same 31 course units.' },
    'energy-tablet-resistance': { by: 'A muddy handheld in a rubber case', said: 'They can use it fine. Not where there is no signal.',
      right: 'The rural routes got proper coverage maps. The technicians close their jobs on the handheld.',
      wrong: '320 technicians have a mindset certificate. The rural jobs still go on paper.' },
    'fashion-retail-shrinkage': { by: 'A Nora & Lou carrier bag', said: 'It is not walking out of the front door, you know.',
      right: 'The stores count deliveries again. Shrinkage is back where it was.',
      wrong: '400 shop staff can spot a shoplifter. The stock still goes missing at the back door.' },
    'finance-tied-selling': { by: 'A Meridia Bank pen on a little chain', said: 'The targets wrote that script, not the bankers.',
      right: 'The bundle is gone from the bankers\' targets. The complaints pile is thin.',
      wrong: '600 bankers passed the refresher. Customers are still told the insurance is compulsory.' },
    'food-hygiene-audit': { by: 'A hairnet sticking out of a coat pocket', said: 'Ask the night crew. Nobody ever asks the night crew.',
      right: 'The night cleaning crew has its own checklist, in its own languages. The swabs pass.',
      wrong: '160 operators passed the HACCP test. The swabs still fail at start-up.' },
    'healthcare-sepsis': { by: 'A nurse\'s fob watch', said: 'They know the protocol. It is three in the morning that is the problem.',
      right: 'Night nurses call the on-call doctor on the score alone, no questions asked. Transfers come earlier.',
      wrong: '100% completion on the e-learning. At night, the nurses still wait.' },
    'home-care-turnover': { by: 'A bicycle with two panniers', said: 'Forty minutes between clients. Unpaid.',
      right: 'The carers plan their rounds by neighbourhood again. Fewer of them leave.',
      wrong: '310 carers did the resilience training. Eleven more left over the summer.' },
    'hotel-upgrades': { by: 'A brass badge: RECEPTION', said: 'The offer is on screen three. Who gets to screen three?',
      right: 'The upgrade offer is on the first check-in screen. Upgrades are back.',
      wrong: '24 receptionists can upsell. The offer is still two screens deep.' },
    'insurance-claims-backlog': { by: 'A mug: WORLD\'S BEST CLAIMS HANDLER', said: 'Seventeen years of motor claims, and now I do roofs.',
      right: 'Former motor handlers got a mentor and a household checklist. Household files take 30 days.',
      wrong: '140 handlers have a time management certificate. Household files still take 47 days.' },
    'it-helpdesk-reopen': { by: 'A headset round the neck', said: 'Close it fast, open it again. That is the contract.',
      right: 'The provider is paid for tickets that stay closed. Reopens are down.',
      wrong: '40 people are ITIL certified. The provider still closes fast and reopens later.' },
    'law-firm-juniors': { by: 'A red pen behind an ear', said: 'Nobody reads their drafts before the partners do.',
      right: 'A senior reads the corporate juniors\' drafts again, like before 2005. Rewrites are down.',
      wrong: '22 juniors did the legal writing course. The partners still rewrite the drafts at night.' },
    'logistics-night-shift': { by: 'A reach-truck key on a yellow fob', said: 'Two to four in the morning. Week four. Always.',
      right: 'Agency drivers on nights get a buddy for their first six weeks. The near-misses are down.',
      wrong: '220 staff watched the refresher in the break room. The near-misses are still between two and four.' },
    'mfg-green-belts': { by: 'A Green Belt certificate, folded in a wallet', said: 'We passed. Then nobody gave us the time.',
      right: 'Each team lead has two hours a week for one project. Line 3 opened the first one since 2006.',
      wrong: '22 team leads have a second Green Belt. Not one project is open.' },
    'newspaper-going-online': { by: 'A notebook with a court pass clipped to it', said: 'Nobody gets a byline for the website.',
      right: 'Web stories count in the morning meeting now. The site has the news before the paper.',
      wrong: '64 journalists can write for the web. They still save the scoop for print.' },
    'ngo-volunteer-churn': { by: 'A phone-line rota on a clipboard', said: 'Three months on the phone before you meet anyone. That is the rule.',
      right: 'New volunteers can start with a home visit. More of them stay.',
      wrong: '35 coordinators did the leadership course. Volunteers still leave in month three.' },
    'pharma-read-and-sign': { by: 'A cleanroom glove in a pocket', said: 'You cannot read your way into an isolator.',
      right: 'New isolator operators learn at the line with a buddy. Deviations are down.',
      wrong: '140 operators signed 23 SOPs again. Line 4 had two deviations in August.' },
    'port-crane-safety': { by: 'A crane driver\'s thermos', said: 'It is the second shift. It is always the second shift.',
      right: 'Double shifts are capped and the bonus counts safe moves. Late-shift incidents are down.',
      wrong: 'The safety culture posters are up on the quay. The incidents still come at the end of double shifts.' },
    'public-service-desk': { by: 'A queue ticket', said: 'Appointment only. There is a queue anyway.',
      right: 'Walk-in mornings are back, twice a week. Complaints are down.',
      wrong: '35 clerks did the friendliness training. The queue is still outside at eight.' },
    'tech-sales-motivation': { by: 'A fleece from an off-site', said: 'Lovely speaker. Same commission plan.',
      right: 'The clawback rule is fixed. The reps sell the deals customers need.',
      wrong: 'The off-site was great, everyone says so. The discounted deals still sit in the pipeline.' },
    'telecom-first-call': { by: 'A contact-centre headset bag', said: 'Twenty-five euro. Nobody told them they could.',
      right: 'New agents know they can give a 25 euro credit themselves. Transfers have halved.',
      wrong: 'New agents did more product training. They still transfer every billing complaint.' }
  };
  // The line for one request: { by, said, line }. `call` is the lever call you made, if it was kept.
  function check(req, card) {
    const c = CHECK[req.card];
    if (!c) return null;
    const want = card && card.learningIsTheAnswer;
    const line = req.call && want ? (req.call === want ? c.right : c.wrong) : 'They raise a glass at you. "Still working on it."';
    return { by: c.by, said: c.said, line, who: req.who, card: req.card };
  }

  // Seams you can note (Arc's notebook pairs them up).
  const SEAMS = {
    train: { who: 'The Junction', label: '08:56, delayed', text: 'The board over the bar: 08:56 to Brussels-North, DELAYED. It said that yesterday evening too.' },
    regulars: { who: 'The Junction', label: 'Word for word', text: 'The regulars say the same thing every evening, word for word.' },
    machine: { who: 'Your flat', label: '3 September 2007', text: 'The answering machine, every Monday: "Monday 3 September 2007, 08:12. It is HR. Your first day is today."' },
    ticket: { who: 'City Hall', label: 'Ticket 1207', text: 'The queue ticket at City Hall says 1207. It said 1207 last time.' },
    bakery: { who: 'Mill Street', label: 'BACK AT 7', text: 'The bakery on Mill Street is never open. The sign says BACK AT 7, at any hour.' },
    edge: { who: 'The streets', label: 'Fog', text: 'Fog at the end of every road out of town. The bus to Brussels turns back at the ring road.' },
    reader: { who: 'The Learning House', label: 'The grey reader', text: 'The machine in the corner prints index cards for books that come out years from now. The ink on the year is fresh.' }
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // The pay envelope, as a payslip. ctx: { weeks, act, ending }
  function payslip(ctx) {
    const n = ctx.weeks;
    const rows = ['SYNERGIX NV · PAYROLL · WEEK ' + n, 'Employee no. 1207 · Name: to follow', ''];
    const pad = (k, v) => k + ' ' + '.'.repeat(Math.max(2, 44 - k.length - v.length)) + ' ' + v;
    PAY.forEach(([k, v]) => rows.push(pad(k, eur(v))));
    rows.push(pad('Net pay (EUR)', eur(NET)), '', 'Pay does not depend on your scores. Nobody\'s does.', 'HR remarks: ' + REMARKS[(n - 1) % REMARKS.length]);
    if (ctx.act >= 2) rows.push('', 'Immersion costs: covered by the Learning House.');
    if (ctx.act >= 3) rows.push('Sign-offs: ' + (get(SIGN_KEY) === '1' ? 1 : 0));
    if (ctx.ending === 'logoff') rows.push('Final settlement: 0.00 (archive currency)');
    rows.push('', pad('In your account', eur(balance(n))));
    return el('pre', 'tw-slip', rows.join('\n'));
  }

  // ---------- the places ----------
  // Each place: { title, intro, items: [{ label, text, note?, build? }] }
  function places(ctx) {
    const act = ctx.act, monday = ctx.now.day === 0;
    const checks = ctx.checks;
    const regulars = checks.filter(c => c.card !== 'public-service-desk').slice(0, 4);
    const P = {};

    P.junction = act >= 3 ? {
      title: 'The Junction',
      intro: 'Chairs on the tables. One lamp on over the bar. The departures board is blank, and nobody is in.',
      items: [{ label: 'A clipboard on the bar', text: 'MONDAY CHECK, filed by the operator. Three months after each request, somebody walks through town and writes down what changed.\n\n'
        + (checks.length ? checks.map(c => c.who + ': ' + c.line).join('\n') : 'Nothing filed for your cases yet.')
        + '\n\nThis is what the Learning House measures. Not the course. The town, three months later.' }]
    } : {
      title: 'The Junction',
      intro: 'The café on the station square: a fruit machine, beer mats, the departures board over the bar. Your old clients drop in after work, and they tell you how it went.'
        + (act >= 2 && regulars.length ? ' They always sit in the same seats.' : ''),
      items: [{ label: 'The departures board', text: '17:52 Brussels-North · 18:07 Antwerp-Central · 18:22 Ghent-St-Peter\'s. All on time, for once.'
        + (act >= 2 ? '\n\nAt the top, still: 08:56 Brussels-North · DELAYED.' : ''), note: act >= 2 ? 'train' : null }]
        .concat(regulars.length ? regulars.map(c => ({ label: c.by, text: '"' + c.said + '"\n\nThree months later: ' + c.line }))
          : [{ label: 'The regulars', text: 'Nobody you know yet. Finish a week, and your clients start dropping in.' }])
        .concat(act >= 2 && regulars.length ? [{ label: 'The regulars, again', text: 'You have heard every one of these sentences before. Word for word, in the same voice, from the same seat.', note: 'regulars' }] : [])
    };

    const mine = owned().map(id => CATALOGUE.find(c => c.id === id).line);
    const machine = act >= 3 ? '1 message. "Monday 3 September 2007, 08:12. Hi, it is HR at Synergix. Your first day is today."\n\nThe tape has a small white label: ARCHIVE ITEM 0412.'
      : act >= 2 && monday ? '1 new message. "Monday 3 September 2007, 08:12. Hi, it is HR at Synergix. Welcome! Your first day is today. Bring your passport for the photo."\n\nThe machine\'s clock says today. The message says 3 September.'
      : ['1 new message. "It is Synergix Housing. Welcome to Canal Street 12. The boiler is temperamental. Kick it, gently."',
        '1 new message. "Hello, this is the video shop. Your tape is three days late."',
        'No new messages. The light blinks anyway.',
        '1 new message. "It is Facilities. Somebody is pressing floor 5 again. If it is you, please stop."'][(ctx.now.week + ctx.now.day) % 4];
    P.flat = {
      title: 'Your flat, Canal Street',
      intro: act >= 3 ? 'Everything has a small white label now: ARCHIVE ITEM, and a number. The bed, the chair, the window onto the canal.'
        + (mine.length ? ' Even ' + mine.join(', ') + '.' : '')
        : 'Canal Street 12, second floor. Synergix staff housing: a bed, a chair, a window onto the canal'
        + (mine.length ? ', ' + mine.join(', ') : '') + '. The rain is louder in here.',
      items: [
        { label: 'The answering machine', text: machine, note: act === 2 && monday ? 'machine' : null },
        ctx.weeks ? { label: 'A brown envelope from Payroll', build: box => {
          box.appendChild(payslip({ weeks: ctx.weeks, act, ending: ctx.ending }));
          if (act >= 2 && ctx.weeks >= 1) box.appendChild(el('p', 'tw-sticky', 'A yellow sticky note in Mieke\'s writing: "Nobody here gets paid for being right. That\'s why we can afford to be."'));
        } } : { label: 'The letterbox', text: 'Nothing yet. Payroll pays on Friday, in a brown envelope.' },
        { label: 'The scrapbook', text: (act >= 3 ? 'ARCHIVE ITEM 0977. ' : '') + (ctx.scrap.length ? 'Your cases, cut out and glued in:\n\n' + ctx.scrap.join('\n') : 'Empty so far. Your cases go in here when a week is done.') },
        { label: 'The Lindeveld Home Catalogue', build: box => catalogue(box, ctx) }
      ]
    };

    const fatima = checks.find(c => c.card === 'public-service-desk');
    P.hall = {
      title: 'City Hall',
      intro: act >= 3 ? 'The citizen service desk. The counter is a terminal now: green letters on black, and a cursor blinking.'
        : 'The citizen service desk. Appointment only since February; there is a queue anyway. A ticket machine by the door, five counters, one open.',
      items: act >= 3 ? [{ label: 'The terminal', text: 'NOW SERVING: 1207\nPLEASE STATE YOUR REQUEST\n\nUnder it, very small: Monday check, citizen service desk. ' + (fatima ? fatima.line : 'Not filed.') }]
        : [
          { label: 'The ticket machine', text: act >= 2 ? 'Your ticket: 1207. Now serving: 1206.' : 'Your ticket: ' + (300 + (ctx.now.week * 37 + ctx.now.day * 11) % 500) + '. Now serving: a number a long way off.', note: act >= 2 ? 'ticket' : null },
          { label: 'Counter 3', text: 'A name plate: F. EL AMRANI. A pot of pens, every one on a chain. A stack of complaint forms, neatly squared.'
            + (fatima ? '\n\nThree months later: ' + fatima.line : '') }
        ]
    };

    P.streets = {
      title: 'The streets',
      intro: act >= 3 ? 'Mill Street, the market square, the canal. Where the streets leave town the map is grey, and the corner says: 71% recovered.'
        : 'Mill Street, the market square, the canal. Lindeveld at half past six, in the rain.' + (act >= 2 ? ' Past the ring road there is fog. There always is.' : ''),
      items: [
        { label: 'Election posters', text: 'Posters from the June election are still up: Belgium still has no government. Somebody has torn the face off every single one.'
          + (act >= 3 ? '\n\nUp close, there never were faces under them. Just the paper.' : '') },
        { label: 'The bakery on Mill Street', text: act >= 3 ? 'BACK AT 7. The bread in the window is a picture of bread.'
          : act >= 2 ? 'BACK AT 7. You have never seen it open, at any hour.' : 'BACK AT 7. The bread in the window looks good.', note: act === 2 ? 'bakery' : null }
      ].concat(act >= 2 ? [{ label: 'The road out of town', text: act >= 3 ? 'Where the road should go on, there is nothing: NOT RECOVERED.'
        : 'Fog at the end of every road out of town. The bus to Brussels turns back at the ring road. The driver does not seem to mind.', note: act === 2 ? 'edge' : null }] : [])
    };
    // The Learning House (js/clinic.js): the Case Clinic and the grey reader.
    if (window.Clinic) P.house = Clinic.place(ctx);
    return P;
  }

  function catalogue(box, ctx) {
    box.innerHTML = '';
    box.appendChild(el('p', null, 'Autumn 2007. Free delivery in Lindeveld. In your account: ' + eur(balance(ctx.weeks)) + ' EUR.'));
    const list = el('ul', 'tw-cat');
    CATALOGUE.forEach(c => {
      const li = el('li');
      const has = owned().includes(c.id);
      li.append(el('span', null, c.label + ' · ' + eur(c.price)));
      const b = el('button', null, has ? 'Delivered' : 'Order'); b.type = 'button';
      b.disabled = has || balance(ctx.weeks) < c.price;
      b.onclick = () => { set(OWN_KEY, JSON.stringify(owned().concat(c.id))); catalogue(box, ctx); if (ctx.redraw) ctx.redraw(); };
      li.appendChild(b);
      list.appendChild(li);
    });
    box.appendChild(list);
    box.appendChild(el('p', 'tw-small', 'It makes the flat nicer. It does not make you any better at your job.'));
  }

  // ---------- the map ----------
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    if (text != null) e.textContent = text;
    return e;
  }
  // Where each place sits on the 800 x 500 map, and its label.
  const PINS = { junction: [600, 120, 'The Junction'], flat: [230, 330, 'Canal Street 12'], hall: [430, 250, 'City Hall'], streets: [320, 160, 'Mill Street'], house: [520, 338, 'The Learning House'] };
  function map(act, pick) {
    const s = svg('svg', { viewBox: '0 0 800 500', class: 'tw-map', role: 'group', 'aria-label': 'Map of Lindeveld' });
    // Drawn well past the 800 x 500 box, so a window of any shape shows map and not a border.
    s.appendChild(svg('rect', { x: -600, y: -400, width: 2000, height: 1300, class: 'tw-land' }));
    // The canal, the railway, the ring road, a few streets, blocks.
    s.appendChild(svg('path', { d: 'M-600 470 L -10 420 C 140 380 220 400 300 360 S 520 300 620 330 S 760 380 820 360 L 1400 330', class: 'tw-canal' }));
    s.appendChild(svg('path', { d: 'M-600 50 L 1400 180', class: 'tw-rail' }));
    s.appendChild(svg('ellipse', { cx: 400, cy: 250, rx: 370, ry: 225, class: 'tw-ring' }));
    ['M120 250 L 700 250', 'M400 40 L 400 470', 'M180 140 L 560 380', 'M600 120 L 430 250', 'M230 330 L 430 250', 'M320 160 L 520 170']
      .forEach(d => s.appendChild(svg('path', { d, class: 'tw-street' })));
    [[460, 200, 60, 34], [350, 270, 40, 50], [250, 190, 50, 30], [500, 280, 70, 40], [160, 280, 44, 34], [540, 190, 40, 30], [300, 400, 60, 28], [620, 260, 50, 40]]
      .forEach(([x, y, w, h]) => s.appendChild(svg('rect', { x, y, width: w, height: h, class: 'tw-block' })));
    s.appendChild(svg('rect', { x: 560, y: 98, width: 90, height: 24, class: 'tw-station' }));
    s.appendChild(svg('text', { x: 400, y: 485, class: 'tw-small-label' }, 'Synergix NV · Ring Road 4'));
    s.appendChild(svg('text', { x: 100, y: 440, class: 'tw-small-label' }, 'Canal'));
    s.appendChild(svg('text', { x: 605, y: 92, class: 'tw-small-label' }, 'Station'));
    s.appendChild(svg('text', { x: 470, y: 228, class: 'tw-small-label' }, 'Market Square'));
    // Fog past the ring road from act 2; after the reveal it is simply not there.
    if (act >= 2) {
      const d = svg('defs');
      const g = svg('radialGradient', { id: 'tw-fog', gradientUnits: 'userSpaceOnUse', cx: 400, cy: 250, r: 560 });
      g.append(svg('stop', { offset: '58%', 'stop-color': act >= 3 ? '#9a9a9a' : '#f4f4f0', 'stop-opacity': 0 }), svg('stop', { offset: '100%', 'stop-color': act >= 3 ? '#9a9a9a' : '#f4f4f0', 'stop-opacity': act >= 3 ? 1 : 0.92 }));
      d.appendChild(g); s.appendChild(d);
      s.appendChild(svg('rect', { x: -600, y: -400, width: 2000, height: 1300, fill: 'url(#tw-fog)', 'pointer-events': 'none' }));
      if (act >= 3) [[20, 30], [640, 30], [20, 490], [640, 490]].forEach(([x, y]) => s.appendChild(svg('text', { x, y, class: 'tw-lost' }, 'not recovered')));
    }
    Object.entries(PINS).forEach(([id, [x, y, label]]) => {
      if (id === 'house' && !window.Clinic) return;
      const g = svg('g', { class: 'tw-pin', tabindex: 0, role: 'button', 'data-place': id, 'aria-label': label });
      // A wider ring nobody sees, so a finger on a phone finds the pin.
      g.append(svg('circle', { cx: x, cy: y, r: 26, class: 'tw-hit' }), svg('circle', { cx: x, cy: y, r: 9 }), svg('text', { x: x + 14, y: y + 5 }, label));
      g.addEventListener('click', () => pick(id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id); } });
      s.appendChild(g);
    });
    return s;
  }

  // ctx: { now: arcNow, weeks: finished normal weeks, checks, scrap, revealed, ending, tomorrow, onDone, card(id), dayKey }
  function open(ctx) {
    ctx.act = ctx.revealed ? 3 : ctx.now.week >= 5 ? 2 : 1;
    const lay = el('div', 'town');
    lay.id = 'town';
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', 'Lindeveld');
    const w = el('div', 'tw-win');
    const head = el('div', 'titlebar');
    head.append(el('span', null, '🗺'), el('span', 'tt', 'Lindeveld - Doors Maps' + (ctx.act >= 3 ? ' (archive 71% recovered)' : '')));
    w.appendChild(head);
    const body = el('div', 'tw-body');
    const panel = el('div', 'tw-panel');
    panel.setAttribute('aria-live', 'polite');
    let at = 'flat';
    const draw = (id, quiet) => {
      at = id;
      const P = places(ctx)[id];
      if (id === 'house' && !quiet && window.Clinic) Clinic.arrive(ctx);
      panel.innerHTML = '';
      lay.querySelectorAll('.tw-pin').forEach(g => g.classList.toggle('on', g.dataset.place === id));
      panel.append(el('h3', null, P.title), el('p', 'tw-intro', P.intro));
      P.items.forEach(it => {
        const d = el('details', 'tw-item');
        const sum = el('summary', null, it.label);
        d.appendChild(sum);
        const box = el('div', 'tw-text');
        if (it.build) it.build(box); else box.textContent = it.text;
        d.appendChild(box);
        if (it.note && window.Arc) {
          const id = 'town:' + it.note, n = el('button', null, Arc.noted(id) ? '📓 In your notebook' : '📓 Note it'); n.type = 'button';
          n.disabled = Arc.noted(id);
          n.onclick = () => { Arc.note(id, SEAMS[it.note]); n.textContent = '📓 In your notebook'; n.disabled = true; };
          d.appendChild(n);
        }
        panel.appendChild(d);
      });
    };
    ctx.redraw = () => draw(at, true);
    ctx.played = ctx.checks.map(c => c.card);
    body.append(map(ctx.act, draw), panel);
    w.appendChild(body);
    const bar = el('div', 'tw-bar');
    bar.appendChild(el('span', 'tw-when', ctx.when || ''));
    const bed = el('button', 'primary', 'Go to bed: start ' + (ctx.tomorrow || 'tomorrow')); bed.type = 'button';
    bed.onclick = () => { lay.classList.remove('in'); setTimeout(() => { lay.remove(); if (ctx.onDone) ctx.onDone(); }, 400); };
    bar.appendChild(bed);
    w.appendChild(bar);
    lay.appendChild(w);
    document.body.appendChild(lay);
    draw('flat');
    requestAnimationFrame(() => lay.classList.add('in'));
    bed.focus({ preventScroll: true });
  }

  window.Town = { open, check, CHECK, SEAMS, payslip, NET, balance, CATALOGUE, SIGN_KEY };
})();
