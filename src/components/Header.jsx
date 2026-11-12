import React from 'react';
import { Volume2, VolumeX, FastForward, FileText, Cpu, RotateCcw, ShieldAlert } from 'lucide-react';

export default function Header({
  session,
  stage,
  isMuted,
  onToggleMute,
  onOpenAdvisorBriefing,
  onOpenCostMonitor,
  onTimeTravel,
  onResetSession,
  mockMode,
}) {
  const STAGES = [
    { id: 'interrogation', label: '1. Interrogate' },
    { id: 'summary', label: '1.5 Summary' },
    { id: 'reveal', label: '2. The Reveal' },
    { id: 'verdict', label: '3. Verdict' },
    { id: 'mission', label: '4. Mission' },
    { id: 'followup', label: '5. Follow-Up' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#101112]/90 backdrop-blur-md border-b border-[#2E3236] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Active Case */}
        <div className="flex items-center gap-3">
          <button
            onClick={onResetSession}
            className="flex items-center gap-2 group text-left focus:outline-none"
            title="Return to Case Selection"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C7F36B] flex items-center justify-center font-black text-[#101112] text-sm group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(199,243,107,0.3)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">THE PLAN AUDIT</span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-[#C7F36B]/15 text-[#C7F36B] font-bold border border-[#C7F36B]/30">
                  SHERPAS 2026
                </span>
                {mockMode && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold" title="Running in zero-token local mock mode">
                    🛡️ Zero-Token Dev
                  </span>
                )}
              </div>
              {session && (
                <div className="text-xs text-[#92979B] flex items-center gap-1.5">
                  <span className="font-semibold text-white">{session.caseName}</span>
                  {session.isCoupleMode && (
                    <span className="text-[10px] text-[#C7F36B] bg-[#C7F36B]/10 px-1 rounded">Couple Mode</span>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Stage Progress Bar (Visible when session is active) */}
        {session && (
          <div className="hidden md:flex items-center gap-1 bg-[#191B1D] px-2 py-1 rounded-full border border-[#2E3236]">
            {STAGES.map((s) => {
              const isActive = stage === s.id;
              return (
                <span
                  key={s.id}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    isActive
                      ? 'bg-[#C7F36B] text-[#101112] font-bold shadow-[0_0_10px_rgba(199,243,107,0.3)]'
                      : 'text-[#92979B] hover:text-white'
                  }`}
                >
                  {s.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {session && (
            <>
              {/* Demo Time Travel Button */}
              <button
                onClick={onTimeTravel}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm"
                title="Fast forward simulated timeline 30 days for jury demonstration"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">FAST FORWARD</span> 30 DAYS
              </button>

              {/* Advisor Briefing Report */}
              <button
                onClick={onOpenAdvisorBriefing}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#222528] text-white hover:bg-[#2E3236] border border-[#2E3236] transition-colors"
                title="Open Paraplanner & Advisor Briefing Report"
              >
                <FileText className="w-3.5 h-3.5 text-[#C7F36B]" />
                <span className="hidden lg:inline">Advisor Briefing</span>
              </button>
            </>
          )}

          {/* AI Usage / Budget Console */}
          <button
            onClick={onOpenCostMonitor}
            className="flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-[#191B1D] text-[#92979B] hover:text-white border border-[#2E3236] transition-colors"
            title="AI Cost & Token Usage Console"
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">AI Tokens</span>
          </button>

          {/* Audio Mute / Unmute */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-[#191B1D] border-[#2E3236] text-[#92979B] hover:text-white'
                : 'bg-[#C7F36B]/15 border-[#C7F36B]/40 text-[#C7F36B]'
            }`}
            title={isMuted ? 'Unmute Auditor Voice' : 'Mute Auditor Voice'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
