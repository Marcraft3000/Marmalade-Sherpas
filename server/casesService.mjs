import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { normalizePlan } from './planAdapter.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.resolve(here, '../cases');
const IMPORTS_DIR = process.env.PLAN_IMPORT_DIR || path.resolve(here, '../data/imports');
const imported = new Map();
function read(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function overview(plan) {
  return { id: plan.id, ...plan.meta, city: plan.city, state: plan.state, household: plan.household, score: plan.score, band: plan.band, imported: plan.id.startsWith('import-') };
}
export function getAllCasesOverview() {
  const ids = fs.existsSync(CASES_DIR) ? fs.readdirSync(CASES_DIR).filter(id => fs.existsSync(path.join(CASES_DIR, id, 'financial-health.json'))) : [];
  if (fs.existsSync(IMPORTS_DIR)) ids.push(...fs.readdirSync(IMPORTS_DIR).filter(file => /^import-[\w-]+\.json$/.test(file)).map(file => file.slice(0, -5)));
  ids.push(...imported.keys());
  return [...new Set(ids)].map(getCaseDetails).filter(Boolean).map(overview);
}
export function getCaseDetails(caseId) {
  if (typeof caseId !== 'string' || !/^[\w-]+$/.test(caseId)) return null;
  if (imported.has(caseId)) return imported.get(caseId);
  const saved = read(path.join(IMPORTS_DIR, `${caseId}.json`));
  if (saved) {
    try { const result = normalizePlan(saved.document, { ...saved.options, id: caseId }); imported.set(caseId, result); return result; } catch { return null; }
  }
  const document = read(path.join(CASES_DIR, caseId, 'financial-health.json'));
  if (!document) return null;
  try { return normalizePlan(document, { id: caseId }); } catch { return null; }
}
export function importPlan(document, options = {}, { persist = true } = {}) {
  const id = `import-${randomUUID()}`;
  const safeOptions = { filename: path.basename(String(options.filename || 'client-plan.json')), displayName: String(options.displayName || '').slice(0, 150), mapping: options.mapping || {} };
  const plan = normalizePlan(document, { ...safeOptions, id });
  if (persist) {
    fs.mkdirSync(IMPORTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(IMPORTS_DIR, `${id}.json`), JSON.stringify({ document, options: safeOptions }), { encoding: 'utf8', flag: 'wx' });
  }
  imported.set(id, plan);
  return overview(plan);
}
export function getCaseBriefForLLM(caseId) {
  const plan = getCaseDetails(caseId);
  if (!plan) return '';
  return JSON.stringify({ client: plan.meta.name, score: plan.score, band: plan.band, summary: plan.narrative.summary_main.slice(0, 3500), recommendations: plan.recommendations.slice(0, 5000), facts: plan.evidence.slice(0, 30).map(e => ({ id: e.id, label: e.title, figure: e.figure, source: e.source.path, raw: e.source.raw })) });
}
