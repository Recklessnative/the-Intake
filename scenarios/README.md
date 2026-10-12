# THE INTAKE: scenario cards

_A test of your intake craftsmanship, but then funnier._

Each card is one stakeholder request, written as JSON so the game can load it directly. Gemini plays the stakeholder from the card, and a separate judge call grades the player against the `gold`, `hidden_facts`, `measurement` and `concepts` blocks. The player sees only the `briefing`, the `opening_message` and what the stakeholder says in character.

## The cards

| Card | Sector | Tier | Stakeholder | Opens with | What's really going on | Training the lever? | Risk appetite |
|---|---|---|---|---|---|---|---|
| `hotel-upgrades` | Hospitality | 0 | Lien Vermeulen, Front Office Manager | Upselling training for reception | New hires never see the upgrade screen in the new hotel system | yes | Medium |
| `construction-cost-reports` | Construction | 0 | Pieter Goossens, Operations Director | Excel course for site managers | Newly promoted site managers can't estimate remaining cost on the new template | yes | Medium |
| `telecom-first-call` | Telecom customer service | 0 | Ines Dumont, Contact Centre Manager | More product training for new agents | New agents don't know they may give a 25-euro credit themselves | partly | Medium |
| `mfg-green-belts` | Manufacturing | 1 | Marc Peeters, Plant Manager | Green Belt refresher for all 22 team leads | They passed and their course projects worked; no protected time, no sponsor and targets that ignore projects | no | Medium |
| `logistics-night-shift` | Retail logistics | 1 | Sofie Van den Broeck, Site Ops Manager | 15-minute safety refresher on the break-room PC or a DVD | New agency drivers, nights, no supervisor, per-case bonus; one break-room PC for the whole shift | partly | Medium |
| `healthcare-sepsis` | Healthcare | 2 | Annelies Maes, Director of Nursing | Sepsis e-learning, 100% completion | Nurses know it; they hesitate to call two dismissive doctors at night | partly | Low |
| `finance-tied-selling` | Financial services | 2 | Bart Verhaegen, Head of Retail Network | "Engaging" refresher on credits | Bankers present the bank's insurance as compulsory (tied selling) under a double-counting target | partly | Low |
| `public-service-desk` | Public sector | 3 | Kristof Jacobs, Head of Citizen Services | Friendliness training for counter staff | Appointment-only system turns people away by rule; booking needs an eID card reader or a busy phone line | no | Low |
| `tech-sales-motivation` | Tech / software | 3 | Jasper Wouters, VP Sales EMEA | Motivational off-site with a Navy SEAL | Commission clawback, unsupported new pricing tier, uncoached new hires | partly | High |
| `pharma-read-and-sign` | Pharma | 1 | Dr. Nathalie Dubois, Site Quality Director | Read-and-sign 23 SOPs for 140 operators | New hires on one isolator line, never trained hands-on since the trainer retired | yes | Low |
| `energy-tablet-resistance` | Energy and utilities | 2 | Thomas Lemmens, Director of Field Operations IT | "Digital mindset" bootcamp for technicians | Technicians use the handhelds fine where there is signal; no GPRS in basements, billing still wants the carbon copy, and the job norm punishes the handheld | no | Medium |
| `ngo-volunteer-churn` | Non-profit | 2 | Hanne Claes, Head of Volunteering | Leadership course for volunteer coordinators | Six-week wait, then a compulsory phone-line period set by the founder | partly | Medium |
| `education-ai-cheating` | Higher education | 3 | Prof. Ilse Verbruggen, Vice-Dean of Education | Compulsory detection checks and an honesty e-learning for 9,000 students | Most cases sit in 31 units taught by part-timers nobody taught to design assignments that cannot be copied or bought | yes | Low |
| `airport-ground-handling` | Aviation ground handling | 1 | Dirk Vandamme, Station Manager | Redo the loading course for all 62 ramp agents | New aircraft type with a different hold layout; seasonal starters learned from a CD-ROM and the lead who checked holds moved to cargo | partly | Low |
| `insurance-claims-backlog` | Insurance | 1 | Veerle Janssens, Claims Director | Time management training for 140 claims handlers | System, limits and staffing were fixed this year; 70 ex-motor handlers can't decide cover on water damage and park the files | yes | Medium |
| `fashion-retail-shrinkage` | Fashion retail | 2 | Katrien Desmet, Head of Store Operations | Loss prevention training for 400 shop staff | The COO's no-count deliveries and an unaudited outsourced warehouse send short boxes; untagged stock, broken alarm gates | partly | Low |
| `law-firm-juniors` | Legal services | 2 | Geert Hendrickx, Managing Partner | Writing training for 22 junior associates | Seven corporate juniors hired since 2005 never got the memo clinic the managing partner scrapped; they write research, not advice | yes | Low |
| `newspaper-going-online` | Media | 3 | Frank Verstraeten, Editor-in-Chief | Internet training for 64 journalists | The editor keeps scoops for the paper, the web system is two PCs and retyping, and the union blocks online publishing until bylines are settled | no | High |
| `food-hygiene-audit` | Food processing | 1 | Koen Wouters, Plant Manager | HACCP refresher for all 160 operators | Subcontracted night cleaners get Dutch-only instructions, were never shown how to strip the slicers, and have a shrinking cleaning window | partly | Medium |
| `car-dealer-aftersales` | Automotive retail | 2 | Philippe Delcourt, Aftersales Director | Customer service training for 14 service advisors | Advisors get it right on quiet days and at Wavre; the 100% booking target, a separate workshop plan and an upsell bonus without approval cause the rest | no | Medium |
| `home-care-turnover` | Home care | 2 | Griet Van Acker, Director of Care | Resilience training for all carers | City-wide rounds with unpaid travel, schedule changes by SMS at night, and no more team meeting | partly | Low |
| `it-helpdesk-reopen` | Internal IT | 3 | Dirk Wuyts, IT Service Manager | ITIL Foundation for first and second line | The outsourcing contract pays per ticket closed, a reopen counts as new, and the knowledge base is nearly empty | no | Low |
| `port-crane-safety` | Port and shipping | 3 | Luc Claessens, Terminal Operations Director | Safety culture programme for the quay | A bonus per move, penalties for late ships and double shifts from the pool: twistlock checks get skipped | no | Medium |

There are 23 cards: 3 at tier 0, 6 at tier 1, 8 at tier 2 and 6 at tier 3. All of them are set in Belgium in autumn 2007; `node tests/check-cards.cjs` checks the schema and flags words that did not exist yet.

Tier 0 cards are starters for a player's first intake: a friendly stakeholder, one clear root cause, 3 or 4 facts all found on the call, and two dependencies. Tiers 1 to 3 follow the run's difficulty ramp: tier 1 has an open stakeholder, tier 2 hides the root cause behind politics, and tier 3 is a hard case where the obvious diagnosis is wrong. Whether training is the lever varies inside every tier (6 yes, 10 partly, 7 no), so players can't learn the answer from the tier; keep that mix when adding cards. A run draws one card per tier, from different sectors. The two v0.1 cards from the design doc are `tech-sales-motivation` (sales director) and `logistics-night-shift` (warehouse ops manager).

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
