# The story arc (spoilers)

The whole game hides one twist. This file is the source of truth for it, so every feature that touches the story builds towards the same reveal. Full working doc with the reasoning: https://claude.ai/code/artifact/bdcc35d4-1ba3-4357-a481-54208c74f76e. Script room notes: `/mnt/project-files/the-intake/script-room/` in the project folder. Agreed with Yannick on 17 Oct 2026.

## The twist

It is not 2007. It is 2041, and The Intake is a re-skilling programme.

In 2041 machines ask excellent questions, but only about the course they were asked to build, and only of whoever opened the chat. Courses are free, so nobody has to decide whether one is worth making, and there is always a machine that says yes. What the world lost is the person who says "this is not a course problem", puts their name under it, and checks on Monday whether anything changed. The game already scores that skill (the lever call, the defence, the board room).

- **Who runs it:** the Learning House, in 2041 a public body that certifies the humans who must sign off mandatory training under a human-oversight rule. Organisations need someone they believe and can blame; nobody buys "not a course" from a machine.
- **Why 2007:** the best-archived year with no machines in it. Synergix went bankrupt in 2009 and the receiver kept every drive. The archive is 71% recovered, which explains the redactions, the repeats and the fog at the edges.
- **The player:** cohort 12, seat 07, so participant 1207. They signed an immersion waiver on Thu 14 Mar 2041. No memory wipe.
- **Mieke:** participant 0031. She logged off once, saw that nobody out there asks anything, and came back to coach.
- **No faces:** the archive's photos were redacted. People are known by their desks and things.
- **GMS and Max the avatar:** the ancestors of the 2041 machines. "Completion means the module was opened" is the 2041 economy.
- **The last intake on file in the region:** 2033 (not 2024; the audience runs intakes today).

## Acts

A week counts when its Friday is done in the normal game (`w.done && !w.hard && !w.one`). Hard mode and Try one case never show hints or move the story.

| Act | Weeks | Question | Ends with |
| --- | --- | --- | --- |
| 1. Probation | 1 to 4 | Will I pass probation and win Halvorsen? | The tender. From that evening the player may press lift button 5. |
| 2. Seams | 5 to 7 | Why does this place repeat, and is anyone here real? | Friday of week 7: 5 is the only button if the player hasn't gone up yet. |
| 3. Outside | The week after the reveal | Was a course the right answer? | The player's own lever call decides the ending. |

Act 1 must work on its own as today's game: most players stop within the 3 free weeks.

## Title screen

One Blender camera on the Synergix building from across the street, four stages. The constant is one lit window on the fourth floor.

| Stage | When | Shot |
| --- | --- | --- |
| 1 Day | no finished week | overcast autumn morning, wet street |
| 2 Rain | 1+ finished weeks | steady rain, umbrellas from behind |
| 3 Dark and rain | 4+ finished weeks | night, most windows dark |
| 4 After | `intake-told-reveal` set | the building in 2041: sign dead, server racks, empty street; subtitle "Session 1207: resume?" |

Read `localStorage` directly (`told()` sets the key when it checks it). Cross-fade once when a new stage is reached (`intake-title-stage`); `?title=1..4` forces a stage.

## Cold open

> An e-learning costs forty thousand euros and twelve weeks. So someone still has to decide if it's worth making.
> AI that can write a whole course is fifteen years away.
> It will ask excellent questions. All of them about the course.
> You still have time to learn the other one: do we need a course at all?

Planned framing: a breakfast TV broadcast on Mon 3 Sep 2007 (Northern Rock, Synergix loses Brugmann to GMS, a GMS ad for Max, an expert saying "fifteen years away, at least", rain all week). After the reveal it replays stamped "ARCHIVE 2007-09-03, RESTORED 2041", with "Line five was correct."

## Hint ladder

Every hint has a 2007 excuse, at most one new hint lands per in-game day, none is scored, and nothing visible names AI or 2041 before the reveal (mail source and file properties excepted). Repeated numbers appear early and innocently: 1207, 61%, 71%.

| Act | Hint | Where |
| --- | --- | --- |
| 1 | Nobody has a face | everywhere (exists) |
| 1 | "fifteen years away" | cold open (exists) |
| 1 | Filler mails identical every week | inbox (exists, keep) |
| 1 | Mieke's "Morning again!" on Mondays | Messenger (make deliberate) |
| 1 | Lift button 5 taped over, "OUT OF ORDER"; Facilities mail about floor 5 in week 2; the building has four floors | evening floor, inbox |
| 1 | Rain always starts at 08:56 | sound, floor |
| 1 | Friday of week 3: indicator flickers 4, 5, 4; doors open half a second on dark and a fan hum | evening floor |
| 1 | Badge No. 1207, "Photo: to follow"; desk calendar whose next page is also September | your desk (new look spot) |
| 1 | Darren's planner: "NEW HIRE!!" every Monday | Darren's office |
| 2 | The theory machine shows Mosher (2011) and Weinbauer-Heidel (2016) with dates | Learning House |
| 2 | A 2008 Lehman headline, recalled as "a test headline from our template folder" | inbox, week 5 |
| 2 | Coffee machine note "out of order since 2004", corrected to 2024 in another pen | floor |
| 2 | HR: 61% completion "as every week since records began"; Priya's chart with "and then?" in Mieke's pencil | inbox, Priya's desk |
| 2 | "View source" shows a 2041 date and "71% recovered"; a case file says "restored, 71% legible" and has a "[REDACTED: ARCHIVE]" line | Doors Mail, case file, week 6 |
| 2 | Leaked course-agent transcript: 14 smart questions, all about the course; click the one it never asked (2 bonus points) | case file, weeks 6-7 |
| 2 | Bart's draft has no flaw and no stakeholder quote; only "Something else..." fits; Mieke: "Bart didn't write this. Nobody did."; properties: Author: MODULEGEN | team review, week 7 |
| 2 | Spam text ends "Reply LOG OFF to stop these messages" | phone, week 7 |
| 2 | Canteen TV test card after 18:00; Lindeveld streets end in fog | evening floor, town |

In the game: `js/arc.js` holds the slot of every built hint (arc week and day, one per day) and the "Doesn't add up" page; `tests/story.cjs` plays weeks 2, 3 and 5 to 7 to check them. From week 5 every week is a team week, so act 2 hints sit on Mondays and Thursdays only.

## Mechanics for the story

None costs a case question or a point.

- **Doesn't add up:** a notebook page. Odd findables get "Note it". Pin two that go together and write a one-line guess first; pairs we wrote click into a lead. Leads never gate the reveal; they add lines to it. Hidden until the first odd find. No Gemini.
- **Mieke deflects:** her prompt gets a lore block for weeks 5-7, so she gives the 2007 excuse and steers back to the case. After the reveal, one off-the-record chat of three questions to Mieke herself.
- **The missing question** and **Bart's empty draft** (see the ladder).

## The reveal

The lift goes to 5 (a short rendered film). The same floor in 2041: no desks, racks with Max's GMS logo, one CRT on the carpet running Doors OS. No voice. Doors Mail is open:

> From: operator@archive.lindeveld.be · Thu 14 Mar 2041
> Subject: Request: we need a course
> We certify 4,000 team leads a year. The system keeps writing them courses on intake. We need someone who can tell us when it shouldn't.
> PS: you are cohort 12, seat 07. Sorry about the rain. It was in the archive, so it is in the build.

The simulation is the course the operator ordered. The player signs the waiver; the name field strikes itself through and becomes 1207. Set `intake-told-reveal`.

In the game: `js/reveal.js` (button 5 from the evening of the tender, the only button from week 8; floor 5 is a still for now, `scene.py floor5`, the lift film can replace it). Leads add lines to a `session_1207.log` on the CRT. `tests/story.cjs` plays the reveal in week 8.

Aftermath: button 5 stays lit, the canteen TV shows its test card all day, Mieke's lamp is off with a "Participant 0031" badge on her chair, the boot screen says "archive build 2041.03", My scores.txt is headed "Exported from session 1207", the start menu has a greyed "Log off...".

## The last week and the ending

One request: the operator's, played as a normal call with the operator as stakeholder. Hidden facts carry the premise (last intake on file 2033, what the modules change, why 2007, Mieke). A "Just tell me" button for readers. Data documents are module dashboards: 100% completion, no idea what helped. The one-pager gets a line "Accountable: ____" where the player types their name.

The ending is the lever call, graded like any case:

- **Training** means Clock in tomorrow: back to 2007, endless weeks, Mieke's lamp on again.
- **Role and authority** (someone who can say no and sign it) means Log off: down the lift, out into the 2041 rain, the fourth-floor window going dark behind you.

Neither is labelled the good one. In the game: `scenarios/operator-2041.json` (never drawn; `era: "2041"` swaps the period line in every prompt), the week starts when `intake-told-reveal` is set and `intake-ending` is not; `Reveal.end` in `js/reveal.js` plays the ending and stores `intake-ending` (`logoff` or `clockin`). Learning fixes this or Partly means Clock in; Not a learning problem means Log off. `tests/story.cjs` plays both. End card: "Asking why was never the hard part. Saying 'not a course', with your name under it, is." If voiced, the operator speaks only at the end: "You noticed eleven things. Most cohorts notice four. That is the skill, by the way."

## The town and the money

Lindeveld is rebuilt from the same archive, so it is faceless too; people are known by their things (an umbrella, a bike, a dog lead). Belgium had no federal government for most of autumn 2007: the election posters are still up with every face torn off. The town is the Monday check: each card gets a "three months later" line seen in town, and after the reveal the player learns that this is what the operator measures.

| Place | Role | Act 2 seam | After the reveal |
| --- | --- | --- | --- |
| The Junction, station café | Friday drink, past stakeholders as regulars | regulars repeat lines word for word; the 08:56 train never leaves | chairs on tables, one lamp on |
| Your flat, Canal Street | answering machine, payslip, scrapbook of your work | a message from 3 Sep 2007 every Monday | objects tagged "archive item" |
| City Hall | Fatima's counter (service desk case) | queue ticket always 1207 | the counter is a terminal |
| Streets | evening choice via the lift | a bakery that never opens; fog | map edges "not recovered" |

Money (round 6 plan): flat weekly pay in a Friday envelope, the same for a 41 and a 91, an HR remarks line, rent already deducted, a fixed catalogue for the flat. Money buys comfort, never learning, never a score. The balance is derived from finished normal weeks, never stored; hard mode and Try one case pay nothing. Arc layer: employee no. 1207; act 2 fine print "Immersion costs: covered by the Learning House"; Mieke: "Nobody here gets paid for being right. That's why we can afford to be."; after the reveal "Sign-offs: 0", which becomes 1 if the last lever call is "not a course" with your name under it; Log off brings "Final settlement: 0.00 (archive currency)".

In the game: `js/town.js`, a Doors Maps window the evening lift offers once a normal week is finished (never in hard mode, Try one case or the last week). The Monday check lines are `CHECK` in that file, one per card: `right` when your lever call matched the card, `wrong` when it didn't (the call is kept on each request in `intake-scores`). Act 2 seams are notebook things (`town:train`, `town:regulars`, `town:machine`, `town:ticket`, `town:bakery`, `town:edge`) with pairs in `js/arc.js`. Flat purchases are the only thing stored (`intake-flat`); `Reveal.end` stores `intake-signoffs`. `tests/story.cjs` walks the town in acts 1, 2 and after the ending.

## Rules for anything that touches the story

- Act 1 stands alone; nothing in weeks 1 to 4 needs the twist to make sense.
- No faces; Windows XP for all UI after log on (the title screen is the one exception), including the 2041 terminal.
- Every word the player reads is English. Only people's names and the city of Lindeveld stay Belgian.
- Post-2007 facts appear only in the listed hints and the last week's card; put them on an allowlist in `tests/check-cards.cjs` so the period check still catches accidents.
- Fix accidental slips first (name collisions, Mieke's Snake phone, "GDPR is not a thing yet") so deliberate ones stand out.
