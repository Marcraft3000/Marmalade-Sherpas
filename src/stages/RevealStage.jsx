import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Check, MessageCircle, BookOpen, SkipForward, Volume2, Sparkles } from 'lucide-react';
import SourceDrawer from '../components/SourceDrawer';
import ProjectionChart from '../components/ProjectionChart';
import { submitUnderstandingCheck, exploreDiscovery } from '../utils/api';
import { speechService } from '../utils/speech';

export default function RevealStage({ revealData: data, session, onProceedToVerdict, onChooseRoute, isMuted }) {
  const [phase, setPhase] = useState('words');
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [surprised, setSurprised] = useState(() => new Set((session.understandingChecks || [])
    .filter(check => check.choice === 'surprised').map(check => check.discoveryId)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [routeChoice, setRouteChoice] = useState(null);
  const [question, setQuestion] = useState('');
  const [exploration, setExploration] = useState(null);
  const [exploring, setExploring] = useState(false);
  const heading = useRef(null);
  const scene = useRef(null);
  const findings = data?.discoveries || [];
  const current = findings[index];
  useEffect(() => {
    if (phase !== 'pause') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setPhase('score'), reduced ? 0 : 1700);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [phase, index]);
  async function respond(choice) {
    setBusy(true); setError('');
    try {
      const result = await submitUnderstandingCheck(session.id, current.id, choice, choice === 'discuss' ? question : '');
      if (choice === 'surprised') setSurprised(previous => new Set(previous).add(current.id));
      setFeedback(old => ({ ...old, [current.id]: result.response }));
    } catch { setError('We could not save that response. Please try again.'); }
    finally { setBusy(false); }
  }
  function move(next) { setIndex(next); setDetail(false); setQuestion(''); setExploration(null); setError(''); speechService.stop(); }
  function parallax(event) {
    if (!scene.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches || event.pointerType === 'touch') return;
    const box = scene.current.getBoundingClientRect();
    scene.current.style.setProperty('--parallax-x', `${((event.clientX - box.left) / box.width - .5) * 22}px`);
    scene.current.style.setProperty('--parallax-y', `${((event.clientY - box.top) / box.height - .5) * 22}px`);
  }
  async function beginFindings() {
    if (routeChoice) {
      setBusy(true);
      try { await onChooseRoute(routeChoice); setIndex(0); }
      catch { setError('We could not save your choice. Please try again.'); setBusy(false); return; }
      setBusy(false);
    }
    if (findings.length) setPhase('findings'); else onProceedToVerdict();
  }
  async function askQuestion(event) {
    event.preventDefault();
    if (!question.trim() || !current) return;
    setExploring(true); setError('');
    try { setExploration(await exploreDiscovery(session.id, current.id, question.trim())); }
    catch { setError('We could not open a deeper explanation. Your question is still here.'); }
    finally { setExploring(false); }
  }
  useEffect(() => () => speechService.stop(), []);
  if (!data || data.version !== 2) return <section className="story-shell"><h1>Reopen your plan</h1><p>This session uses an older reveal. Start a new session to see the source-backed experience.</p></section>;
  return <section ref={scene} onPointerMove={parallax} onPointerLeave={() => { if (scene.current) { scene.current.style.removeProperty('--parallax-x'); scene.current.style.removeProperty('--parallax-y'); } }} className={`reveal-stage reveal-${phase}`}>
    <div className="reveal-grain" aria-hidden="true" />
    <div className="reveal-orbit reveal-orbit-one" aria-hidden="true" /><div className="reveal-orbit reveal-orbit-two" aria-hidden="true" />
    <div className="reveal-inner">
      <div className="chapter-line"><span>Your perspective / Your plan</span><span>{session.caseName}</span></div>
      {phase === 'words' && <div className="words-scene scene-enter">
        <p className="eyebrow">Before we open the plan</p>
        <h1 ref={heading} tabIndex={-1} className="quiet-heading">You told us.</h1>
        {data.userQuote ? <blockquote className="client-quote">“{data.userQuote.text}”</blockquote> : <p className="client-quote">Let’s put your perspective beside the plan.</p>}
        <p className="quote-attribution">Your words, from our conversation{data.userQuote?.partner ? ` · ${data.userQuote.partner}` : ''}</p>
        <div className="words-bottom"><p>Keep that thought.<br />Now let’s look at what the plan says.</p><button className="primary-action" onClick={() => setPhase('pause')}>Open my plan <ArrowRight size={19} /></button></div>
      </div>}
      {phase === 'pause' && <div className="pause-scene"><div className="reveal-rule" aria-hidden="true" /><h1 ref={heading} tabIndex={-1}>A number is only<br /><em>part of the story.</em></h1><button className="quiet-action" onClick={() => setPhase('score')}><SkipForward size={16} /> Skip transition</button></div>}
      {phase === 'score' && <div className="score-scene scene-enter">
        <p className="eyebrow">Perspective meets the plan</p><h1 ref={heading} tabIndex={-1}>{data.actualScore === null ? 'There’s more to explore.' : 'Here’s where we begin.'}</h1>
        <div className="score-spread"><div className="expectation-block"><span className="eyebrow">Your perspective</span>{Object.keys(data.partnerScores || {}).length > 1 ? Object.entries(data.partnerScores).map(([person, value]) => <div className="partner-score" key={person}><span>{person}</span><strong>{value}<small>/100</small></strong></div>) : <><div className="expected-number">{data.expectedScore}<small>/100</small></div><p>Your estimate before seeing the plan</p></>}</div><div className="actual-block"><span className="eyebrow">In your Sherpas plan</span><div className="actual-number">{data.actualScore ?? '—'}{data.actualScore !== null && <small>/100</small>}</div><p>{data.actualScore === null ? 'No financial health score in this export' : data.band || 'Published financial health score'}</p><SourceDrawer source={data.scoreSource} title="Financial health score" label="Where this score comes from" /></div></div>
        <div className="score-context"><span className="context-marker" aria-hidden="true" /><div><h2>{data.scoreContext?.title || 'The details matter.'}</h2><p>{data.auditorReaction}</p><button className="voice-action" disabled={isMuted} onClick={() => speechService.speak(`Your estimate was ${data.expectedScore} out of 100. ${data.actualScore === null ? 'This plan does not include a score.' : `Your Sherpas plan score is ${data.actualScore} out of 100.`} ${data.auditorReaction}`)}><Volume2 size={16} /> Listen to the reveal</button></div></div>
        {findings.length > 1 && <div className="route-chooser"><p className="eyebrow">Choose where to begin</p><p>Your choice changes the first finding and the next step we prepare.</p><div>{findings.map(item => <button key={item.id} aria-pressed={routeChoice === item.id} onClick={() => setRouteChoice(item.id)}><span>{item.badge}</span><strong>{item.title}</strong><ArrowRight size={16} /></button>)}</div></div>}
        {data.reviewedProjection && <ProjectionChart projection={data.reviewedProjection} />}
        {error && <p role="alert" className="inline-error">{error}</p>}
        <div className="scene-actions"><button className="quiet-action" onClick={() => setPhase('words')}><ArrowLeft size={17} /> Your words</button><button className="primary-action" disabled={busy} onClick={beginFindings}>{findings.length ? 'Look beyond the score' : 'Continue with the available information'}<ArrowRight size={18} /></button></div>
      </div>}
      {phase === 'findings' && current && <div className="finding-layout">
        <aside className="perspective-rail"><span className="eyebrow">Keep your question in view</span><blockquote>“{data.userQuote?.text || data.priorityQuote}”</blockquote><p>Your words</p><div className="finding-progress" aria-label={`Finding ${index + 1} of ${findings.length}`}>{findings.map((item, i) => <button key={item.id} onClick={() => move(i)} aria-label={`Finding ${i + 1}`} aria-current={i === index ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span><i /></button>)}</div></aside>
        <article key={current.id} className="finding-page scene-enter">
          <div className="finding-kicker"><span>Finding {String(index + 1).padStart(2, '0')}</span><span>{current.badge}</span></div>
          <h1 ref={heading} tabIndex={-1}>{current.title}</h1>
          <p className="reflection-question">{current.reflectionQuestion}</p>
          <button className="voice-action" disabled={isMuted} onClick={() => speechService.speak(`${current.title}. ${current.explanation}. ${current.whyItMatters}`)}><Volume2 size={16} /> Listen to this finding</button>
          <div className="depth-switch" role="group" aria-label="Explanation depth"><button aria-pressed={!detail} onClick={() => setDetail(false)}><BookOpen size={15} />In plain language</button><button aria-pressed={detail} onClick={() => setDetail(true)}>Numbers & context</button></div>
          {!detail ? <div className="plain-explanation"><p>{current.explanation}</p><div className="why-note"><span>What to take away</span><p>{current.whyItMatters}</p></div></div> : <div className="numbers-context scene-enter">{current.figure && <div className="finding-figure">{current.figure}</div>}<p>{current.title}</p><dl>{current.source.period && <div><dt>Period</dt><dd>{current.source.period}</dd></div>}{current.source.basis && <div><dt>Basis / assumptions</dt><dd>{current.source.basis}</dd></div>}{current.source.raw?.note && <div><dt>Reading this correctly</dt><dd>{current.source.raw.note}</dd></div>}</dl>{current.badge === 'PLAN TEXT' && <p className="plan-passage">{current.source.raw}</p>}</div>}
          <SourceDrawer source={current.source} title={current.title} />
          {detail && current.projection && <ProjectionChart projection={current.projection} />}
          <form className="deep-dive" onSubmit={askQuestion}>
            <div className="deep-dive-heading"><Sparkles size={17} /><div><h2>Go deeper</h2><p>Ask in your own words about this finding or another part of your plan.</p></div></div>
            <label className="field-label">Your question<textarea className="editorial-input" rows={2} maxLength={500} value={question} onChange={event => setQuestion(event.target.value)} placeholder="What does this mean for my situation?" /></label>
            <button className="deep-dive-submit" type="submit" disabled={exploring || !question.trim()}>{exploring ? 'Looking in your plan…' : 'Ask about my plan'} <ArrowRight size={16} /></button>
            {exploration && <div className="exploration-answer" role="status">
              <span>{exploration.kind === 'off_topic' ? 'Outside this plan' : exploration.kind === 'unavailable' ? 'Answer unavailable' : 'Based on your plan'}</span>
              <p>{exploration.answer}</p>
              {exploration.kind === 'answered' && <SourceDrawer source={exploration.source} title={exploration.sourceTitle || current.title} label="Check the source" />}
            </div>}
          </form>
          <div className="understanding-actions"><button disabled={busy} onClick={() => respond('understood')}><Check size={16} /> This makes sense</button><button disabled={busy || surprised.has(current.id)} onClick={() => respond('surprised')}><Sparkles size={16} /> {surprised.has(current.id) ? 'Surprise saved' : 'This surprised me'}</button><button disabled={busy} onClick={() => respond('discuss')}><MessageCircle size={16} /> Discuss with my advisor</button></div>
          {feedback[current.id] && <p className="saved-feedback" role="status">{feedback[current.id]}</p>}{error && <p role="alert" className="inline-error">{error}</p>}
          <div className="scene-actions"><button className="quiet-action" onClick={() => index ? move(index - 1) : setPhase('score')}><ArrowLeft size={17} />Back</button><button className="primary-action" onClick={() => index < findings.length - 1 ? move(index + 1) : onProceedToVerdict()}>{index < findings.length - 1 ? 'Next finding' : 'Bring it together'}<ArrowRight size={18} /></button></div>
        </article>
      </div>}
    </div>
  </section>;
}
