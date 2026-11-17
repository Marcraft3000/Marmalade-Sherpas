import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';

// Ensure NO Supabase credentials are set
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
process.env.ADVISOR_PORTAL = 'true';

const { configureAdvisorPortal, portalErrorHandler } = await import('./advisorPortal.mjs');

test('advisor portal works completely in local dev mode without Supabase', async () => {
  const app = express();
  app.use(express.json());
  configureAdvisorPortal(app);
  app.use(portalErrorHandler);

  const server = app.listen(0);
  await once(server, 'listening');
  const root = 'http://127.0.0.1:' + server.address().port;

  let cookie = '';
  const advisor = async (path, options = {}) => {
    const res = await fetch(root + '/api/advisor' + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...options.headers,
      },
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return res;
  };

  // 1. Sign in
  const loginRes = await advisor('/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'advisor@sherpaswealth.com', password: 'demo-password' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.email, 'advisor@sherpaswealth.com');
  assert.ok(cookie.startsWith('plan_audit_advisor='));

  // 2. Get workspace
  const wsRes = await advisor('/workspace');
  assert.equal(wsRes.status, 200);
  const wsData = await wsRes.json();
  assert.equal(wsData.email, 'advisor@sherpaswealth.com');
  assert.ok(Array.isArray(wsData.plans));
  assert.ok(wsData.plans.length > 0);
  assert.ok(Array.isArray(wsData.invitations));

  // 3. Create invitation
  const samplePlanId = wsData.plans[0].id;
  const inviteRes = await advisor('/invitations', {
    method: 'POST',
    body: JSON.stringify({ caseId: samplePlanId, coupleMode: true }),
  });
  assert.equal(inviteRes.status, 201);
  const inviteData = await inviteRes.json();
  assert.ok(inviteData.invitation);
  assert.ok(inviteData.path.startsWith('/audit/'));
  const token = inviteData.path.replace('/audit/', '');

  // 4. Client opens invitation
  const clientRes = await fetch(root + '/api/invitations/open', {
    headers: { 'X-Audit-Invite': token },
  });
  assert.equal(clientRes.status, 200);
  const clientData = await clientRes.json();
  assert.ok(clientData.session);
  assert.equal(clientData.session.caseId, samplePlanId);

  // 5. Advisor checks invitation details
  const detailRes = await advisor(`/invitations/${inviteData.invitation.id}`);
  assert.equal(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.equal(detailData.invitation.status, 'in_progress'); // opened_at was set
  assert.ok(detailData.path);
  assert.equal(detailData.invitation.step, 'opened');

  // 6. Advisor leaves a note and adds the client's email; the client sees the note on return
  const noteRes = await advisor(`/invitations/${inviteData.invitation.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ note: 'See you on Thursday.', clientEmail: 'client@example.com' }),
  });
  assert.equal(noteRes.status, 200);
  const noted = (await noteRes.json()).invitation;
  assert.equal(noted.note, 'See you on Thursday.');
  assert.equal(noted.clientEmail, 'client@example.com');
  const reopened = await (await fetch(root + '/api/invitations/open', { headers: { 'X-Audit-Invite': token } })).json();
  assert.equal(reopened.advisorNote.text, 'See you on Thursday.');

  // 7. Without an email provider, sending returns a ready-to-send mailto link
  const sendRes = await advisor(`/invitations/${inviteData.invitation.id}/send`, { method: 'POST', body: JSON.stringify({ kind: 'invite' }) });
  assert.equal(sendRes.status, 200);
  const { delivery } = await sendRes.json();
  assert.equal(delivery.sent, false);
  assert.ok(delivery.mailto.startsWith('mailto:client%40example.com?subject='));
  const early = await advisor(`/invitations/${inviteData.invitation.id}/send`, { method: 'POST', body: JSON.stringify({ kind: 'day3' }) });
  assert.equal(early.status, 400);

  // 8. Reminder endpoint requires the cron secret
  const cron = await fetch(root + '/api/cron/reminders', { method: 'POST' });
  assert.equal(cron.status, 401);

  // 8b. A couple invitation gives each partner their own link, limited to their own answers
  const couple = await (await advisor('/invitations', { method: 'POST', body: JSON.stringify({ caseId: samplePlanId, coupleMode: true }) })).json();
  assert.equal(couple.memberLinks.length, 2);
  const [first, second] = couple.memberLinks;
  const memberToken = first.path.replace('/audit/', '');
  const opened = await (await fetch(root + '/api/invitations/open', { headers: { 'X-Audit-Invite': memberToken } })).json();
  assert.equal(opened.member, first.name);
  const wrong = await fetch(root + '/api/audit/interrogate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Audit-Invite': memberToken },
    body: JSON.stringify({ sessionId: opened.session.id, answer: { category: 'perceived_health', value: 40, partner: second.name } }),
  });
  assert.equal(wrong.status, 403);

  // 9. Sign-up and demo access
  const signup = await advisor('/signup', { method: 'POST', body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', password: 'short' }) });
  assert.equal(signup.status, 400);
  const created = await advisor('/signup', { method: 'POST', body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', password: 'long-enough-password' }) });
  assert.equal(created.status, 201);
  const named = await (await advisor('/workspace')).json();
  assert.equal(named.name, 'Ana');
  const demo = await advisor('/demo', { method: 'POST' });
  assert.equal(demo.status, 200);
  const config = await (await fetch(root + '/api/portal')).json();
  assert.equal(config.demo, true);

  server.close();
});
