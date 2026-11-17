# The Plan Audit

An interactive explanation of an existing financial plan: the client gives their perspective first, then sees the plan in context and chooses a next step.

## Run locally

Requires Node.js 22.9 or later.

```sh
npm install
npm run build
npm start
```

The server serves the built app on `http://localhost:3001`. Configure `.env` using `.env.example`. `MOCK_AI=true` runs evidence selection without any model calls. The API key stays on the server.

For frontend development, run `npm run dev` in one terminal and `npm run dev:client` in another, then open `http://localhost:5173`. The Express server alone does **not** provide frontend hot reload. Restart it after backend changes; rebuild if viewing port 3001.

## Deploy on Render

Create a **Web Service** from this repository with build command `npm install && npm run build` and start command `npm start` (Node 22+). Express serves the built React app and `/api` on the same hostname. Add the environment variables below in **Environment**.

### Enable the advisor workspace

1. In your Supabase project's SQL Editor, apply every file in [`supabase/migrations`](supabase/migrations) in order, once each: the advisor portal, private plans and [advisor clients](supabase/migrations/202611170001_advisor_clients.sql) migrations.
2. Advisors create their own account from **Create account** on the workspace. Set `ADVISOR_SIGNUP_CODE` to require a firm code. Set `DEMO_ADVISOR_EMAIL` and `DEMO_ADVISOR_PASSWORD` to offer **Explore the demo workspace**; the account is created on first use.
3. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` to the Render environment. For local testing, put these settings in your ignored `.env`. Keep the secret key on the server.
4. The workspace is on by default (`ADVISOR_PORTAL=false` turns it off); keep `PUBLIC_DEMO=true`. The advisor workspace opens at `/` and each invitation opens its audit directly. Links are valid for 30 days and can be copied from the invitation details. Existing links continue to work until they expire. After a client submits their survey, the invitation receives a notification. The workspace refreshes every 30 seconds while visible and remembers which responses were opened in the current browser.

Without Supabase settings the workspace runs on an in-memory store for local development: any email and password signs in and data is lost on restart.

### Following each client

The **Clients** list shows each invitation's journey (invited → opened → perspective → plan reveal → next step → day 3 → day 30), the client's estimate beside the plan score, the step they chose and check-ins that are due. Open a client to:

- **Leave a note.** The client sees it at the top of the audit the next time they open their link.
- **Email the invitation or a reminder.** With `RESEND_API_KEY` the server sends it; otherwise the message opens in the advisor's email app, ready to send.
- **Get real check-ins.** Three and thirty days after the client commits to a step, a reminder links to `/audit/<token>?checkin=3` (or `30`), which opens that check-in directly. The server checks hourly; because free Render instances sleep, [the reminders workflow](.github/workflows/reminders.yml) also calls `POST /api/cron/reminders` daily. Set the `APP_URL` and `CRON_SECRET` repository secrets and the same `CRON_SECRET` on Render. Resend's test sender only delivers to the Resend account's own address; verify a domain to email clients.

Use a sample plan and fictional responses when verifying the flow. The advisor workspace can also import a client's JSON, preview the detected fields and findings, and create an invitation from that plan. Imported plans are scoped to the advisor who uploaded them in Supabase.

For live plan analysis and interview personalization, set `ADVISOR_PLAN_AI=true` and `ADVISOR_INTERVIEW_AI=true` alongside `TEAM_KEY` and `LLM_PROXY_URL`. Set `ADVISOR_QUESTIONS_AI=true` to let the model select passages when clients ask questions. `MOCK_AI=true` keeps these paths offline.

To enable server narration on invitations, set `ADVISOR_TTS=true`, `TTS_VOICE_ID` and the proxy's `OPENROUTER_TTS_MODEL`. For direct ElevenLabs, set `TTS_PROVIDER=elevenlabs`, `ELEVENLABS_API_KEY` and `TTS_MODEL=eleven_flash_v2_5`. The app uses browser speech if the provider is unavailable. Remote narration reads the visible financial figures aloud, so use synthetic plans when testing providers.

Set a stable `AUDIT_INVITE_SIGNING_KEY` on Render if you want it separate from the Supabase secret used by default. Without either, invitation links stop working after a restart.

## The experience

1. One question at a time. Household members give separate score estimates; concerns and priorities are a shared response. A fifth question follows a topic in the imported plan without revealing its score or figures. Draft answers survive refresh.
2. A recap preserves the client’s exact words and lets them edit their answers.
3. The reveal starts with those words, a short skippable transition, and the plan’s score. Reduced-motion preferences skip the pause.
4. The client can choose which source-backed finding to explore first. This changes the first finding and can change the preparation step. Findings appear individually with a contextual reflection question. Switch between **In plain language** and **Numbers & context**, ask a question for a deeper explanation, listen with browser speech, or open a readable source summary in an accessible Radix dialog. Technical pointers, replacement keys, and raw JSON remain out of the client-facing panel.
5. A high score is contextualized by a retirement depletion finding only when that finding is actually in the plan. No client-name-specific story or age is embedded in the application.
6. Select a preparation step based on an original plan recommendation, record a barrier and receive a contextual response, then try clearly labelled day 3 and day 30 check-ins. AI can phrase the preparation questions and respond to the client's reported progress; the actions themselves are self-reported.

The advisor can open an invitation to see what surprised the client, the findings and questions they saved, and the preparation step they accepted. Each sample finding with a verified report reference links to its PDF page. Retirement findings offer a projected net-worth chart when the plan includes a valid annual series.

## Importing other clients

Use **Import a client plan** on the client list. Upload one client’s JSON export (up to 4.8 MB), review the detected fields, and add the client.

- Standard Sherpas financial-health exports are detected at the root or inside an enclosing object/array. Optional fields may be absent.
- The import accepts other schema layouts. When configured, AI analyzes a selection of the document's fields and suggests mappings, findings and a chart for an available yearly series. The advisor can review original values, correct field selections and labels, and add findings manually. Field locations use JSON Pointer internally.
- Scores must be numeric and use a 0–100 scale. Missing scores stay missing, including in the briefing; zero remains zero.
- Labelled metrics with `label`, `value` (or `min`/`max`), and optional `unit`, `period`, `basis`, and `note` are read directly. Narrative-only plans can be explored through their mapped text.
- If a document omits context for a value, confirm its meaning with the source before including it in the audit. Each finding retains its original value and location in the uploaded JSON.
- One client per import: multiple recognized financial-health plans in the same file produce an explicit error. Unsupported shapes and invalid mappings also produce actionable errors.
- Generic household arrays use `first_name` or `name`, and explicit roles `client`, `spouse`, `partner`, `co-client` or `coclient`. Children are not treated as partners; missing roles do not create a fictitious second perspective.
- The original source location and value are retained for each finding. Imports persist under `data/imports/`; sessions persist under `data/sessions/`. Both are excluded from git.

Sherpas provided the original files under `cases/` as examples of its current system. Keep them intact. Sample PDF references live under `server/report-sources/`. `server/planInference.mjs` suggests fields with AI, `server/planAdapter.mjs` validates data, and `server/auditEngine.mjs` owns the flow.

The standalone client list is available for local testing. Use the signed-in advisor workspace when sharing an audit link based on an imported JSON.

## Evidence and AI

The model may choose relevant IDs from a bounded list of source-backed findings using the user's answers, pose reflection questions, explain one source-backed finding on request, and phrase preparation and follow-up prompts. It cannot supply the displayed score, amounts, quotations or source passages. Invalid IDs are discarded. Unrelated questions are rejected before a model call; if a relevant question cannot be answered because the model is unavailable, the app says so instead of repeating a generic finding as an answer. In mock mode, or if the request fails, topic matching and prepared text keep the rest of the journey usable.

Explanation templates retain distinctions such as projections versus current balances, annual amounts versus lump sums, and reserves versus money available after goals. Unsupported or absent data is not replaced with another family’s plan. Original recommendations remain inspectable; the app does not recalculate the financial plan.

The developer monitor estimates AI usage from requests recorded by this app. Day 3 and day 30 are simulated check-ins.

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
