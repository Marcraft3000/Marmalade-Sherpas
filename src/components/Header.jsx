import React from 'react';
import { Volume2, VolumeX, FastForward, FileText, Cpu, ShieldCheck } from 'lucide-react';

const STAGES = [
  { id: 'interrogation', label: 'Your perspective' },
  { id: 'summary', label: 'The recap' },
  { id: 'reveal', label: 'The reveal' },
  { id: 'verdict', label: 'The verdict' },
  { id: 'mission', label: 'Your mission' },
  { id: 'followup', label: 'Follow-up' },
];

export default function Header({ session, stage, isMuted, onToggleMute, onOpenAdvisorBriefing, onOpenCostMonitor, onTimeTravel, onResetSession, mockMode, showCostMonitor }) {
  const activeIndex = STAGES.findIndex((item) => item.id === stage);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1C2529] bg-[#0A0D0E]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button onClick={onResetSession} className="group flex min-w-0 items-center gap-3 text-left" title="Return to case selection">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#04724D] text-white shadow-[0_0_20px_rgba(4,114,77,0.24)] transition-transform group-hover:scale-105">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-extrabold tracking-tight text-white">THE PLAN AUDIT</span>
              <span className="rounded border border-[#1C2529] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-[#B8DBD9]">SHERPAS 2026</span>
              {mockMode && <span className="rounded-full border border-[#04724D]/40 bg-[#04724D]/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-[#B8DBD9]">DEMO MODE</span>}
            </span>
            {session && <span className="mt-0.5 block truncate text-xs text-[#92979B]">{session.caseName}{session.isCoupleMode ? ' · Couple audit' : ''}</span>}
          </span>
        </button>

        {session && (
          <nav aria-label="Audit progress" className="hidden items-center gap-1 rounded-full border border-[#1C2529] bg-[#0E1315] p-1 lg:flex">
            {STAGES.map((item, index) => {
              const active = stage === item.id;
              const complete = activeIndex > index;
              return <span key={item.id} aria-current={active ? 'step' : undefined} className={`rounded-full px-3 py-1.5 text-xs transition-colors ${active ? 'bg-[#04724D] font-semibold text-white' : complete ? 'text-[#B8DBD9]' : 'text-[#586F7C]'}`}>{item.label}</span>;
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {session && <>
            <button onClick={onTimeTravel} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 sm:px-3" title="Advance the simulated timeline by 30 days">
              <FastForward className="h-3.5 w-3.5" /><span className="hidden sm:inline">FAST FORWARD</span><span>30D</span>
            </button>
            <button onClick={onOpenAdvisorBriefing} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C2529] bg-[#0E1315] px-2.5 py-2 text-xs text-[#F4F4F9] transition-colors hover:border-[#04724D]" title="Open advisor briefing">
              <FileText className="h-3.5 w-3.5 text-[#B8DBD9]" /><span className="hidden xl:inline">Briefing</span>
            </button>
          </>}
          {showCostMonitor && <button onClick={onOpenCostMonitor} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C2529] bg-[#0E1315] px-2.5 py-2 font-mono text-xs text-[#92979B] transition-colors hover:text-white" title="AI usage and cost monitor">
            <Cpu className="h-3.5 w-3.5 text-[#B8DBD9]" /><span className="hidden sm:inline">Usage</span>
          </button>}
          <button onClick={onToggleMute} aria-label={isMuted ? 'Turn auditor voice on' : 'Mute auditor voice'} className={`rounded-lg border p-2 transition-colors ${isMuted ? 'border-[#1C2529] bg-[#0E1315] text-[#92979B]' : 'border-[#04724D]/50 bg-[#04724D]/15 text-[#B8DBD9]'}`}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {session && <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-[#1C2529] lg:hidden"><div className="h-full bg-[#04724D] transition-all" style={{ width: `${Math.max(1, ((activeIndex + 1) / STAGES.length) * 100)}%` }} /></div>}
    </header>
  );
}
