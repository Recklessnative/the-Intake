# THE INTAKE: scenario cards

_A test of your intake craftsmanship, but then funnier._

Each card is one stakeholder request, written as JSON so the game can load it directly. Gemini plays the stakeholder from the card, and a separate judge call grades the player against the `gold`, `hidden_facts`, `measurement` and `concepts` blocks. The player never sees anything except `opening_message` and what the stakeholder says in character.

## The cards

| Card | Sector | Tier | Stakeholder | Opens with | What's really going on | Risk appetite |
|---|---|---|---|---|---|---|
| `mfg-green-belts` | Manufacturing | 1 | Marc Peeters, Plant Manager | Green Belt for all 22 team leads | No daily management routine; half of all downtime coded "Other" | Medium |
| `logistics-night-shift` | Retail logistics | 1 | Sofie Van den Broeck, Site Ops Manager | 15-minute safety refresher on phones | New agency drivers, nights, no supervisor, per-case bonus; phones are banned | Medium |
| `healthcare-sepsis` | Healthcare | 2 | Annelies Maes, Director of Nursing | Sepsis e-learning, 100% completion | Nurses know it; they hesitate to call two dismissive doctors at night | Low |
| `finance-aml-finding` | Financial services | 2 | Caroline Lambrecht, Chief Compliance Officer | Refreshed "engaging" AML e-learning | Private banking overrides alerts under a speed bonus; no four-eyes check | Low |
| `public-service-desk` | Public sector | 3 | Kristof Jacobs, Head of Citizen Services | Friendliness training for counter staff | Appointment-only system turns people away by rule | Low |
| `tech-sales-motivation` | Tech / SaaS | 3 | Jasper Wouters, VP Sales EMEA | Motivational off-site with a Navy SEAL | Commission clawback, unsupported new pricing tier, uncoached new hires | High |

Tiers follow the run's difficulty ramp from the design doc: tier 1 is an open stakeholder with a real skill gap, tier 2 hides the root cause behind politics, and tier 3 is a problem where the best answer is mostly not training. A run draws one card per tier. The two v0.1 cards from the design doc are `tech-sales-motivation` (sales director) and `logistics-night-shift` (warehouse ops manager).

## Card schema (v1)

| Field | Used by | Meaning |
|---|---|---|
| `id`, `schema_version`, `sector`, `tier`, `tier_label`, `title` | Game | Identity and run placement. |
| `stakeholder.name/role/org/voice` | Actor | Who they are and how they talk. |
| `stakeholder.patience` | Game | Weak or leading questions tolerated before they get curt (1 to 5). |
| `stakeholder.risk_appetite` | Game | 0 to 3. A concept whose judged boldness exceeds this triggers the defence round, one objection per point of gap. |
| `opening_message` | Game | The ping. The only thing the player sees before asking. |
| `surface_ask` | Judge | The solution in disguise, in one line. |
| `gold.real_problem`, `gold.root_cause_types`, `gold.is_training_the_lever`, `gold.need_statement` | Judge | The answer key for diagnosis. `root_cause_types` uses: skill, will, system, process, expectations, incentive, environment. `is_training_the_lever` is yes, partly or no. |
| `hidden_facts[]` | Actor + game | Each has `id`, `fact`, `unlocks_when` (the kind of question that reveals it), `reveal_line` (in-voice), `weight` 1 to 3 and `critical`. The game flags a fact as surfaced when the actor reveals it. |
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
