<div align="center">

# The Plan Audit

**Bring the financial plan to life.**

A guided, interactive audit that starts with what a household believes, reveals what its plan actually says, and helps it prepare a first step.

**Team Marmalade · Sherpas Wealth × UPV Sigma Data Club · 2026**

[Open hosted workspace](https://marmalade-plan-audit-upv-2026.azurewebsites.net/) · [Run the demo locally](#run-the-demo-locally) · [Read the challenge](https://github.com/SherpasEngineering/hackathon-upv-2026)

</div>

---

> [!TIP]
> The hosted workspace opens at the advisor sign-in. Use an advisor-issued link for the hosted client journey, or follow the local steps below to try the sample households without credentials.

## Start with a guess

A plan arrives with scores, projections and recommendations. Most families already have a question in mind. The Plan Audit asks what they expect before it opens the report. Inspired by Caleb Hammer’s *Financial Audit*, the Reveal puts that expectation next to the plan and gives equal attention to what is going well and what needs a closer look.

<table>
<tr><th>What the client expects</th><th>What the plan says</th></tr>
<tr><td><strong>50 / 100</strong><br>Example client estimate</td><td><strong>26 / 100</strong><br>Published score in Michael Carter’s sample plan</td></tr>
</table>

Then the client chooses what to explore. For example, **“How much would I need each year in retirement before long-term care?”** leads to **$89,648.57 per year** in the Carter plan, with the plan’s original figure and a link to page 5 of the report. We verified this question with live AI on a sample invitation in Azure.

## Walk through the experience

| Step | What happens |
| --- | --- |
| **1 · Hear the household** | Each partner can give their own score estimate. The household shares its concerns and priorities, then reviews its own words before the Reveal. |
| **2 · Open the plan** | The Reveal compares expectations with the published score when one exists. The client chooses a finding and switches between plain language and numerical detail. |
| **3 · Ask about the plan** | With live AI enabled, clients can ask in their own words. The backend retrieves relevant evidence and validates the model’s answer against its selected source. Exact metric names can also be looked up directly. |
| **4 · Choose a first step** | A preparation task comes from an existing plan recommendation. The client can name a barrier and try simulated day 3 and day 30 check-ins. |
| **5 · Brief the advisor** | The advisor sees the client’s expectations, saved questions, surprises and chosen first step before their meeting. |

Findings can be read aloud in the browser. Where a source has a verified PDF reference, the client can open the relevant report page. A chart is available when the plan includes a valid yearly projection series.

## From an uploaded JSON to an invitation

The advisor can upload one household’s plan, review the proposed fields and findings, and create a link for the client. The import supports Sherpas exports, wrapped documents and other schemas through AI-assisted or manual mapping. The advisor checks field selections against the uploaded values before sharing.

| Layer | Responsibility |
| --- | --- |
| [Plan inference](server/planInference.mjs) | Suggests fields, findings and available projection series from the uploaded JSON. |
| [Plan adapter](server/planAdapter.mjs) | Validates field selections and retains original values, units and JSON paths. A missing score stays missing. |
| [Audit engine](server/auditEngine.mjs) | Runs the interview, Reveal, deeper questions and next-step flow. The model works with a bounded set of plan evidence. |
| [Advisor workspace](server/advisorPortal.mjs) | Uses Supabase for signed-in advisors, private imports and invitation links. |

The four [sample households](cases/) and report PDFs come from Sherpas. [PDF references](server/report-sources/) are stored with the app. The hosted public demo uses the sample files and keeps live AI off by default. The Sherpas proxy is the optional model provider for configured runs.

## Run the demo locally

Requires **Node.js 22.9+** and npm. From the repository root:

```sh
cp .env.example .env
npm ci
npm run build
npm start
```

Open [localhost:3001](http://localhost:3001) and pick a sample household. The example setup uses `MOCK_AI=true` for a credential-free walkthrough. The exact-name lookup still works in this mode. For frontend hot reload, run `npm run dev` and `npm run dev:client` in separate terminals, then open [localhost:5173](http://localhost:5173).

<details>
<summary><strong>Enable the advisor workspace and live AI</strong></summary>

1. Apply the [advisor portal migration](supabase/migrations/202611140001_advisor_portal.sql) and then the [private plans migration](supabase/migrations/202611150001_advisor_plans.sql) in Supabase.
2. Create and confirm a test advisor in Supabase Auth. Add the user’s ID to `public.audit_advisors`.
3. Set `ADVISOR_PORTAL=true`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in the server environment. Keep the secret key in server-side configuration.
4. Set `MOCK_AI=false`, `TEAM_KEY` and `LLM_PROXY_URL` for live calls. The app expects the proxy base URL without the `/v1` suffix. Use the switches below for the features you intend to test.

| Server setting | Effect |
| --- | --- |
| `ADVISOR_PLAN_AI=true` | Suggests fields and findings when a signed-in advisor imports a plan. |
| `ADVISOR_REVEAL_AI=true` | Uses the client’s answers to choose and frame relevant Reveal findings. |
| `ADVISOR_QUESTIONS_AI=true` | Enables live answers to questions within a valid invitation. |
| `ADVISOR_AI_INVITATION_ID=<id>` | Limits live Reveal and Q&A calls in the advisor workspace to the selected invitation. Use the invitation row ID. |

The generated invitation is valid for 30 days. Copy it when you create it. The server stores its hash. Use a sample household and fictional answers for a public demo.

</details>

<details>
<summary><strong>Deploy to Azure App Service</strong></summary>

Use a Linux Web App with Node.js 24 LTS and startup command `npm start`. Set `SCM_DO_BUILD_DURING_DEPLOYMENT=true` and `PUBLIC_DEMO=true`. Set `AUDIT_SESSIONS_DIR=/home/plan-audit/demo-sessions` for storage across restarts. Add the Supabase settings above if hosting the advisor workspace.

Create a source ZIP with the repository files at the archive root, then deploy with Azure CLI:

```sh
az webapp deploy --resource-group <group> --name <app> --src-path <package.zip> --type zip
```

Check `/api/health` and complete an audit from a fresh browser session.

</details>

## Checks

```sh
npm test
npm run test:e2e
```

The server suite covers varied JSON shapes, missing scores, couple mode, exact figures, and source checks for model answers. The Playwright suite exercises desktop and mobile journeys with mock AI and uses an installed Chrome browser.

**Built with React, Vite, Express, Supabase and Azure App Service.** [Third-party notices](THIRD_PARTY_NOTICES.md)
