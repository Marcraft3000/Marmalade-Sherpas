import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, AlertOctagon, Eye, Award, Sparkles } from 'lucide-react';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';

export default function VerdictStage({
  verdict,
  session,
  onProceedToMission,
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (verdict?.bottomLine) {
      const speech = `Here is your official verdict. Bottom line: ${verdict.bottomLine}`;
      speechService.speak(speech, () => setSpeaking(true), () => setSpeaking(false));
    }
  }, [verdict]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Avatar */}
      <AuditorAvatar
        speaking={speaking}
        mood="SUPPORTIVE"
        text={verdict?.bottomLine || "You're not financially doomed. You're simply prioritizing the wrong things. Let us fix that."}
        onReplay={() => {
          if (verdict?.bottomLine) {
            speechService.speak(verdict.bottomLine, () => setSpeaking(true), () => setSpeaking(false));
          }
        }}
      />

      {/* Main Verdict Card */}
      <div className="bg-[#0E1315] border border-[#1C2529] rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="text-center pb-4 border-b border-[#1C2529]">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#B8DBD9] px-3 py-1 rounded-full bg-[#04724D]/10 border border-[#04724D]/20">
            STAGE 3: THE AUDIT VERDICT
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3 font-display">
            The Official Evaluation
          </h2>
          <p className="text-xs text-[#92979B] mt-1">
            Grounded in your Sherpas plan data and your interrogation statements
          </p>
        </div>

        {/* 1. What You're Doing Right */}
        <div className="p-5 rounded-xl bg-[#101719] border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>WHAT YOU'RE DOING RIGHT</span>
          </div>
          <p className="text-sm text-[#F1EFE9] leading-relaxed">
            {verdict?.doingRight}
          </p>
        </div>

        {/* 2. What Needs Attention */}
        <div className="p-5 rounded-xl bg-[#101719] border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-400">
            <AlertOctagon className="w-4 h-4" />
            <span>WHAT NEEDS IMMEDIATE ATTENTION</span>
          </div>
          <p className="text-sm text-[#F1EFE9] leading-relaxed">
            {verdict?.needsAttention}
          </p>
        </div>

        {/* 3. What You May Be Overlooking */}
        <div className="p-5 rounded-xl bg-[#101719] border border-sky-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-sky-400">
            <Eye className="w-4 h-4" />
            <span>WHAT YOU MAY BE OVERLOOKING</span>
          </div>
          <p className="text-sm text-[#F1EFE9] leading-relaxed">
            {verdict?.overlooking}
          </p>
        </div>

        {/* 4. THE BOTTOM LINE HERO */}
        <div className="p-6 rounded-2xl bg-[#0A0D0E] border-2 border-[#04724D] glow-lime text-center space-y-2">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#B8DBD9]">
            ⚡ THE BOTTOM LINE
          </span>
          <div className="text-lg md:text-xl font-black text-white font-display leading-snug">
            "{verdict?.bottomLine}"
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-[#1C2529] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#92979B]">
            Enough talk. Now we turn this diagnosis into a single concrete mission.
          </div>

          <button
            onClick={onProceedToMission}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#04724D] hover:bg-[#03593C] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(4,114,77,0.3)] transition-all"
          >
            <span>REVEAL MY MISSION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
