import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import Header from './components/Header';
import CaseSelection from './stages/CaseSelection';
import InterrogationStage from './stages/InterrogationStage';
import InterrogationSummary from './stages/InterrogationSummary';
import RevealStage from './stages/RevealStage';
import VerdictStage from './stages/VerdictStage';
import MissionStage from './stages/MissionStage';
import FollowUpStage from './stages/FollowUpStage';
import CostMonitorModal from './components/CostMonitorModal';
import AdvisorBriefingModal from './components/AdvisorBriefingModal';

import {
  fetchCases,
  createSession,
  fetchSession,
  submitInterrogationAnswer,
  fetchSummary,
  fetchReveal,
  fetchVerdict,
  fetchMission,
  submitMissionAcceptance,
  submitFollowUp,
  fetchAdvisorBriefing,
  fetchUsageStats,
  invitationPath,
  openInvitation,
} from './utils/api';
import { chooseRoute } from './utils/api';

export default function App() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [session, setSession] = useState(null);
  const [stage, setStage] = useState('case_selection');
  const [caseDetails, setCaseDetails] = useState(null);

  // Stage-specific data
  const [interrogationSummary, setInterrogationSummary] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [verdictData, setVerdictData] = useState(null);
  const [missionData, setMissionData] = useState(null);
  const [briefingData, setBriefingData] = useState(null);

  // Modals
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [mockMode, setMockMode] = useState(true);
  const [publicDemo, setPublicDemo] = useState(false);

  function switchStage(next) {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage(next);
      return;
    }
    document.startViewTransition(() => flushSync(() => setStage(next)));
  }

  // Load initial cases and check mock mode status
  useEffect(() => {
    async function init() {
      try {
        const [initial, stats] = await Promise.all([
          invitationPath ? openInvitation() : fetchCases(),
          fetchUsageStats().catch(() => ({ mockMode: true }))
        ]);
        if (!invitationPath) setCases(initial);
        setPublicDemo(stats?.publicDemo === true);
        if (stats && typeof stats.mockMode === 'boolean') {
          setMockMode(stats.mockMode);
        }

        // Restore active session if present in localStorage
        const savedSessionId = invitationPath ? null : localStorage.getItem('the_plan_audit_session_id');
        if (invitationPath || savedSessionId) {
          try {
            const restored = invitationPath ? initial : await fetchSession(savedSessionId);
            if (restored?.version === 2) {
              setSession(restored);
              setStage(restored.currentStage || 'interrogation');
              if (restored.summary) setInterrogationSummary(restored.summary);
              if (restored.reveal) setRevealData(restored.reveal);
              if (restored.verdict) setVerdictData(restored.verdict);
              if (restored.mission) setMissionData(restored.mission);
            }
          } catch (e) {
            console.warn('Could not restore session:', e);
            localStorage.removeItem('the_plan_audit_session_id');
          }
        }
      } catch (err) {
        setError(invitationPath ? 'This invitation could not be opened. Try again or ask your advisor for a new link.' : 'We could not load the client list. Refresh to try again.');
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 1. Select Case & Initialize Session
  const handleSelectCase = async (caseId, coupleMode) => {
    setLoading(true);
    setError('');
    try {
      const newSession = await createSession(caseId, coupleMode);
      setSession(newSession);
      localStorage.setItem('the_plan_audit_session_id', newSession.id);
      switchStage('interrogation');
    } catch (err) {
      setError('We could not open this plan. Please try again.');
      console.error('Failed to create session:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Interrogation & View Summary
  const handleCompleteInterrogation = async (answers) => {
    try {
      // Save all answers
      if (!invitationPath) {
        for (const ans of answers) await submitInterrogationAnswer(session.id, ans);
      }
      const summary = await fetchSummary(session.id, invitationPath ? answers.at(-1) : undefined);
      setInterrogationSummary(summary);
      setSession(await fetchSession(session.id));
      switchStage('summary');
    } catch (err) {
      console.error('Failed to generate summary:', err);
      throw err;
    }
  };

  // 3. Proceed to Reveal (Expected vs Actual & Discoveries)
  const handleProceedToReveal = async () => {
    if (transitioning) return;
    setTransitioning(true);
    setError('');
    try {
      const reveal = await fetchReveal(session.id);
      setRevealData(reveal);
      switchStage('reveal');
    } catch (err) {
      setError('We could not open the reveal. Your answers are saved; try again.');
      console.error('Failed to generate reveal:', err);
    } finally {
      setTransitioning(false);
    }
  };

  // 4. Proceed to Verdict
  const handleProceedToVerdict = async () => {
    if (transitioning) return;
    setTransitioning(true);
    try {
      const verdict = await fetchVerdict(session.id);
      setVerdictData(verdict);
      switchStage('verdict');
    } catch (err) {
      setError('We could not prepare the recap. Please try again.');
      console.error('Failed to generate verdict:', err);
    } finally {
      setTransitioning(false);
    }
  };

  const handleChooseRoute = async (discoveryId) => {
    const reveal = await chooseRoute(session.id, discoveryId);
    setRevealData(reveal);
    setSession(await fetchSession(session.id));
  };

  // 5. Proceed to Mission
  const handleProceedToMission = async () => {
    if (transitioning) return;
    setTransitioning(true);
    try {
      const mission = await fetchMission(session.id);
      setMissionData(mission);
      switchStage('mission');
    } catch (err) {
      setError('We could not prepare the next step. Please try again.');
      console.error('Failed to generate mission:', err);
    } finally {
      setTransitioning(false);
    }
  };

  // 6. Accept / Modify Mission
  const handleChooseRecommendation = async (recommendationId) => {
    setMissionData(await fetchMission(session.id, recommendationId));
  };

  const handleAcceptMission = async (decision, reason = '') => {
    try {
      const result = await submitMissionAcceptance(session.id, decision, reason);
      if (result.mission) {
        setMissionData(result.mission);
      }
      return result;
    } catch (err) {
      console.error('Failed to submit mission decision:', err);
      throw err;
    }
  };

  // 7. Proceed to Follow-Up (Day 3 & Day 30)
  const handleProceedToFollowUp = () => {
    switchStage('followup');
  };

  const handleSubmitFollowUp = async (day, status, details = '') => {
    const res = await submitFollowUp(session.id, day, status, details);
    const updated = await fetchSession(session.id);
    setSession(updated);
    setMissionData(updated.mission);
    return res;
  };

  // Demo Time Travel (FAST FORWARD 30 DAYS)
  const handleTimeTravel = async () => {
    if (!session || !missionData) return;
    setSession(prev => ({ ...prev, simulatedDay: 30 }));
    switchStage('followup');
  };

  // Advisor Briefing
  const handleOpenAdvisorBriefing = async () => {
    if (!session) return;
    try {
      const briefing = await fetchAdvisorBriefing(session.id);
      setBriefingData(briefing);
      setIsBriefingModalOpen(true);
    } catch (err) {
      setError('The briefing is available after exploring the plan. Please try again then.');
      console.error('Failed to fetch briefing:', err);
    }
  };

  // Reset Audit to start over
  const handleResetSession = () => {
    setError('');
    localStorage.removeItem('the_plan_audit_session_id');
    setSession(null);
    switchStage('case_selection');
    setInterrogationSummary(null);
    setRevealData(null);
    setVerdictData(null);
    setMissionData(null);
    setBriefingData(null);
  };

  return (
    <div className={`app-shell ${stage === 'reveal' ? 'app-reveal' : ''}`}>
      {/* Top Header & Navigation */}
      <Header
        session={session}
        stage={stage}
        onOpenAdvisorBriefing={handleOpenAdvisorBriefing}
        onOpenCostMonitor={() => setIsCostModalOpen(true)}
        onTimeTravel={handleTimeTravel}
        onResetSession={invitationPath ? undefined : handleResetSession}
        mockMode={mockMode}
        showCostMonitor={import.meta.env.DEV && !invitationPath}
        canTimeTravel={Boolean(missionData)}
        canOpenBriefing={!invitationPath && Boolean(revealData)}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center">
        {error && <div role="alert" className="app-error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {transitioning && <div className="app-status" role="status">Preparing the findings from your plan…</div>}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#1C2529] border-t-[#04724D] animate-spin"></div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#92979B]">
              Opening your plan…
            </span>
          </div>
        ) : (
          <>
            {stage === 'case_selection' && !invitationPath && (
              <CaseSelection cases={cases} onSelectCase={handleSelectCase} onImported={async () => setCases(await fetchCases())} publicDemo={publicDemo} />
            )}

            {stage === 'interrogation' && session && (
              <InterrogationStage
                session={session}
                caseData={cases.find(c => c.id === session.caseId)}
                onCompleteInterrogation={handleCompleteInterrogation}
                onSaveAnswer={invitationPath ? answer => submitInterrogationAnswer(session.id, answer) : undefined}
              />
            )}

            {stage === 'summary' && session && (
              <InterrogationSummary
                summary={interrogationSummary}
                session={session}
                onProceedToReveal={handleProceedToReveal}
                onEditAnswers={() => switchStage('interrogation')}
              />
            )}

            {stage === 'reveal' && session && (
              <RevealStage
                revealData={revealData}
                session={session}
                onProceedToVerdict={handleProceedToVerdict}
                onChooseRoute={handleChooseRoute}
              />
            )}

            {stage === 'verdict' && session && (
              <VerdictStage
                verdict={verdictData}
                session={session}
                onProceedToMission={handleProceedToMission}
              />
            )}

            {stage === 'mission' && session && (
              <MissionStage
                mission={missionData}
                  onChooseRecommendation={handleChooseRecommendation}
                session={session}
                onAcceptMission={handleAcceptMission}
                onProceedToFollowUp={handleProceedToFollowUp}
              />
            )}

            {stage === 'followup' && session && (
              <FollowUpStage
                key={`${session.id}-${session.simulatedDay}`}
                session={session}
                mission={missionData}
                onSubmitFollowUp={handleSubmitFollowUp}
                onResetAudit={invitationPath ? undefined : handleResetSession}
                onOpenAdvisorBriefing={invitationPath ? undefined : handleOpenAdvisorBriefing}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer"><span>The Plan Audit</span><span>Built for the Sherpas × UPV challenge · 2026</span></footer>

      {/* Modals */}
      <CostMonitorModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        onMockModeChange={(enabled) => setMockMode(enabled)}
      />

      <AdvisorBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        briefing={briefingData}
        session={session}
      />
    </div>
  );
}
