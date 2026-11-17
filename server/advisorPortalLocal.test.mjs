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

  server.close();
});
