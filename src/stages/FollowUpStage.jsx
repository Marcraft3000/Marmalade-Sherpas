import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
const options = [{ id: 'done', label: 'I completed it', description: 'Self-reported; keep your confirmation or notes.' }, { id: 'started', label: 'I made a start', description: 'There are still a few things to finish.' }, { id: 'not_started', label: 'Not yet', description: 'I haven’t taken the first step.' }, { id: 'blocked', label: 'Something got in the way', description: 'I need help with an obstacle.' }];
export default function FollowUpStage({ session, mission, onSubmitFollowUp, onResetAudit, onOpenAdvisorBriefing }) {
  const [day, setDay] = useState(session.simulatedDay || 3);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState(session.followUpHistory?.findLast(item => item.day === (session.simulatedDay || 3)) || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    setBusy(true); setError('');
    try { setFeedback(await onSubmitFollowUp(day, status, notes)); }
    catch { setError('Your update could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="story-shell"><p className="eyebrow">Day {day} · Simulated check-in</p><h1>Plans meet life.<br /><em>How did it go?</em></h1><div className="followup-reminder"><span className="eyebrow">Your saved next step</span><h2>{mission?.title}</h2><p>Status: {(mission?.status || 'not selected').replace(/_/g, ' ')}</p>{mission?.checkpoints?.find(item => item.day === day) && <p className="checkpoint-prompt">{mission.checkpoints.find(item => item.day === day).prompt}</p>}</div><div className="answer-options followup-options">{options.map(option => <button aria-pressed={status === option.id} key={option.id} onClick={() => setStatus(option.id)}><div><strong>{option.label}</strong><p>{option.description}</p></div></button>)}</div><label className="field-label custom-answer">Anything you’d like to add?<textarea className="editorial-input" rows={3} value={notes} maxLength={3000} onChange={e => setNotes(e.target.value)} placeholder="What helped, or what got in the way?" /></label><div className="scene-actions"><button className="quiet-action" onClick={() => { setDay(day === 3 ? 30 : 3); setStatus(''); setFeedback(null); }}>Simulate day {day === 3 ? 30 : 3}<ArrowUpRight size={16} /></button><button className="primary-action" disabled={!status || busy} onClick={submit}>{busy ? 'Saving…' : 'Save my check-in'}<ArrowRight size={18} /></button></div>{feedback && <div className="followup-feedback" role="status"><h2>Your next conversation</h2><p>{feedback.auditorReaction}</p><p>{feedback.nextStep}</p></div>}{error && <p className="inline-error" role="alert">{error}</p>}<div className="recap-bottom"><button className="quiet-action" onClick={onOpenAdvisorBriefing}>Open advisor briefing <ArrowUpRight size={16} /></button><button className="quiet-action" onClick={onResetAudit}>Return to clients</button></div></section>;
}
