# The Plan Audit

An interactive explanation of an existing financial plan: the client gives their perspective first, then sees the plan in context and chooses a next step.

## Run locally

Requires Node.js 22+.

```sh
npm install
npm run build
npm start
```

The server serves the built app on `http://localhost:3001`. Configure `.env` using `.env.example`. `MOCK_AI=true` runs evidence selection without any model calls. The API key stays on the server.

For frontend development, run `npm run dev` in one terminal and `npm run dev:client` in another, then open `http://localhost:5173`. The Express server alone does **not** provide frontend hot reload. Restart it after backend changes; rebuild if viewing port 3001.

## The experience

1. One question at a time. Household members give separate score estimates; concerns and priorities are a shared response. A fifth question follows a topic in the imported plan without revealing its score or figures. Draft answers survive refresh.
2. A recap preserves the client’s exact words and lets them edit their answers.
3. The reveal starts with those words, a short skippable transition, and the plan’s score. Reduced-motion preferences skip the pause.
4. The client can choose which source-backed finding to explore first. This changes the first finding and can change the preparation step. Findings appear individually with a contextual reflection question. Switch between **In plain language** and **Numbers & context**, ask a question for a deeper explanation, listen with browser speech, or open a readable source summary in an accessible Radix dialog. Technical pointers, replacement keys, and raw JSON remain out of the client-facing panel.
5. A high score is contextualized by a retirement depletion finding only when that finding is actually in the plan. No client-name-specific story or age is embedded in the application.
6. Select a preparation step based on an original plan recommendation, record a barrier and receive a contextual response, then try clearly labelled day 3 and day 30 check-ins. AI can phrase the preparation questions and respond to the client's reported progress; the actions themselves are self-reported.

Questions saved for the advisor are included in the briefing. A rejected action records the barrier; it does not claim to have generated a new financial recommendation.

## Importing other clients

Use **Import a client plan** on the client list. Upload one client’s JSON export (up to 4.8 MB), review the detected fields, and add the client.

- Standard Sherpas financial-health exports are detected at the root or inside an enclosing object/array. Optional fields may be absent.
- Other layouts use explicit field mapping for client name, health score, household, summary and recommendations. Field locations use JSON Pointer internally; the selector lists available fields.
- Scores must be numeric and use a 0–100 scale. Missing scores stay missing, including in the briefing; zero remains zero.
- Labelled metrics with `label`, `value` (or `min`/`max`), and optional `unit`, `period`, `basis`, and `note` are read directly. Narrative-only plans can be explored through their mapped text.
- Unknown field semantics are **not** guessed. An export with differently structured unlabelled metrics needs an adapter or the relevant text mapped before those metrics can become findings. No application can reliably infer the meaning of an arbitrary JSON value solely from its position.
- One client per import: multiple recognized financial-health plans in the same file produce an explicit error. Unsupported shapes and invalid mappings also produce actionable errors.
- Generic household arrays use `first_name` or `name`, and explicit roles `client`, `spouse`, `partner`, `co-client` or `coclient`. Children are not treated as partners; missing roles do not create a fictitious second perspective.
- The original source location and value are retained for each finding. Imports persist under `data/imports/`; sessions persist under `data/sessions/`. Both are excluded from git.

Sample plans remain under `cases/<client-id>/financial-health.json`. The runtime does not contain a lookup table of family names or canned per-family findings. `server/planAdapter.mjs` owns schema interpretation, `server/casesService.mjs` owns storage, and `server/auditEngine.mjs` owns the flow.

This is a local/demo app. The server’s client list is shared and has no authentication or tenant isolation. Add those controls before making real client plans available in a shared deployment.

## Evidence and AI

The model may choose relevant IDs from a bounded list of source-backed findings using the user's answers, pose reflection questions, explain one source-backed finding on request, and phrase preparation and follow-up prompts. It cannot supply the displayed score, amounts, quotations or source passages. Invalid IDs are discarded. Unrelated questions are rejected before a model call; if a relevant question cannot be answered because the model is unavailable, the app says so instead of repeating a generic finding as an answer. In mock mode, or if the request fails, topic matching and prepared text keep the rest of the journey usable.

Explanation templates retain distinctions such as projections versus current balances, annual amounts versus lump sums, and reserves versus money available after goals. Unsupported or absent data is not replaced with another family’s plan. Original recommendations remain inspectable; the app does not recalculate the financial plan.

AI usage in the developer monitor is an estimate recorded by this app, not the team's authoritative remaining proxy budget. The listening button uses browser speech; ElevenLabs is not connected and no ElevenLabs key is required. Day 3 and day 30 remain simulated demo check-ins, not scheduled notifications.

## Validation

```sh
npm test
npm run test:e2e
```

Unit tests cover new clients, wrapped and mapped schemas, missing/zero scores, exact source pointers, edits, distinct partner scores, fabricated model IDs, and full lifecycle progression. Browser tests cover the desktop and mobile journeys, import mapping, reduced motion, dialog keyboard behavior and session restoration.

Browser tests use Playwright with the installed Chrome browser, a separate local server on port 3107 and mock AI. Their data lives under ignored `data/test-*` directories; screenshots are under ignored `test-results/`.

## Hackathon

Challenge context: https://github.com/SherpasEngineering/hackathon-upv-2026

The synthetic sample households are provided by Sherpas. The application explains their existing plans; it is not a replacement for Sherpas’s calculations.
