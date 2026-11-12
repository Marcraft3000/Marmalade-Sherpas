import React, { useState } from 'react';
import { X, Copy, Check, Printer, FileText, CheckCircle2 } from 'lucide-react';

export default function AdvisorBriefingModal({ isOpen, onClose, briefing, session }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !briefing) return null;

  const handleCopy = () => {
    const text = `
SHERPAS WEALTH — PARAPLANNER ADVISOR BRIEFING
Client: ${briefing.clientName}
Verified Score: ${briefing.verifiedScore}/100 | Client Expected: ${briefing.expectedScore}/100 (Gap: ${briefing.scoreGap})

VERIFIED PLAN FACTS:
${(briefing.facts || []).map(f => `- ${f}`).join('\n')}

CLIENT STATEMENTS (FROM INTERROGATION):
${(briefing.userStatements || []).map(s => `- ${s}`).join('\n')}

MISCONCEPTIONS & DIAGNOSTIC:
${(briefing.misconceptionsAndGaps || []).map(m => `- ${m}`).join('\n')}

ACCEPTED AUDIT MISSION:
- ${briefing.acceptedMission} (Status: ${briefing.missionStatus})

RECOMMENDED ADVISOR MEETING AGENDA:
${(briefing.advisorAgenda || []).map((a, i) => `${i + 1}. ${a}`).join('\n')}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0E1315] border border-[#1C2529] rounded-2xl max-w-3xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1C2529]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#04724D]/20 text-[#B8DBD9] flex items-center justify-center font-mono">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Paraplanner & Advisor Briefing Report</h3>
              <p className="text-xs text-[#92979B]">Pre-meeting executive intelligence prepared by THE PLAN AUDIT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#101719] hover:bg-[#1C2529] border border-[#1C2529] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#101719] text-[#92979B] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Briefing Document Body */}
        <div className="py-5 space-y-6 overflow-y-auto flex-1 text-sm text-[#F1EFE9] pr-1">
          {/* Executive Summary Card */}
          <div className="p-4 rounded-xl bg-[#0A0D0E] border border-[#1C2529] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#92979B] uppercase">Client Household</span>
              <div className="font-bold text-white mt-0.5">{briefing.clientName}</div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#92979B] uppercase">Verified Score</span>
              <div className="font-bold text-[#B8DBD9] mt-0.5 font-mono text-base">
                {briefing.verifiedScore}/100
              </div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#92979B] uppercase">Client Expected</span>
              <div className="font-bold text-white mt-0.5 font-mono text-base">
                {briefing.expectedScore}/100
              </div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[#92979B] uppercase">Perception Gap</span>
              <div className={`font-bold mt-0.5 font-mono text-base ${briefing.scoreGap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {briefing.scoreGap > 0 ? `+${briefing.scoreGap} (Over)` : `${briefing.scoreGap}`}
              </div>
            </div>
          </div>

          {/* Section 1: Verified Facts */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                VERIFIED PLAN FACTS
              </span>
              <span className="text-xs text-[#92979B]">Directly from Sherpas algorithmic analysis</span>
            </div>
            <ul className="space-y-1.5 bg-[#101719]/50 p-3.5 rounded-xl border border-[#1C2529] text-xs">
              {(briefing.facts || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: User Statements */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                USER STATEMENTS
              </span>
              <span className="text-xs text-[#92979B]">Captured verbatim during pre-audit interrogation</span>
            </div>
            <ul className="space-y-1.5 bg-[#101719]/50 p-3.5 rounded-xl border border-[#1C2529] text-xs">
              {(briefing.userStatements || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Diagnostic & Misconceptions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                AUDITOR INTERPRETATION & GAPS
              </span>
              <span className="text-xs text-[#92979B]">Key cognitive dissonance and blind spots identified</span>
            </div>
            <ul className="space-y-1.5 bg-[#101719]/50 p-3.5 rounded-xl border border-[#1C2529] text-xs">
              {(briefing.misconceptionsAndGaps || []).map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Accepted Mission */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#04724D]/15 text-[#B8DBD9] border border-[#04724D]/30">
                ACCEPTED CLIENT MISSION
              </span>
              <span className="text-xs text-[#92979B]">First behavioral commitment locked during audit</span>
            </div>
            <div className="bg-[#101719] p-3.5 rounded-xl border border-[#1C2529] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#B8DBD9]" />
                <span>{briefing.acceptedMission}</span>
              </div>
              <span className="font-mono text-[11px] text-[#B8DBD9] bg-[#04724D]/10 px-2 py-0.5 rounded border border-[#04724D]/20">
                {briefing.missionStatus}
              </span>
            </div>
          </div>

          {/* Section 5: Advisor Agenda */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                RECOMMENDED MEETING AGENDA
              </span>
              <span className="text-xs text-[#92979B]">Top 3 high-impact discussion points for the meeting</span>
            </div>
            <div className="space-y-2 bg-[#101719]/50 p-3.5 rounded-xl border border-[#1C2529] text-xs">
              {(briefing.advisorAgenda || []).map((topic, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-white font-medium">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1C2529] flex justify-between items-center text-xs text-[#92979B]">
          <span>Generated by THE PLAN AUDIT Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#101719] hover:bg-[#1C2529] text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
