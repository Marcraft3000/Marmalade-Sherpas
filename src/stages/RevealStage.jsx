import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, HelpCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';
import { submitUnderstandingCheck } from '../utils/api';

export default function RevealStage({
  revealData,
  session,
  onProceedToVerdict,
}) {
  const [activeDiscovery, setActiveDiscovery] = useState(0);
  const [understandingFeedback, setUnderstandingFeedback] = useState({});
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Trigger suspense reveal
  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true);
      if (revealData?.auditorReaction) {
        speechService.speak(
          revealData.auditorReaction,
          () => setSpeaking(true),
          () => setSpeaking(false)
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [revealData]);

  const handleCheck = async (discoveryId, choice) => {
    setCheckingLoading(true);
    try {
      const res = await submitUnderstandingCheck(session.id, discoveryId, choice);
      setUnderstandingFeedback(prev => ({
        ...prev,
        [discoveryId]: { choice, response: res.response }
      }));
      speechService.speak(res.response, () => setSpeaking(true), () => setSpeaking(false));
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingLoading(false);
    }
  };

  const expected = revealData?.expectedScore ?? session.expectedScore;
  const actual = revealData?.actualScore ?? 60;
  const gap = expected - actual; // e.g. 85 - 60 = +25 (user over-optimistic)

  const getBandBadge = (band) => {
    switch (band?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'vulnerable':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'stable':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'strong':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Commentary */}
      <AuditorAvatar
        speaking={speaking}
        mood={Math.abs(gap) > 15 ? "ROASTING" : "DISSECTING"}
        text={revealData?.auditorReaction || "The numbers are in. Let's see how your self-assessment matches the cold hard math."}
        onReplay={() => {
          if (revealData?.auditorReaction) {
            speechService.speak(revealData.auditorReaction, () => setSpeaking(true), () => setSpeaking(false));
          }
        }}
      />

      {/* STAGE 2 HERO: EXPECTED VS ACTUAL COMPARISON */}
      <div className="bg-[#191B1D] border border-[#2E3236] rounded-2xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
        <div className="text-center mb-6">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#C7F36B] px-3 py-1 rounded-full bg-[#C7F36B]/10 border border-[#C7F36B]/20">
            THE MOMENT OF TRUTH
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3 font-display">
            EXPECTATION VS REALITY
          </h2>
        </div>

        {/* Big Numbers Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center py-4">
          {/* Expected Score */}
          <div className="p-6 rounded-2xl bg-[#101112] border border-[#2E3236]">
            <span className="text-xs font-mono uppercase text-[#92979B] tracking-wider block mb-1">
              WHAT YOU PREDICTED
            </span>
            <div className="text-5xl md:text-6xl font-black font-mono text-white">
              {expected}
            </div>
            <span className="text-xs text-[#92979B] mt-2 block">Your Self-Assessment</span>
          </div>

          {/* Reality Gap Indicator */}
          <div className="flex flex-col items-center justify-center p-4">
            <span className="text-xs font-mono uppercase text-[#92979B] tracking-wider mb-2">
              REALITY GAP
            </span>
            <div className={`text-4xl md:text-5xl font-black font-mono px-4 py-2 rounded-2xl border ${
              gap > 10
                ? 'bg-red-500/15 text-red-400 border-red-500/30 glow-red'
                : gap < -10
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 glow-amber'
            }`}>
              {gap > 0 ? `-${gap} PTS` : gap < 0 ? `+${Math.abs(gap)} PTS` : '0 PTS'}
            </div>
            <span className="text-[11px] font-mono text-[#92979B] mt-2">
              {gap > 0 ? "⚠️ Over-Optimistic Gap" : gap < 0 ? "Under-estimated Foundation" : "Accurate Perception"}
            </span>
          </div>

          {/* Actual Sherpas Score */}
          <div className="p-6 rounded-2xl bg-[#101112] border border-[#C7F36B]/40 glow-lime-sm">
            <span className="text-xs font-mono uppercase text-[#C7F36B] tracking-wider block mb-1 font-bold">
              VERIFIED SHERPAS SCORE
            </span>
            <div className="text-5xl md:text-6xl font-black font-mono text-[#C7F36B]">
              {actual}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${getBandBadge(revealData?.band)}`}>
                BAND: {revealData?.band || 'STABLE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DISCOVERIES BREAKDOWN */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Critical Financial Discoveries</h3>
            <p className="text-xs text-[#92979B]">Unpacking the core paradoxes and vulnerabilities in your plan</p>
          </div>
          <span className="text-xs font-mono text-[#C7F36B] bg-[#C7F36B]/10 px-2.5 py-1 rounded-lg border border-[#C7F36B]/20">
            {revealData?.discoveries?.length || 0} KEY FINDINGS
          </span>
        </div>

        {revealData?.discoveries?.map((disc, idx) => {
          const feedback = understandingFeedback[disc.id];

          return (
            <div
              key={disc.id || idx}
              className="bg-[#191B1D] border border-[#2E3236] rounded-2xl p-6 shadow-xl space-y-4 transition-all"
            >
              {/* Discovery Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3236] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    {disc.badge || 'FACT'}
                  </span>
                  <h4 className="font-extrabold text-white text-base md:text-lg tracking-tight">
                    {disc.title}
                  </h4>
                </div>
                <div className="text-sm font-mono font-bold text-[#C7F36B] bg-[#101112] px-3 py-1 rounded-lg border border-[#2E3236]">
                  {disc.figure}
                </div>
              </div>

              {/* Source & Plain English Breakdown */}
              <div>
                <span className="text-[11px] font-mono text-[#92979B] uppercase block mb-1">
                  SOURCE: {disc.source}
                </span>
                <p className="text-sm text-[#F1EFE9] leading-relaxed">
                  {disc.explanation}
                </p>
              </div>

              {/* Why It Matters */}
              <div className="p-3.5 rounded-xl bg-[#222528] border border-[#2E3236] text-xs space-y-1">
                <span className="font-mono uppercase font-bold text-amber-400 block">
                  WHY THIS MATTERS:
                </span>
                <p className="text-[#92979B] leading-relaxed">
                  {disc.whyItMatters}
                </p>
              </div>

              {/* Auditor Remark */}
              <div className="p-3.5 rounded-xl bg-[#101112] border border-[#C7F36B]/20 text-xs font-mono text-[#C7F36B] leading-relaxed flex items-start gap-2">
                <span className="text-base">🎙️</span>
                <span>"{disc.auditorRemark}"</span>
              </div>

              {/* Understanding Check */}
              <div className="pt-2 border-t border-[#2E3236]">
                <div className="text-xs font-mono text-[#92979B] mb-2">
                  HOW DOES THIS LAND WITH YOU?
                </div>

                {!feedback ? (
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'understand', label: 'I understand the math' },
                      { id: 'explain', label: 'Explain simpler' },
                      { id: 'disagree', label: 'I disagree with this' },
                      { id: 'action', label: 'What can I do about it?' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        disabled={checkingLoading}
                        onClick={() => handleCheck(disc.id, opt.label)}
                        className="px-3 py-1.5 rounded-lg bg-[#222528] hover:bg-[#2E3236] border border-[#2E3236] text-xs font-medium text-white hover:text-[#C7F36B] transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#101112] border border-[#2E3236] text-xs space-y-1">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C7F36B]" />
                      <span>You chose: "{feedback.choice}"</span>
                    </div>
                    <p className="text-[#92979B] pl-5 italic">
                      "{feedback.response}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition to Verdict */}
      <div className="p-6 rounded-2xl bg-[#191B1D] border border-[#2E3236] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-bold text-white text-sm">Ready for the formal assessment?</div>
          <p className="text-xs text-[#92979B]">Proceed to hear the Auditor's complete Verdict.</p>
        </div>

        <button
          onClick={onProceedToVerdict}
          className="px-6 py-3 rounded-xl bg-[#C7F36B] hover:bg-[#B8E55A] text-[#101112] font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(199,243,107,0.3)] transition-all whitespace-nowrap"
        >
          <span>PROCEED TO THE VERDICT</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
