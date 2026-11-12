import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock, Check, HelpCircle, XCircle, ShieldAlert, Sparkles, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';

export default function MissionStage({
  mission,
  session,
  onAcceptMission,
  onProceedToFollowUp,
}) {
  const [decision, setDecision] = useState(mission?.status || 'not_accepted');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [auditorComment, setAuditorComment] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (mission?.title) {
      const speech = `Your mission is: ${mission.title}. Why it matters: ${mission.whyItMatters}. Are you ready to commit?`;
      speechService.speak(speech, () => setSpeaking(true), () => setSpeaking(false));
    }
  }, [mission]);

  const handleDecision = async (choice) => {
    setDecision(choice);

    if (choice === 'accept') {
      setShowRejectInput(false);
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C7F36B', '#38BDF8', '#FFFFFF']
      });

      const res = await onAcceptMission('accept');
      if (res?.auditorResponse) {
        setAuditorComment(res.auditorResponse);
        speechService.speak(res.auditorResponse, () => setSpeaking(true), () => setSpeaking(false));
      }
    } else if (choice === 'think') {
      setShowRejectInput(false);
      const res = await onAcceptMission('think');
      if (res?.auditorResponse) {
        setAuditorComment(res.auditorResponse);
        speechService.speak(res.auditorResponse, () => setSpeaking(true), () => setSpeaking(false));
      }
    } else if (choice === 'reject') {
      setShowRejectInput(true);
    }
  };

  const submitReject = async () => {
    const res = await onAcceptMission('reject', rejectReason);
    if (res?.auditorResponse) {
      setAuditorComment(res.auditorResponse);
      speechService.speak(res.auditorResponse, () => setSpeaking(true), () => setSpeaking(false));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Avatar */}
      <AuditorAvatar
        speaking={speaking}
        mood={decision === 'accept' ? 'IMPRESSED' : 'SUPPORTIVE'}
        text={auditorComment || `This is your single highest leverage first step. Don't worry about step 10. Execute this, and everything else gets easier.`}
        onReplay={() => {
          const text = auditorComment || mission?.firstAction;
          speechService.speak(text, () => setSpeaking(true), () => setSpeaking(false));
        }}
      />

      {/* MISSION CARD HERO */}
      <div className="bg-[#191B1D] border-2 border-[#C7F36B] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden glow-lime-sm">
        {/* Mission Badge & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2E3236]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-[#C7F36B] text-[#101112]">
              {mission?.number || 'MISSION 01'}
            </span>
            <span className="text-xs text-[#92979B] font-mono">HIGHEST PRIORITY ACTION</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#92979B] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C7F36B]" />
              <span>{mission?.timeframe || '72 Hours'}</span>
            </span>
          </div>
        </div>

        {/* Mission Title */}
        <div className="py-4">
          <h2 className="text-2xl md:text-3xl font-black text-white font-display tracking-tight">
            {mission?.title}
          </h2>
          <p className="text-sm text-[#92979B] mt-2 leading-relaxed">
            <strong className="text-white">Why this matters: </strong>
            {mission?.whyItMatters}
          </p>
        </div>

        {/* Immediate First Action */}
        <div className="p-4 rounded-2xl bg-[#101112] border border-[#2E3236] my-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#C7F36B] font-bold mb-1">
            <Target className="w-4 h-4" />
            <span>IMMEDIATE FIRST ACTION (TODAY):</span>
          </div>
          <p className="text-sm md:text-base font-semibold text-white">
            {mission?.firstAction}
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-2.5 my-6">
          <span className="text-xs font-mono uppercase text-[#92979B] tracking-wider block">
            STEP-BY-STEP EXECUTION PROTOCOL:
          </span>
          {mission?.steps?.map((stepText, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#222528] border border-[#2E3236] flex items-start gap-3 text-xs md:text-sm text-[#F1EFE9]"
            >
              <span className="w-5 h-5 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] font-mono font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{stepText}</span>
            </div>
          ))}
        </div>

        {/* Verification & Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#2E3236] text-xs">
          <div className="p-3 rounded-xl bg-[#101112] border border-[#2E3236]">
            <span className="font-mono uppercase text-[#92979B] block text-[10px]">HOW TO VERIFY COMPLETION</span>
            <span className="text-white font-medium mt-0.5 block">{mission?.howToVerify}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#101112] border border-[#2E3236]">
            <span className="font-mono uppercase text-[#92979B] block text-[10px]">ESTIMATED EFFORT</span>
            <span className="text-[#C7F36B] font-medium mt-0.5 block">{mission?.estimatedDifficulty}</span>
          </div>
        </div>

        {/* Mission Commitment Buttons */}
        <div className="mt-8 pt-6 border-t border-[#2E3236] space-y-4">
          <div className="text-center">
            <span className="text-xs font-mono uppercase text-[#92979B]">
              WILL YOU COMMIT TO EXECUTING THIS MISSION?
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Accept */}
            <button
              onClick={() => handleDecision('accept')}
              className={`p-4 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                decision === 'accepted' || decision === 'accept'
                  ? 'bg-[#C7F36B] text-[#101112] shadow-[0_0_25px_rgba(199,243,107,0.4)]'
                  : 'bg-[#C7F36B]/20 text-[#C7F36B] hover:bg-[#C7F36B] hover:text-[#101112] border border-[#C7F36B]/40'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>ACCEPT MISSION</span>
            </button>

            {/* Think */}
            <button
              onClick={() => handleDecision('think')}
              className={`p-4 rounded-2xl font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${
                decision === 'considering' || decision === 'think'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-[#222528] text-[#92979B] hover:text-white border-[#2E3236]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>I NEED TO THINK</span>
            </button>

            {/* Reject */}
            <button
              onClick={() => handleDecision('reject')}
              className={`p-4 rounded-2xl font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${
                decision === 'rejected' || decision === 'reject'
                  ? 'bg-red-500/20 text-red-400 border-red-500'
                  : 'bg-[#222528] text-[#92979B] hover:text-white border-[#2E3236]'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>DOESN'T WORK</span>
            </button>
          </div>

          {/* If Reject, collect reason */}
          {showRejectInput && (
            <div className="p-4 rounded-2xl bg-[#101112] border border-red-500/30 space-y-3 animate-fade-in">
              <span className="text-xs text-red-300 font-semibold block">
                What stands in the way of this mission?
              </span>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. I need to consult my spouse first, or unexpected medical expenses..."
                className="w-full bg-[#191B1D] border border-[#2E3236] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#474E54] focus:outline-none focus:border-red-500"
              />
              <button
                onClick={submitReject}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-bold"
              >
                Submit Feedback
              </button>
            </div>
          )}

          {/* Continue to Follow-up */}
          {decision !== 'not_accepted' && (
            <div className="pt-4 flex justify-end">
              <button
                onClick={onProceedToFollowUp}
                className="px-6 py-3 rounded-xl bg-white hover:bg-gray-100 text-[#101112] font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
              >
                <span>PROCEED TO STAGE 5: FOLLOW-UP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
