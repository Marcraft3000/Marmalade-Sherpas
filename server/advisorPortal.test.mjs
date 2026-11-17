import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';

Object.assign(process.env, {
  ADVISOR_PORTAL: 'true', SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable', SUPABASE_SECRET_KEY: 'test-secret',
  MOCK_AI: 'false', TEAM_KEY: 'test-team-key', LLM_PROXY_URL: 'https://speech.example.test',
  ADVISOR_TTS: 'true', TTS_VOICE_ID: 'test-voice', TTS_MODEL: 'test-model',
});
const { configureAdvisorPortal, portalErrorHandler } = await import('./advisorPortal.mjs');
const { sendNarration } = await import('./speech.mjs');

test('an advisor can recover active links, and authorized narration returns provider audio', async () => {
  const advisorId = randomUUID();
  const otherId = randomUUID();
  const rows = [];
  const realFetch = globalThis.fetch;
  const audio = Buffer.from('ID3-mock-audio');
  let speechCalls = 0;
  const json = value => Response.json(value);
  globalThis.fetch = async (input, options) => {
    const target = new URL(input);
    if (target.hostname === 'speech.example.test') {
      assert.equal(target.pathname, '/v1/audio/speech');
      const payload = JSON.parse(options.body);
      assert.equal(payload.voice, 'test-voice');
      assert.match(payload.input, /out of 100/);
      speechCalls++;
      return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg' } });
    }
    assert.equal(target.hostname, 'supabase.example.test');
    if (target.pathname === '/auth/v1/user') return json({ id: options.headers.Authorization.endsWith('other') ? otherId : advisorId, email: 'advisor@example.test' });
    if (target.pathname === '/rest/v1/audit_advisors') return json([{ user_id: advisorId }]);
    if (target.pathname === '/rest/v1/audit_plans') return json([]);
    assert.equal(target.pathname, '/rest/v1/audit_invitations');
    if (options.method === 'POST') {
      const row = { ...JSON.parse(options.body), created_at: '2026-11-17T10:00:00Z', expires_at: '2099-12-31T00:00:00Z', revision: 0 };
      rows.push(row);
      return json([row]);
    }
    const matches = rows.filter(row => ['id', 'advisor_id', 'token_hash'].every(key =>
      !target.searchParams.has(key) || target.searchParams.get(key) === 'eq.' + row[key])
      && (!target.searchParams.has('expires_at') || Date.parse(row.expires_at) > Date.now()));
    if (options.method === 'PATCH') for (const row of matches) Object.assign(row, JSON.parse(options.body));
    return json(matches);
  };
  const app = express();
  app.use(express.json());
  configureAdvisorPortal(app);
  app.post('/api/audit/speech', (req, res, next) => sendNarration(req, res).catch(next));
  app.use(portalErrorHandler);
  const server = app.listen(0);
  await once(server, 'listening');
  const root = 'http://127.0.0.1:' + server.address().port;
  const advisor = (path, options = {}) => realFetch(root + '/api/advisor' + path, { ...options, headers: { 'Content-Type': 'application/json', cookie: 'plan_audit_advisor=' + (options.other ? 'other' : 'advisor') } });
  const inviteRequest = (path, link, body) => realFetch(root + path, {
    method: body ? 'POST' : 'GET', body: body && JSON.stringify(body),
    headers: { 'X-Audit-Invite': link.slice('/audit/'.length), 'Content-Type': 'application/json' },
  });
  try {
    const created = await advisor('/invitations', { method: 'POST', body: JSON.stringify({ caseId: 'samantha-lewis' }) });
    assert.equal(created.status, 201);
    const { invitation, path } = await created.json();
    const detailPath = '/invitations/' + invitation.id;
    assert.equal((await (await advisor(detailPath)).json()).path, path);
    assert.equal((await advisor(detailPath, { other: true })).status, 404);
    assert.equal((await inviteRequest('/api/invitations/open', path)).status, 200);
    assert.equal((await advisor('/workspace').then(response => response.json())).invitations[0].completedAt, null);
    const row = rows[0];
    row.session.summary = { submittedAt: '2026-11-17T10:30:00Z' };
    assert.equal((await advisor('/workspace').then(response => response.json())).invitations[0].completedAt, row.session.summary.submittedAt);
    row.session.reveal = { version: 2, discoveries: [], expectedScore: 70, actualScore: 82, auditorReaction: 'Read the projection.' };
    const body = { sessionId: row.session.id };
    const result = await inviteRequest('/api/audit/speech', path, body);
    assert.equal(result.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(Buffer.from(await result.arrayBuffer()), audio);
    assert.equal((await inviteRequest('/api/audit/speech', path, body)).status, 200);
    assert.equal(speechCalls, 1);
    // A hash-only invitation remains usable and gets a recoverable link to the same session.
    const legacyToken = randomBytes(32).toString('base64url');
    row.token_hash = createHash('sha256').update(legacyToken).digest('hex');
    assert.equal((await inviteRequest('/api/invitations/open', '/audit/' + legacyToken)).status, 200);
    assert.equal((await (await advisor(detailPath)).json()).path, path);
    row.expires_at = '2025-01-01T00:00:00Z';
    assert.equal((await (await advisor(detailPath)).json()).path, null);
    assert.equal((await inviteRequest('/api/invitations/open', path)).status, 404);
  } finally {
    globalThis.fetch = realFetch;
    server.close();
  }
});
