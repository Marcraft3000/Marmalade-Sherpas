import React, { useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import SourceDrawer from '../components/SourceDrawer';
import Narration from '../components/Narration';
import { missionNarration, shortNarration } from '../utils/narration';

export default function MissionStage({ mission, onChooseRecommendation, onAcceptMission, onProceedToFollowUp }) {
  const [response, setResponse] = useState('');
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function choose(recommendationId) {
    setBusy(true);
    setError('');
    try {
      await onChooseRecommendation(recommendationId);
      setResponse('');
      setReason('');
      setShowReason(false);
    } catch {
      setError('We could not open that recommendation. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision) {
    setBusy(true);
    setError('');
    try {
      const result = await onAcceptMission(decision, reason);
      setResponse(result.auditorResponse);
      setShowReason(false);
    } catch {
      setError('We could not save your decision. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const canChoose = mission?.options?.length > 1 && ['not_accepted', 'considering'].includes(mission.status);

  return <section className="story-shell mission-stage">
    <p className="eyebrow">One next step</p>
    <h1>{mission?.title}</h1>
    <p className="mission-intro">{mission?.whyItMatters}</p>
    <Narration label="Listen to your next step" text={missionNarration(mission)} />
    {canChoose && <label className="field-label mission-options">
      Choose a recommendation from your plan
      <select className="editorial-input" disabled={busy} value={mission.recommendationId} onChange={event => choose(event.target.value)}>
        {mission.options.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
      </select>
    </label>}
    <div className="mission-layout">
      <div className="mission-first">
        <span className="eyebrow">Start here</span>
        <h2>{mission?.firstAction}</h2>
        <ol>{mission?.steps?.map(step => <li key={step}>{step}</li>)}</ol>
        {mission?.source && <SourceDrawer source={mission.source} title="Your plan's recommendation" label="Read the original recommendation" />}
      </div>
      <aside className="mission-aside">
        <Clock size={22} /><h3>At your pace</h3><p>{mission?.timeframe}</p>
        <hr /><h3>What counts as progress</h3><p>{mission?.howToVerify}</p>
      </aside>
    </div>
    {mission?.checkpoints?.length > 0 && <div className="checkpoint-list">
      <p className="eyebrow">Your check-in path</p>
      {mission.checkpoints.map(item => <div key={item.day}><span>Day {item.day}</span><p>{item.prompt}</p></div>)}
    </div>}
    {mission?.recommendation && <details className="recommendation-passage">
      <summary>The recommendation behind this step</summary><p>{mission.recommendation}</p>
    </details>}
    <div className="mission-decisions">
      <button className="primary-action" disabled={busy} onClick={() => decide('accept')}><Check size={17} />I'll take this step</button>
      <button className="quiet-action" disabled={busy} onClick={() => decide('think')}>I need time</button>
      <button className="quiet-action" disabled={busy} onClick={() => setShowReason(true)}>Something is in the way</button>
    </div>
    {showReason && <div className="barrier-input">
      <label className="field-label">What would you like your advisor to know?<textarea className="editorial-input" value={reason} maxLength={3000} onChange={event => setReason(event.target.value)} rows={3} /></label>
      <button className="primary-action" disabled={busy || !reason.trim()} onClick={() => decide('reject')}>Save my concern</button>
    </div>}
    {response && <>
      <p className="saved-feedback" role="status">{response}</p>
      <Narration label="Listen to this response" text={shortNarration(response, 550)} scene={false} />
    </>}
    {error && <p role="alert" className="inline-error">{error}</p>}
    {mission?.status !== 'not_accepted' && <div className="scene-actions">
      <span /><button className="quiet-action" onClick={onProceedToFollowUp}>Try a follow-up <ArrowRight size={18} /></button>
    </div>}
  </section>;
}
