import React from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
import Narration from '../components/Narration';
import { summaryNarration } from '../utils/narration';
export default function InterrogationSummary({ summary, onProceedToReveal, onEditAnswers }) {
  return <section className="recap-stage story-shell">
    <p className="eyebrow">A moment before the numbers</p><h1>This is what<br /><em>matters to you.</em></h1>
    <Narration label="Listen to the recap" text={summaryNarration(summary)} />
    <div className="recap-layout"><div className="recap-quotes"><span className="eyebrow">Your main concern</span><blockquote>“{summary?.mainConcern}”</blockquote><span className="eyebrow">What you want to change</span><blockquote>“{summary?.biggestPriority}”</blockquote></div><aside className="recap-perspective"><span className="eyebrow">Your perspective</span>{Object.keys(summary?.partnerScores || {}).length > 1 ? Object.entries(summary.partnerScores).map(([person, value]) => <div className="partner-score" key={person}><span>{person}</span><strong>{value}<small>/100</small></strong></div>) : <div className="recap-number">{summary?.expectedScore}<small>/100</small></div>}<p>{summary?.confidence}</p><button className="quiet-action" onClick={onEditAnswers}><Pencil size={15} /> Edit my answers</button></aside></div>
    <div className="recap-bottom"><p>Your own words, kept exactly as you gave them.<br />Let’s see how the plan connects.</p><button className="primary-action" onClick={onProceedToReveal}>Meet your plan <ArrowRight size={18} /></button></div>
  </section>;
}
