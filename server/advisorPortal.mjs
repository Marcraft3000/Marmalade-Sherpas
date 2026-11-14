import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import { AuditEngine } from './auditEngine.mjs';
import { getAllCasesOverview, getCaseDetails, preparePlanImport, sampleReportPath } from './casesService.mjs';
import { analyzePlan } from './planInference.mjs';

const enabled = process.env.ADVISOR_PORTAL === 'true';
const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const cookieName = 'plan_audit_advisor';
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.PUBLIC_DEMO === 'true' || process.env.NODE_ENV === 'production', path: '/api/advisor' };
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

if (enabled && (!url || !publishableKey || !secretKey)) {
  throw new Error('ADVISOR_PORTAL requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.');
}

class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function supabase(endpoint, { method = 'GET', body, accessToken } = {}) {
  const isAuth = endpoint.startsWith('/auth/');
  const key = isAuth ? publishableKey : secretKey;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (accessToken || key.startsWith('eyJ')) headers.Authorization = `Bearer ${accessToken || key}`;
  if (!isAuth) headers.Prefer = 'return=representation';

  let response;
  try {
    response = await fetch(url + endpoint, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new PortalError(503, 'The advisor service is temporarily unavailable. Try again.');
  }
  if (isAuth && [400, 401, 403, 422].includes(response.status)) {
    throw new PortalError(401, 'Sign in with your advisor account.');
  }
  if (response.status === 429) throw new PortalError(429, 'Too many requests. Try again in a moment.');
  if (!response.ok) {
    console.error('Supabase request failed:', method, endpoint.split('?')[0], response.status);
    throw new PortalError(503, 'The advisor service is temporarily unavailable. Try again.');
  }
  return response.status === 204 ? null : response.json();
}

function table(name, filters = {}, options) {
  return supabase(`/rest/v1/${name}?${new URLSearchParams(filters)}`, options);
}

async function requireAdvisorAccess(id) {
  if (!uuidPattern.test(id || '')) throw new PortalError(401, 'Sign in with your advisor account.');
  const [advisor] = await table('audit_advisors', { user_id: `eq.${id}`, select: 'user_id' });
  if (!advisor) throw new PortalError(403, 'This account has no advisor access.');
}

const signedIn = route(async (req, res, next) => {
  const token = req.get('cookie')?.split('; ').find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) throw new PortalError(401, 'Sign in with your advisor account.');
  const user = await supabase('/auth/v1/user', { accessToken: token });
  await requireAdvisorAccess(user.id);
  req.advisor = user;
  next();
});

function advisorView(row) {
  const session = row.session;
  return {
    id: row.id,
    planName: session.caseName,
    createdAt: row.created_at,
    status: session.summary ? 'answered' : row.opened_at ? 'in_progress' : 'pending',
    answerCount: session.answers.length,
  };
}

async function findInvitation(token) {
  if (!tokenPattern.test(token || '')) throw new PortalError(404, 'This invitation could not be opened.');
  const [invitation] = await table('audit_invitations', {
    token_hash: `eq.${createHash('sha256').update(token).digest('hex')}`,
    expires_at: `gt.${new Date().toISOString()}`,
  });
  if (!invitation) throw new PortalError(404, 'This invitation could not be opened.');
  return invitation;
}

async function resolveAdvisorPlan(caseId, advisorId) {
  if (typeof caseId !== 'string') return null;
  if (!caseId.startsWith('import-')) return getCaseDetails(caseId);
  const [plan] = await table('audit_plans', { id: `eq.${caseId}`, advisor_id: `eq.${advisorId}`, select: 'plan' });
  return plan?.plan ?? null;
}

function advisorPlanInput(operation) {
  try { return operation(); }
  catch (error) { throw new PortalError(400, error.message); }
}

export function configureAdvisorPortal(app) {
  app.get('/api/portal', (req, res) => res.json({ advisorPortal: enabled }));
  if (!enabled) return;

  const advisor = express.Router();
  const client = express.Router();
  // Credentials and session payloads must not be cached or sent as referrers.
  app.use((req, res, next) => {
    res.set('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api/') || req.path.startsWith('/audit/')) res.set('Cache-Control', 'no-store');
    next();
  });
  advisor.post('/login', route(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 320 || password.length > 1024) {
      throw new PortalError(400, 'Enter your advisor email and password.');
    }
    const auth = await supabase('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email.trim(), password } });
    await requireAdvisorAccess(auth.user.id);
    res.cookie(cookieName, auth.access_token, { ...cookieOptions, maxAge: auth.expires_in * 1000 });
    res.json({ email: auth.user.email });
  }));
  advisor.post('/logout', (req, res) => {
    res.clearCookie(cookieName, cookieOptions);
    res.sendStatus(204);
  });
  advisor.use(signedIn);
  advisor.post('/plans/inspect', route(async (req, res) => {
    let inspection;
    try { inspection = await analyzePlan(req.body?.document, { privateAdvisor: true }); }
    catch (error) { throw new PortalError(400, error.message); }
    res.json({ inspection });
  }));
  advisor.post('/plans/import', route(async (req, res) => {
    const { plan } = advisorPlanInput(() => preparePlanImport(req.body?.document, req.body?.options));
    const record = { id: plan.id, advisor_id: req.advisor.id, name: plan.meta.name, couple_mode: plan.meta.coupleMode, plan };
    await table('audit_plans', {}, { method: 'POST', body: record });
    res.status(201).json({ case: { id: plan.id, name: plan.meta.name, coupleMode: plan.meta.coupleMode, imported: true } });
  }));
  advisor.get('/workspace', route(async (req, res) => {
    const scope = { advisor_id: `eq.${req.advisor.id}`, order: 'created_at.desc' };
    const [rows, imported] = await Promise.all([
      table('audit_invitations', { ...scope, select: 'id,created_at,opened_at,session' }),
      table('audit_plans', { ...scope, select: 'id,name,couple_mode' }),
    ]);
    const plans = [
      ...imported.map(({ id, name, couple_mode }) => ({ id, name, coupleMode: couple_mode, imported: true })),
      ...getAllCasesOverview().filter(plan => !plan.imported).map(({ id, name, coupleMode }) => ({ id, name, coupleMode })),
    ];
    res.json({ email: req.advisor.email, plans, invitations: rows.map(advisorView) });
  }));
  advisor.post('/invitations', route(async (req, res) => {
    const { caseId, coupleMode } = req.body || {};
    const plan = await resolveAdvisorPlan(caseId, req.advisor.id);
    if (!plan) throw new PortalError(400, 'Choose a plan in your workspace.');
    const session = new AuditEngine(() => plan).createSession(caseId, coupleMode === true);
    const token = randomBytes(32).toString('base64url');
    const [row] = await table('audit_invitations', {}, {
      method: 'POST',
      body: {
        advisor_id: req.advisor.id,
        token_hash: createHash('sha256').update(token).digest('hex'),
        session,
      },
    });
    res.status(201).json({ invitation: advisorView(row), path: `/audit/${token}` });
  }));
  advisor.get('/invitations/:id', route(async (req, res) => {
    if (!uuidPattern.test(req.params.id)) throw new PortalError(404, 'Invitation not found.');
    const [row] = await table('audit_invitations', { id: `eq.${req.params.id}`, advisor_id: `eq.${req.advisor.id}`, select: 'id,created_at,opened_at,session' });
    if (!row) throw new PortalError(404, 'Invitation not found.');
    const engine = new AuditEngine();
    engine.sessions.set(row.session.id, row.session);
    const briefing = row.session.reveal?.version === 2 ? engine.getAdvisorBriefing(row.session.id) : null;
    res.json({ invitation: advisorView(row), answers: row.session.answers, briefing });
  }));
  app.use('/api/advisor', advisor);

  client.get('/open', route(async (req, res) => {
    const row = await findInvitation(req.get('X-Audit-Invite'));
    if (!row.opened_at) {
      await table('audit_invitations', { id: `eq.${row.id}`, opened_at: 'is.null' }, { method: 'PATCH', body: { opened_at: new Date().toISOString() } });
    }
    const session = row.session.caseId.startsWith('import-') ? row.session : new AuditEngine().restoreSession(row.session);
    res.json({ session });
  }));
  app.use('/api/invitations', client);

  app.get('/audit/:token/report', route(async (req, res) => {
    const row = await findInvitation(req.params.token);
    const report = sampleReportPath(row.session.caseId);
    if (!report) throw new PortalError(404, 'This plan has no report attached.');
    res.sendFile(report);
  }));

  app.use('/api/audit', route(async (req, res, next) => {
    if (['/session/new', '/briefing'].includes(req.path.replace(/\/$/, '').toLowerCase())) {
      throw new PortalError(404, 'This action is only available in the advisor workspace.');
    }
    const row = await findInvitation(req.get('X-Audit-Invite'));
    const sessionId = req.method === 'GET' ? req.path.split('/')[2] : req.body?.sessionId;
    if (sessionId !== row.session.id) throw new PortalError(404, 'This audit session could not be opened.');

    const plan = await resolveAdvisorPlan(row.session.caseId, row.advisor_id);
    if (!plan) throw new PortalError(404, 'The plan for this invitation is unavailable.');
    req.auditEngine = new AuditEngine(() => plan, { liveQuestions: process.env.ADVISOR_QUESTIONS_AI === 'true' });
    req.auditEngine.restoreSession(row.session);
    req.saveAuditSession = async session => {
      const [updated] = await table('audit_invitations', { id: `eq.${row.id}`, revision: `eq.${row.revision}` }, {
        method: 'PATCH',
        body: { session, revision: row.revision + 1 },
      });
      if (!updated) throw new PortalError(409, 'The session changed in another tab. Try again.');
    };
    next();
  }));
}

export function portalErrorHandler(error, req, res, next) {
  if (!(error instanceof PortalError)) return next(error);
  res.status(error.status).json({ success: false, error: error.message });
}

export { enabled as advisorPortalEnabled };
