import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Clipboard, Link2, LogOut, RefreshCw } from 'lucide-react';
import { advisorRequest } from '../utils/api';
import PlanImport from './PlanImport';
import './advisor.css';

const statuses = { pending: 'Pending', in_progress: 'In progress', answered: 'Survey complete' };
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const seenStorageKey = 'plan-audit-surveys-seen';

function InviteLink({ value, expiresAt, copied, onCopy }) {
  if (!value) return <p className="advisor-empty">This invitation has expired. Create a new invitation to send another link.</p>;
  return <div className="advisor-link">
    <label className="field-label">Invitation link<input className="editorial-input" value={value} readOnly onFocus={event => event.target.select()} /></label>
    <button className="quiet-action" onClick={() => onCopy(value)}><Clipboard size={16} /> Copy link</button>
    <p role="status">{copied ? 'Link copied.' : `Expires ${dateFormat.format(new Date(expiresAt))}.`}</p>
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

export default function AdvisorPortal() {
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
  const [password, setPassword] = useState('');
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

  async function openDetail(id) {
    const next = await advisorRequest(`/invitations/${id}`);
    setDetail(next);
    setWorkspace(previous => previous && ({ ...previous, invitations: previous.invitations.map(item => item.id === id ? next.invitation : item) }));
    if (next.invitation.completedAt) setSeen(previous => ({ ...previous, [id]: next.invitation.completedAt }));
  }

  async function run(action) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function signIn(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email');
    run(async () => {
      try {
        await advisorRequest('/login', { method: 'POST', body: { email, password } });
        await loadWorkspace();
      } finally {
        setPassword('');
      }
    });
  }

  function createInvitation(event) {
    event.preventDefault();
    run(async () => {
      const { invitation, path } = await advisorRequest('/invitations', {
        method: 'POST',
        body: { caseId: planId, coupleMode: Boolean(plan?.coupleMode && coupleMode) },
      });
      setLink({ value: new URL(path, window.location.origin).href, expiresAt: invitation.expiresAt });
      setCopiedLink('');
      setWorkspace(previous => ({ ...previous, invitations: [invitation, ...previous.invitations] }));
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>The Plan Audit</div>
        {workspace && <div className="advisor-account">
          <span>{workspace.email}</span>
          <a href="#advisor-invitations" className="quiet-action advisor-bell" aria-label={`${unreadCount} new completed surveys`}>
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
        {error && <p className="inline-error" role="alert">{error}</p>}
        {!workspace ? (
          <form className="advisor-panel" onSubmit={signIn}>
            <h2>Sign in</h2>
            <label className="field-label">Email<input className="editorial-input" name="email" type="email" autoComplete="username" required /></label>
            <label className="field-label">Password<input className="editorial-input" name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
            <button className="primary-action" disabled={busy}>Sign in <ArrowRight size={17} /></button>
          </form>
        ) : (
          <div className="advisor-grid">
            <section className="advisor-panel">
              <h2>Invite a client</h2>
              <form onSubmit={createInvitation}>
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
                <button className="primary-action" disabled={!planId || busy}>Create invitation <Link2 size={17} /></button>
              </form>
              <PlanImport privateAdvisor onImported={item => {
                setWorkspace(previous => ({ ...previous, plans: [item, ...previous.plans] }));
                setPlanId(item.id);
                setLink(null);
                setCoupleMode(true);
              }} />
              {link && <InviteLink {...link} copied={copiedLink === link.value} onCopy={copyLink} />}
            </section>
            <section className="advisor-panel" id="advisor-invitations">
              <div className="advisor-section-head">
                <h2>Invitations</h2>
                <button className="quiet-action" disabled={busy} onClick={() => run(async () => {
                  await loadWorkspace();
                  if (detail) await openDetail(detail.invitation.id);
                })}><RefreshCw size={16} /> Refresh</button>
              </div>
              {!workspace.invitations.length && <p className="advisor-empty">Create an invitation to start collecting responses.</p>}
              <ul className="advisor-invitations">
                {workspace.invitations.map(item => <li key={item.id}>
                  <button disabled={busy} className="advisor-invitation" aria-expanded={detail?.invitation.id === item.id} onClick={() => run(async () => {
                    if (detail?.invitation.id === item.id) setDetail(null);
                    else await openDetail(item.id);
                  })}>
                    <span><strong>{item.planName}</strong><small>{dateFormat.format(new Date(item.createdAt))}</small></span>
                    <span className="advisor-status" data-status={item.status}>{isUnread(item) && <><span className="advisor-unread" aria-hidden="true" /><span className="sr-only">New. </span></>}{statuses[item.status]}</span>
                  </button>
                  {detail?.invitation.id === item.id && <div className="advisor-answers">
                    <InviteLink value={detail.path ? new URL(detail.path, window.location.origin).href : null} expiresAt={detail.invitation.expiresAt} copied={copiedLink === (detail.path && new URL(detail.path, window.location.origin).href)} onCopy={copyLink} />
                    {detail.briefing && <MeetingBrief briefing={detail.briefing} />}
                    {!detail.answers.length ? <p>No responses yet.</p> : <dl>
                      {detail.answers.map(answer => <div key={`${answer.category}-${answer.partner || ''}`}>
                        <dt>{answer.question || answer.category.replaceAll('_', ' ')}{answer.partner && ` · ${answer.partner}`}</dt>
                        <dd>{answer.value}{answer.category === 'perceived_health' && ' / 100'}</dd>
                      </div>)}
                    </dl>}
                  </div>}
                </li>)}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
