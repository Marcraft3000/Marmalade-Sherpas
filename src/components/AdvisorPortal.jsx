import React, { useEffect, useState } from 'react';
import { ArrowRight, Clipboard, Link2, LogOut, RefreshCw } from 'lucide-react';
import { advisorRequest } from '../utils/api';
import './advisor.css';

const statuses = { pending: 'Pending', in_progress: 'In progress', answered: 'Answered' };
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdvisorPortal() {
  const [workspace, setWorkspace] = useState(null);
  const [planId, setPlanId] = useState('');
  const [coupleMode, setCoupleMode] = useState(true);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const plan = workspace?.plans.find(item => item.id === planId);

  function handleError(err) {
    if (err.status === 401 || err.status === 403) {
      setWorkspace(null);
      setLink('');
      setDetail(null);
    }
    setError(err.message);
  }

  async function loadWorkspace() {
    const result = await advisorRequest('/workspace');
    setWorkspace(result);
    setPlanId(previous => result.plans.some(item => item.id === previous) ? previous : result.plans[0]?.id || '');
  }

  useEffect(() => {
    loadWorkspace().catch(err => {
      if (err.status !== 401) handleError(err);
    }).finally(() => setBusy(false));
  }, []);

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
      setLink(new URL(path, window.location.origin).href);
      setCopied(false);
      setWorkspace(previous => ({ ...previous, invitations: [invitation, ...previous.invitations] }));
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
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
          <button className="quiet-action" disabled={busy} onClick={() => run(async () => {
            await advisorRequest('/logout', { method: 'POST' });
            setWorkspace(null);
            setLink('');
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
                <label className="field-label">Sample plan
                  <select className="editorial-input" value={planId} onChange={event => {
                    setPlanId(event.target.value);
                    setCoupleMode(true);
                    setLink('');
                  }}>
                    {workspace.plans.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                {plan?.coupleMode && <label className="advisor-checkbox"><input type="checkbox" checked={coupleMode} onChange={event => setCoupleMode(event.target.checked)} /> Include both perspectives</label>}
                <button className="primary-action" disabled={!planId || busy}>Create invitation <Link2 size={17} /></button>
              </form>
              {link && <div className="advisor-link">
                <label className="field-label">Invitation link<input className="editorial-input" value={link} readOnly onFocus={event => event.target.select()} /></label>
                <button className="quiet-action" onClick={copyLink}><Clipboard size={16} /> Copy link</button>
                <p role="status">{copied ? 'Link copied.' : 'Copy the link to send it to your client. It expires in 30 days.'}</p>
              </div>}
            </section>
            <section className="advisor-panel">
              <div className="advisor-section-head">
                <h2>Invitations</h2>
                <button className="quiet-action" disabled={busy} onClick={() => run(async () => {
                  await loadWorkspace();
                  if (detail) setDetail(await advisorRequest(`/invitations/${detail.invitation.id}`));
                })}><RefreshCw size={16} /> Refresh</button>
              </div>
              {!workspace.invitations.length && <p className="advisor-empty">Create an invitation to start collecting responses.</p>}
              <ul className="advisor-invitations">
                {workspace.invitations.map(item => <li key={item.id}>
                  <button disabled={busy} className="advisor-invitation" aria-expanded={detail?.invitation.id === item.id} onClick={() => run(async () => {
                    setDetail(detail?.invitation.id === item.id ? null : await advisorRequest(`/invitations/${item.id}`));
                  })}>
                    <span><strong>{item.planName}</strong><small>{dateFormat.format(new Date(item.createdAt))}</small></span>
                    <span className="advisor-status" data-status={item.status}>{statuses[item.status]}</span>
                  </button>
                  {detail?.invitation.id === item.id && <div className="advisor-answers">
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
