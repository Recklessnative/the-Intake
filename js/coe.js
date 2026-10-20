// The Center of Excellence folder: the learning team's own reference documents.
// Static, trusted content written for the game (so innerHTML is fine here).
(function () {
  const arrow = (x, y1, y2) => `<path class="arr" d="M${x} ${y1} V${y2 - 6}" marker-end="url(#ah)"/>`;
  const box = (y, h, title, sub, cls) => `<rect class="${cls || 'box'}" x="60" y="${y}" width="320" height="${h}" rx="6"/>` +
    `<text class="h" x="220" y="${y + 20}" text-anchor="middle">${title}</text>` +
    sub.map((t, i) => `<text x="220" y="${y + 38 + i * 16}" text-anchor="middle">${t}</text>`).join('');

  const FLOW = `<svg class="flow" viewBox="0 0 560 760" role="img" aria-label="Intake flowchart: request, gap, cause, the lever test, measurement, concept, risks, one-pager">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#1a3e8c"/></marker></defs>
  ${box(10, 54, '1. Read the request and the case file', ['What are they asking for? (That is not the need yet.)'], 'ask')}
  ${arrow(220, 64, 92)}
  ${box(92, 70, '2. Find the performance gap', ['What do people do now, and what should they do?', 'Who exactly, since when, how much?'])}
  ${arrow(220, 162, 190)}
  ${box(190, 70, '3. Find the cause', ['Skill · process · tools · incentives', 'expectations · environment. Usually more than one.'])}
  ${arrow(220, 260, 290)}
  <polygon class="ask" points="220,290 380,345 220,400 60,345"/>
  <text class="h" x="220" y="340" text-anchor="middle">4. Could they do it</text>
  <text class="h" x="220" y="357" text-anchor="middle">if their job depended on it?</text>
  <path class="arr" d="M380 345 H430 V392" marker-end="url(#ah)"/>
  <text x="440" y="337">Yes</text>
  <rect class="stop" x="398" y="398" width="152" height="78" rx="6"/>
  <text class="h" x="474" y="418" text-anchor="middle">Not (only) learning</text>
  <text x="474" y="436" text-anchor="middle">Fix the process, tool</text>
  <text x="474" y="452" text-anchor="middle">or incentive. Say so,</text>
  <text x="474" y="468" text-anchor="middle">politely, with evidence.</text>
  ${arrow(220, 400, 430)}
  <text x="230" y="420">No: learning can help</text>
  ${box(430, 70, '5. Decide how you will know', ['Baseline → behaviour → business metric', '→ how you collect it, with data they really have.'])}
  ${arrow(220, 500, 528)}
  ${box(528, 70, '6. Design the smallest thing that works', ['It fixes the cause you found, fits the budget,', "the deadline and the audience's real day."])}
  ${arrow(220, 598, 626)}
  ${box(626, 54, '7. Check risks and sign-offs', ['Managers, works council, privacy officer, IT, budget owner.'])}
  ${arrow(220, 680, 706)}
  ${box(706, 48, '8. Send a one-pager in their language', [], 'ask')}
</svg>`;

  const DOCS = [
    {
      id: 'flow', icon: '🗺', name: 'Intake flowchart.png', meta: 'Center of Excellence · laminated copies by the coffee machine (the broken one)',
      html: '<h2>How we run an intake</h2><p class="doc-meta">Center of Excellence · laminated copies by the coffee machine (the broken one)</p>' + FLOW +
        '<p>Steps 2 and 3 happen on the call. Most bad programmes start with someone skipping straight from 1 to 6.</p>'
    },
    {
      id: 'standard', icon: '📄', name: 'Intake quality standard.doc',
      html: `<h2>Intake quality standard</h2><p class="doc-meta">Center of Excellence · version 3.2 · approved by everyone who attended the meeting</p>
<p>Every intake is reviewed against these six criteria. The examiner uses the same ones.</p>
<table><thead><tr><th>Criterion</th><th>Below standard</th><th>Meets standard</th><th>Excellent</th></tr></thead><tbody>
<tr><td><b>Need diagnosis</b></td><td>Repeats the request.</td><td>Names part of the gap, with some evidence.</td><td>Names the real gap, the causes, and whether learning is the lever, backed by what the stakeholder said.</td></tr>
<tr><td><b>Measurement</b></td><td>Completion rates or happy sheets.</td><td>A behaviour or a business metric, but no baseline.</td><td>Baseline, behaviour, business metric, and a way to collect it with data that exists.</td></tr>
<tr><td><b>Concept fit</b></td><td>A course, because a course was asked for.</td><td>Partly fixes the cause, ignores a constraint, or has us fixing what we don't own.</td><td>Fixes the cause within the budget, the deadline and the audience's day. Each cause goes to the person who owns it; our part is scoped honestly, even when it is small.</td></tr>
<tr><td><b>Right-sized ambition</b></td><td>A default course, or far more (or less) than the problem needs.</td><td>Sensible, with parts the cause doesn't need, or too thin to move the metric.</td><td>The smallest thing that would move the metric, at a size this client can take. Going further? Name the first step and when you would stop. Ask about their appetite for risk.</td></tr>
<tr><td><b>Risks</b></td><td>None, or "change management".</td><td>Real risks, no mitigations.</td><td>The people who can block it, each with a plan.</td></tr>
<tr><td><b>Pitch</b></td><td>Long, vague or defensive.</td><td>Clear enough.</td><td>Short, in their language, and objections answered with reasons.</td></tr>
</tbody></table>
<h3>Minimum for every intake</h3>
<ul><li>At least one question about what people do now.</li><li>At least one question about why.</li><li>At least one question about data you could measure with.</li><li>At least one question about who has to agree.</li></ul>`
    },
    {
      id: 'questions', icon: '📄', name: 'Good intake questions.txt',
      html: `<h2>Good intake questions</h2><p class="doc-meta">Center of Excellence · collected from colleagues · steal freely</p>
<p>Open questions work best. Ask one thing at a time, and follow up on surprises.</p>
<h3>The gap</h3><ul><li>What are people doing now that worries you?</li><li>What would you see them do if this worked?</li><li>Who exactly? Everyone, or a specific group?</li><li>Since when? What changed around then?</li></ul>
<h3>The cause</h3><ul><li>Why do you think they do it this way?</li><li>Do the people who do it right do something different?</li><li>What gets in their way: tools, time, targets, their manager?</li><li>Have they been trained on this before? What happened?</li></ul>
<h3>Data and measurement</h3><ul><li>How do you know it is a problem? What numbers do you look at?</li><li>Where are we today on that number?</li><li>What would a good result look like in three months?</li></ul>
<h3>Constraints and people</h3><ul><li>What budget and deadline are we working with?</li><li>Who has to approve this? Who could stop it?</li><li>When could people actually spend time on this?</li></ul>`
    },
    {
      id: 'ladder', icon: '📄', name: 'Measurement ladder.doc',
      html: `<h2>The measurement ladder</h2><p class="doc-meta">Center of Excellence · "if you can't measure it, at least don't pretend"</p>
<table><thead><tr><th>Rung</th><th>Question</th><th>Example</th></tr></thead><tbody>
<tr><td><b>Baseline</b></td><td>Where are we now?</td><td>Errors per 1,000 orders, last quarter.</td></tr>
<tr><td><b>Behaviour</b></td><td>What will people do differently?</td><td>Pickers scan every pallet before moving it.</td></tr>
<tr><td><b>Business metric</b></td><td>What moves for the business?</td><td>Error rate down by a third; fewer customer complaints.</td></tr>
<tr><td><b>Collection</b></td><td>How, when and with what data?</td><td>Weekly export from the warehouse system, compared per shift.</td></tr>
</tbody></table>
<h3>Traps</h3><ul><li>Completion rates measure attendance, not change.</li><li>Satisfaction scores measure whether the sandwiches were good.</li><li>Small numbers bounce around: compare periods, not single weeks.</li><li>Better reporting can make incident numbers go up at first. That can be good news.</li></ul>`
    },
    {
      id: 'archive', icon: '🗄', name: 'Learning styles policy (ARCHIVED).doc',
      html: `<h2>Learning styles policy</h2><p class="doc-meta">Center of Excellence · <span class="archived">ARCHIVED 2006</span></p>
<p class="archived">This document has been archived. It was never true.</p>
<p>Please stop sending the "Are you visual, auditory or kinaesthetic?" questionnaire to new hires. Matching teaching to a preferred "style" does not improve learning. Matching it to the task does.</p>
<p>The laminated poster in meeting room 3 will be removed as soon as somebody finds the screwdriver.</p>`
    }
  ];

  // The pocket card: the folder on one page, plus the player's own if-then plans, to take out of the
  // game. Plans are player text, so they are escaped. `body` is shared by the window and the file.
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function pocketBody(plans) {
    return `<h2>Before you build any training</h2>
<ol class="pocket-steps"><li><b>The ask is not the need.</b> Write down what they asked for, then park it.</li>
<li><b>Find the gap.</b> What do people do now, what should they do, who exactly, since when?</li>
<li><b>Find the causes.</b> Skill, process, tools, incentives, expectations, environment. Usually more than one.</li>
<li><b>Is learning the lever?</b> Could they do it if their job depended on it? If yes, it is not (only) a learning problem. Say so, with evidence.</li>
<li><b>Say who owns each cause.</b> Ours is the skill part. The rest goes to whoever can change it.</li>
<li><b>Decide how you will know.</b> Baseline, behaviour, business metric, and data they really have.</li>
<li><b>Design the smallest thing that works.</b> Going bolder? Name the first step and when you would stop.</li>
<li><b>Check who can block it.</b> Managers, works council, privacy, IT, budget owner.</li></ol>
<h3>Ask at least once</h3><ul><li>What are people doing now that worries you?</li><li>Why do you think they do it this way? Do the ones who get it right do something different?</li><li>Where are we today on the number you care about?</li><li>Who has to agree, and who could stop it?</li></ul>
<h3>My plan for the next request</h3>` + (plans.length
      ? '<ul class="pocket-plans">' + plans.map(p => `<li>When someone asks me for ${esc(p.when)}, I will first ask: <b>${esc(p.ask)}</b></li>`).join('') + '</ul>'
      : '<p>No plan yet. After each request, the scorecard asks for one under "Take it to Monday".</p>');
  }
  function pocketFile(plans) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Intake pocket card</title>
<style>body{font:15px/1.45 Georgia,serif;max-width:40em;margin:0 auto;padding:16px;color:#222;background:#fff}h2{font-size:1.3em}h3{font-size:1.05em;margin-top:1.2em}li{margin:.25em 0}.foot{color:#666;font-size:12px;margin-top:2em}@media print{body{font-size:12px}}</style></head>
<body>${pocketBody(plans)}<p class="foot">From THE INTAKE, a practice game for learning professionals.</p></body></html>`;
  }
  DOCS.splice(1, 0, {
    id: 'pocket', icon: '🗂', name: 'Pocket card (take it with you).htm',
    html: () => '<p class="doc-meta">Center of Excellence · the folder on one page, plus your own plans</p>' + pocketBody(Coe.plans()) +
      '<p><button type="button" id="coe-save-pocket">💾 Save it to your computer or phone</button></p>'
  });

  // Every document, with the Learning House handouts and reader cards (js/clinic.js) at the end.
  const all = () => DOCS.concat(window.Clinic ? Clinic.docs(Coe.act()) : []);
  let last = null;
  function render(filesEl, docEl, openId) {
    last = [filesEl, docEl, openId];
    filesEl.innerHTML = '';
    all().forEach(d => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.icon + ' ' + d.name;
      b.setAttribute('aria-current', d.id === openId);
      b.onclick = () => render(filesEl, docEl, d.id);
      li.appendChild(b);
      filesEl.appendChild(li);
    });
    const doc = all().find(d => d.id === openId) || DOCS[0];
    docEl.innerHTML = typeof doc.html === 'function' ? doc.html() : doc.html;
    docEl.scrollTop = 0;
    const save = docEl.querySelector('#coe-save-pocket');
    if (save) save.onclick = () => {
      const a = document.createElement('a');
      a.download = 'intake-pocket-card.html';
      a.href = URL.createObjectURL(new Blob([pocketFile(Coe.plans())], { type: 'text/html' }));
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    return doc;
  }

  // app.js replaces `plans` with the player's saved if-then plans.
  // After the Learning House files something new: redraw the list if the folder is already open.
  function refresh() { if (last && last[1].innerHTML) render(last[0], last[1], last[2]); }
  const Coe = window.Coe = { docs: DOCS, render, refresh, pocketFile, plans: () => [], act: () => 1 };
})();
