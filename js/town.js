// Lindeveld (STORY.md, "The town and the money"; spoilers): the evening walk home from the lift.
// A rendered town (tools/office/town.py) with four places of its own: The Junction (the station café, where your past clients drop
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
    'bus-drivers-dutch': { by: 'A ten-ride bus card, half punched', said: 'They are not rude. They were lost.',
      right: 'The drivers on the Jodoigne lines answer in Dutch now. Language complaints went from seven a month to one.',
      wrong: 'All 71 drivers did the friendliness programme. Passengers still cannot get an answer in Dutch on the 360.' },
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
    'police-statements': { by: 'A cap with a chequered band, on the bar', said: 'Sometimes the request is the answer. Write that down.',
      right: 'The young inspectors write the six elements in. One statement in fourteen comes back now, not one in five.',
      wrong: 'The whole zone did the quality programme. The prosecutor still sends back one statement in five.' },
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
      items: [{ label: 'A clipboard on the bar', at: 'bar', text: 'MONDAY CHECK, filed by the operator. Three months after each request, somebody walks through town and writes down what changed.\n\n'
        + (checks.length ? checks.map(c => c.who + ': ' + c.line).join('\n') : 'Nothing filed for your cases yet.')
        + '\n\nThis is what the Learning House measures. Not the course. The town, three months later.' }]
    } : {
      title: 'The Junction',
      intro: 'The café on the station square: a fruit machine, beer mats, the departures board over the bar. Your old clients drop in after work, and they tell you how it went.'
        + (act >= 2 && regulars.length ? ' They always sit in the same seats.' : ''),
      items: [{ label: 'The departures board', at: 'board', text: '17:52 Brussels-North · 18:07 Antwerp-Central · 18:22 Ghent-St-Peter\'s. All on time, for once.'
        + (act >= 2 ? '\n\nAt the top, still: 08:56 Brussels-North · DELAYED.' : ''), note: act >= 2 ? 'train' : null }]
        .concat(regulars.length ? regulars.map((c, i) => ({ label: c.by, at: 'seat' + (i + 1), text: '"' + c.said + '"\n\nThree months later: ' + c.line }))
          : [{ label: 'The regulars', at: 'bar', text: 'Nobody you know yet. Finish a week, and your clients start dropping in.' }])
        .concat(act >= 2 && regulars.length ? [{ label: 'The regulars, again', at: 'bar', text: 'You have heard every one of these sentences before. Word for word, in the same voice, from the same seat.', note: 'regulars' }] : [])
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
        { label: 'The answering machine', at: 'machine', text: machine, note: act === 2 && monday ? 'machine' : null },
        ctx.weeks ? { label: 'A brown envelope from Payroll', at: 'envelope', build: box => {
          box.appendChild(payslip({ weeks: ctx.weeks, act, ending: ctx.ending }));
          if (act >= 2 && ctx.weeks >= 1) box.appendChild(el('p', 'tw-sticky', 'A yellow sticky note in Mieke\'s writing: "Nobody here gets paid for being right. That\'s why we can afford to be."'));
        } } : { label: 'The letterbox', at: 'envelope', text: 'Nothing yet. Payroll pays on Friday, in a brown envelope.' },
        { label: 'The scrapbook', at: 'scrapbook', text: (act >= 3 ? 'ARCHIVE ITEM 0977. ' : '') + (ctx.scrap.length ? 'Your cases, cut out and glued in:\n\n' + ctx.scrap.join('\n') : 'Empty so far. Your cases go in here when a week is done.') },
        { label: 'The Lindeveld Home Catalogue', at: 'catalogue', build: box => catalogue(box, ctx) }
      ]
    };

    const fatima = checks.find(c => c.card === 'public-service-desk');
    P.hall = {
      title: 'City Hall',
      intro: act >= 3 ? 'The citizen service desk. The counter is a terminal now: green letters on black, and a cursor blinking.'
        : 'The citizen service desk. Appointment only since February; there is a queue anyway. A ticket machine by the door, five counters, one open.',
      items: act >= 3 ? [{ label: 'The terminal', at: 'counter', text: 'NOW SERVING: 1207\nPLEASE STATE YOUR REQUEST\n\nUnder it, very small: Monday check, citizen service desk. ' + (fatima ? fatima.line : 'Not filed.') }]
        : [
          { label: 'The ticket machine', at: 'ticket', text: act >= 2 ? 'Your ticket: 1207. Now serving: 1206.' : 'Your ticket: ' + (300 + (ctx.now.week * 37 + ctx.now.day * 11) % 500) + '. Now serving: a number a long way off.', note: act >= 2 ? 'ticket' : null },
          { label: 'Counter 3', at: 'counter', text: 'A name plate: F. EL AMRANI. A pot of pens, every one on a chain. A stack of complaint forms, neatly squared.'
            + (fatima ? '\n\nThree months later: ' + fatima.line : '') }
        ]
    };

    P.streets = {
      title: 'The streets',
      intro: act >= 3 ? 'Mill Street, the market square, the canal. Where the streets leave town the map is grey, and the corner says: 71% recovered.'
        : 'Mill Street, the market square, the canal. Lindeveld at ' + (ctx.back ? 'lunchtime' : 'half past six') + ', in the rain.' + (act >= 2 ? ' Past the ring road there is fog. There always is.' : ''),
      items: [
        { label: 'Election posters', at: 'posters', text: 'Posters from the June election are still up: Belgium still has no government. Somebody has torn the face off every single one.'
          + (act >= 3 ? '\n\nUp close, there never were faces under them. Just the paper.' : '') },
        { label: 'The bakery on Mill Street', at: 'bakery', text: act >= 3 ? 'BACK AT 7. The bread in the window is a picture of bread.'
          : act >= 2 ? 'BACK AT 7. You have never seen it open, at any hour.' : 'BACK AT 7. The bread in the window looks good.', note: act === 2 ? 'bakery' : null }
      ].concat(act >= 2 ? [{ label: 'The road out of town', at: 'road', text: act >= 3 ? 'Where the road should go on, there is nothing: NOT RECOVERED.'
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

  // ---------- Lindeveld, rendered ----------
  // The town is a Blender diorama at half past six in the rain (tools/office/town.py), one picture per
  // act; each place opens a rendered close-up with its things tagged on it, and its card beside it.
  // js/town-map.js (generated) says where every place and thing sits on the pictures, in %.
  const MEDIA = 'media/town/';
  const TMAP = () => window.TOWN_MAP || { ids: [], spots: {}, shots: {}, items: {} };
  const ORDER = ['junction', 'flat', 'hall', 'streets', 'house'];
  const LABEL = { junction: 'The Junction', flat: 'Canal Street 12', hall: 'City Hall', streets: 'Mill Street', house: 'The Learning House' };
  // Which picture of a place goes with an act.
  const PIC = (id, act) => ({ junction: act >= 3 ? 'closed' : 'open', flat: act >= 3 ? 'archive' : 'base', hall: act >= 3 ? 'terminal' : 'base', streets: String(act), house: 'base' })[id];
  // The departures board over the bar is drawn here, so its times can change without rendering again.
  const BOARD = act => act >= 3 ? [] : (act >= 2 ? [['08:56', 'Brussels-North', 'DELAYED']] : [])
    .concat([['17:52', 'Brussels-North', 'On time'], ['18:07', 'Antwerp-Central', 'On time'], ['18:22', 'Ghent-St-Peter\'s', 'On time']]);

  // The hit mask: one grey level per place, as in js/office.js.
  let mask = null, maskW = 0, maskH = 0;
  function loadMask() {
    if (mask) return;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = maskW = img.naturalWidth; c.height = maskH = img.naturalHeight;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        mask = g.getImageData(0, 0, maskW, maskH).data;
      } catch (e) { mask = null; }   // file:// taints the canvas: the labels still work
    };
    img.src = MEDIA + 'mask.png';
  }
  function placeAt(ev, stage) {
    if (!mask) return null;
    const r = stage.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / r.width * maskW), y = Math.floor((ev.clientY - r.top) / r.height * maskH);
    if (x < 0 || y < 0 || x >= maskW || y >= maskH) return null;
    return TMAP().ids[Math.round(mask[(y * maskW + x) * 4] / 20) - 1] || null;
  }

  // The projective transform taking a w x h box onto four points (top left, top right, bottom right, bottom left).
  function warp(w, h, pts) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
    src.forEach(([x, y], i) => {
      const [u, v] = pts[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    });
    for (let c = 0; c < 8; c++) {
      let m = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      [A[c], A[m]] = [A[m], A[c]]; [b[c], b[m]] = [b[m], b[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const q = b.map((v, i) => v / A[i][i]);
    return 'matrix3d(' + [q[0], q[3], 0, q[6], q[1], q[4], 0, q[7], 0, 0, 1, 0, q[2], q[5], 0, 1].join(',') + ')';
  }

  // ctx: { now: arcNow, weeks: finished normal weeks, checks, scrap, revealed, ending, tomorrow, onDone, card(id), dayKey, when,
  //        back: during the working day, the way back to the office (no bed then) }
  function open(ctx) {
    ctx.act = ctx.revealed ? 3 : ctx.now.week >= 5 ? 2 : 1;
    const act = ctx.act, M = TMAP();
    const lay = el('div', 'town act-' + act);
    lay.id = 'town';
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-label', 'Lindeveld');
    // The diorama fills the screen; on top of it, the PC's own controls (a taskbar with the places,
    // a tray with the time and the way to bed), as on the office floor.
    const stage = el('div', 'tw-stage tw-map');
    stage.setAttribute('aria-label', 'Lindeveld, ' + (act >= 3 ? 'the archive build' : 'half past six, in the rain'));
    const rain = el('div', 'tw-rain'); rain.setAttribute('aria-hidden', 'true');
    const pic = el('picture');
    const so = el('source'); so.media = '(max-width: 900px)'; so.srcset = MEDIA + 'town-' + act + '-960.webp';
    const img = el('img', 'tw-pic'); img.src = MEDIA + 'town-' + act + '.webp';
    img.alt = 'Lindeveld from above: the canal, Canal Street, the mill of the Learning House, Mill Street, the market square with City Hall, and the station square with The Junction.';
    img.onerror = () => lay.classList.add('no-pic');
    pic.append(so, img);
    stage.append(rain, pic);
    const glows = {}, tags = {};
    ORDER.forEach(id => {
      if (id === 'house' && !window.Clinic) return;
      const sp = M.spots[id];
      if (!sp) return;
      const g = el('img', 'tw-glow'); g.alt = ''; g.src = MEDIA + 'glow-' + id + '.webp';
      Object.assign(g.style, { left: sp.rect[0] + '%', top: sp.rect[1] + '%', width: (sp.rect[2] - sp.rect[0]) + '%', height: (sp.rect[3] - sp.rect[1]) + '%' });
      const t = el('button', 'office-tag tw-tag', LABEL[id]); t.type = 'button'; t.dataset.place = id;
      t.style.left = sp.tag[0] + '%'; t.style.top = sp.tag[1] + '%';
      t.onclick = () => draw(id);
      t.onmouseenter = t.onfocus = () => light(id);
      t.onmouseleave = t.onblur = () => light(null);
      glows[id] = g; tags[id] = t;
      stage.append(g, t);
    });
    // After the reveal the corners of the map are simply not there.
    if (act >= 3) [['2%', '4%'], ['78%', '4%'], ['2%', '88%'], ['78%', '88%']].forEach(([l, t]) => { const x = el('span', 'tw-lost', 'not recovered'); x.style.left = l; x.style.top = t; stage.appendChild(x); });
    const look = el('div', 'tw-look'); look.hidden = true;
    const panel = el('div', 'tw-panel'); panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    stage.append(look, panel);
    const line = el('p', 'office-line tw-line', act >= 3 ? 'Lindeveld, as the archive kept it. Pick a place.' : ctx.back ? 'Lindeveld, lunchtime. Pick a place; your desk waits.' : 'Lindeveld, half past six. Pick a place, or go to bed.');
    // The taskbar: one button per place, then the tray.
    const bar = el('div', 'office-bar tw-bar');
    const list = el('nav', 'office-list tw-places'); list.setAttribute('aria-label', 'Places in Lindeveld');
    ORDER.forEach(id => {
      if (id === 'house' && !window.Clinic) return;
      const b = el('button', 'tw-pin'); b.type = 'button'; b.dataset.place = id; b.setAttribute('aria-label', LABEL[id]);
      b.append(el('b', null, LABEL[id]));
      b.onclick = () => draw(id);
      list.appendChild(b);
    });
    const tray = el('div', 'office-tray tw-tray');
    tray.appendChild(el('span', 'tw-when', ctx.when || ''));
    // In the evening the way out is bed (the next morning); during the day, back to the office.
    const bed = el('button', 'primary', ctx.back ? 'Back to the office' : 'Go to bed: start ' + (ctx.tomorrow || 'tomorrow')); bed.type = 'button';
    bed.onclick = () => { lay.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => { lay.remove(); const f = ctx.back || ctx.onDone; if (f) f(); }, 200); };
    tray.appendChild(bed);
    bar.append(list, tray);
    lay.append(stage, line, bar);

    let at = null;
    function light(id) {
      Object.entries(glows).forEach(([k, g]) => g.classList.toggle('on', k === id));
      Object.entries(tags).forEach(([k, t]) => t.classList.toggle('hot', k === id));
    }
    stage.addEventListener('pointermove', ev => {
      if (at || ev.target.classList.contains('tw-tag')) return;
      const id = placeAt(ev, stage);
      light(id && tags[id] ? id : null); stage.style.cursor = id && tags[id] ? 'pointer' : '';
    });
    stage.addEventListener('pointerleave', () => { if (!at) light(null); });
    stage.addEventListener('click', ev => {
      if (at || ev.target.closest('.tw-tag, .tw-panel, .tw-look')) return;
      const id = placeAt(ev, stage);
      if (id && tags[id]) draw(id);
    });

    // Back to the whole town.
    function overview() {
      at = null;
      stage.classList.remove('looking');
      look.hidden = true; look.innerHTML = '';
      panel.hidden = true;
      lay.querySelectorAll('.tw-pin').forEach(b => b.classList.remove('on'));
      line.hidden = false;
      const t = tags[ORDER.find(k => tags[k])]; if (t) t.focus({ preventScroll: true });
    }
    // A place: its close-up, its things tagged on it, its card beside it.
    function draw(id, quiet) {
      const keep = quiet ? [...panel.querySelectorAll('details[open] > summary')].map(s_ => s_.textContent) : [];
      const scroll = quiet ? panel.scrollTop : 0;
      at = id;
      light(null);
      const P = places(ctx)[id];
      if (id === 'house' && !quiet && window.Clinic) Clinic.arrive(ctx);
      lay.querySelectorAll('.tw-pin').forEach(g => g.classList.toggle('on', g.dataset.place === id));
      stage.classList.add('looking');
      line.hidden = true;
      // The picture.
      look.innerHTML = '';
      look.hidden = false;
      look.className = 'tw-look at-' + id;
      const shot = (M.shots || {})[id] || { things: {} };
      const lp = el('img', 'tw-look-pic'); lp.src = MEDIA + id + '-' + PIC(id, act) + '.webp'; lp.alt = P.title;
      lp.onerror = () => look.classList.add('no-pic');
      look.appendChild(lp);
      // What you bought from the Home Catalogue stands in the flat.
      if (id === 'flat') owned().forEach(k => {
        const r = (M.items || {})[k];
        if (!r) return;
        const it = el('img', 'tw-item-pic'); it.alt = ''; it.src = MEDIA + 'item-' + k + '.webp';
        Object.assign(it.style, { left: r[0] + '%', top: r[1] + '%', width: (r[2] - r[0]) + '%', height: (r[3] - r[1]) + '%' });
        look.appendChild(it);
      });
      if (id === 'junction' && shot.board && BOARD(act).length) {
        const bd = el('div', 'tw-board'); bd.setAttribute('aria-hidden', 'true');
        BOARD(act).forEach(r => { const rw = el('div', 'tw-board-row' + (r[2] === 'DELAYED' ? ' late' : '')); r.forEach(c => rw.appendChild(el('span', null, c))); bd.appendChild(rw); });
        look.appendChild(bd);
        const fit = () => { const w = look.clientWidth, h = look.clientHeight; if (w && h) bd.style.transform = warp(600, 116, shot.board.map(([x, y]) => [x / 100 * w, y / 100 * h])); };
        fit(); requestAnimationFrame(fit);
        ctx._fit = fit;
      }
      if (id === 'streets') look.appendChild(el('div', 'tw-rain'));
      const back = el('button', 'office-look-back tw-back', '← Lindeveld'); back.type = 'button'; back.onclick = overview;
      look.appendChild(back);
      // The card.
      panel.innerHTML = '';
      panel.hidden = false;
      const head = el('div', 'titlebar');
      const x = el('button', 'tb close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Back to the map'); x.onclick = overview;
      head.append(el('span', 'tt', P.title + ' - Lindeveld'), x);
      const body = el('div', 'tw-card-body');
      body.append(el('h3', null, P.title), el('p', 'tw-intro', P.intro));
      const used = new Set();
      P.items.forEach(it => {
        const d = el('details', 'tw-item');
        const sum = el('summary', null, it.label);
        d.appendChild(sum);
        const box = el('div', 'tw-text');
        if (it.build) it.build(box); else box.textContent = it.text;
        d.appendChild(box);
        if (it.note && window.Arc) {
          const nid = 'town:' + it.note, n = el('button', null, Arc.noted(nid) ? '📓 In your notebook' : '📓 Note it'); n.type = 'button';
          n.disabled = Arc.noted(nid);
          n.onclick = () => { Arc.note(nid, SEAMS[it.note]); n.textContent = '📓 In your notebook'; n.disabled = true; };
          d.appendChild(n);
        }
        if (keep.includes(it.label)) d.open = true;
        body.appendChild(d);
        // A label on the picture where the thing is, if the render has it.
        const th = it.at && shot.things[it.at];
        if (th && !used.has(it.at)) {
          used.add(it.at);
          const t = el('button', 'office-tag thing tw-thing', it.label); t.type = 'button';
          t.style.left = th.tag[0] + '%'; t.style.top = th.tag[1] + '%';
          t.onclick = () => { d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); };
          look.appendChild(t);
        }
      });
      panel.append(head, body);
      if (quiet) panel.scrollTop = scroll;
      untangle(look);
      if (!quiet) back.focus({ preventScroll: true });
    }
    // Labels that land on top of each other move up until they are clear.
    function untangle(root) {
      const ts = [...root.querySelectorAll(':scope > .tw-thing')];
      const placed = [];
      ts.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top).forEach(t => {
        for (let n = 0; n < 6; n++) {
          const r = t.getBoundingClientRect();
          const hit = placed.find(q => r.left < q.right + 4 && r.right > q.left - 4 && r.top < q.bottom + 4 && r.bottom > q.top - 4);
          if (!hit) break;
          t.style.marginTop = (parseFloat(t.style.marginTop || 0) - (r.bottom - hit.top + 6)) + 'px';
        }
        placed.push(t.getBoundingClientRect());
      });
    }
    const key = ev => { if (ev.key === 'Escape' && at && document.getElementById('town') === lay && !document.querySelector('.lh')) { ev.preventDefault(); overview(); } };
    document.addEventListener('keydown', key);
    window.addEventListener('resize', () => { if (ctx._fit && at === 'junction') ctx._fit(); });
    ctx.redraw = () => { if (at) draw(at, true); };
    ctx.played = ctx.checks.map(c => c.card);
    document.body.appendChild(lay);
    loadMask();
    requestAnimationFrame(() => lay.classList.add('in'));
    bed.focus({ preventScroll: true });
  }

  window.Town = { open, check, CHECK, SEAMS, payslip, NET, balance, CATALOGUE, SIGN_KEY };
})();
