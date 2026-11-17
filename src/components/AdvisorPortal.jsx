import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Bot, CalendarClock, Clipboard, Link2, LogOut, Mail, MessageSquare, RefreshCw, Sparkles, UserPlus, Users } from 'lucide-react';
import { advisorRequest } from '../utils/api';
import PlanImport from './PlanImport';
import './advisor.css';

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = value => value ? dateFormat.format(new Date(value)) : '';
const seenStorageKey = 'plan-audit-surveys-seen';
const journey = [
  ['invited', 'Invited'],
  ['opened', 'Opened'],
  ['survey', 'Perspective'],
  ['reveal', 'Plan reveal'],
  ['next_step', 'Next step'],
  ['day3', 'Day 3'],
  ['day30', 'Day 30'],
];
const missionStatus = { accepted: 'Committed', considering: 'Thinking it over', rejected: 'Barrier raised', not_accepted: 'Not chosen yet', completed: 'Completed', in_progress: 'In progress', not_started: 'Not started', blocked: 'Blocked' };
const messages = { invite: 'Invitation', day3: 'Day 3 reminder', day30: 'Day 30 reminder' };

function JourneyTrack({ step }) {
  const reached = journey.findIndex(([id]) => id === step);
  return <ol className="journey-track" aria-label={`Journey: ${journey[reached]?.[1]}`}>
    {journey.map(([id, label], index) => <li key={id} className={index <= reached ? 'is-reached' : ''} aria-current={index === reached ? 'step' : undefined}><span>{label}</span></li>)}
  </ol>;
}

function InviteLink({ value, expiresAt, copied, onCopy }) {
  if (!value) return <p className="advisor-empty">This invitation has expired. Create a new invitation to send another link.</p>;
  return <div className="advisor-link">
    <label className="field-label">Invitation link<input className="editorial-input" value={value} readOnly onFocus={event => event.target.select()} /></label>
    <button className="quiet-action" onClick={() => onCopy(value)}><Clipboard size={16} /> Copy link</button>
    <p role="status">{copied ? 'Link copied.' : `Expires ${shortDate(expiresAt)}.`}</p>
  </div>;
}

function MeetingBrief({ briefing }) {
  const score = value => value == null ? 'Unavailable' : `${value} / 100`;
  const partners = Object.entries(briefing.partnerScores || {});
  return <section className="meeting-brief" aria-label="Prepare the next meeting">
    <h3>Prepare the next meeting</h3>
    <dl className="meeting-scores">
      {partners.length > 1
        ? partners.map(([partner, value]) => <div key={partner}><dt>{partner} estimated</dt><dd>{score(value)}</dd></div>)
        : <div><dt>Client estimated</dt><dd>{score(briefing.expectedScore)}</dd></div>}
      <div><dt>Plan score</dt><dd>{score(briefing.verifiedScore)}</dd></div>
    </dl>
    {briefing.surprisedBy.length > 0 && <section>
      <h4>What surprised the client</h4>
      <ul>{briefing.surprisedBy.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>}
    {briefing.discussionFindings.length > 0 && <section>
      <h4>Findings the client wants to discuss</h4>
      <ul>{briefing.discussionFindings.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>}
    {briefing.exploredQuestions.length > 0 && <section>
      <h4>Client questions</h4>
      <ul>{briefing.exploredQuestions.map(({ question, finding }, i) => <li key={i}>
        {question}{finding && <small>{finding}</small>}
      </li>)}</ul>
    </section>}
    <section>
      <h4>Next step</h4>
      {briefing.mission?.accepted
        ? <><p><strong>{briefing.mission.title}</strong></p><p>{briefing.mission.step}</p></>
        : <p>The client has yet to commit to a step.</p>}
      {briefing.mission?.barrier && <p>{briefing.mission.barrier}</p>}
      {briefing.followUp.map(({ day, status, note }, index) => <p key={index}>Day {day} · {status.replaceAll('_', ' ')}{note ? ` · ${note}` : ''}</p>)}
    </section>
  </section>;
}

function MemberLinks({ links, copiedLink, onCopy }) {
  if (!links?.length) return null;
  return <div className="member-links">
    <p className="field-label">One link per person <small>(each answers from their own phone)</small></p>
    {links.map(({ name, path }) => {
      const value = new URL(path, window.location.origin).href;
      return <div key={name}>
        <span>{name}</span>
        <button className="quiet-action" onClick={() => onCopy(value)}><Clipboard size={15} /> {copiedLink === value ? 'Copied' : `Copy ${name}’s link`}</button>
      </div>;
    })}
  </div>;
}

function ClientDetail({ detail, item, busy, emailDelivery, copiedLink, onCopy, onSaveNote, onSend }) {
  const [note, setNote] = useState(item.note);
  const [email, setEmail] = useState(item.clientEmail);
  useEffect(() => { setNote(item.note); setEmail(item.clientEmail); }, [item.id, item.note, item.clientEmail]);
  const link = detail.path ? new URL(detail.path, window.location.origin).href : null;
  const canRemind = Boolean(item.nextStep);
  return <div className="advisor-answers">
    {detail.aiSummary && <section className="ai-summary" aria-label="Summary for the advisor">
      <span className="eyebrow"><Bot size={14} aria-hidden="true" /> {detail.aiSummary.source === 'ai' ? 'AI summary · from the client’s own answers' : 'Summary'}</span>
      <p>{detail.aiSummary.text}</p>
    </section>}
    <InviteLink value={link} expiresAt={item.expiresAt} copied={copiedLink === link} onCopy={onCopy} />
    <MemberLinks links={detail.memberLinks} copiedLink={copiedLink} onCopy={onCopy} />
    <section className="client-contact" aria-label="Messages to the client">
      <h3><Mail size={17} /> Messages</h3>
      <label className="field-label">Client email<input className="editorial-input" type="email" value={email} placeholder="client@example.com" onChange={event => setEmail(event.target.value)} onBlur={() => email !== item.clientEmail && onSaveNote({ clientEmail: email })} /></label>
      <div className="send-actions">
        {Object.entries(messages).map(([kind, label]) => <button key={kind} className="quiet-action" disabled={busy || !link || (kind !== 'invite' && !canRemind)} onClick={() => onSend(kind)}>
          {kind === 'invite' ? <Mail size={15} /> : <CalendarClock size={15} />} {item.reminders[kind] ? `Resend ${label.toLowerCase()}` : `Send ${label.toLowerCase()}`}
        </button>)}
      </div>
      <p className="advisor-hint">{Object.entries(item.reminders).map(([kind, at]) => `${messages[kind]} sent ${shortDate(at)}`).join(' · ') || (emailDelivery
        ? 'Day 3 and day 30 reminders are emailed automatically after the client commits to a next step.'
        : 'Email delivery is not configured, so messages open in your email app.')}</p>
    </section>
    <section className="client-contact" aria-label="Note for the client">
      <h3><MessageSquare size={17} /> Note for the client</h3>
      <p className="advisor-hint">The client sees this note the next time they open their link.</p>
      <textarea className="editorial-input" rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Looking forward to talking about your retirement goals on Thursday." />
      <button className="quiet-action" disabled={busy || note === item.note} onClick={() => onSaveNote({ note })}>{item.note && !note ? 'Remove note' : 'Save note'}</button>
      {item.noteAt && note === item.note && <p className="advisor-hint">Saved {shortDate(item.noteAt)}.</p>}
    </section>
    {detail.briefing && <MeetingBrief briefing={detail.briefing} />}
    {!detail.answers.length ? <p>No responses yet.</p> : <dl>
      {detail.answers.map(answer => <div key={`${answer.category}-${answer.partner || ''}`}>
        <dt>{answer.question || answer.category.replaceAll('_', ' ')}{answer.partner && ` · ${answer.partner}`}</dt>
        <dd>{answer.value}{answer.category === 'perceived_health' && ' / 100'}</dd>
      </div>)}
    </dl>}
  </div>;
}

function AccessPanel({ config, busy, onSubmit, onDemo }) {
  const [mode, setMode] = useState('signin');
  const [password, setPassword] = useState('');
  const signup = mode === 'signup';
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(signup ? 'signup' : 'login', { email: form.get('email'), password, name: form.get('name') || undefined, code: form.get('code') || undefined }).finally(() => setPassword(''));
  }
  return <div className="advisor-access">
    <form className="advisor-panel" onSubmit={submit}>
      <div className="access-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!signup} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" role="tab" aria-selected={signup} onClick={() => setMode('signup')}>Create account</button>
      </div>
      {signup && <label className="field-label">Your name<input className="editorial-input" name="name" autoComplete="name" maxLength={120} required /></label>}
      <label className="field-label">Email<input className="editorial-input" name="email" type="email" autoComplete="username" required /></label>
      <label className="field-label">Password<input className="editorial-input" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {signup && config?.signupCode && <label className="field-label">Firm code<input className="editorial-input" name="code" autoComplete="off" required /><small className="advisor-hint">Your firm shares this code with its advisors.</small></label>}
      <button className="primary-action" disabled={busy}>{signup ? <>Create advisor account <UserPlus size={17} /></> : <>Sign in <ArrowRight size={17} /></>}</button>
    </form>
    {config?.demo && <section className="advisor-panel demo-panel">
      <Sparkles size={20} aria-hidden="true" />
      <h2>Just looking?</h2>
      <p>Open a shared demo workspace with the four sample households. Invite yourself, take the audit as the client, then come back to see the briefing.</p>
      <button className="primary-action" disabled={busy} onClick={onDemo}>Explore the demo workspace <ArrowRight size={17} /></button>
    </section>}
  </div>;
}

export default function AdvisorPortal() {
  const [config, setConfig] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [planId, setPlanId] = useState('');
  const [coupleMode, setCoupleMode] = useState(true);
  const [link, setLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState('');
  const [seen, setSeen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(seenStorageKey)) || {}; } catch { return {}; }
  });
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const plan = workspace?.plans.find(item => item.id === planId);
  const isUnread = item => Boolean(item.completedAt && seen[item.id] !== item.completedAt);
  const unreadCount = workspace?.invitations.filter(isUnread).length || 0;

  function handleError(err) {
    if (err.status === 401 || err.status === 403) {
      setWorkspace(null);
      setLink(null);
      setDetail(null);
    }
    setError(err.message);
  }

  async function loadWorkspace(signal) {
    const result = await advisorRequest('/workspace', { signal });
    if (signal?.aborted) return;
    setWorkspace(result);
    setPlanId(previous => result.plans.some(item => item.id === previous) ? previous : result.plans[0]?.id || '');
  }

  useEffect(() => {
    fetch('/api/portal').then(response => response.json()).then(setConfig).catch(() => {});
    loadWorkspace().catch(err => {
      if (err.status !== 401) handleError(err);
    }).finally(() => setBusy(false));
  }, []);

  const signedIn = Boolean(workspace);
  useEffect(() => {
    if (!signedIn) return;
    const request = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      loadWorkspace(request.signal).catch(err => {
        if (err.status === 401 || err.status === 403) handleError(err);
      });
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      request.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [signedIn]);

  useEffect(() => {
    try { localStorage.setItem(seenStorageKey, JSON.stringify(seen)); } catch {}
  }, [seen]);

  function replaceInvitation(next) {
    setWorkspace(previous => previous && ({ ...previous, invitations: previous.invitations.map(item => item.id === next.id ? next : item) }));
  }

  async function openDetail(id) {
    const next = await advisorRequest(`/invitations/${id}`);
    setDetail(next);
    replaceInvitation(next.invitation);
    if (next.invitation.completedAt) setSeen(previous => ({ ...previous, [id]: next.invitation.completedAt }));
  }

  async function run(action) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function authenticate(kind, body) {
    return run(async () => {
      await advisorRequest(`/${kind}`, { method: 'POST', body });
      await loadWorkspace();
    });
  }

  function createInvitation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    run(async () => {
      const { invitation, path, memberLinks } = await advisorRequest('/invitations', {
        method: 'POST',
        body: {
          caseId: planId,
          coupleMode: Boolean(plan?.coupleMode && coupleMode),
          clientName: fields.get('clientName'),
          clientEmail: fields.get('clientEmail'),
          note: fields.get('note'),
        },
      });
      setLink({ id: invitation.id, value: new URL(path, window.location.origin).href, expiresAt: invitation.expiresAt, email: invitation.clientEmail, memberLinks });
      setCopiedLink('');
      setWorkspace(previous => ({ ...previous, invitations: [invitation, ...previous.invitations] }));
      form.reset();
    });
  }

  function send(id, kind) {
    run(async () => {
      const { delivery, invitation } = await advisorRequest(`/invitations/${id}/send`, { method: 'POST', body: { kind } });
      replaceInvitation(invitation);
      if (delivery.sent) setNotice(`${messages[kind]} emailed to ${invitation.clientEmail}.`);
      else {
        window.location.href = delivery.mailto;
        setNotice(delivery.reason === 'provider_error'
          ? 'The email service rejected the message, so it opened in your email app instead.'
          : 'Your email app opened with the message ready to send.');
      }
    });
  }

  function saveClient(id, body) {
    run(async () => {
      const { invitation } = await advisorRequest(`/invitations/${id}`, { method: 'PATCH', body });
      replaceInvitation(invitation);
      setNotice(body.note !== undefined ? 'Note saved. The client will see it next time they open the link.' : 'Client details saved.');
    });
  }

  async function copyLink(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLink(value);
    } catch {
      setError('Select the invitation link and copy it manually.');
    }
  }

  const invitations = workspace?.invitations || [];
  const counts = {
    all: invitations.length,
    waiting: invitations.filter(item => ['invited', 'opened'].includes(item.step)).length,
    committed: invitations.filter(item => item.nextStep?.acceptedAt).length,
    due: invitations.filter(item => item.dueCheckIns.length > 0).length,
  };
  const visible = invitations.filter(item => filter === 'all'
    || (filter === 'waiting' && ['invited', 'opened'].includes(item.step))
    || (filter === 'committed' && item.nextStep?.acceptedAt)
    || (filter === 'due' && item.dueCheckIns.length > 0));
  const scoreText = item => {
    const partners = Object.values(item.partnerScores || {});
    const estimate = partners.length > 1 ? partners.join(' & ') : item.expectedScore;
    if (estimate == null) return null;
    return `Felt ${estimate} · Plan ${item.planScore ?? '—'}`;
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>The Plan Audit</div>
        {workspace && <div className="advisor-account">
          <span>{workspace.name || workspace.email}</span>
          <a href="#advisor-clients" className="quiet-action advisor-bell" aria-label={`${unreadCount} new completed surveys`}>
            <Bell size={18} aria-hidden="true" />{unreadCount > 0 && <b aria-hidden="true">{unreadCount}</b>}
          </a>
          <button className="quiet-action" disabled={busy} onClick={() => run(async () => {
            await advisorRequest('/logout', { method: 'POST' });
            setWorkspace(null);
            setLink(null);
            setDetail(null);
          })}><LogOut size={16} /> Sign out</button>
        </div>}
      </header>
      <main className={workspace ? 'advisor-page' : 'advisor-page advisor-signin'}>
        <h1>Advisor workspace</h1>
        {!workspace && <p className="advisor-lede">Invite clients to see their plan from their own perspective first. Follow each family from the first answer to the day 30 check-in.</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        {notice && <p className="advisor-notice" role="status">{notice}</p>}
        {!workspace ? (
          <AccessPanel config={config} busy={busy} onSubmit={authenticate} onDemo={() => authenticate('demo')} />
        ) : (
          <>
            <dl className="advisor-metrics">
              <div><dt>Clients</dt><dd>{counts.all}</dd></div>
              <div><dt>Waiting for answers</dt><dd>{counts.waiting}</dd></div>
              <div><dt>Committed to a step</dt><dd>{counts.committed}</dd></div>
              <div><dt>Check-ins due</dt><dd>{counts.due}</dd></div>
            </dl>
            <div className="advisor-grid">
              <section className="advisor-panel">
                <h2>Invite a client</h2>
                <form onSubmit={createInvitation}>
                  <label className="field-label">Client name<input className="editorial-input" name="clientName" maxLength={120} placeholder="e.g. Emily Johnson" /></label>
                  <label className="field-label">Client email <small>(optional)</small><input className="editorial-input" name="clientEmail" type="email" placeholder="client@example.com" /></label>
                  <label className="field-label">Client plan
                    <select className="editorial-input" value={planId} onChange={event => {
                      setPlanId(event.target.value);
                      setCoupleMode(true);
                      setLink(null);
                    }}>
                      {workspace.plans.map(item => <option key={item.id} value={item.id}>{item.name}{item.imported ? '' : ' (sample)'}</option>)}
                    </select>
                  </label>
                  {plan?.coupleMode && <label className="advisor-checkbox"><input type="checkbox" checked={coupleMode} onChange={event => setCoupleMode(event.target.checked)} /> Include both perspectives</label>}
                  <label className="field-label">Personal note <small>(optional)</small><textarea className="editorial-input" name="note" rows={2} maxLength={1000} placeholder="Shown to the client when they open the link." /></label>
                  <button className="primary-action" disabled={!planId || busy}>Create invitation <Link2 size={17} /></button>
                </form>
                <PlanImport privateAdvisor onImported={item => {
                  setWorkspace(previous => ({ ...previous, plans: [item, ...previous.plans] }));
                  setPlanId(item.id);
                  setLink(null);
                  setCoupleMode(true);
                }} />
                {link && <>
                  <InviteLink value={link.value} expiresAt={link.expiresAt} copied={copiedLink === link.value} onCopy={copyLink} />
                  <MemberLinks links={link.memberLinks} copiedLink={copiedLink} onCopy={copyLink} />
                  {link.email && <button className="quiet-action" disabled={busy} onClick={() => send(link.id, 'invite')}><Mail size={16} /> Email the invitation to {link.email}</button>}
                </>}
              </section>
              <section className="advisor-panel" id="advisor-clients">
                <div className="advisor-section-head">
                  <h2><Users size={24} aria-hidden="true" /> Clients</h2>
                  <button className="quiet-action" disabled={busy} onClick={() => run(async () => {
                    await loadWorkspace();
                    if (detail) await openDetail(detail.invitation.id);
                  })}><RefreshCw size={16} /> Refresh</button>
                </div>
                <div className="client-filters" role="group" aria-label="Filter clients">
                  {[['all', 'All'], ['waiting', 'Waiting'], ['committed', 'Committed'], ['due', 'Check-in due']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <span>{counts[id]}</span></button>)}
                </div>
                {!invitations.length && <p className="advisor-empty">Create an invitation to start following a client.</p>}
                {invitations.length > 0 && !visible.length && <p className="advisor-empty">No clients match this filter.</p>}
                <ul className="advisor-invitations">
                  {visible.map(item => <li key={item.id}>
                    <button disabled={busy} className="advisor-invitation client-card" aria-expanded={detail?.invitation.id === item.id} onClick={() => run(async () => {
                      if (detail?.invitation.id === item.id) setDetail(null);
                      else await openDetail(item.id);
                    })}>
                      <span className="client-card-head">
                        <span><strong>{isUnread(item) && <><span className="advisor-unread" aria-hidden="true" /><span className="sr-only">New. </span></>}{item.clientName}</strong><small>{item.clientName !== item.planName ? `${item.planName} · ` : ''}Invited {shortDate(item.createdAt)}</small></span>
                        <span className="client-card-tags">
                          {item.dueCheckIns.length > 0 && <span className="advisor-status" data-status="due">Day {item.dueCheckIns[0]} check-in due</span>}
                          {item.note && <span className="advisor-status" data-status="note" title="Note for the client">Note</span>}
                        </span>
                      </span>
                      <JourneyTrack step={item.step} />
                      <span className="client-card-facts">
                        {scoreText(item) && <span>{scoreText(item)}</span>}
                        {item.nextStep && <span>{item.nextStep.title} · {missionStatus[item.nextStep.status] || item.nextStep.status}</span>}
                        {item.lastCheckIn && <span>Day {item.lastCheckIn.day}: {item.lastCheckIn.status.replaceAll('_', ' ')}</span>}
                      </span>
                    </button>
                    {detail?.invitation.id === item.id && <ClientDetail detail={detail} item={item} busy={busy} emailDelivery={workspace.emailDelivery} copiedLink={copiedLink} onCopy={copyLink} onSaveNote={body => saveClient(item.id, body)} onSend={kind => send(item.id, kind)} />}
                  </li>)}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
