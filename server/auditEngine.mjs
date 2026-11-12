import { getCaseDetails, getCaseBriefForLLM } from './casesService.mjs';
import { aiService, AUDITOR_SYSTEM_PROMPT } from './aiService.mjs';
import { CASE_FALLBACKS } from './fallbacks.mjs';

export class AuditEngine {
  constructor() {
    this.sessions = new Map();
  }

  createSession(caseId, isCoupleMode = false) {
    const caseDetails = getCaseDetails(caseId);
    if (!caseDetails) throw new Error(`Case ${caseId} not found`);

    const sessionId = `audit_${caseId}_${Date.now()}`;
    const session = {
      id: sessionId,
      caseId,
      caseName: caseDetails.meta.name,
      isCoupleMode,
      activePartner: isCoupleMode ? caseDetails.meta.partners[0] : null,
      currentStage: 'interrogation', // interrogation -> summary -> reveal -> verdict -> mission -> followup
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expectedScore: 70,
      partnerScores: {},
      answers: [],
      summary: null,
      reveal: null,
      verdict: null,
      mission: null,
      followUpHistory: [],
      simulatedDay: 0,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId, updates) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    Object.assign(session, updates, { updatedAt: new Date().toISOString() });
    return session;
  }

  /**
   * Process an interrogation response and optionally generate a dynamic follow-up
   */
  async handleInterrogationAnswer(sessionId, answer) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    session.answers.push({
      ...answer,
      timestamp: new Date().toISOString()
    });

    if (answer.category === 'perceived_health') {
      session.expectedScore = Number(answer.value);
      if (session.isCoupleMode && session.activePartner) {
        session.partnerScores[session.activePartner] = Number(answer.value);
      }
    }

    session.updatedAt = new Date().toISOString();
    return { success: true, session };
  }

  /**
   * Generate interrogation summary ("Here's what I heard")
   */
  async generateInterrogationSummary(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const caseDetails = getCaseDetails(session.caseId);
    const answers = session.answers;

    const perceivedHealthAns = answers.find(a => a.category === 'perceived_health');
    const mainConcernAns = answers.find(a => a.category === 'main_concern');
    const priorityAns = answers.find(a => a.category === 'financial_priority');
    const confidenceAns = answers.find(a => a.category === 'confidence');

    const expectedScore = perceivedHealthAns ? Number(perceivedHealthAns.value) : session.expectedScore;
    const mainConcern = mainConcernAns?.value || 'Maintaining our lifestyle and family security';
    const biggestPriority = priorityAns?.value || 'Optimizing our current money management';
    const confidence = confidenceAns?.value || 'Moderate';

    const prompt = `
Generate a concise, punchy "Here is what I heard" summary for ${caseDetails.meta.name}.
User answers during interrogation:
- Perceived Financial Health: ${expectedScore}/100
- Confidence level: ${confidence}
- Main Concern: "${mainConcern}"
- Top Immediate Priority: "${biggestPriority}"
${session.isCoupleMode ? `- Couple Mode Partners: ${caseDetails.meta.partners.join(' and ')}` : ''}

Respond with a JSON object:
{
  "expectedScore": ${expectedScore},
  "confidence": "${confidence}",
  "mainConcern": "short concise sentence",
  "biggestPriority": "short concise sentence",
  "auditorImpression": "1-2 sharp, witty Caleb Hammer style sentences acknowledging their perspective before the reveal",
  "keyBeliefs": ["bullet 1", "bullet 2"]
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: 'interrogation_summary',
      stage: 'interrogation'
    });

    let summary = null;
    if (aiRes.success && aiRes.content && typeof aiRes.content === 'object') {
      summary = aiRes.content;
    } else {
      summary = {
        expectedScore,
        confidence,
        mainConcern,
        biggestPriority,
        auditorImpression: `You see your household as a solid ${expectedScore}/100 and believe your main hurdle is "${mainConcern}". Let's see if the cold hard math backs that up.`,
        keyBeliefs: [
          `You rate your financial health at ${expectedScore}/100.`,
          `Your biggest priority right now is "${biggestPriority}".`,
          `You consider yourself ${confidence.toLowerCase()} confident in your financial path.`
        ]
      };
    }

    session.summary = summary;
    session.currentStage = 'summary';
    session.updatedAt = new Date().toISOString();
    return summary;
  }

  /**
   * Generate THE REVEAL: Expected vs Actual Score, Gap, and Discoveries
   */
  async generateReveal(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const caseDetails = getCaseDetails(session.caseId);
    const expectedScore = session.expectedScore;
    const actualScore = caseDetails.score;
    const gap = expectedScore - actualScore; // Positive means user was over-optimistic
    const fallback = CASE_FALLBACKS[session.caseId];

    // Format user answers context
    const answersText = session.answers
      .map(a => `- ${a.category}: ${a.value}`)
      .join('\n');

    const prompt = `
${getCaseBriefForLLM(session.caseId)}

THE INTERROGATION IS COMPLETE. NOW GENERATE THE REVEAL.
User's Expected Health Score: ${expectedScore}
Official Sherpas Verified Health Score: ${actualScore} (Band: ${caseDetails.band})
Mathematical Score Gap: ${gap > 0 ? `+${gap} (User was OVER-OPTIMISTIC)` : `${gap} (User was CONSERVATIVE)`}

User's Statements during interrogation:
${answersText}

YOUR TASK:
1. Provide a sharp, personalized Caleb Hammer style auditor reaction comparing their expected score (${expectedScore}) to their real score (${actualScore}).
   - You MUST explicitly reference what they claimed in their answers (e.g. why they felt safe or what they thought their main concern was).
   - Point out the central contradiction between their feeling and reality.
2. Select 2-3 deep financial discoveries from the official plan. For each discovery provide:
   - title: Punchy headline in all caps (e.g. "THE 18% PARADOX", "THE 2027 CLIFF", "THE RETIREMENT VOID")
   - figure: Exact dollar amount or percentage from the facts
   - source: Name of the Sherpas plan section
   - explanation: Clear, jargon-free breakdown of what the numbers mean
   - whyItMatters: Practical life consequence
   - auditorRemark: Sarcastic but caring Caleb Hammer one-liner
   - badge: "FACT" | "INTERPRETATION"

Respond ONLY with valid JSON:
{
  "expectedScore": ${expectedScore},
  "actualScore": ${actualScore},
  "gap": ${gap},
  "band": "${caseDetails.band}",
  "auditorReaction": "personalized commentary comparing expectation vs reality",
  "discoveries": [
    {
      "id": "disc-1",
      "title": "HEADLINE",
      "figure": "$XX,XXX at Y%",
      "source": "Source section",
      "explanation": "plain english explanation",
      "whyItMatters": "consequence",
      "auditorRemark": "witty auditor punchline",
      "badge": "FACT"
    }
  ]
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: 'reveal_generation',
      stage: 'reveal'
    });

    let revealData = null;
    if (aiRes.success && aiRes.content && aiRes.content.auditorReaction && Array.isArray(aiRes.content.discoveries)) {
      revealData = {
        ...aiRes.content,
        expectedScore,
        actualScore,
        gap,
        band: caseDetails.band
      };
    } else {
      // Deterministic curated fallback
      revealData = {
        expectedScore,
        actualScore,
        gap,
        band: caseDetails.band,
        auditorReaction: fallback.revealReaction(expectedScore, actualScore, gap),
        discoveries: fallback.discoveries
      };
    }

    session.reveal = revealData;
    session.currentStage = 'reveal';
    session.updatedAt = new Date().toISOString();
    return revealData;
  }

  /**
   * Handle user understanding check on a discovery
   */
  async handleUnderstandingCheck(sessionId, discoveryId, choice, userComment = '') {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const prompt = `
The user is reacting to discovery "${discoveryId}" in their financial audit.
Their choice: "${choice}"
User comment: "${userComment}"

Respond with a brief, supportive, direct 2-sentence response from the Auditor addressing their question, validating their feeling, or clarifying the math in simple terms.
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: aiService.fastModel,
      purpose: 'understanding_check',
      stage: 'reveal'
    });

    const responseText = aiRes.success && aiRes.content
      ? (typeof aiRes.content === 'string' ? aiRes.content : JSON.stringify(aiRes.content))
      : "I hear you. The numbers can feel jarring at first glance, but that's why we confront them today—so you can take full control of tomorrow.";

    return { success: true, response: responseText };
  }

  /**
   * Generate THE VERDICT
   */
  async generateVerdict(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const caseDetails = getCaseDetails(session.caseId);
    const fallback = CASE_FALLBACKS[session.caseId];

    const prompt = `
${getCaseBriefForLLM(session.caseId)}

AUDIT STAGE: THE VERDICT
User Expected Score: ${session.expectedScore} | Real Score: ${caseDetails.score} (${caseDetails.band})
Discoveries discussed:
${(session.reveal?.discoveries || fallback.discoveries).map(d => `- ${d.title}: ${d.figure}`).join('\n')}

Generate the final formal Audit Verdict.
Respond with JSON:
{
  "doingRight": "Acknowledge 1-2 real strengths and achievements honestly",
  "needsAttention": "Highlight the most urgent financial hazard or leak",
  "overlooking": "Identify the core underlying contradiction or blind spot",
  "bottomLine": "One memorable, punchy Caleb Hammer style verdict sentence"
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: 'verdict_generation',
      stage: 'verdict'
    });

    let verdict = null;
    if (aiRes.success && aiRes.content && aiRes.content.bottomLine) {
      verdict = aiRes.content;
    } else {
      verdict = fallback.verdict;
    }

    session.verdict = verdict;
    session.currentStage = 'verdict';
    session.updatedAt = new Date().toISOString();
    return verdict;
  }

  /**
   * Generate THE MISSION (Stage 4)
   */
  async generateMission(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const caseDetails = getCaseDetails(session.caseId);
    const fallback = CASE_FALLBACKS[session.caseId];

    const prompt = `
${getCaseBriefForLLM(session.caseId)}

AUDIT STAGE: THE MISSION (STAGE 4)
The family has confronted their numbers and heard the verdict.
Now assign ONE concrete first mission based strictly on Sherpas recommendations.
Do not assign five things. Pick the single highest leverage first step.

Respond with JSON:
{
  "number": "MISSION 01",
  "title": "Short imperative action title",
  "whyItMatters": "Clear reason connecting their situation to peace of mind",
  "firstAction": "Immediate step they can do within 24-48 hours",
  "steps": [
    "Step 1: Specific action",
    "Step 2: Specific action",
    "Step 3: Specific action",
    "Step 4: Specific action"
  ],
  "timeframe": "e.g. 72 hours / 7 days",
  "howToVerify": "Objective sign of completion (e.g. balance reaches zero, application submitted)",
  "estimatedDifficulty": "Label as estimate, e.g. Low effort, High leverage"
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: 'mission_generation',
      stage: 'mission'
    });

    let mission = null;
    if (aiRes.success && aiRes.content && aiRes.content.title && Array.isArray(aiRes.content.steps)) {
      mission = {
        ...aiRes.content,
        status: 'not_accepted',
        acceptedAt: null,
      };
    } else {
      mission = {
        ...fallback.mission,
        status: 'not_accepted',
        acceptedAt: null,
      };
    }

    session.mission = mission;
    session.currentStage = 'mission';
    session.updatedAt = new Date().toISOString();
    return mission;
  }

  /**
   * User accepts or modifies mission
   */
  handleMissionAcceptance(sessionId, decision, reason = '') {
    const session = this.getSession(sessionId);
    if (!session || !session.mission) throw new Error('Mission not found');

    session.mission.status = decision === 'accept' ? 'accepted' : decision === 'think' ? 'considering' : 'rejected';
    session.mission.acceptedAt = decision === 'accept' ? new Date().toISOString() : null;
    session.mission.userReason = reason;

    let response = '';
    if (decision === 'accept') {
      response = "Boom! That is what I like to hear. You've officially committed to taking your money off defense. Now go execute step one—I will be waiting for your Day 3 update.";
    } else if (decision === 'think') {
      response = "Fair enough. Big financial moves take mental processing. But don't let 'thinking about it' turn into another 12 months of paying unnecessary interest.";
    } else {
      response = `Understood. If this mission doesn't fit your immediate reality, let's look at what barrier came up: "${reason || 'Other priorities'}". We will adapt the next step.`;
    }

    session.updatedAt = new Date().toISOString();
    return { success: true, mission: session.mission, auditorResponse: response };
  }

  /**
   * Stage 5: Follow-Up & Demo Time Travel (Day 3 & Day 30)
   */
  async handleFollowUp(sessionId, { day, status, details = '' }) {
    const session = this.getSession(sessionId);
    if (!session || !session.mission) throw new Error('Session or mission not found');

    session.simulatedDay = day;
    const mission = session.mission;

    const prompt = `
AUDIT STAGE: FOLLOW-UP (DAY ${day})
Family: ${session.caseName}
Mission: "${mission.title}"
User reported status: "${status}" (Options: done, started, not_started, blocked)
User notes: "${details}"

Give a personalized Caleb Hammer style auditor reaction:
- If 'done': Celebrate their win enthusiastically and remind them what this unlocked.
- If 'started': Validate their initial progress, push them to finish the remaining steps.
- If 'not_started': Ask without shaming what distracted them and give a 10-minute micro-action.
- If 'blocked': Help remove the specific roadblock constructively.

Respond with a JSON object:
{
  "day": ${day},
  "status": "${status}",
  "auditorReaction": "personalized 2-3 sentence response",
  "nextStep": "one clear next micro-step",
  "updatedMissionStatus": "${status === 'done' ? 'completed' : status === 'started' ? 'in_progress' : 'needs_revision'}"
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: `followup_day_${day}`,
      stage: 'followup'
    });

    let followUpRes = null;
    if (aiRes.success && aiRes.content && aiRes.content.auditorReaction) {
      followUpRes = aiRes.content;
    } else {
      const reactions = {
        done: `Outstanding work! You actually stepped up and executed. You've stopped the bleed and proven to yourself that your money is under your command.`,
        started: `Good start! You took the hardest step which is getting off the couch. Now let's push through the remaining items so you can declare total victory.`,
        not_started: `Look, life happens and procrastination is comfortable. But that financial hazard isn't taking a vacation. Take just 15 minutes today to do step one.`,
        blocked: `Roadblocks are normal when dealing with banks and insurance. What matters is not throwing your hands up. Let's tackle the obstacle directly.`
      };

      followUpRes = {
        day,
        status,
        auditorReaction: reactions[status] || reactions.started,
        nextStep: status === 'done' ? "Review next priority on your financial roadmap" : "Complete step 1 of your mission today",
        updatedMissionStatus: status === 'done' ? 'completed' : 'in_progress'
      };
    }

    if (status === 'done') {
      mission.status = 'completed';
      mission.completedAt = new Date().toISOString();
    } else if (status === 'started') {
      mission.status = 'in_progress';
    }

    session.followUpHistory.push(followUpRes);
    session.currentStage = 'followup';
    session.updatedAt = new Date().toISOString();

    return followUpRes;
  }

  /**
   * Stage 6: Generate Advisor Briefing
   */
  async generateAdvisorBriefing(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const caseDetails = getCaseDetails(session.caseId);
    const expectedScore = session.expectedScore;
    const actualScore = caseDetails.score;

    const facts = [
      `Verified Sherpas Financial Health Score: ${actualScore}/100 (${caseDetails.band}).`,
      `Liquid Cash: $${caseDetails.facts.cash?.accessibleCash?.value ?? 'N/A'}.`,
      `Emergency Reserve Target: $${caseDetails.facts.cash?.emergencyReserve?.min ?? 'N/A'} - $${caseDetails.facts.cash?.emergencyReserve?.max ?? 'N/A'}.`,
      `Existing Debts: ${JSON.stringify(caseDetails.facts.debt).slice(0, 150)}.`,
      `Retirement Status: ${caseDetails.facts.retirement?.savingsRunOut?.label || 'Projected based on Sherpas model'}.`
    ];

    const userStatements = session.answers.map(a => `Claimed ${a.category}: "${a.value}"`);

    const prompt = `
Generate a structured, professional Financial Advisor Briefing report for ${session.caseName}.
This briefing will be read by the Sherpas wealth advisor before meeting the family.

DATA TO INCLUDE:
- Verified Score: ${actualScore}/100
- Client Expected Score: ${expectedScore}/100 (Gap: ${expectedScore - actualScore})
- Client Stated Concerns & Priorities: ${userStatements.join('; ')}
- Discoveries covered during audit: ${(session.reveal?.discoveries || []).map(d => d.title).join(', ')}
- Mission Accepted: ${session.mission?.title || 'None'} (Status: ${session.mission?.status || 'Pending'})

Format requirements:
Separately list:
1. VERIFIED FACTS (from Sherpas plan)
2. USER STATEMENTS (verbatim claims made during interrogation)
3. AUDIT DIAGNOSTIC & MISCONCEPTIONS (AI interpretations of why client perceptions differ from reality)
4. TOP 3 ADVISOR AGENDA TOPICS for the upcoming client meeting.

Respond with JSON:
{
  "clientName": "${session.caseName}",
  "verifiedScore": ${actualScore},
  "expectedScore": ${expectedScore},
  "scoreGap": ${expectedScore - actualScore},
  "facts": ["fact 1", "fact 2", "fact 3"],
  "userStatements": ["statement 1", "statement 2"],
  "misconceptionsAndGaps": ["gap 1", "gap 2"],
  "acceptedMission": "${session.mission?.title || 'Pending'}",
  "missionStatus": "${session.mission?.status || 'Pending'}",
  "advisorAgenda": [
    "Topic 1: Specific high leverage discussion item",
    "Topic 2: Specific high leverage discussion item",
    "Topic 3: Specific high leverage discussion item"
  ]
}
`;

    const aiRes = await aiService.callChatCompletion({
      messages: [
        { role: 'system', content: 'You are an expert senior paraplanner preparing a concise, high-value client briefing for a licensed financial advisor. Distinguish strictly between facts and client statements.' },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json_object',
      purpose: 'advisor_briefing',
      stage: 'briefing'
    });

    let briefing = null;
    if (aiRes.success && aiRes.content && Array.isArray(aiRes.content.advisorAgenda)) {
      briefing = aiRes.content;
    } else {
      briefing = {
        clientName: session.caseName,
        verifiedScore: actualScore,
        expectedScore,
        scoreGap: expectedScore - actualScore,
        facts,
        userStatements,
        misconceptionsAndGaps: [
          `Client estimated health score at ${expectedScore}, differing by ${Math.abs(expectedScore - actualScore)} points from verified score (${actualScore}).`,
          `Client prioritized immediate liquidity or lifestyle over structural vulnerabilities (protection gaps and high-interest liabilities).`
        ],
        acceptedMission: session.mission?.title || 'Initial Financial Health Calibration',
        missionStatus: session.mission?.status || 'In Progress',
        advisorAgenda: [
          `Review the client's expectation gap (${expectedScore} vs ${actualScore}) and validate their positive momentum.`,
          `Finalize execution on the accepted audit mission (${session.mission?.title || 'Credit card & protection restructuring'}).`,
          `Present the long-term living map scenario demonstrating the compound effect of fixing their core vulnerability today.`
        ]
      };
    }

    session.briefing = briefing;
    session.updatedAt = new Date().toISOString();
    return briefing;
  }
}

export const auditEngine = new AuditEngine();
