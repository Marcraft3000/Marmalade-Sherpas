/**
 * Client API connector for THE PLAN AUDIT backend
 */

export const invitationPath = window.location.pathname.startsWith('/audit/');
const inviteToken = /^\/audit\/([A-Za-z0-9_-]{43})\/?$/.exec(window.location.pathname)?.[1];

function auditFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  if (inviteToken) headers.set('X-Audit-Invite', inviteToken);
  return fetch(url, { ...options, headers });
}

export async function openInvitation() {
  if (!inviteToken) throw new Error('Invalid invitation');
  const res = await auditFetch('/api/invitations/open');
  if (!res.ok) throw new Error('Invitation unavailable');
  return (await res.json()).session;
}

export async function advisorRequest(path, options = {}) {
  const res = await fetch('/api/advisor' + path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return;
  const payload = await res.json();
  if (res.ok) return payload;
  const error = new Error(payload.error || 'Try again in a moment.');
  error.status = res.status;
  throw error;
}

export async function fetchCases() {
  const res = await fetch('/api/cases');
  if (!res.ok) throw new Error('Failed to fetch cases');
  const data = await res.json();
  return data.cases;
}

export async function fetchCaseDetails(caseId) {
  const res = await fetch(`/api/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case details for ${caseId}`);
  const data = await res.json();
  return data.case;
}

export async function createSession(caseId, coupleMode = false) {
  const res = await auditFetch('/api/audit/session/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, coupleMode }),
  });
  if (!res.ok) throw new Error('Failed to create audit session');
  const data = await res.json();
  return data.session;
}

export async function fetchSession(sessionId) {
  const res = await auditFetch(`/api/audit/session/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  const data = await res.json();
  return data.session;
}

export async function submitInterrogationAnswer(sessionId, answer) {
  const res = await auditFetch('/api/audit/interrogate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answer }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}

export async function fetchSummary(sessionId, answer) {
  const res = await auditFetch('/api/audit/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answer }),
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  const data = await res.json();
  return data.summary;
}

export async function fetchReveal(sessionId) {
  const res = await auditFetch('/api/audit/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate reveal');
  const data = await res.json();
  return data.reveal;
}

export async function chooseRoute(sessionId, discoveryId) {
  const res = await auditFetch('/api/audit/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, discoveryId }) });
  if (!res.ok) throw new Error('Failed to choose route');
  return (await res.json()).reveal;
}

export async function exploreDiscovery(sessionId, discoveryId, question) {
  const res = await auditFetch('/api/audit/discovery/explore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, discoveryId, question }) });
  if (!res.ok) throw new Error('Failed to explore finding');
  return (await res.json()).exploration;
}

export async function submitUnderstandingCheck(sessionId, discoveryId, choice, userComment = '') {
  const res = await auditFetch('/api/audit/discovery/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, discoveryId, choice, userComment }),
  });
  if (!res.ok) throw new Error('Failed to submit check');
  return res.json();
}

export async function fetchVerdict(sessionId) {
  const res = await auditFetch('/api/audit/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to fetch verdict');
  const data = await res.json();
  return data.verdict;
}

export async function fetchMission(sessionId) {
  const res = await auditFetch('/api/audit/mission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate mission');
  const data = await res.json();
  return data.mission;
}

export async function submitMissionAcceptance(sessionId, decision, reason = '') {
  const res = await auditFetch('/api/audit/mission/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, decision, reason }),
  });
  if (!res.ok) throw new Error('Failed to submit mission decision');
  return res.json();
}

export async function submitFollowUp(sessionId, day, status, details = '') {
  const res = await auditFetch('/api/audit/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, day, status, details }),
  });
  if (!res.ok) throw new Error('Failed to submit follow-up');
  const data = await res.json();
  return data.followUp;
}

export async function fetchAdvisorBriefing(sessionId) {
  const res = await auditFetch('/api/audit/briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate advisor briefing');
  const data = await res.json();
  return data.briefing;
}

export async function fetchUsageStats() {
  const res = await fetch('/api/monitor/usage');
  if (!res.ok) throw new Error('Failed to fetch usage stats');
  return res.json();
}

export async function toggleMockMode(enabled) {
  const res = await fetch('/api/monitor/mock-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return res.json();
}
