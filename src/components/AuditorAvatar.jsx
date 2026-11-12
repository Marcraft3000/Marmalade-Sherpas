import React from 'react';
import { Volume2, AlertCircle, Sparkles } from 'lucide-react';

export default function AuditorAvatar({
  speaking,
  mood = 'DISSECTING', // 'DISSECTING' | 'ROASTING' | 'SUSPICIOUS' | 'IMPRESSED' | 'SUPPORTIVE'
  text,
  onReplay,
}) {
  const MOOD_STYLES = {
    DISSECTING: {
      label: 'DISSECTING THE NUMBERS',
      border: 'border-[#C7F36B]',
      badgeBg: 'bg-[#C7F36B]/15 text-[#C7F36B] border-[#C7F36B]/30',
      avatarBg: 'bg-emerald-950/40 text-[#C7F36B]',
      glow: 'shadow-[0_0_20px_rgba(199,243,107,0.2)]'
    },
    ROASTING: {
      label: 'CALLING OUT THE PARADOX',
      border: 'border-red-500',
      badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30',
      avatarBg: 'bg-red-950/40 text-red-400',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]'
    },
    SUSPICIOUS: {
      label: 'QUESTIONING ASSUMPTIONS',
      border: 'border-amber-500',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      avatarBg: 'bg-amber-950/40 text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
    },
    IMPRESSED: {
      label: 'VALIDATING PROGRESS',
      border: 'border-sky-400',
      badgeBg: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
      avatarBg: 'bg-sky-950/40 text-sky-300',
      glow: 'shadow-[0_0_20px_rgba(56,189,248,0.2)]'
    },
    SUPPORTIVE: {
      label: 'ADVISING WITH EMPATHY',
      border: 'border-[#C7F36B]',
      badgeBg: 'bg-[#C7F36B]/15 text-[#C7F36B] border-[#C7F36B]/30',
      avatarBg: 'bg-emerald-950/40 text-[#C7F36B]',
      glow: 'shadow-[0_0_20px_rgba(199,243,107,0.2)]'
    }
  };

  const style = MOOD_STYLES[mood] || MOOD_STYLES.DISSECTING;

  return (
    <div className={`p-4 md:p-5 rounded-2xl bg-[#191B1D] border ${style.border} ${style.glow} transition-all duration-300 mb-6`}>
      <div className="flex items-start gap-4">
        {/* Avatar Graphic & Pulsing Audio Visualizer */}
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${style.avatarBg} border border-current flex items-center justify-center text-xl md:text-2xl shadow-inner`}>
            ⚖️
          </div>
          {speaking && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7F36B] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#C7F36B] border-2 border-[#101112]"></span>
            </span>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">THE FINANCIAL AUDITOR</span>
              <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
                {style.label}
              </span>
            </div>

            {onReplay && text && (
              <button
                onClick={onReplay}
                className="text-xs flex items-center gap-1 text-[#92979B] hover:text-[#C7F36B] transition-colors"
                title="Replay Auditor Voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
            )}
          </div>

          {/* Speech Text */}
          <div className="text-[#F1EFE9] text-sm md:text-base leading-relaxed font-normal">
            "{text}"
          </div>

          {/* Live Waveform Indicator when speaking */}
          {speaking && (
            <div className="flex items-center gap-1 mt-2.5">
              <span className="h-2 w-1 bg-[#C7F36B] animate-pulse rounded-full"></span>
              <span className="h-4 w-1 bg-[#C7F36B] animate-pulse delay-75 rounded-full"></span>
              <span className="h-3 w-1 bg-[#C7F36B] animate-pulse delay-150 rounded-full"></span>
              <span className="h-5 w-1 bg-[#C7F36B] animate-pulse delay-100 rounded-full"></span>
              <span className="h-2 w-1 bg-[#C7F36B] animate-pulse delay-200 rounded-full"></span>
              <span className="text-[11px] font-mono text-[#92979B] ml-2">Speaking aloud...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
