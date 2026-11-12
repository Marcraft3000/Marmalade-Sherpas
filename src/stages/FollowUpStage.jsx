import React, { useState } from 'react';
import { FastForward, CheckCircle2, Clock, RotateCcw, AlertTriangle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';

export default function FollowUpStage({
  session,
  mission,
  onSubmitFollowUp,
  onResetAudit,
  onOpenAdvisorBriefing,
}) {
  const [activeDay, setActiveDay] = useState(session.simulatedDay || 3);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [auditorFeedback, setAuditorFeedback] = useState(
    session.followUpHistory?.[session.followUpHistory.length - 1] || null
  );
  const [submitting, setSubmitting] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleStatusSelect = async (status) => {
    setSelectedStatus(status);
    setSubmitting(true);
    try {
      const res = await onSubmitFollowUp(activeDay, status, notes);
      setAuditorFeedback(res);
      speechService.speak(res.auditorReaction, () => setSpeaking(true), () => setSpeaking(false));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFastForwardDay30 = async () => {
    setActiveDay(30);
    setSelectedStatus('');
    const promptSpeech = "Simulating thirty days later. Let's see if the initial momentum carried through, or if the old financial habits crept back in.";
    speechService.speak(promptSpeech, () => setSpeaking(true), () => setSpeaking(false));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Avatar */}
      <AuditorAvatar
        speaking={speaking}
        mood={
          auditorFeedback?.status === 'done'
            ? 'IMPRESSED'
            : auditorFeedback?.status === 'started'
            ? 'SUPPORTIVE'
            : 'DISSECTING'
        }
        text={
          auditorFeedback?.auditorReaction ||
          (activeDay === 3
            ? `Three days later. The dust has settled. Did you actually take action on "${mission?.title}", or did you put it off until next week?`
            : `Thirty days later. A full month in simulated time. How has your financial baseline shifted?`)
        }
        onReplay={() => {
          if (auditorFeedback?.auditorReaction) {
            speechService.speak(auditorFeedback.auditorReaction, () => setSpeaking(true), () => setSpeaking(false));
          }
        }}
      />

      {/* Hero Card */}
      <div className="bg-[#191B1D] border border-[#2E3236] rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        {/* Timeline Header & Demo Time Travel Control */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2E3236]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {activeDay === 3 ? "DAY 3 CHECK-IN" : "DAY 30 CHECK-IN"}
              </span>
              <span className="text-xs text-[#92979B] font-mono">CONTINUOUS ACCOUNTABILITY</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">
              {activeDay === 3 ? "Three Days Later: How's The Mission Going?" : "Thirty Days Later: Long-Term Accountability"}
            </h2>
          </div>

          {/* Time Travel Button */}
          {activeDay === 3 && (
            <button
              onClick={handleFastForwardDay30}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
              title="Demo fast forward 30 days"
            >
              <FastForward className="w-4 h-4" />
              <span>FAST FORWARD TO DAY 30</span>
            </button>
          )}
        </div>

        {/* Mission Reminder Banner */}
        <div className="p-4 rounded-xl bg-[#101112] border border-[#2E3236] flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#92979B] font-mono uppercase text-[10px] block">COMMITTED MISSION</span>
            <span className="text-white font-semibold text-sm">{mission?.title}</span>
          </div>
          <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            {mission?.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
          </span>
        </div>

        {/* Interactive Status Question */}
        <div>
          <span className="text-xs font-mono uppercase text-[#92979B] tracking-wider block mb-3">
            SELECT YOUR CURRENT PROGRESS:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'done', label: 'Done & Verified', desc: 'Executed step one and completed the commitment.' },
              { id: 'started', label: 'Started / In Motion', desc: 'Took preliminary steps; finishing the rest.' },
              { id: 'not_started', label: 'Haven’t Started Yet', desc: 'Distracted by day-to-day life or hesitation.' },
              { id: 'blocked', label: 'Something Got In The Way', desc: 'Encountered unexpected resistance or roadblocks.' },
            ].map((opt) => (
              <button
                key={opt.id}
                disabled={submitting}
                onClick={() => handleStatusSelect(opt.id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  selectedStatus === opt.id
                    ? 'bg-[#C7F36B]/15 border-[#C7F36B] text-white shadow-[0_0_15px_rgba(199,243,107,0.15)]'
                    : 'bg-[#222528] border-[#2E3236] text-[#92979B] hover:text-white hover:border-[#474E54]'
                }`}
              >
                <div className="font-bold text-sm text-white mb-1">{opt.label}</div>
                <div className="text-xs text-[#92979B]">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Auditor Reaction Box */}
        {auditorFeedback && (
          <div className="p-5 rounded-2xl bg-[#101112] border border-[#C7F36B]/30 space-y-3 animate-slide-up">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#C7F36B] uppercase">
              <Sparkles className="w-4 h-4" />
              <span>AUDITOR'S ACCOUNTABILITY FEEDBACK</span>
            </div>
            <p className="text-sm md:text-base text-white leading-relaxed">
              "{auditorFeedback.auditorReaction}"
            </p>
            {auditorFeedback.nextStep && (
              <div className="pt-2 text-xs font-mono text-[#92979B]">
                <strong className="text-white">NEXT MICRO-STEP: </strong>
                {auditorFeedback.nextStep}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-6 border-t border-[#2E3236] flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={onOpenAdvisorBriefing}
            className="px-4 py-2.5 rounded-xl bg-[#222528] hover:bg-[#2E3236] border border-[#2E3236] text-xs font-semibold text-white flex items-center gap-2 transition-colors"
          >
            <span>View Advisor Briefing Sheet</span>
          </button>

          <button
            onClick={onResetAudit}
            className="px-5 py-2.5 rounded-xl bg-[#C7F36B] hover:bg-[#B8E55A] text-[#101112] text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Audit Another Family</span>
          </button>
        </div>
      </div>
    </div>
  );
}
