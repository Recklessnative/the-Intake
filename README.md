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
| `index.html`, `styles.css` | Screens: title, key, cubicle, the KimOS laptop panes, end of week |
| `js/config.js` | Where the backend lives (empty = own keys only) and the donation link |
| `js/gemini.js` | Gemini client with structured JSON output: direct with an own key, otherwise through the backend |
| `js/cards.js` | Maps a scenario card file to the game's shape |
| `js/prompts.js` | The three roles: stakeholder (in character), reaction (boldness + objections), examiner (scorecard) |
| `js/app.js` | The loop and the scoring |
| `scenarios/*.json` | Scenario cards; `scenarios/index.json` lists the ones in play |
| `api/index.php` | Backend: run cap, unlock codes, and a Gemini proxy that keeps the key on the server |
| `api/schema.sql`, `api/new-code.sql` | Database tables, and a template for creating an unlock code |

Scoring per request, out of 100: need diagnosis 25 (half the examiner's score, half the weighted hidden facts you surfaced), measurement 20, concept fit 20, next level 15 (only counted when fit is at least 12), risks and dependencies 10, pitch and defence 10. A defence round triggers when the concept's boldness is above the stakeholder's risk appetite; a strong defence earns +5, a weak one halves next level, backing down zeroes it.

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

The backend stores a salted hash of each IP address (never the IP itself), a random browser token, and run counts. A run counts against both the browser token and the IP, with the IP allowed three times as many runs, so colleagues behind one office IP can still play.

## Test

- `node tests/smoke.cjs` plays a full three-request week on an own key, in headless Chromium with Gemini mocked (needs Playwright).
- `bash tests/backend.sh` checks the backend against SQLite and a mock Gemini: cap, unlock codes, call limits, CORS (needs PHP with pdo_sqlite).
- `bash tests/backend-e2e.sh` plays the game through the backend: claim a run, play, hit the cap, unlock.
