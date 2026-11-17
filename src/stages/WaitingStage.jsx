import React from 'react';
import { Pencil } from 'lucide-react';
import Narration from '../components/Narration';
import { narration } from '../utils/narration';

// Shown to one partner after they finish, until the other partner has shared their own view.
export default function WaitingStage({ member, waitingFor, onEditAnswers }) {
  const others = waitingFor.filter(person => person !== member);
  const name = others.join(' and ') || 'your partner';
  const text = narration(
    member ? `Thank you, ${member}. Your perspective is saved` : 'Your perspective is saved',
    `We will open the plan as soon as ${name} has shared theirs, so you can see both views side by side`,
    'You can leave this page open, or come back with your link later',
  );
  return <section className="recap-stage story-shell waiting-stage">
    <p className="eyebrow">Two perspectives, one plan</p>
    <h1>Your view is in.<br /><em>Now, {name}’s.</em></h1>
    <Narration label="Listen" text={text} />
    <p className="mission-intro">We’ll open the plan as soon as {name} has answered from their own link, so you can compare how each of you sees things before the numbers. This page updates on its own.</p>
    <div className="waiting-pulse" role="status" aria-live="polite"><span aria-hidden="true" /> Waiting for {name}…</div>
    <div className="recap-bottom"><p>Changed your mind about something?</p><button className="quiet-action" onClick={onEditAnswers}><Pencil size={15} /> Review my answers</button></div>
  </section>;
}
