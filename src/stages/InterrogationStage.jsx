import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Narration from '../components/Narration';
import { narration } from '../utils/narration';

const concerns = ['Planning for the long term', 'Feeling in control of monthly spending', 'Preparing for the unexpected', 'Making room for family goals'];
const priorities = ['Build a stronger financial safety net', 'Make more room for our goals', 'Feel more in control of monthly spending', 'Plan confidently for the long term'];
const confidenceOptions = ['Very confident', 'Somewhat confident', 'Unsure', 'Feeling overwhelmed'];
const questions = [
  { category: 'perceived_health', title: 'How do things feel, financially?', note: 'Before seeing the plan, give your financial health a score from 0 to 100. There is no right answer here.' },
  { category: 'confidence', title: 'How confident do you feel about your decisions?', note: 'A plan should help you understand your choices, wherever you are starting from.' },
  { category: 'main_concern', title: 'What’s the thought you keep coming back to?', note: 'Choose a starting point or tell us in your own words. We will keep your exact words beside the findings.' },
  { category: 'financial_priority', title: 'What would you most like to change?', note: 'Your priority will guide which parts of the plan we explore first.' },
  { category: 'future_expectation', title: 'What would make this feel clearer?', note: 'One more thought before we put your perspective beside the plan.' },
];
export default function InterrogationStage({ session, onCompleteInterrogation, onSaveAnswer }) {
  const key = `audit-draft-${session.id}`;
  const [draft, setDraft] = useState(() => {
    if (onSaveAnswer) {
      const answers = session.answers || [];
      const partners = session.isCoupleMode ? session.partners : [null];
      const unansweredPartner = partners.findIndex(partner => !answers.some(answer => answer.category === 'perceived_health' && answer.partner === partner));
      if (unansweredPartner >= 0) return { step: 0, partnerIndex: unansweredPartner, answers, value: '' };
      const unansweredQuestion = questions.findIndex((question, index) => index > 0 && !answers.some(answer => answer.category === question.category));
      return { step: unansweredQuestion < 0 ? 0 : unansweredQuestion, partnerIndex: 0, answers, value: '' };
    }
    try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && Array.isArray(saved.answers) && saved.step >= 0 && saved.step <= 4) return saved; } catch {}
    return { step: 0, partnerIndex: 0, answers: session.answers || [], value: '' };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const partners = session.isCoupleMode ? session.partners || [] : [];
  const partner = draft.step === 0 ? partners[draft.partnerIndex] || null : null;
  const question = draft.step === 4 ? { ...questions[4], title: session.focusPrompt?.question || questions[4].title } : questions[draft.step];
  const questionNarration = narration(
    draft.step === 0 && draft.partnerIndex === 0 && 'Welcome. We’ll start with how things feel to you, then open your plan together',
    partner && `This question is for ${partner}`,
    question.title,
    question.note,
  );
  const saved = [...draft.answers].reverse().find(a => a.category === question.category && (a.partner || null) === partner);
  const value = draft.value !== '' ? draft.value : saved?.value ?? (draft.step === 0 ? 50 : '');
  useEffect(() => {
    if (!onSaveAnswer) localStorage.setItem(key, JSON.stringify(draft));
  }, [draft, key, onSaveAnswer]);
  async function next() {
    if (draft.step !== 0 && !String(value).trim()) return;
    const answer = { category: question.category, question: question.title, value: draft.step === 0 ? Number(value) : String(value).trim(), partner };
    const answers = [...draft.answers.filter(a => !(a.category === answer.category && (a.partner || null) === partner)), answer];
    setError('');
    if (draft.step < 4) {
      if (onSaveAnswer && saved?.value !== answer.value) {
        setBusy(true);
        try { await onSaveAnswer(answer); }
        catch {
          setError('We could not save this answer. Please try again.');
          return;
        } finally { setBusy(false); }
      }
      if (draft.step === 0 && draft.partnerIndex < partners.length - 1) return setDraft({ ...draft, answers, value: '', partnerIndex: draft.partnerIndex + 1 });
      return setDraft({ ...draft, answers, step: draft.step + 1, value: '' });
    }
    setBusy(true);
    try { await onCompleteInterrogation(answers); localStorage.removeItem(key); }
    catch { setError('Your answers are still here. We could not save them. Please try again.'); }
    finally { setBusy(false); }
  }
  function back() {
    if (draft.step === 0 && draft.partnerIndex > 0) setDraft({ ...draft, partnerIndex: draft.partnerIndex - 1, value: '' });
    else if (draft.step > 0) setDraft({ ...draft, step: draft.step - 1, partnerIndex: draft.step === 1 ? Math.max(0, partners.length - 1) : draft.partnerIndex, value: '' });
  }
  const choices = draft.step === 1 ? confidenceOptions : draft.step === 2 ? concerns : draft.step === 3 ? priorities : [];
  return <section className="conversation-stage">
    <div className="conversation-aside"><p className="eyebrow">First, your perspective</p><div className="conversation-index">0{draft.step + 1}<span>/ 05</span></div><p>{session.caseName}</p>{partners.length > 1 && <p className="partner-label">{draft.step === 0 ? `${partner}’s perspective` : 'Your shared response'}</p>}<div className="conversation-track" aria-hidden="true">{questions.map((_, i) => <i key={i} className={i <= draft.step ? 'is-complete' : ''} />)}</div><p className="aside-note">We’ll listen first.<br />The numbers come later.</p></div>
    <div className="conversation-content" key={`${draft.step}-${draft.partnerIndex}`}>
      <h1 className="scene-enter">{question.title}</h1><p className="conversation-note">{question.note}</p>
      <Narration label="Listen to this question" text={questionNarration} />
      <div className="answer-space">
        {draft.step === 0 ? <><div className="perception-number"><output htmlFor="perception">{value}</output><span>/100</span></div><label className="sr-only" htmlFor="perception">Your estimated financial health</label><input id="perception" className="perception-range" type="range" min="0" max="100" value={value} onChange={e => setDraft({ ...draft, value: Number(e.target.value) })} /><div className="range-labels"><span>Needs support</span><span>Feeling secure</span></div></> : <><div className="answer-options">{choices.map(choice => <button key={choice} aria-pressed={value === choice} onClick={() => setDraft({ ...draft, value: choice })}><span>{choice}</span><span className="choice-marker">{value === choice && <Check size={15} />}</span></button>)}</div>{draft.step >= 2 && <label className="field-label custom-answer">In your own words<textarea className="editorial-input" rows={3} maxLength={3000} value={choices.includes(value) ? '' : value} onChange={e => setDraft({ ...draft, value: e.target.value })} placeholder={draft.step === 4 ? "Tell us what feels uncertain..." : "What matters to you?"} /></label>}</>}
      </div>
      {error && <p role="alert" className="inline-error">{error}</p>}
      <div className="conversation-actions"><button className="quiet-action" disabled={busy || (draft.step === 0 && draft.partnerIndex === 0)} onClick={back}><ArrowLeft size={17} /> Back</button><button className="primary-action" disabled={busy || (draft.step !== 0 && !String(value).trim())} onClick={next}>{busy ? 'Saving your perspective…' : draft.step === 4 ? 'Review my answers' : draft.step === 0 ? `Confirm ${value} / 100` : 'Continue'}<ArrowRight size={18} /></button></div>
    </div>
  </section>;
}
