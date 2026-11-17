import React, { useState } from 'react';
import { ArrowUpRight, ArrowRight, Users, UserRound } from 'lucide-react';
import PlanImport from '../components/PlanImport';
import Narration from '../components/Narration';
export default function CaseSelection({ cases, onSelectCase, onImported, publicDemo }) {
  const [couples, setCouples] = useState({});
  function moveArt(event) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--art-x', `${((event.clientX - box.left) / box.width - .5) * 24}px`);
    event.currentTarget.style.setProperty('--art-y', `${((event.clientY - box.top) / box.height - .5) * 24}px`);
  }
  return <section className="cover-stage">
    <div className="cover-intro"><div><p className="eyebrow">A little clarity changes everything</p><h1>Your money.<br />Your life.<br /><em>The whole story.</em></h1><p className="cover-description">A plan means more when it starts with you. Share your perspective, explore what the numbers mean, and find a next step that fits.</p><a href="#choose-client" className="cover-anchor">Find your starting point <ArrowRight size={18} /></a>
        <Narration label="Listen to the welcome" text="Welcome to The Plan Audit. Choose a household to begin. We’ll hear your perspective first, then look at what the plan says and help you prepare a next step." />
      </div>
      <div className="cover-art" onPointerMove={moveArt} onPointerLeave={event => { event.currentTarget.style.removeProperty('--art-x'); event.currentTarget.style.removeProperty('--art-y'); }} aria-label="Your perspective and your plan, brought together"><div className="art-orbit" /><div className="art-page art-page-back"><span className="eyebrow">The evidence</span><h2>What your<br />plan says.</h2><div className="art-lines"><i /><i /><i /></div><span className="art-foot">Context. Sources. Clarity.</span></div><div className="art-page art-page-front"><span className="eyebrow">The perspective</span><span className="art-quote">"</span><h2>What matters<br />to you?</h2><span className="art-foot">Your words come first.</span></div><span className="art-caption">Two perspectives. One clearer picture.</span></div>
    </div>
    <div id="choose-client" className="client-section"><div className="client-section-heading"><div><p className="eyebrow">Start a conversation</p><h2>Whose story are we opening?</h2>{publicDemo && <p>Choose a sample household and use fictional answers.</p>}</div>{!publicDemo && <PlanImport onImported={onImported} />}</div>
      <div className="client-grid">{cases.map((client, index) => <article className="client-row" key={client.id}><span className="client-number">{String(index + 1).padStart(2, '0')}</span><div className="client-details"><div className="client-type">{client.coupleMode ? <Users size={14} /> : <UserRound size={14} />}<span>{client.imported ? 'Imported plan' : 'Sample household'}</span></div><h3>{client.name}</h3><p>{[client.city, client.state].filter(Boolean).join(', ') || 'Client plan'}</p>{client.coupleMode && <label className="couple-choice"><input type="checkbox" checked={couples[client.id] ?? true} onChange={event => setCouples({ ...couples, [client.id]: event.target.checked })} />Include both perspectives</label>}</div><button className="open-client" onClick={() => onSelectCase(client.id, client.coupleMode && (couples[client.id] ?? true))} aria-label={`Open ${client.name}`}><ArrowUpRight size={23} /></button></article>)}</div>
      {!cases.length && <p>{publicDemo ? 'No sample plans are available.' : 'No client plans yet. Import a JSON file to begin.'}</p>}<p className="cover-note">Your answers come before the scores. Take your time - the plan will wait.</p>
    </div>
  </section>;
}
