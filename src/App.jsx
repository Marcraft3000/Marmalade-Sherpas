import React, { useState, useEffect } from 'react';
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
  fetchUsageStats
} from './utils/api';
import { speechService } from './utils/speech';

export default function App() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [stage, setStage] = useState('case_selection');
  const [caseDetails, setCaseDetails] = useState(null);

  // Stage-specific data
  const [interrogationSummary, setInterrogationSummary] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [verdictData, setVerdictData] = useState(null);
  const [missionData, setMissionData] = useState(null);
  const [briefingData, setBriefingData] = useState(null);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [mockMode, setMockMode] = useState(true);

  // Load initial cases and check mock mode status
  useEffect(() => {
    async function init() {
      try {
        const [loadedCases, stats] = await Promise.all([
          fetchCases(),
          fetchUsageStats().catch(() => ({ mockMode: true }))
        ]);
        setCases(loadedCases);
        if (stats && typeof stats.mockMode === 'boolean') {
          setMockMode(stats.mockMode);
        }

        // Restore active session if present in localStorage
        const savedSessionId = localStorage.getItem('the_plan_audit_session_id');
        if (savedSessionId) {
          try {
            const restored = await fetchSession(savedSessionId);
            if (restored) {
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
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    speechService.setMuted(next);
  };

  // 1. Select Case & Initialize Session
  const handleSelectCase = async (caseId, coupleMode) => {
    setLoading(true);
    try {
      speechService.stop();
      const newSession = await createSession(caseId, coupleMode);
      setSession(newSession);
      localStorage.setItem('the_plan_audit_session_id', newSession.id);
      setStage('interrogation');
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Interrogation & View Summary
  const handleCompleteInterrogation = async (answers, expectedScore) => {
    setLoading(true);
    try {
      // Save all answers
      for (const ans of answers) {
        await submitInterrogationAnswer(session.id, ans);
      }
      const summary = await fetchSummary(session.id);
      setInterrogationSummary(summary);
      setStage('summary');
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Proceed to Reveal (Expected vs Actual & Discoveries)
  const handleProceedToReveal = async () => {
    setLoading(true);
    try {
      const reveal = await fetchReveal(session.id);
      setRevealData(reveal);
      setStage('reveal');
    } catch (err) {
      console.error('Failed to generate reveal:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Proceed to Verdict
  const handleProceedToVerdict = async () => {
    setLoading(true);
    try {
      const verdict = await fetchVerdict(session.id);
      setVerdictData(verdict);
      setStage('verdict');
    } catch (err) {
      console.error('Failed to generate verdict:', err);
    } finally {
      setLoading(false);
    }
  };

  // 5. Proceed to Mission
  const handleProceedToMission = async () => {
    setLoading(true);
    try {
      const mission = await fetchMission(session.id);
      setMissionData(mission);
      setStage('mission');
    } catch (err) {
      console.error('Failed to generate mission:', err);
    } finally {
      setLoading(false);
    }
  };

  // 6. Accept / Modify Mission
  const handleAcceptMission = async (decision, reason = '') => {
    try {
      const result = await submitMissionAcceptance(session.id, decision, reason);
      if (result.mission) {
        setMissionData(result.mission);
      }
      return result;
    } catch (err) {
      console.error('Failed to submit mission decision:', err);
    }
  };

  // 7. Proceed to Follow-Up (Day 3 & Day 30)
  const handleProceedToFollowUp = () => {
    setStage('followup');
  };

  const handleSubmitFollowUp = async (day, status, details = '') => {
    const res = await submitFollowUp(session.id, day, status, details);
    return res;
  };

  // Demo Time Travel (FAST FORWARD 30 DAYS)
  const handleTimeTravel = async () => {
    if (!session) return;
    setStage('followup');
    speechService.speak("Fast forwarding simulated timeline 30 days for jury demonstration.", null, null);
  };

  // Advisor Briefing
  const handleOpenAdvisorBriefing = async () => {
    if (!session) return;
    try {
      const briefing = await fetchAdvisorBriefing(session.id);
      setBriefingData(briefing);
      setIsBriefingModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch briefing:', err);
    }
  };

  // Reset Audit to start over
  const handleResetSession = () => {
    speechService.stop();
    localStorage.removeItem('the_plan_audit_session_id');
    setSession(null);
    setStage('case_selection');
    setInterrogationSummary(null);
    setRevealData(null);
    setVerdictData(null);
    setMissionData(null);
    setBriefingData(null);
  };

  return (
    <div className="min-h-screen bg-[#101112] text-[#F1EFE9] flex flex-col font-sans">
      {/* Top Header & Navigation */}
      <Header
        session={session}
        stage={stage}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenAdvisorBriefing={handleOpenAdvisorBriefing}
        onOpenCostMonitor={() => setIsCostModalOpen(true)}
        onTimeTravel={handleTimeTravel}
        onResetSession={handleResetSession}
        mockMode={mockMode}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#2E3236] border-t-[#C7F36B] animate-spin"></div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#92979B]">
              CALIBRATING AUDIT ROOM...
            </span>
          </div>
        ) : (
          <>
            {stage === 'case_selection' && (
              <CaseSelection cases={cases} onSelectCase={handleSelectCase} />
            )}

            {stage === 'interrogation' && session && (
              <InterrogationStage
                session={session}
                caseData={cases.find(c => c.id === session.caseId)}
                onCompleteInterrogation={handleCompleteInterrogation}
                isMuted={isMuted}
              />
            )}

            {stage === 'summary' && session && (
              <InterrogationSummary
                summary={interrogationSummary}
                session={session}
                onProceedToReveal={handleProceedToReveal}
                onEditAnswers={() => setStage('interrogation')}
              />
            )}

            {stage === 'reveal' && session && (
              <RevealStage
                revealData={revealData}
                session={session}
                onProceedToVerdict={handleProceedToVerdict}
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
                session={session}
                onAcceptMission={handleAcceptMission}
                onProceedToFollowUp={handleProceedToFollowUp}
              />
            )}

            {stage === 'followup' && session && (
              <FollowUpStage
                session={session}
                mission={missionData}
                onSubmitFollowUp={handleSubmitFollowUp}
                onResetAudit={handleResetSession}
                onOpenAdvisorBriefing={handleOpenAdvisorBriefing}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2E3236] py-4 px-6 text-center text-xs text-[#92979B] font-mono">
        THE PLAN AUDIT • Sherpas x UPV Sigma Data Club Hackathon 2026 • Caleb Hammer Inspired Format
      </footer>

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
