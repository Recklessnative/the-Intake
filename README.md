# THE INTAKE

*A test of your intake craftsmanship, but then funnier.*

A browser game for learning professionals. You sit down at your cubicle, a stakeholder asks for a course, and you get one call to find the real need. Then you write the need, a measurement plan and a one-page concept, defend it if it's bold, and get graded. An experiment by Yannick, learning strategist.

Design doc: https://claude.ai/code/artifact/1f84b894-1c45-429e-8651-b48ed630dd90

## Run it

It's a static site with no build step. Serve the folder over http (the scenarios are fetched, so `file://` won't work):

```
python3 -m http.server 8000
```

Open http://localhost:8000 and add a Gemini API key under "Gemini key". In v0.1 the key stays in the player's browser and is sent only to Google. The default model is `gemini-2.5-flash-lite`; the model field takes any Gemini model id.

## How it fits together

| File | What it does |
| --- | --- |
| `index.html`, `styles.css` | Screens: title, key, cubicle, the KimOS laptop panes, end of week |
| `js/gemini.js` | Gemini client with structured JSON output; later points at the PHP proxy |
| `js/cards.js` | Maps a scenario card file to the game's shape |
| `js/prompts.js` | The three roles: stakeholder (in character), reaction (boldness + objections), examiner (scorecard) |
| `js/app.js` | The loop and the scoring |
| `scenarios/*.json` | Scenario cards; `scenarios/index.json` lists the ones in play |

Scoring per request, out of 100: need diagnosis 25 (half the examiner's score, half the weighted hidden facts you surfaced), measurement 20, concept fit 20, next level 15 (only counted when fit is at least 12), risks and dependencies 10, pitch and defence 10. A defence round triggers when the concept's boldness is above the stakeholder's risk appetite; a strong defence earns +5, a weak one halves next level, backing down zeroes it.

## Deploying

- **GitHub Pages:** pushing to `main` deploys via `.github/workflows/pages.yml` (set Pages source to GitHub Actions).
- **yannickwillems.be:** upload `index.html`, `styles.css`, `js/` and `scenarios/` to a subfolder over FTP. All paths are relative.

## Test

`node tests/smoke.cjs` plays a full three-request week in headless Chromium with Gemini mocked (needs Playwright).
