import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import WaitingStage from './stages/WaitingStage';
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
  invitationContext,
  requestedCheckIn,
} from './utils/api';
import { chooseRoute } from './utils/api';
import { speechService } from './utils/speech';

const reviewStages = ['verdict', 'mission', 'followup'];

function memberWaitingFor(session, member) {
  const answered = (category, partner) => session.answers.some(answer => answer.category === category && (answer.partner || null) === partner);
  const ownDone = answered('perceived_health', member) && answered('main_concern', member)
    && ['confidence', 'financial_priority', 'future_expectation'].every(category => answered(category, null));
  if (!ownDone) return [];
  return session.partners.filter(person => !answered('perceived_health', person) || !answered('main_concern', person));
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [session, setSession] = useState(null);
  const [stage, setStage] = useState('case_selection');
  const [returnStage, setReturnStage] = useState(null);

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
  const [advisorNote, setAdvisorNote] = useState(null);
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [realCheckIn, setRealCheckIn] = useState(null);
  const [waitingFor, setWaitingFor] = useState([]);
  const member = invitationPath ? invitationContext.member : null;

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
              // A reminder link (or a check-in that is already due) opens the real check-in directly.
              const checkInDay = invitationPath && restored.mission
                ? requestedCheckIn || invitationContext.dueCheckIns[0] || null : null;
              if (invitationPath) setAdvisorNote(invitationContext.advisorNote);
              if (checkInDay) {
                setRealCheckIn(checkInDay);
                restored.simulatedDay = checkInDay;
                restored.currentStage = 'followup';
              }
              // A partner who finished their own questions waits for the other perspective.
              const waiting = invitationPath && invitationContext.member && !restored.summary
                ? memberWaitingFor(restored, invitationContext.member) : [];
              if (waiting.length) {
                setWaitingFor(waiting);
                restored.currentStage = 'waiting';
              }
              setSession(restored);
              const reviewingFrom = sessionStorage.getItem(`audit-review-${restored.id}`);
              const reviewStage = restored.reveal && reviewStages.includes(reviewingFrom) ? reviewingFrom : null;
              setReturnStage(reviewStage);
              setStage(reviewStage ? 'reveal' : restored.currentStage || 'interrogation');
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

  // While one partner waits, check every few seconds whether the other has finished.
  useEffect(() => {
    if (stage !== 'waiting' || !session) return;
    const timer = window.setInterval(async () => {
      try {
        const latest = await fetchSession(session.id);
        if (latest.summary) {
          setSession(latest);
          setInterrogationSummary(latest.summary);
          switchStage('summary');
        } else if (member) {
          setWaitingFor(memberWaitingFor(latest, member));
        }
      } catch {}
    }, 8000);
    return () => window.clearInterval(timer);
  }, [stage, session?.id]);

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
      if (summary?.waitingFor) {
        setSession(await fetchSession(session.id));
        setWaitingFor(summary.waitingFor);
        switchStage('waiting');
        return;
      }
      localStorage.removeItem(`audit-reveal-${session.id}`);
      setRevealData(null);
      setVerdictData(null);
      setMissionData(null);
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
    if (returnStage) {
      sessionStorage.removeItem(`audit-review-${session.id}`);
      setReturnStage(null);
      switchStage(returnStage);
      return;
    }
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

  const handleReturnToFindings = async () => {
    if (transitioning || !session) return;
    setError('');
    setTransitioning(true);
    try {
      const latest = await fetchSession(session.id);
      setSession(latest);
      setRevealData(latest.reveal);
      sessionStorage.setItem(`audit-review-${session.id}`, stage);
      setReturnStage(stage);
      switchStage('reveal');
    } catch {
      setError('We could not reopen the plan. Please try again.');
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
    speechService.stop();
    if (session) {
      sessionStorage.removeItem(`audit-review-${session.id}`);
      localStorage.removeItem(`audit-reveal-${session.id}`);
    }
    setReturnStage(null);
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
        onReturnToFindings={reviewStages.includes(stage) && revealData ? handleReturnToFindings : undefined}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center">
        {advisorNote && !noteDismissed && session && <aside className="advisor-note-banner" aria-label="Message from your advisor">
          <div><span className="eyebrow">A note from your advisor</span><p>{advisorNote.text}</p></div>
          <button className="quiet-action" onClick={() => setNoteDismissed(true)} aria-label="Hide the advisor note">×</button>
        </aside>}
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
                member={member}
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
                returningToProgress={Boolean(returnStage)}
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

            {stage === 'waiting' && session && (
              <WaitingStage member={member} waitingFor={waitingFor} onEditAnswers={() => switchStage('interrogation')} />
            )}

            {stage === 'followup' && session && (
              <FollowUpStage
                key={`${session.id}-${session.simulatedDay}`}
                session={session}
                mission={missionData}
                onSubmitFollowUp={handleSubmitFollowUp}
                realCheckIn={realCheckIn}
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
