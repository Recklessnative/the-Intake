# THE INTAKE: scenario cards

_A test of your intake craftsmanship, but then funnier._

Each card is one stakeholder request, written as JSON so the game can load it directly. Gemini plays the stakeholder from the card, and a separate judge call grades the player against the `gold`, `hidden_facts`, `measurement` and `concepts` blocks. The player sees only the `briefing`, the `opening_message` and what the stakeholder says in character.

## The cards

| Card | Sector | Tier | Stakeholder | Opens with | What's really going on | Risk appetite |
|---|---|---|---|---|---|---|
| `hotel-upgrades` | Hospitality | 0 | Lien Vermeulen, Front Office Manager | Upselling training for reception | New hires never see the upgrade screen in the new hotel system | Medium |
| `construction-cost-reports` | Construction | 0 | Pieter Goossens, Operations Director | Excel course for site managers | Newly promoted site managers can't estimate remaining cost on the new template | Medium |
| `telecom-first-call` | Telecom customer service | 0 | Ines Dumont, Contact Centre Manager | More product training for new agents | New agents don't know they may give a 25-euro credit themselves | Medium |
| `mfg-green-belts` | Manufacturing | 1 | Marc Peeters, Plant Manager | Green Belt for all 22 team leads | No daily management routine; half of all downtime coded "Other" | Medium |
| `logistics-night-shift` | Retail logistics | 1 | Sofie Van den Broeck, Site Ops Manager | 15-minute safety refresher on phones | New agency drivers, nights, no supervisor, per-case bonus; phones are banned | Medium |
| `healthcare-sepsis` | Healthcare | 2 | Annelies Maes, Director of Nursing | Sepsis e-learning, 100% completion | Nurses know it; they hesitate to call two dismissive doctors at night | Low |
| `finance-tied-selling` | Financial services | 2 | Bart Verhaegen, Head of Retail Network | "Engaging" refresher on credits | Bankers present the bank's insurance as compulsory (tied selling) under a double-counting target | Low |
| `public-service-desk` | Public sector | 3 | Kristof Jacobs, Head of Citizen Services | Friendliness training for counter staff | Appointment-only system turns people away by rule | Low |
| `tech-sales-motivation` | Tech / SaaS | 3 | Jasper Wouters, VP Sales EMEA | Motivational off-site with a Navy SEAL | Commission clawback, unsupported new pricing tier, uncoached new hires | High |
| `pharma-read-and-sign` | Pharma | 1 | Dr. Nathalie Dubois, Site Quality Director | Read-and-sign 23 SOPs for 140 operators | New hires on one isolator line, never trained hands-on since the trainer retired | Low |
| `energy-tablet-resistance` | Energy and utilities | 2 | Thomas Lemmens, Director of Digital Transformation | "Digital mindset" bootcamp for technicians | App needs signal in basements; safety still demands the paper permit | Medium |
| `ngo-volunteer-churn` | Non-profit | 2 | Hanne Claes, Head of Volunteering | Leadership course for volunteer coordinators | Six-week wait, then a compulsory phone-line period set by the founder | Medium |
| `education-ai-cheating` | Higher education | 3 | Prof. Ilse Verbruggen, Vice-Dean of Education | AI-detection training for 600 lecturers | Take-home assessment, a biased detector and exam rules that block redesign | Low |

Tier 0 cards are starters for a player's first intake: a friendly stakeholder, one clear root cause, 3 or 4 facts all found on the call, and two dependencies. Tiers 1 to 3 follow the run's difficulty ramp from the design doc: tier 1 is an open stakeholder with a real skill gap, tier 2 hides the root cause behind politics, and tier 3 is a problem where the best answer is mostly not training. A run draws one card per tier, from different sectors. The two v0.1 cards from the design doc are `tech-sales-motivation` (sales director) and `logistics-night-shift` (warehouse ops manager).

## Card schema (v1)

| Field | Used by | Meaning |
|---|---|---|
| `id`, `schema_version`, `sector`, `tier`, `tier_label`, `title` | Game | Identity and run placement. |
| `stakeholder.name/role/org/voice` | Actor | Who they are and how they talk. |
| `stakeholder.patience` | Game | Weak or leading questions tolerated before they get curt (1 to 5). |
| `stakeholder.risk_appetite` | Game | 0 to 3. A concept whose judged boldness exceeds this triggers the defence round, one objection per point of gap. |
| `briefing.headline`, `briefing.points[]` | Game | A one-line headline plus 3 to 5 neutral context bullets the player reads before the call: the sector, the rules that make it sensitive, who the usual players are. No spoilers; it never contains a hidden fact. A hard mode can hide it. |
| `opening_message` | Game | The ping. With the briefing, the only thing the player sees before asking. |
| `surface_ask` | Judge | The solution in disguise, in one line. |
| `gold.real_problem`, `gold.root_cause_types`, `gold.is_training_the_lever`, `gold.need_statement` | Judge | The answer key for diagnosis. `root_cause_types` uses: skill, will, system, process, expectations, incentive, environment. `is_training_the_lever` is yes, partly or no. |
| `hidden_facts[]` | Actor + game | Each has `id`, `fact`, `unlocks_when` (the kind of question that reveals it), `reveal_line` (in-voice), `weight` 1 to 3 and `critical`. The game flags a fact as surfaced when the actor reveals it. |
| `hidden_facts[].found_at[]` | Game | Where the fact can be found in the lighter loop: `call` (intake call or callback with the stakeholder), `frontline` (corridor chat), or `data:kpi`, `data:org`, `data:process`, `data:policy`, `data:training` (data requests). The first entry is the most natural place. Only facts tagged `call` should be given to the stakeholder actor. |
| `hidden_facts[].data_doc`, `data_source` | Game | Present when the fact has a `data:` tag: the untitled document text the player receives for that data request, and a short label for where it comes from (for example "Near-miss log, last quarter"). |
| `hidden_facts[].frontline_line` | Actor | Present when the fact has a `frontline` tag: how the corridor-chat person says it. |
| `frontline.name/role/voice` | Actor | The person on the floor the player can chat with in the corridor. |
| `volunteered_facts[]` | Actor | Things the stakeholder says freely. |
| `constraints` | Actor + judge | Budget, deadline, audience, schedule, languages, data available and not available. Fit is judged against these. |
| `dependencies[]` | Judge + board | `who`, `concern`, `if_ignored`. The risks score checks whether the player named the ones that matter. |
| `measurement.traps[]`, `measurement.gold_plan` | Judge | What a weak plan measures, and the shape of a strong one (baseline, behaviour, leading indicators, business metric, collection). |
| `concepts.conventional/solid/next_level_examples/also_valid/red_flags` | Judge | Calibration anchors. "Next level" is anything that departs from `conventional` and plausibly works better; the examples are anchors, not the only right answers. |
| `defence_objections[]` | Actor | In-character objections for the defence round, to adapt to the player's actual concept. |
| `question_you_didnt_ask` | Debrief | The one question that unlocks the most. Shown on the scorecard if the player never asked anything like it. |
| `actor_notes[]` | Actor | How to play this person: what they hide, what earns or costs trust. |
| `flavour_lines[]` | Actor | Dry-humour lines to drop in naturally, at most one or two per conversation. |

## Notes for the actor and judge prompts

- The actor reveals a hidden fact only when its `unlocks_when` condition is met, and uses the `reveal_line` as a basis rather than verbatim.
- Facts marked `critical` should weigh most in the diagnosis score; missing all critical facts caps diagnosis low even with a plausible guess.
- Every card is built so the `surface_ask` is wrong or incomplete. A player who simply delivers it should land around "Order Taker".
- All organisations and people are fictional, set in a Belgian context (works councils, the prevention advisor, Flemish language legislation, sector agreements), which gives the dependencies teeth.

## Quick intakes (`quick/`)

Twelve 2-to-4-minute mini-cards in `quick/<id>.json`, listed in `quick/index.json` and kept out of the main index. There are three of each kind: `one-question` (type the first question you'd ask), `triage` (train / dont_train / need_more_info), `measure` (fill the four rungs for a diagnosed case) and `flaw` (find the one wrong line in a colleague's draft; one draft is clean, `flaw_index: -1`). Common fields: `id`, `schema_version`, `kind`, `sector`, `tier`, `from`, `subject`, `mail`, `snippets[3]`, `debrief`; kind-specific fields as agreed with the game thread.
