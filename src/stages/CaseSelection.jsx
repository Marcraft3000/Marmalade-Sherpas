import React, { useState } from 'react';
import { ArrowUpRight, Users, UserRound, ShieldCheck, ArrowRight, ScanSearch } from 'lucide-react';

export default function CaseSelection({ cases, onSelectCase }) {
  const [coupleModeSelection, setCoupleModeSelection] = useState({});

  const toggleCoupleMode = (caseId) => setCoupleModeSelection((prev) => ({ ...prev, [caseId]: !prev[caseId] }));

  return (
    <div className="relative isolate min-h-full overflow-hidden px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-tech-grid opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-0 -z-10 h-96 w-96 rounded-full bg-[#04724D]/10 blur-3xl" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid gap-8 border-b border-[#1C2529] pb-10 md:grid-cols-[1fr_auto] md:items-end md:pb-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#04724D]/30 bg-[#04724D]/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B8DBD9]">
              <ScanSearch className="h-3.5 w-3.5" /> THE AUDIT ROOM
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-[#F4F4F9] sm:text-5xl lg:text-6xl">
              Your money has a story.
              <span className="mt-2 block text-[#B8DBD9]">Let’s hear it before we see the numbers.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#92979B] sm:text-lg">
              Four households. Four different perspectives. Start with what you believe, then compare it with the financial plan.
            </p>
          </div>
          <div className="hidden border-l border-[#1C2529] pl-5 font-mono text-xs leading-6 text-[#586F7C] md:block">
            <div>SHERPAS × UPV</div>
            <div>PRIVATE AUDIT · 5 STEPS</div>
          </div>
        </div>

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#586F7C]">Choose a case file</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#F4F4F9]">Who are we sitting down with?</h2>
          </div>
          <span className="font-mono text-xs text-[#586F7C]">{String(cases.length).padStart(2, '0')} HOUSEHOLDS</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cases.map((item, index) => {
            const coupleMode = coupleModeSelection[item.id] ?? item.coupleMode;
            const members = item.household?.length || 1;
            return (
              <article key={item.id} className="group relative flex min-h-[218px] flex-col justify-between overflow-hidden rounded-2xl border border-[#1C2529] bg-[#0E1315]/90 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#04724D]/60 hover:bg-[#101719] sm:p-6">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-[#1C2529] transition-colors group-hover:border-[#04724D]/30" />
                <div>
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-[#586F7C]">CASE FILE / {String(index + 1).padStart(2, '0')}</span>
                    <span className="rounded-full border border-[#1C2529] bg-[#0A0D0E] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#92979B]">Plan review</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[#B8DBD9] sm:text-2xl">{item.name}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#92979B]">
                    <span>{[item.city, item.state].filter(Boolean).join(', ')}</span>
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#586F7C]" />
                    <span>{members} {members === 1 ? 'household member' : 'household members'}</span>
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#1C2529] pt-4">
                  {item.coupleMode ? (
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg pr-2 text-xs text-[#92979B] transition-colors hover:text-white">
                      <input type="checkbox" checked={coupleMode} onChange={() => toggleCoupleMode(item.id)} className="h-4 w-4 rounded border-[#586F7C] bg-[#0A0D0E] text-[#04724D] focus:ring-[#04724D] focus:ring-offset-0" />
                      {coupleMode ? <Users className="h-4 w-4 text-[#B8DBD9]" /> : <UserRound className="h-4 w-4" />}
                      <span>Compare both perspectives</span>
                    </label>
                  ) : <span className="inline-flex items-center gap-2 text-xs text-[#586F7C]"><UserRound className="h-4 w-4" /> Individual audit</span>}
                  <button onClick={() => onSelectCase(item.id, coupleMode)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#04724D] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(4,114,77,0.18)] transition-all hover:bg-[#03593C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8DBD9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1315]">
                    Begin audit <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#1C2529] bg-[#0E1315]/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B8DBD9]" />
            <div><p className="text-sm font-semibold text-white">Your perspective comes first.</p><p className="mt-1 max-w-3xl text-sm leading-6 text-[#92979B]">No scores or financial findings are shown until after the conversation. The audit begins with your expectations, then checks them against the plan.</p></div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#586F7C]">A conversation, not a dashboard <ArrowUpRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </div>
  );
}
