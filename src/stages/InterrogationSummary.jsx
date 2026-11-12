import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, Edit3, ShieldCheck } from 'lucide-react';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';

export default function InterrogationSummary({
  summary,
  session,
  onProceedToReveal,
  onEditAnswers,
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (summary?.auditorImpression) {
      speechService.speak(
        summary.auditorImpression,
        () => setSpeaking(true),
        () => setSpeaking(false)
      );
    }
  }, [summary]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Avatar */}
      <AuditorAvatar
        speaking={speaking}
        mood="SUSPICIOUS"
        text={summary?.auditorImpression || "I've heard your side. You believe things are under control, but let us see what happens when the actual numbers take the stand."}
        onReplay={() => {
          if (summary?.auditorImpression) {
            speechService.speak(summary.auditorImpression, () => setSpeaking(true), () => setSpeaking(false));
          }
        }}
      />

      {/* Summary Card */}
      <div className="bg-[#191B1D] border border-[#2E3236] rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#2E3236] mb-6">
          <div>
            <span className="text-xs font-mono uppercase text-[#C7F36B] tracking-wider">
              INTERROGATION COMPLETE
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Here Is What I Heard</h2>
          </div>
          <button
            onClick={onEditAnswers}
            className="flex items-center gap-1.5 text-xs text-[#92979B] hover:text-white px-3 py-1.5 rounded-lg border border-[#2E3236] bg-[#101112] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit My Answers</span>
          </button>
        </div>

        {/* Captured Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[#101112] border border-[#2E3236]">
            <span className="text-[11px] font-mono uppercase text-[#92979B]">Your Expected Health</span>
            <div className="text-3xl font-black font-mono text-[#C7F36B] mt-1">
              {summary?.expectedScore ?? session.expectedScore}/100
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#101112] border border-[#2E3236]">
            <span className="text-[11px] font-mono uppercase text-[#92979B]">Confidence Level</span>
            <div className="text-lg font-bold text-white mt-1">
              {summary?.confidence || 'Moderate'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#101112] border border-[#2E3236]">
            <span className="text-[11px] font-mono uppercase text-[#92979B]">Household Mode</span>
            <div className="text-lg font-bold text-white mt-1">
              {session.isCoupleMode ? 'Dual Partner' : 'Individual'}
            </div>
          </div>
        </div>

        {/* Main Concern & Priority Callouts */}
        <div className="space-y-4 mb-8">
          <div className="p-4 rounded-xl bg-[#222528] border border-[#2E3236]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>YOUR PRIMARY CONCERN</span>
            </div>
            <p className="text-sm font-medium text-white">
              "{summary?.mainConcern || 'Preserving our lifestyle while juggling debt and future goals'}"
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#222528] border border-[#2E3236]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#C7F36B] mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>YOUR STATED TOP PRIORITY</span>
            </div>
            <p className="text-sm font-medium text-white">
              "{summary?.biggestPriority || 'Optimizing our current money management strategy'}"
            </p>
          </div>
        </div>

        {/* Key Beliefs */}
        {summary?.keyBeliefs?.length > 0 && (
          <div className="mb-8">
            <span className="text-xs font-mono uppercase text-[#92979B] tracking-wider mb-2 block">
              KEY ASSUMPTIONS ON FILE:
            </span>
            <ul className="space-y-2 text-xs text-[#92979B]">
              {summary.keyBeliefs.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#C7F36B] font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transition to Reveal */}
        <div className="pt-6 border-t border-[#2E3236] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#92979B] text-center sm:text-left">
            Once you proceed, the official Sherpas financial plan findings will be unmasked.
          </div>

          <button
            onClick={onProceedToReveal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#C7F36B] hover:bg-[#B8E55A] text-[#101112] font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(199,243,107,0.35)] transition-all"
          >
            <span>REVEAL WHAT THE NUMBERS SAY</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
