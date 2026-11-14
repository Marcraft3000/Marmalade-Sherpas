import React from 'react';
import { ArrowRight } from 'lucide-react';
export default function VerdictStage({ verdict, onProceedToMission }) {
  return <section className="story-shell verdict-stage"><p className="eyebrow">The bigger picture</p><h1>Clarity, before<br /><em>the next step.</em></h1><div className="verdict-list">{[{ title: 'A useful starting point', value: verdict?.doingRight }, { title: 'A finding to explore', value: verdict?.needsAttention }, { title: 'Keep the context', value: verdict?.overlooking }].map((item, i) => <div key={item.title}><span className="verdict-index">0{i + 1}</span><div><h2>{item.title}</h2><p>{item.value}</p></div></div>)}</div><div className="recap-bottom"><p>{verdict?.bottomLine}</p><button className="primary-action" onClick={onProceedToMission}>Choose a next step <ArrowRight size={18} /></button></div></section>;
}
