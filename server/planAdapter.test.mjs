import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizePlan, atPointer, inspectPlan } from './planAdapter.mjs';

process.env.MOCK_AI = 'true';
process.env.TEAM_KEY = 'offline-test';
const { importPlan, getCaseDetails, getAllCasesOverview } = await import('./casesService.mjs');
const { AuditEngine } = await import('./auditEngine.mjs');
const { aiService } = await import('./aiService.mjs');
const { analyzePlan } = await import('./planInference.mjs');

const fixture = () => ({
  part: 'financial-health',
  case: { name: 'Avery & Morgan Rivera', household: [{ first_name: 'Avery', role: 'client' }, { first_name: 'Morgan', role: 'partner' }] },
  score: { published_score: 88, band: 'strong', top_moves: [{ title: 'Review retirement saving', action: 'Review the retirement contribution in the plan.' }] },
  narrative: { summary_main: 'The plan includes both current finances and retirement.', summary_recommendations: 'Review retirement saving before committing to another goal.' },
  key_metrics: { facts: { retirement: { savingsRunOut: { label: 'Savings and investments run out at age 79', value: 120000, unit: 'USD', period: 'planned spending left unpaid by the end of the plan', basis: 'projection' } }, cash: { accessibleCash: { label: 'Accessible cash', value: 22000, unit: 'USD', period: 'today' } } } },
});
async function answered(engine, id, couple = false) {
  const s = engine.createSession(id, couple);
  await engine.handleInterrogationAnswer(s.id, { category: 'perceived_health', value: 80, partner: couple ? 'Avery' : null });
  if (couple) await engine.handleInterrogationAnswer(s.id, { category: 'perceived_health', value: 40, partner: 'Morgan' });
  for (const [category, value] of [['confidence', 'Unsure'], ['main_concern', 'Will my retirement be sustainable?'], ['financial_priority', 'Plan for the long term']]) await engine.handleInterrogationAnswer(s.id, { category, value });
  await engine.generateInterrogationSummary(s.id);
  return s;
}

test('a new client works through the complete lifecycle without a case-specific fallback', async () => {
  const client = importPlan(fixture(), {}, { persist: false });
  const engine = new AuditEngine();
  const s = await answered(engine, client.id);
  const reveal = await engine.generateReveal(s.id);
  assert.equal(reveal.userQuote.text, 'Will my retirement be sustainable?');
  assert.equal(reveal.actualScore, 88);
  assert.match(reveal.discoveries[0].title, /79/);
  assert.ok(reveal.scoreContext);
  assert.deepEqual(reveal.discoveries[0].source.raw, atPointer(fixture(), reveal.discoveries[0].source.path));
  const finding = reveal.discoveries[0];
  await engine.handleUnderstandingCheck(s.id, finding.id, 'discuss', 'Which assumption matters most?');
  await engine.handleUnderstandingCheck(s.id, finding.id, 'surprised');
  await engine.generateVerdict(s.id);
  const mission = await engine.generateMission(s.id);
  assert.equal(mission.title, 'Review retirement saving');
  assert.match(mission.whyItMatters, /Plan for the long term/);
  engine.handleMissionAcceptance(s.id, 'accept');
  await engine.handleFollowUp(s.id, { day: 3, status: 'blocked', details: 'Need a statement' });
  assert.equal(s.mission.status, 'blocked');
  const brief = await engine.generateAdvisorBriefing(s.id);
  assert.deepEqual(brief.discussionFindings, [finding.title]);
  assert.deepEqual(brief.surprisedBy, [finding.title]);
  assert.ok(brief.advisorAgenda.includes('Which assumption matters most?'));
  assert.equal(brief.mission.title, 'Review retirement saving');
  assert.equal(brief.mission.accepted, true);
});

test('AI imports an unfamiliar client schema using only reviewed source values and series', async () => {
  const document = {
    dossier: { titular: 'New client', puntuacion: 125, saldo: 0, indicacion: 'Revisar el fondo de emergencia.' },
    proyeccion: [{ anio: 2030, ahorros: 35000 }, { anio: 2031, ahorros: 27500 }, { anio: 2032, ahorros: 0 }],
  };
  const original = aiService.callChatCompletion;
  const mockMode = aiService.mockMode;
  aiService.mockMode = false;
  aiService.callChatCompletion = async () => ({ success: true, content: {
    mapping: { name: '/dossier/titular', score: '/dossier/puntuacion', recommendations: '/dossier/indicacion' },
    metrics: [{ path: '/dossier/saldo', label: 'Available cash', value: 1_000_000, unit: 'EUR' }, { path: '/invented', label: 'Invented finding' }],
    projection: { path: '/proyeccion', yearKey: 'anio', valueKey: 'ahorros', title: 'Projected savings', unit: 'EUR' },
  } });
  try {
    const analysis = await analyzePlan(document);
    assert.equal(analysis.analyzedWithAI, true);
    assert.equal(analysis.mapping.score, undefined);
    assert.equal(analysis.suggestedMetrics.length, 1);
    const plan = normalizePlan(document, { mapping: analysis.mapping, metricMappings: analysis.suggestedMetrics, projectionMapping: analysis.suggestedProjection });
    assert.equal(plan.meta.name, 'New client');
    assert.equal(plan.evidence.find(item => item.title === 'Available cash').source.raw, 0);
    assert.deepEqual(plan.reviewedProjection.points, document.proyeccion.map(row => ({ year: row.anio, value: row.ahorros })));
  } finally {
    aiService.mockMode = mockMode;
    aiService.callChatCompletion = original;
  }
});

test('a bundled retirement finding links to its verified report and preserves its yearly data', () => {
  const plan = getCaseDetails('michael-carter');
  const finding = plan.evidence.find(item => item.source.path.endsWith('/savingsRunOut'));
  assert.equal(finding.source.report.page, 5);
  assert.equal(finding.projection.report.page, 5);
  assert.equal(finding.projection.title, 'Projected net worth');
  const original = JSON.parse(fs.readFileSync(new URL('../cases/michael-carter/financial-health.json', import.meta.url)));
  assert.deepEqual(finding.projection.points, original.projections.yearly.map(row => ({ year: row.year, value: row.net_worth_todays_dollars })));
  assert.equal(getCaseDetails('samantha-lewis').evidence.some(item => item.source.report), false);
});

test('each partner retains their own score and edits replace the old value', async () => {
  const client = importPlan(fixture(), {}, { persist: false });
  const engine = new AuditEngine();
  const s = await answered(engine, client.id, true);
  assert.deepEqual(s.partnerScores, { Avery: 80, Morgan: 40 });
  await engine.generateReveal(s.id);
  await engine.handleInterrogationAnswer(s.id, { category: 'perceived_health', partner: 'Avery', value: 30 });
  const summary = await engine.generateInterrogationSummary(s.id);
  assert.equal(summary.expectedScore, 30);
  assert.deepEqual(summary.partnerScores, { Avery: 30, Morgan: 40 });
  assert.equal(s.answers.filter(a => a.category === 'perceived_health').length, 2);
  assert.equal(s.reveal, null);
});

test('another JSON layout works with explicit pointers and preserves zero scores', () => {
  const json = { payload: { person: 'A new client', rating: 0, review: 'A review with no recommendations.' } };
  const plan = normalizePlan(json, { mapping: { name: '/payload/person', score: '/payload/rating', summary: '/payload/review' } });
  assert.equal(plan.score, 0);
  assert.equal(plan.meta.name, 'A new client');
  assert.equal(plan.recommendations, '');
  assert.equal(plan.evidence[0].source.path, '/payload/review');
});

test('missing score remains null through reveal, mission and briefing', async () => {
  const client = importPlan({ report: 'Discuss this client’s goals before making a financial decision.' }, { mapping: { summary: '/report' } }, { persist: false });
  const engine = new AuditEngine();
  const s = await answered(engine, client.id);
  const reveal = await engine.generateReveal(s.id);
  assert.equal(reveal.actualScore, null);
  assert.equal(reveal.gap, null);
  assert.equal(reveal.scoreSource, null);
  assert.equal(reveal.scoreContext, null);
  await engine.generateVerdict(s.id);
  assert.equal((await engine.generateMission(s.id)).title, 'Get the missing recommendation');
  assert.equal((await engine.generateAdvisorBriefing(s.id)).verifiedScore, null);
});

test('wrapped Sherpas exports preserve source paths and do not depend on family identity', () => {
  const json = { result: fixture() };
  const plan = normalizePlan(json);
  assert.equal(plan.score, 88);
  assert.equal(plan.scoreSource.path, '/result/score/published_score');
  assert.equal(plan.actions[0].source.path, '/result/score/top_moves/0');
  for (const item of plan.evidence) assert.deepEqual(item.source.raw, atPointer(json, item.source.path));
  const array = normalizePlan([fixture()]);
  assert.equal(array.scoreSource.path, '/0/score/published_score');
});

test('invalid and ambiguous data produces actionable errors, never a fabricated score', () => {
  assert.throws(() => normalizePlan({}), /No usable plan content/);
  assert.throws(() => normalizePlan({ n: 101 }, { mapping: { score: '/n' } }), /between 0 and 100/);
  assert.throws(() => normalizePlan({ n: '90' }, { mapping: { score: '/n' } }), /numeric/);
  assert.throws(() => normalizePlan(fixture(), { mapping: { summary: '/absent' } }), /Invalid field/);
  assert.throws(() => inspectPlan([fixture(), fixture()]), /multiple/);
  assert.equal(getCaseDetails('../.env'), null);
  assert.equal(atPointer({ 'a/b': { '~key': 3 } }, '/a~1b/~0key'), 3);
});

test('a strong score alone never manufactures a contradiction', () => {
  const json = fixture();
  delete json.key_metrics.facts.retirement.savingsRunOut;
  assert.equal(normalizePlan(json).scoreContext, null);
  json.key_metrics.facts.retirement.savingsRunOut = { label: 'Savings do not run out at age 79', value: 0, unit: 'USD' };
  assert.equal(normalizePlan(json).scoreContext, null);
});

test('model-selected unknown IDs and invented prose cannot enter the reveal', async () => {
  const engine = new AuditEngine();
  const client = importPlan(fixture(), {}, { persist: false });
  const s = await answered(engine, client.id);
  const original = aiService.callChatCompletion;
  aiService.callChatCompletion = async () => ({ success: true, content: { ids: ['invented'], actualScore: 99, userQuote: 'Fake quote', discoveries: [{ title: 'Fake balance', figure: '$999' }] } });
  try {
    const reveal = await engine.generateReveal(s.id);
    assert.equal(reveal.actualScore, 88);
    assert.equal(reveal.userQuote.text, 'Will my retirement be sustainable?');
    assert.ok(reveal.discoveries.every(item => getCaseDetails(client.id).evidence.some(e => e.id === item.id)));
  } finally { aiService.callChatCompletion = original; }
});

test('all original sample plans normalize from their files; retirement age is read from the source', () => {
  for (const overview of getAllCasesOverview().filter(c => !c.imported)) {
    const raw = JSON.parse(fs.readFileSync(new URL(`../cases/${overview.id}/financial-health.json`, import.meta.url)));
    const plan = getCaseDetails(overview.id);
    assert.equal(plan.score, raw.score.published_score);
    for (const e of plan.evidence) assert.deepEqual(e.source.raw, atPointer(raw, e.source.path));
  }
  assert.match(getCaseDetails('samantha-lewis').evidence.find(e => e.id === getCaseDetails('samantha-lewis').scoreContext.evidenceId).title, /73/);
});

test('a chosen route changes the first finding and a deeper question reaches the advisor', async () => {
  const client = importPlan(fixture(), {}, { persist: false });
  const engine = new AuditEngine();
  const s = await answered(engine, client.id);
  assert.match(s.focusPrompt.question, /retirement/i);
  const reveal = await engine.generateReveal(s.id);
  const target = reveal.discoveries.find(item => item.id !== reveal.discoveries[0].id);
  assert.ok(target);
  engine.chooseRoute(s.id, target.id);
  assert.equal(s.reveal.discoveries[0].id, target.id);
  assert.throws(() => engine.chooseRoute(s.id, 'made-up'), /Choose a finding/);
  const exploration = await engine.exploreDiscovery(s.id, target.id, 'What does this cover?');
  assert.equal(exploration.source.path, target.source.path);
  // Without a model, the client is pointed to the open finding itself.
  assert.equal(exploration.kind, 'answered');
  assert.ok(exploration.answer.startsWith(target.title));
  await engine.generateVerdict(s.id);
  const mission = await engine.generateMission(s.id);
  assert.deepEqual(mission.checkpoints.map(item => item.day), [3, 30]);
  const barrier = await engine.handleMissionAcceptance(s.id, 'reject', 'I need to understand my other goals first');
  assert.match(barrier.auditorResponse, /advisor/i);
  const briefing = await engine.generateAdvisorBriefing(s.id);
  assert.ok(briefing.advisorAgenda.includes('What does this cover?'));
  assert.ok(briefing.advisorAgenda.includes('I need to understand my other goals first'));
});

test('an unrelated question never gets a fabricated plan answer or enters the advisor agenda', async () => {
  const client = importPlan(fixture(), {}, { persist: false });
  const engine = new AuditEngine();
  const session = await answered(engine, client.id);
  const reveal = await engine.generateReveal(session.id);
  const original = aiService.callChatCompletion;
  aiService.callChatCompletion = async () => { throw new Error('Off-topic questions must not reach the model'); };
  try {
    const response = await engine.exploreDiscovery(session.id, reveal.discoveries[0].id, 'Hi how can I make pancakes?');
    assert.equal(response.kind, 'off_topic');
    assert.match(response.answer, /figure, assumption or recommendation/i);
    assert.doesNotMatch(response.answer, /spending left unpaid/i);
    const greeting = await engine.exploreDiscovery(session.id, reveal.discoveries[0].id, 'hello');
    assert.equal(greeting.kind, 'off_topic');
    assert.match(greeting.answer, /figure, assumption or recommendation/i);
    const briefing = await engine.generateAdvisorBriefing(session.id);
    assert.ok(!briefing.advisorAgenda.includes('Hi how can I make pancakes?'));
  } finally { aiService.callChatCompletion = original; }
});

test('each sample concern leads to a source-backed finding and a relevant next step', async () => {
  const scenarios = [
    ['timothy-melanie-weah', 'We have savings, but should we pay down expensive credit card debt?', /credit card/i, /revolving card/i],
    ['daniel-emily-johnson', 'How do we protect our children if one of us dies?', /life insurance/i, /life insurance|mortality/i],
    ['michael-carter', 'Can I buy a home and still retire at 58?', /purchase a home/i, /home purchase/i],
    ['samantha-lewis', 'Will my retirement savings last?', /run out at age 73/i, /retirement/i],
  ];
  for (const [caseId, concern, title, action] of scenarios) {
    const engine = new AuditEngine();
    const session = engine.createSession(caseId);
    for (const [category, value] of Object.entries({ perceived_health: 50, confidence: 'Unsure', main_concern: concern, financial_priority: 'Make more room for our goals' })) {
      await engine.handleInterrogationAnswer(session.id, { category, value });
    }
    const summary = await engine.generateInterrogationSummary(session.id);
    assert.ok(summary.submittedAt);
    const reveal = await engine.generateReveal(session.id);
    const [first] = reveal.discoveries;
    const raw = JSON.parse(fs.readFileSync(new URL(`../cases/${caseId}/financial-health.json`, import.meta.url)));
    assert.match(first.title, title, caseId);
    assert.deepEqual(first.source.raw, atPointer(raw, first.source.path));
    assert.match((await engine.generateMission(session.id)).title, action, caseId);
  }
});

test('a model can select supplied passages but cannot insert an unsupported guarantee', async () => {
  const engine = new AuditEngine();
  const session = await answered(engine, 'samantha-lewis');
  const [finding] = (await engine.generateReveal(session.id)).discoveries;
  const original = aiService.callChatCompletion;
  try {
    aiService.callChatCompletion = async () => ({ success: true, content: { answer: 'Your retirement income is guaranteed.' } });
    const unsupported = await engine.exploreDiscovery(session.id, finding.id, 'What assumptions affect this retirement projection?');
    assert.equal(unsupported.kind, 'unavailable');
    aiService.callChatCompletion = async () => ({ success: true, content: { sourceId: finding.id, answer: 'Your savings would last 99,999,999 more years.' } });
    const invented = await engine.exploreDiscovery(session.id, finding.id, 'What assumptions affect this retirement projection?');
    assert.equal(invented.kind, 'unavailable');
    aiService.callChatCompletion = async () => ({ success: true, content: { sourceId: finding.id, answer: 'The plan projects when savings would run out, based on its stated assumptions.' } });
    const supported = await engine.exploreDiscovery(session.id, finding.id, 'What does this mean for my retirement?');
    assert.equal(supported.kind, 'answered');
    assert.equal(supported.answer, 'The plan projects when savings would run out, based on its stated assumptions.');
    const direct = await engine.exploreDiscovery(session.id, finding.id, 'Yearly retirement spending need (excluding estimated long-term care');
    assert.equal(direct.kind, 'answered');
    assert.match(direct.answer, /^Your plan lists /);
    aiService.callChatCompletion = async () => ({ success: true, content: { sourceId: finding.id, answer: 'We need to plan for this in our retirement.' } });
    const familyVoice = await engine.exploreDiscovery(session.id, finding.id, 'What does this mean for my retirement?');
    assert.equal(familyVoice.kind, 'answered');
    assert.doesNotMatch(familyVoice.answer, /(we|our)/i);
  } finally {
    aiService.callChatCompletion = original;
  }
});
