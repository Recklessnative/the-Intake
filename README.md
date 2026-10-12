# THE INTAKE

*A test of your intake craftsmanship, but then funnier.*

A browser game for learning professionals. You sit down at your cubicle, a stakeholder asks for a course, and you get one call to find the real need. Then you write the need, a measurement plan and a one-page concept, defend it if it's bold, and get graded. An experiment by Yannick, learning strategist.

Design doc: https://claude.ai/code/artifact/1f84b894-1c45-429e-8651-b48ed630dd90

## Run it

It's a static site with no build step. Serve the folder over http (the scenarios are fetched, so `file://` won't work):

```
python3 -m http.server 8000
```

Open http://localhost:8000 and add a Gemini API key under "Gemini key". A player's own key stays in their browser and is sent only to Google. The default model is `gemini-3.5-flash-lite`; a remembered model from the retired 1.x or 2.x families falls back to it.

Without a key, the game uses the backend in `api/` when `js/config.js` points to it: Yannick's key, a few free weeks per player, then an unlock code or the player's own key.

## How it fits together

| File | What it does |
| --- | --- |
| `index.html`, `styles.css` | Screens: title, key, cubicle, the office desktop and its windows, end of week |
| `js/desktop.js` | The window manager: title bars, drag, minimise, the taskbar and start menu, and a layout per phase |
| `js/config.js` | Where the backend lives (empty = own keys only) and the donation link |
| `js/gemini.js` | Gemini client with structured JSON output: direct with an own key, otherwise through the backend |
| `js/cards.js` | Maps a scenario card file to the game's shape |
| `js/story.js` | The story: Synergix e-Learning Solutions in autumn 2007, Darren's weekly mails, real 2007 headlines, the Friday memo |
| `js/slides.js` | Pitchwright 2007: the board room slide editor, the full-screen slide show with the board's reactions |
| `js/retro.js` | The 2000s layer: unlockable wallpapers, Doors Messenger pop-ups and nudges, the brick phone (texts and Snake), and Staply |
| `js/team.js` | The team after your promotion: Bart, Priya and Jens each send a one-pager with one flaw, built from the card's own traps |
| `js/academy.js` | CoE Academy: six e-learning modules (four questions with feedback, then tips for your cases) |
| `js/coe.js` | The Center of Excellence folder on the desktop: intake flowchart, quality standard, good questions, measurement ladder |
| `js/sound.js` | The Doors OS startup chime and a ding, synthesised with Web Audio (no audio files); mute in the start menu |
| `js/prompts.js` | The roles: stakeholder (in character), Mieke the colleague (coaching, sees only what the player sees), reaction (boldness + objections), examiner (scorecard) |
| `js/app.js` | The loop and the scoring |
| `scenarios/*.json` | Scenario cards; `scenarios/index.json` lists the ones in play |
| `api/index.php` | Backend: run cap, unlock codes, and a Gemini proxy that keeps the key on the server |
| `api/schema.sql`, `api/new-code.sql`, `api/upgrade-1.sql` | Database tables, a template for creating an unlock code, and the one change for databases made before weeks were charged at the first scorecard |

Every window has a desktop icon (on phones, use the start menu). A player's first week opens with two **starter cases** (cards with `"tier": 0`: an open stakeholder, one clear cause, 10 questions and extra patience) and opens the Center of Excellence folder on the flowchart; later weeks leave the starters out. Every finished request is kept in **My scores.txt** on the desktop (in this browser, key `intake-scores`).

Every case beyond the starters has **touchpoints**: 10 questions for the whole request. The first call takes at most 5. After it, the **Follow-up** window offers data requests (1 question each, answered from the card's `data_doc` text, no Gemini), up to 2 questions to the card's `frontline` person at the coffee machine, and one **callback** (up to 3 questions, fresh patience) once you have found something. Each hidden fact's `found_at` decides where it can turn up; the stakeholder only knows the facts tagged `call`. The scorecard says where a missed fact could have been found. Starter cases keep a single 10-question call.

A **week** is three or four full cases from Monday to Thursday, plus the board room on Friday, and its shape changes from week to week. Week 1: two starters and a tier-1 case. Week 2: two tier-1 cases and a tier-2 case. From week 3 the game rotates through three shapes with tier-2 and tier-3 cases. Unplayed cards come first.

**The story** (`js/story.js`) is set at Synergix e-Learning Solutions, a small learning agency, starting on Monday 3 September 2007. A cold open plays once before your first week, and again from the title screen: "AI that can write a whole course is fifteen years away. You still have time…". Each week Darren, the CEO, sends a mail. In weeks 1 to 4 you are on probation, with a rival called Global Multimedia Solutions, and week 4 is the Halvorsen tender. Real headlines from that week in 2007 turn up in the inbox from the day they happened, so the game calendar moves with you. On Friday, Darren's memo reacts to the board. You are **promoted to team lead** after a week of 64+ with every diagnosis at 15+, or automatically in week 4. The promotion is stored in `intake-scores` and is the hook for the team. Hard mode skips the story.

**The team** (`js/team.js`). After the promotion, every normal week is a team week: two requests of your own (Monday and Thursday) and three drafts from Bart (weak on risks), Priya (measures) and Jens (concepts). Each draft is built in code from a card nobody plays that week: four sound lines from the card's gold answer and one flaw from its traps, usually the junior's weak spot and about a third of the time somewhere else. You click the flawed line (4 points) and write a coaching note, which Gemini scores 0 to 3 (doubled to 6) and answers in the junior's voice. The team score is shown on the end screen and in My scores; it does not change your title. To try it without playing four weeks, open the game with `?promote=1` (and `?promote=0` to undo).

**My scores** opens with two charts: every request over time, and your score parts over the last five requests as a share of their maximum, with the weakest one called out and a tip.

**The 2000s layer** (`js/retro.js`). All art is drawn in SVG and CSS, and every name is made up. Mieke's window is a Doors Messenger chat ("Mieke says:"), with a Nudge button and pop-ups in the corner when someone pings you at the start of a request. The brick phone (the 📱 in the taskbar tray, the start menu, or "Play Snake while you wait") sits on the desk as an object, not a window: drag it around, put it away with ✕ or its red key. It has texts from people outside the office and Snake, with the high score kept in `intake-snake`. Staply, a stapler with eyes, offers confidently bad advice at most once per request on the case board, the one-pager or the board slide. He can be switched off from the start menu (`intake-staply`) and never appears in hard mode. Wallpapers (start menu, Display properties) unlock with the best title you have finished a week with: Green Hill, then Azure Swoosh, Aquarium, Autumn Road and Night Skyline. The choice is kept in `intake-wallpaper`.

**CoE Academy** (`js/academy.js`): each normal week assigns one of six modules, which waits on top of the desk on Monday morning: *Ask before you make*, *Is training the answer?*, *How will you know?*, *Who can say no*, *Read the proposal like a reviewer* and *One slide for the board*. Each module has four multiple-choice questions with instant feedback, then three things to look out for in your cases. Those tips are pinned to every case file that week. Modules are scored in code with no Gemini call. They never count toward the week's score, but My scores.txt keeps the result. Hard mode has no module.

**The help fades**: in week 1 the case board has every chip, and Mieke shows her own diagnosis once you lock yours in. In week 2 only the diagnosis keeps its chips; measure and concept are your own one-liners. From week 3 you write a blank one-pager under four headings (the board is still one click away).

**Friday: the board room.** After the last request you take one concept from the week to the board (CFO, CHRO with the privacy officer, COO) on one slide with six boxes: problem, evidence, concept, measure, risks, and the ask. You build it in Pitchwright 2007 (`js/slides.js`), on a 4:3 slide that starts from your write-up (blank in hard mode), with a design, a transition (star wipe included), WordArt and clip art. Then you present it full screen, one box per click, while the board reacts in the front row: a nod, a note, a frown, a raised eyebrow, a yawn or a calculator. Style never changes the score, but a flashy slide earns a whispered remark. Each member nods if the slide already answers their concern, or asks you one question to answer live. The chair grades the slide (40 points) and each member (20; a nod is a full 20) and decides: approved, approved as a pilot, or rejected. The board score counts as much as the week's requests for your title, and it goes on the share card and in My scores.txt.

**Hard mode** (a button on the title screen): three tier-2 and tier-3 cases, 6 questions each (4 on the first call), no case file, no Mieke, and one memo of at most 150 words instead of the board. The week ends with a **share card**: your title, the hidden facts you found, how the defence rounds went and your best line, as a picture (1200 x 627) and as text. Only a hard-mode week gets the HARD MODE badge and the LinkedIn button.

**Test mode:** add `?debug` to the address once (`?debug=0` turns it off again). An **Autofill** button appears in the tray: in the inbox or on the call it plays a scripted call that surfaces every hidden fact (no Gemini calls), on the case board or in memo mode it fills every step from the card's model answer, and in the defence round it fills the answers. The reaction and the examiner are still real Gemini calls.

After the call you write up on the **case board**: five short steps (diagnose with evidence from the call and cause tags, is learning the lever, a four-rung measurement ladder, the concept, the top two blockers), each locked before the next, with Mieke's feedback after the diagnosis, the lever and the risks. The steps become a one-page memo for the stakeholder. Memo mode keeps the original long form.

Scoring per request, out of 100: need diagnosis 25 (on the case board: examiner 8, hidden facts surfaced 7, cause tags 4, key evidence cited 3, lever 3; in memo mode half the examiner's score, half the weighted hidden facts you surfaced), measurement 20, concept fit 20, next level 15 (only counted when fit is at least 12), risks and dependencies 10 (on the case board, 4 of them for picking real blockers), pitch and defence 10. A defence round triggers when the concept's boldness is above the stakeholder's risk appetite; a strong defence earns +5, a weak one halves next level, backing down zeroes it.

## Deploying

**GitHub Pages:** pushing to `main` deploys via `.github/workflows/pages.yml` (set Pages source to GitHub Actions). The `api/` folder is not published there.

**yannickwillems.be (shared hosting with PHP and MySQL):**

1. In your hosting panel, create a MySQL database and user. Run `api/schema.sql` once (phpMyAdmin, Import).
2. Copy `api/config.sample.php` to `intake-config.php` **one folder above your web root** (next to `public_html`, not inside it) and fill in the Gemini key, database details, a long random `ip_salt`, and the free runs per player. If your host won't let you write there, save it as `api/config.php` instead; the `.htaccess` in `api/` blocks downloads of it.
3. Upload `index.html`, `styles.css`, `js/`, `scenarios/` and `api/` over FTP to a subfolder, for example `public_html/the-intake/`.
4. In the uploaded `js/config.js`, set `api: 'api/index.php'` and, if you like, `donateUrl` to your donation page.
5. Open the game. The title screen should say how many free weeks are left.

To let the GitHub Pages version use the same backend, set `api` in `js/config.js` to the full URL (`https://yannickwillems.be/the-intake/api/index.php`); `https://recklessnative.github.io` is already in `allowed_origins`.

**Unlock codes:** edit and run `api/new-code.sql`. Each code grants a number of extra runs and can be redeemed by a set number of players. **Safety limits** in the config: `calls_per_run` stops a runaway run, and `daily_calls` closes the game for the day before the bill can surprise you.

The backend stores a salted hash of each IP address (never the IP itself), a random browser token, and run counts. A week counts against the browser token only once it was played (its first scorecard, or `charge_after_calls` Gemini calls); starting a week again before that hands back the same week. Every week started also counts against the IP, which may start three times as many, so colleagues behind one office IP can still play.

The game saves the week in the browser after every step, so players can close the tab and resume from the title screen.

## Test

- `node tests/smoke.cjs` plays a full three-request week on an own key, in headless Chromium with Gemini mocked (needs Playwright). `node tests/smoke.cjs . /tmp --mobile` does the same at phone width.
- `bash tests/backend.sh` checks the backend against SQLite and a mock Gemini: cap, unlock codes, call limits, CORS (needs PHP with pdo_sqlite).
- `bash tests/backend-e2e.sh` plays the game through the backend: claim a run, play, hit the cap, unlock.
