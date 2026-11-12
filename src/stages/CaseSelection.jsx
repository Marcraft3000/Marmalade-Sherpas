import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, LockKeyhole, ScanSearch, Users, UserRound } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';

const chapters = [
  { number: '01', title: 'Your view', note: 'Start with what you believe' },
  { number: '02', title: 'The evidence', note: 'See what the plan says' },
  { number: '03', title: 'One next step', note: 'Leave with a clear action' },
];

export default function CaseSelection({ cases, onSelectCase }) {
  const [coupleModeSelection, setCoupleModeSelection] = useState({});
  const toggleCoupleMode = (caseId) => setCoupleModeSelection((prev) => ({ ...prev, [caseId]: !prev[caseId] }));

  return (
    <main className="audit-cover relative isolate min-h-full overflow-hidden px-5 pb-16 pt-9 sm:px-8 sm:pt-14 lg:pt-16">
      <div className="audit-cover__glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-[1240px]">
        <section className="audit-intro grid items-end gap-10 border-b border-white/10 pb-10 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-16">
          <div>
            <div className="mb-7 flex items-center gap-3 text-[#B8DBD9]">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-[#B8DBD9]/30 bg-[#04724D]/20"><ScanSearch className="h-4 w-4" /></span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.24em]">The Plan Audit <span className="mx-1 text-white/30">/</span> Private session</span>
            </div>
            <h1 className="max-w-[950px] font-display text-[clamp(3.25rem,8.2vw,7.8rem)] font-normal leading-[0.84] tracking-[-0.055em] text-[#F4F4F9]">
              Money has
              <span className="block pl-[0.42em] font-light italic text-[#B8DBD9]">a story.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-[#B3BEC1] sm:text-lg sm:leading-8">
              Before we look at the plan, we want to hear your side. Choose a household and tell us what you think is going on.
            </p>
          </div>

          <aside className="audit-route border-l border-[#B8DBD9]/25 pl-5 lg:mb-1 lg:pl-7" aria-label="How the audit works">
            <p className="mb-5 font-mono text-[9px] uppercase tracking-[0.24em] text-[#78918E]">Inside the audit</p>
            <ol className="space-y-4">
              {chapters.map((chapter) => <li key={chapter.number} className="grid grid-cols-[32px_1fr] gap-2">
                <span className="pt-0.5 font-mono text-[10px] text-[#67A88D]">{chapter.number}</span>
                <div><p className="text-sm font-semibold text-[#F4F4F9]">{chapter.title}</p><p className="mt-0.5 text-xs leading-5 text-[#879395]">{chapter.note}</p></div>
              </li>)}
            </ol>
          </aside>
        </section>

        <section className="pt-9 sm:pt-11" aria-labelledby="case-heading">
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.24em] text-[#78918E]">Select a household</p>
              <h2 id="case-heading" className="font-display text-3xl font-normal tracking-tight text-[#F4F4F9] sm:text-4xl">Choose your case file.</h2>
            </div>
            <span className="pb-1 font-mono text-[10px] tracking-[0.16em] text-[#78918E]">{String(cases.length).padStart(2, '0')} FILES</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {cases.map((item, index) => {
              const coupleMode = coupleModeSelection[item.id] ?? item.coupleMode;
              const members = item.household?.length || 1;
              return (
                <SpotlightCard key={item.id} className="case-file group relative overflow-hidden rounded-[20px] border border-white/[0.09] bg-[#111917] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#82C7A1]/45 hover:shadow-[0_26px_80px_rgba(0,0,0,0.3)]" spotlightColor="rgba(130, 199, 161, 0.13)">
                  <article className="relative z-[1] flex min-h-[236px] flex-col justify-between p-5 sm:min-h-[252px] sm:p-7">
                    <div className="pointer-events-none absolute -right-1 -top-10 select-none font-display text-[180px] font-light leading-none tracking-[-0.1em] text-white/[0.025] transition-colors group-hover:text-[#B8DBD9]/[0.06]" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                    <div>
                      <div className="mb-7 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#78918E]">Dossier <span className="text-[#67A88D]">{String(index + 1).padStart(2, '0')}</span></span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9BA9A6]">{item.coupleMode ? <><Users className="h-3 w-3" /> Couple</> : <><UserRound className="h-3 w-3" /> Individual</>}</span>
                      </div>
                      <h3 className="relative max-w-[80%] font-display text-[2rem] font-normal leading-[1.05] tracking-[-0.035em] text-[#F4F4F9] sm:text-[2.35rem]">{item.name}</h3>
                      <p className="mt-2 text-sm text-[#98A5A3]">{[item.city, item.state].filter(Boolean).join(', ')} <span className="px-1.5 text-[#50645E]">/</span> {members} {members === 1 ? 'person' : 'people'}</p>
                    </div>

                    <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      {item.coupleMode ? (
                        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-xs text-[#AAB5B2] transition-colors hover:text-white">
                          <input type="checkbox" checked={coupleMode} onChange={() => toggleCoupleMode(item.id)} className="h-4 w-4 rounded border-white/25 bg-[#0A0D0E] text-[#138451] focus:ring-[#82C7A1] focus:ring-offset-0" />
                          Compare both perspectives
                        </label>
                      ) : <span className="inline-flex min-h-10 items-center gap-2 text-xs text-[#78918E]">One perspective</span>}
                      <button onClick={() => onSelectCase(item.id, coupleMode)} className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[#82C7A1]/30 bg-[#123D2C] pl-4 pr-2 text-xs font-semibold text-[#EAF5EF] transition-all hover:border-[#82C7A1]/70 hover:bg-[#176241] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8DBD9]">
                        Open case <span className="grid h-7 w-7 place-items-center rounded-full bg-[#82C7A1]/15"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                      </button>
                    </div>
                  </article>
                </SpotlightCard>
              );
            })}
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-[#879395] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-[#82C7A1]" />Your perspective comes first. Scores and findings stay hidden until after the conversation.</p>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#60716D]">Sherpas x UPV <ArrowRight className="h-3 w-3" /></span>
        </div>
      </div>
    </main>
  );
}
