import React, { useState } from 'react';
import { ArrowRight, Users, Sparkles, Shield, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

export default function CaseSelection({ cases, onSelectCase }) {
  const [coupleModeSelection, setCoupleModeSelection] = useState({});

  const toggleCoupleMode = (caseId) => {
    setCoupleModeSelection(prev => ({
      ...prev,
      [caseId]: !prev[caseId]
    }));
  };

  const getBandBadge = (band) => {
    switch (band?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'vulnerable':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'stable':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'strong':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7F36B]/10 border border-[#C7F36B]/30 text-[#C7F36B] text-xs font-mono font-bold tracking-wider uppercase mb-2">
          <span>THE AUDIT ROOM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] animate-pulse"></span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-display">
          YOUR MONEY HAS A STORY.<br />
          <span className="text-[#C7F36B] underline decoration-[#C7F36B]/40 underline-offset-8">
            LET'S FIND OUT IF IT'S A GOOD ONE.
          </span>
        </h1>
        <p className="text-[#92979B] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Four financial lives. Four different realities. One honest conversation.
          We don't show the answers first—we interrogate your assumptions, then let the real numbers speak.
        </p>
      </div>

      {/* Four Family Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((c) => {
          const isCouple = coupleModeSelection[c.id] ?? c.coupleMode;

          return (
            <div
              key={c.id}
              className="group relative bg-[#191B1D] hover:bg-[#222528] border border-[#2E3236] hover:border-[#C7F36B]/60 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Avatar, Household, Verified Score */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#101112] border border-[#2E3236] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                      {c.avatar}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white group-hover:text-[#C7F36B] transition-colors">
                        {c.name}
                      </h2>
                      <div className="text-xs text-[#92979B] flex items-center gap-2">
                        <span>{c.city}, {c.state}</span>
                        <span>•</span>
                        <span>{c.household?.length || 0} family members</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Score Badge */}
                  <div className="text-right">
                    <div className="text-xs font-mono uppercase text-[#92979B] mb-0.5">Plan Score</div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xl font-black font-mono text-white">{c.score}</span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${getBandBadge(c.band)}`}>
                        {c.band}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Narrative Hook */}
                <div className="p-3.5 rounded-xl bg-[#101112] border border-[#2E3236] text-xs font-mono text-[#C7F36B] leading-relaxed mb-4">
                  "{c.hook}"
                </div>

                {/* Description */}
                <p className="text-xs text-[#92979B] leading-relaxed mb-6">
                  {c.description}
                </p>
              </div>

              {/* Bottom Row: Couple Mode toggle & Start Button */}
              <div className="pt-4 border-t border-[#2E3236] flex items-center justify-between gap-3">
                {c.coupleMode ? (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#92979B] hover:text-white">
                    <input
                      type="checkbox"
                      checked={isCouple}
                      onChange={() => toggleCoupleMode(c.id)}
                      className="rounded bg-[#101112] border-[#2E3236] text-[#C7F36B] focus:ring-[#C7F36B] focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    <Users className="w-3.5 h-3.5 text-[#C7F36B]" />
                    <span>Couple Mode (Compare Both)</span>
                  </label>
                ) : (
                  <div className="text-[11px] text-[#92979B] font-mono">Single Household Mode</div>
                )}

                <button
                  onClick={() => onSelectCase(c.id, isCouple)}
                  className="px-4 py-2.5 rounded-xl bg-[#C7F36B] hover:bg-[#B8E55A] text-[#101112] font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(199,243,107,0.25)] hover:shadow-[0_0_20px_rgba(199,243,107,0.4)] transition-all"
                >
                  <span>START AUDIT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Guarantee Banner */}
      <div className="mt-12 p-6 rounded-2xl bg-[#191B1D]/50 border border-[#2E3236] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#92979B]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#C7F36B] flex-shrink-0" />
          <span>
            <strong className="text-white">The Anti-Tour Guarantee:</strong> We do not lecture or drown you in charts. You will speak before seeing any financial conclusions. Expectation vs. Reality is the whole game.
          </span>
        </div>
        <div className="font-mono text-[11px] text-[#C7F36B] bg-[#C7F36B]/10 px-3 py-1 rounded-full border border-[#C7F36B]/20 whitespace-nowrap">
          5 STAGES • 1 REVOLUTIONARY AUDIT
        </div>
      </div>
    </div>
  );
}
