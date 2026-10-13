// The story: Synergix e-Learning Solutions, autumn 2007. Light on purpose: a mail from Darren each
// week, a real headline now and then, and Darren's memo on Friday. Static, trusted text.
(function () {
  const START = Date.UTC(2007, 8, 3);                 // Monday 3 September 2007, week 1
  const DAY = 24 * 3600 * 1000;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SIGN = '\n\nDarren\nCEO, Synergix e-Learning Solutions\nSent from my BlackBerry';

  const dateOf = (weekNo, day) => new Date(START + ((Math.max(1, weekNo) - 1) * 7 + (day || 0)) * DAY);
  const fmt = d => DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  const day = (weekNo, d) => fmt(dateOf(weekNo, d));

  const WEEKS = {
    1: { subject: 'Welcome aboard (please read)', body: 'Welcome to Synergix!\n\nQuick context, because I am between flights. Last month Global Multimedia Solutions took the Brugmann account off us with a 40-slide deck and an avatar called Max. We are not doing avatars.\n\nYou are on four weeks\' probation, like everyone. Three requests this week, and on Friday you pitch your best one to the board. Make every request count.\n\nAnd when the CoE e-learning lands in your inbox, do it. Mieke made it, and she checks.' },
    2: { subject: 'FW: Proposal from GMS - can we match this?', body: 'Client forwarded this. Can we do it cheaper?\n\nDon\'t answer that. Find out what they actually need before Max the avatar comes back.\n\n----- Forwarded message -----\nFrom: Global Multimedia Solutions\nSubject: Your learning journey, now on CD-ROM!\n\nLeverage our award-winning edutainment platform! 3D avatars! Flash animations! Content adapted to every learning style! 97% completion GUARANTEED!*\n\n*Completion means the module was opened.' },
    3: { subject: 'Shortlisted!!', body: 'We are on the shortlist for the Halvorsen Group tender. It is a big one. GMS is on it too.\n\nFriday\'s board room is your dress rehearsal. Mieke says you are "getting there", which from her is a standing ovation.' },
    4: { subject: 'TENDER FRIDAY', body: 'Friday is the Halvorsen tender. GMS pitches at 10, you at 11.\n\nBring numbers. No avatars. If this goes well we need a team lead, and I have stopped pretending I haven\'t noticed you.' }
  };
  const LATER = [
    { subject: 'Second Life?', body: 'Saw a webinar about "Second Life campuses". Everyone gets an avatar and walks to class. Thoughts?\n\nActually don\'t answer. I know what Mieke will say.' },
    { subject: 'Podcast', body: 'Can we have a podcast? Everyone has a podcast. Even the toner people downstairs have a podcast.' },
    { subject: 'Web 2.0', body: 'The board wants "more Web 2.0". I said yes. Please find out what that means and tell me before Thursday.' },
    { subject: 'Christmas party', body: 'Reminder: this year\'s theme is "Synergy". Costumes optional, synergy mandatory.' }
  ];
  function storyMail(weekNo) {
    const m = WEEKS[weekNo] || LATER[(weekNo - 5) % LATER.length];
    return { from: 'Darren (CEO)', subject: m.subject, body: m.body + SIGN };
  }

  // Real headlines from the week you are in. Week 1 starts on Monday 3 September 2007.
  const NEWS = [
    ['2007-09-05', 'Apple unveils the iPod touch and cuts the iPhone price by $200', 'The iPhone launched in June at $599. Early buyers are getting a $100 store credit by way of apology.', 'Somebody in Sales will now ask for "an e-learning that works on the iPod".'],
    ['2007-09-07', 'Rugby World Cup kicks off in France', 'Hosts France lost the opening match to Argentina at the Stade de France.', 'Facilities reminds you that the TV in the canteen is for "corporate communications".'],
    ['2007-09-14', 'Queues outside Northern Rock as savers rush to withdraw', 'The UK bank asked the Bank of England for emergency support. Customers queued at branches to take their money out.', 'Finance would like everyone to know that our training budget is "fine".'],
    ['2007-09-18', 'US Federal Reserve cuts interest rates by half a point', 'The Fed lowered its key rate to 4.75%, the first cut in four years, to calm the credit markets.', 'Darren has started saying "subprime" in meetings.'],
    ['2007-09-25', 'Halo 3 makes $170 million on its first day', 'The Xbox 360 game set an entertainment record for first-day sales in the US.', 'GMS has announced a "Halo-style" compliance module. Of course it has.'],
    ['2007-10-01', 'Radiohead will let fans choose what to pay for their new album', 'In Rainbows comes out as a download on 10 October. You pay what you want, from nothing upwards.', 'Darren asked whether we can price our courses like that. Finance said no before he finished the sentence.'],
    ['2007-10-04', 'Fifty years since Sputnik', 'On 4 October 1957 the Soviet Union launched the first artificial satellite.', 'Mieke points out it beeped and nobody needed a training course to understand it.'],
    ['2007-10-12', 'Al Gore and the UN climate panel win the Nobel Peace Prize', 'The prize was shared between the former US vice president and the Intergovernmental Panel on Climate Change.', 'Facilities asks you to turn off your monitor at night. Again.'],
    ['2007-10-20', 'South Africa win the Rugby World Cup', 'The Springboks beat England 15-6 in the final at the Stade de France.', 'The canteen TV is back to corporate communications.'],
    ['2007-10-24', 'Microsoft buys 1.6% of Facebook for $240 million', 'The deal values the social network, three years old, at $15 billion.', 'HR has blocked Facebook. HR also has a Facebook page.'],
    ['2007-10-26', 'Mac OS X Leopard goes on sale', 'Apple\'s new operating system adds Time Machine backups and Spaces.', 'IT says Doors OS will be supported "until further notice".'],
    ['2007-11-05', 'Google announces Android, an open platform for phones', 'Google and 33 other companies formed the Open Handset Alliance. The first phones are expected next year.', 'Darren wants a mobile learning strategy. He means his BlackBerry.'],
    ['2007-11-09', 'The iPhone goes on sale in the UK', 'Queues formed outside shops in London for the launch.', 'Mieke still has the phone with Snake on it, and she would like you to know it never crashes.'],
    ['2007-11-19', 'Amazon launches the Kindle e-book reader', 'The $399 device downloads books over a mobile connection, no computer needed. It sold out in hours.', 'Somebody will ask for the compliance course "on the Kindle" by Friday.'],
    ['2007-12-13', 'EU leaders sign the Treaty of Lisbon', 'The treaty reforms how the European Union works. It still has to be ratified by all member states.', 'Legal reminds you the GDPR is not a thing yet. Data protection very much is.']
  ].map(([date, subject, body, ps]) => ({ at: Date.parse(date + 'T07:30:00Z'), subject, body, ps }));
  function news(weekNo, uptoDay) {
    const from = dateOf(weekNo, 0).getTime(), to = dateOf(weekNo, (uptoDay || 0) + 1).getTime();
    // A weekend headline lands in Monday's inbox.
    const sat = from - 2 * DAY;
    return NEWS.filter(n => n.at >= sat && n.at < to).map(n => ({
      from: 'NewsFlash Daily', subject: n.subject, day: Math.max(0, Math.floor((n.at - from) / DAY)),
      body: fmt(new Date(n.at)) + '\n\n' + n.body + '\n\nP.S. from the intranet team: ' + n.ps
    }));
  }

  // Friday: Darren reacts to the board. Week 4 is the tender.
  function memo(weekNo, decision, promoted) {
    const tender = weekNo === 4;
    const lines = {
      approved: tender ? 'We WON Halvorsen. I may have hugged the receptionist. Drinks on me (one drink each).' : 'Approved! That is what I am talking about. Drinks on me (one drink).',
      pilot: tender ? 'Halvorsen wants a pilot first. That is a yes with homework. GMS got nothing. Measure it properly.' : 'A pilot. That is not a no. Measure it properly and it becomes a yes.',
      rejected: tender ? 'Halvorsen went to GMS. Max the avatar sends his regards. We go again.' : 'Rejected. It happens. GMS will be unbearable at the networking lunch. Next week, ask one more question.',
      none: 'No board this week. Fine. Rest your voice.'
    };
    let t = lines[decision] || lines.none;
    if (weekNo <= 4 && !tender) t += '\n\nProbation: week ' + weekNo + ' of 4 done.';
    if (promoted) t += '\n\nP.S. Consider this your promotion to Team Lead. Your team starts as soon as HR finishes "processing". It is HR, so it could be a while.';
    return t + SIGN;
  }

  window.Story = { day, dateOf, storyMail, news, memo };
})();
