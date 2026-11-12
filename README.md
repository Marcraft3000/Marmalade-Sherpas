# THE PLAN AUDIT ⚡
### AI-Powered Interactive Financial Audit — Sherpas x UPV Sigma Data Club Hackathon 2026
**Team:** Marmalade | **Event:** Hackathon UPV 2026 | **Live Server:** `http://localhost:3001`

---

## 01. The Product Vision

**THE PLAN AUDIT** turns the final, hardest step of financial planning into an unforgettable, interactive experience inspired by the entertainment and accountability format of Caleb Hammer’s *Financial Audit*.

Instead of dumping 30 pages of charts or a generic guided tour on families, THE PLAN AUDIT uses a core psychological mechanic:

> ### **EXPECTATION VS. REALITY**
> The family is interrogated about what they *think* is happening with their money **before** seeing any financial conclusions. Only after capturing their subjective perceptions, assumptions, and anxieties does the auditor reveal the official Sherpas plan reality.

The contrast between what they believed and what the cold, hard numbers prove creates the central emotional moment. That discovery is immediately channeled into **ONE concrete, grounded mission** with ongoing 3-day and 30-day follow-up accountability.

---

## 02. The 5 Mandatory Stages

1. **STAGE 1 — THE INTERROGATION (Expectations First)**
   - The auditor introduces itself: direct, witty, sarcastic yet deeply empathetic.
   - Interactive 0–100 perceived health slider with live reactive commentary.
   - Financial confidence evaluation, main concern selector + custom voice dictation, and immediate priorities.
   - **Couple Mode:** Dual-partner perspective comparison for Timothy & Melanie Weah and Daniel & Emily Johnson.
   - **Interrogation Summary:** *"Here is what I heard"* confirmation screen locking assumptions before the reveal.

2. **STAGE 2 — THE REVEAL (The Reality Gap)**
   - Suspense transition into the unmasking.
   - **Giant Side-by-Side Comparison:** Predicted Score vs. Verified Sherpas Score vs. Mathematical Gap (e.g., `-25 PTS`).
   - Personalized auditor reaction explicitly calling out what the user claimed in the interrogation.
   - 2–3 deep discoveries with verified numbers from Sherpas plan facts (`financial-health.json`), plain English breakdowns, and interactive understanding checks.

3. **STAGE 3 — THE VERDICT**
   - **What You're Doing Right:** Honest validation of real strengths.
   - **What Needs Immediate Attention:** The primary financial leak or hazard.
   - **What You May Be Overlooking:** The underlying psychological or structural blind spot.
   - **The Bottom Line:** One memorable Caleb Hammer punchline.

4. **STAGE 4 — THE MISSION (Motivation to Act)**
   - ONE high-leverage first step directly drawn from Sherpas recommendations.
   - Concrete 4-step execution protocol, suggested timeframe (e.g. 72 hours), objective verification criteria, and difficulty rating.
   - User commitment: **ACCEPT MISSION** (with confetti celebration), **I NEED TO THINK**, or **DOESN'T WORK** (with obstacle capture).

5. **STAGE 5 — THE FOLLOW-UP & ACCOUNTABILITY**
   - **Day 3 Check-In:** *"Three days later. How's the mission going?"* (Done / Started / Haven't started / Roadblock).
   - **Day 30 Check-In:** Long-term reflection on baseline shifts.
   - **Fast Forward 30 Days (Demo Time Travel):** Prominent button for judges to simulate the passage of time and observe dynamic accountability responses.
   - Full session persistence surviving reloads.

---

## 03. All 4 Mandatory Families Supported

| Family | Score & Band | Context & Core Paradox |
|---|---|---|
| **Timothy & Melanie Weah** | **60** (Stable) | $150,800 accessible cash vs. $18,000 credit card at 18% APR ($270/mo interest bleed), $1.1M life insurance shortfall, $0 in 529 college funds. Dual-partner couple mode. |
| **Michael Carter** | **26** (Critical) | $180,000 salary with -$8,336 negative annual cash flow, BMW loan, Amex at 20%, $30k cash. Ambitious goal to buy a $550k home in 2027 while trying to retire at 58 (savings run out at 85). |
| **Daniel & Emily Johnson** | **52** (Vulnerable) | $560,000 mortgage, $18,000 credit card at 24.9% APR, two kids (Oliver 11, Sophia 9), and a $1,350,000 life insurance protection void. Dual-partner couple mode. |
| **Samantha Lewis** | **82** (Strong) | $250,000 income, completely debt-free, $2M coverage. **The Hidden Cliff:** Living map projections reveal savings run out at age 73 ($1.45M deficit) with an unsustainable 12.2% retirement draw rate when college and 2030 home collide. |

---

## 04. Key Innovations & Differentiators

- **Zero-Token Protection Mode:** Integrated dev console with a 1-click toggle to run in 100% verified instant local mock mode ($0.00 spent) or switch to live OpenAI-compatible proxy calls (`gpt-5-mini` / `gemini-3.5-flash-lite`).
- **Free Built-in Voice Engine:** Web Speech API text-to-speech for the Caleb Hammer auditor + speech recognition for user microphone dictation. Zero credits consumed, 100% reliable during live presentations.
- **Paraplanner & Advisor Briefing:** Generates an executive pre-meeting intelligence sheet strictly distinguishing **[FACT]**, **[USER STATEMENT]**, **[INTERPRETATION]**, and **[AGENDA]**.
- **Financial Trust & Integrity:** Never invents numbers. All figures, interest rates, and balances come directly from official Sherpas plan files.

---

## 05. How to Run the Application

### Prerequisites
- Node.js 20 or later (Tested on Node.js v24)
- npm 10 or later

### Quick Start (1 Command)
```bash
# 1. Install dependencies
npm install

# 2. Build and launch fullstack server on port 3001
npm run build
npm start
```
Then open your browser to **`http://localhost:3001`**.

### Development Mode (Hot Reload)
```bash
# Runs backend with nodemon/node on port 3001 and Vite client on port 5173
npm run dev
```

---

## 06. Environment Variables (`.env`)

```env
PORT=3001
MCP_URL=https://mcp-hackathon.sherpaswealth.com/mcp
MCP_TOKEN=your_token_here
LLM_PROXY_URL=https://llm-hackathon.sherpaswealth.com
TEAM_KEY=your_team_key_here

# Zero-Token Protection: Keep true for free instant local testing, set false for live API
MOCK_AI=true

OPENROUTER_PRIMARY_MODEL=gemini-3.5-flash-lite
OPENROUTER_FAST_MODEL=gemini-3.5-flash-lite
```

---

## 07. Demo Walkthrough Script (2 Minutes for Judges)

1. **Select Case:** Choose **Samantha Lewis** on the landing page (point out her strong 82 score).
2. **Interrogation:** Move the slider to 90 ("Very Confident", concern: "Paying for college without loans").
3. **Summary:** Confirm the assumptions captured.
4. **The Reveal:** Show the -8 PT gap and reveal the **Age 73 Retirement Cliff** and **12.2% Withdrawal Rate**. Notice the auditor calls out her specific claim!
5. **The Verdict:** Read the Bottom Line: *"You are winning the present, but on track to lose your future."*
6. **The Mission:** Accept Mission 01 (*Establish The Retirement Defense Boundary*), triggering celebration confetti.
7. **Demo Time Travel:** Click **"FAST FORWARD 30 DAYS"** to demonstrate Day 3 and Day 30 follow-up accountability.
8. **Advisor Briefing:** Click **"Advisor Briefing"** in the top navigation to view the exportable paraplanner summary sheet with clear separation of facts and user statements.
