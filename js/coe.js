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
  ${box(626, 54, '7. Check risks and sign-offs', ['Managers, works council, DPO, IT, budget owner.'])}
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
<tr><td><b>Concept fit</b></td><td>A course, because a course was asked for.</td><td>Partly fixes the cause, or ignores a constraint.</td><td>Fixes the cause within the budget, the deadline and the audience's day.</td></tr>
<tr><td><b>Next level</b></td><td>The conventional answer.</td><td>A sensible twist on it.</td><td>Better than standard practice and plausible here. Novelty that won't work doesn't count.</td></tr>
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
      html: `<h2>Learning styles policy</h2><p class="doc-meta">Center of Excellence · <span class="archived">ARCHIVED 2009</span></p>
<p class="archived">This document has been archived. It was never true.</p>
<p>Please stop sending the "Are you visual, auditory or kinaesthetic?" questionnaire to new hires. Matching teaching to a preferred "style" does not improve learning. Matching it to the task does.</p>
<p>The laminated poster in meeting room 3 will be removed as soon as somebody finds the screwdriver.</p>`
    }
  ];

  function render(filesEl, docEl, openId) {
    filesEl.innerHTML = '';
    DOCS.forEach(d => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.icon + ' ' + d.name;
      b.setAttribute('aria-current', d.id === openId);
      b.onclick = () => render(filesEl, docEl, d.id);
      li.appendChild(b);
      filesEl.appendChild(li);
    });
    const doc = DOCS.find(d => d.id === openId) || DOCS[0];
    docEl.innerHTML = doc.html;
    docEl.scrollTop = 0;
    return doc;
  }

  window.Coe = { docs: DOCS, render };
})();
