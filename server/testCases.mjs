import { getAllCasesOverview, getCaseDetails } from './casesService.mjs';
import { auditEngine } from './auditEngine.mjs';
import { aiService } from './aiService.mjs';

async function runTests() {
  console.log('--- 1. Testing Case Loading ---');
  const cases = getAllCasesOverview();
  console.log(`Loaded ${cases.length} cases:`);
  for (const c of cases) {
    console.log(`- [${c.id}] ${c.name} | Verified Score: ${c.score} (${c.band}) | CoupleMode: ${c.coupleMode}`);
  }

  if (cases.length !== 4) {
    throw new Error(`Expected 4 cases, got ${cases.length}`);
  }

  console.log('\n--- 2. Testing Case Details & Facts ---');
  for (const c of cases) {
    const details = getCaseDetails(c.id);
    if (!details || !details.score) {
      throw new Error(`Failed to load details for ${c.id}`);
    }
    console.log(`✓ ${c.id}: Score ${details.score}, ${details.household.length} household members, Facts extracted.`);
  }

  console.log('\n--- 3. Testing Audit Lifecycle for Samantha Lewis ---');
  const session = auditEngine.createSession('samantha-lewis', false);
  console.log(`Created session: ${session.id}`);

  // Interrogation answer
  await auditEngine.handleInterrogationAnswer(session.id, {
    category: 'perceived_health',
    question: 'How healthy do you think your finances are?',
    value: 90
  });

  await auditEngine.handleInterrogationAnswer(session.id, {
    category: 'confidence',
    question: 'How confident are you?',
    value: 'Very Confident'
  });

  await auditEngine.handleInterrogationAnswer(session.id, {
    category: 'main_concern',
    question: 'What is your main concern?',
    value: 'Funding college for Ethan and Ava without derailing my lifestyle'
  });

  // Summary
  console.log('Generating Interrogation Summary...');
  const summary = await auditEngine.generateInterrogationSummary(session.id);
  console.log('Summary auditor impression:', summary.auditorImpression);

  // Reveal
  console.log('Generating Reveal (Expected vs Actual)...');
  const reveal = await auditEngine.generateReveal(session.id);
  console.log(`Expected: ${reveal.expectedScore} | Actual: ${reveal.actualScore} | Gap: ${reveal.gap}`);
  console.log(`Discoveries: ${reveal.discoveries.length}`);
  for (const d of reveal.discoveries) {
    console.log(`  - [${d.badge}] ${d.title}: ${d.figure}`);
  }

  // Verdict
  console.log('Generating Verdict...');
  const verdict = await auditEngine.generateVerdict(session.id);
  console.log(`Bottom line: "${verdict.bottomLine}"`);

  // Mission
  console.log('Generating Mission...');
  const mission = await auditEngine.generateMission(session.id);
  console.log(`Mission: ${mission.number} - ${mission.title}`);

  auditEngine.handleMissionAcceptance(session.id, 'accept');
  console.log('Mission accepted!');

  // Follow-up Day 3
  console.log('Testing Follow-up Day 3...');
  const f3 = await auditEngine.handleFollowUp(session.id, { day: 3, status: 'started', details: 'Reviewed 401k match' });
  console.log(`Day 3 reaction: ${f3.auditorReaction.slice(0, 100)}...`);

  // Follow-up Day 30
  console.log('Testing Follow-up Day 30...');
  const f30 = await auditEngine.handleFollowUp(session.id, { day: 30, status: 'done', details: 'Capped college budget' });
  console.log(`Day 30 reaction: ${f30.auditorReaction.slice(0, 100)}...`);

  // Advisor briefing
  console.log('Generating Advisor Briefing...');
  const briefing = await auditEngine.generateAdvisorBriefing(session.id);
  console.log(`Briefing topics: ${briefing.advisorAgenda?.length}`);

  // Usage summary
  console.log('\n--- 4. Checking AI Usage & Cost Tracking ---');
  const usage = aiService.getUsageSummary();
  console.log(`Total Requests: ${usage.totalRequests} | Total Tokens: ${usage.totalPromptTokens + usage.totalCompletionTokens} | Total Cost: $${usage.totalCostUSD}`);

  console.log('\n✅ ALL BACKEND TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
