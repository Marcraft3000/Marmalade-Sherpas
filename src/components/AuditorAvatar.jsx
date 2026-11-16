import React from 'react';
import { Volume2, Fingerprint } from 'lucide-react';

const MOODS = {
  DISSECTING: { label: 'Reviewing the numbers', tone: 'border-[#04724D]/50', badge: 'border-[#04724D]/30 bg-[#04724D]/10 text-[#B8DBD9]', icon: 'bg-[#04724D]/10 text-[#B8DBD9]' },
  ROASTING: { label: 'Calling out a mismatch', tone: 'border-rose-500/40', badge: 'border-rose-500/25 bg-rose-500/10 text-rose-300', icon: 'bg-rose-500/10 text-rose-300' },
  SUSPICIOUS: { label: 'Testing an assumption', tone: 'border-amber-500/40', badge: 'border-amber-500/25 bg-amber-500/10 text-amber-200', icon: 'bg-amber-500/10 text-amber-200' },
  IMPRESSED: { label: 'Recognizing progress', tone: 'border-sky-400/40', badge: 'border-sky-400/25 bg-sky-400/10 text-sky-200', icon: 'bg-sky-400/10 text-sky-200' },
  SUPPORTIVE: { label: 'Working through it with you', tone: 'border-[#04724D]/50', badge: 'border-[#04724D]/30 bg-[#04724D]/10 text-[#B8DBD9]', icon: 'bg-[#04724D]/10 text-[#B8DBD9]' },
};

export default function AuditorAvatar({ speaking, mood = 'DISSECTING', text, onReplay }) {
  const style = MOODS[mood] || MOODS.DISSECTING;
  return (
    <section className={`mb-5 rounded-2xl border ${style.tone} bg-[#0E1315] p-4 transition-colors duration-300 sm:p-5`} aria-label="Auditor commentary">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/20 ${style.icon} sm:h-12 sm:w-12`}>
          <Fingerprint className="h-6 w-6" strokeWidth={1.5} />
          {speaking && <span aria-label="Auditor is speaking" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0E1315] bg-[#B8DBD9]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">THE FINANCIAL AUDITOR</span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${style.badge}`}>{style.label}</span>
            {onReplay && text && <button onClick={onReplay} className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs text-[#92979B] transition-colors hover:text-[#B8DBD9]" title="Replay auditor voice"><Volume2 className="h-3.5 w-3.5" /><span>Replay</span></button>}
          </div>
          <p className="text-sm leading-6 text-[#F4F4F9] sm:text-[15px]">{text}</p>
          {speaking && <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#586F7C]"><span className="flex h-3 items-end gap-0.5" aria-hidden="true"><i className="h-1.5 w-0.5 animate-pulse rounded bg-[#B8DBD9]" /><i className="h-3 w-0.5 animate-pulse rounded bg-[#B8DBD9] [animation-delay:100ms]" /><i className="h-2 w-0.5 animate-pulse rounded bg-[#B8DBD9] [animation-delay:200ms]" /></span>Speaking</div>}
        </div>
      </div>
    </section>
  );
}
