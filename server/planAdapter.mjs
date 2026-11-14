import { createHash } from 'node:crypto';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const escapeKey = key => String(key).replace(/~/g, '~0').replace(/\//g, '~1');
export const textValue = value => typeof value === 'string' ? value.trim() : '';

// RFC 6901 pointers retain the exact location in the original document.
export function atPointer(document, pointer) {
  if (pointer === '') return document;
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) return undefined;
  return pointer.slice(1).split('/').reduce((value, key) => {
    key = key.replace(/~1/g, '/').replace(/~0/g, '~');
    return value != null && Object.hasOwn(value, key) ? value[key] : undefined;
  }, document);
}

export function walkJson(value, visit, pointer = '', depth = 0) {
  if (depth > 40) throw new Error('This JSON is nested too deeply (maximum 40 levels).');
  visit(value, pointer);
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walkJson(item, visit, `${pointer}/${escapeKey(key)}`, depth + 1);
  }
}

function scoreNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function inspectPlan(document) {
  if (!object(document) && !Array.isArray(document)) throw new Error('Upload a JSON object or array containing a client plan.');
  const fields = [];
  const roots = [];
  walkJson(document, (value, pointer) => {
    if (fields.length < 4000 && (typeof value === 'string' || typeof value === 'number' || Array.isArray(value))) {
      fields.push({ path: pointer, type: Array.isArray(value) ? 'array' : typeof value, preview: Array.isArray(value) ? `${value.length} items` : String(value).slice(0, 110) });
    }
    if (object(value) && (value.part === 'financial-health' || (object(value.score) && 'published_score' in value.score) || (value.case && value.key_metrics))) roots.push({ value, path: pointer });
  });
  if (roots.length > 1) throw new Error('This file contains multiple financial plans. Import one client plan at a time.');
  const root = roots[0];
  const mapping = {};
  if (root) {
    for (const [key, relative] of Object.entries({ name: '/case/name', score: '/score/published_score', household: '/case/household', summary: '/narrative/summary_main', recommendations: '/narrative/summary_recommendations' })) {
      if (atPointer(root.value, relative) !== undefined) mapping[key] = root.path + relative;
    }
  }
  return { recognized: Boolean(root), rootPath: root?.path ?? null, mapping, fields, fieldsTruncated: fields.length >= 4000 };
}

function displayMetric(raw) {
  const format = number => typeof number === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 }).format(number) : String(number);
  const value = raw.value ?? (raw.min !== undefined && raw.max !== undefined ? `${format(raw.min)}–${format(raw.max)}` : null);
  if (value === null) return '';
  if (raw.unit === 'USD' || raw.unit === 'USD/yr') return `$${format(value)}${raw.unit === 'USD/yr' ? ' / year' : ''}`;
  if (raw.unit === 'percent') return String(value).includes('%') ? String(value) : `${format(value)}%`;
  return `${format(value)}${raw.unit && raw.unit !== 'n/a' ? ` ${raw.unit}` : ''}`;
}

function kindFor(raw, pointer) {
  if (/savingsRunOut|retirement|projection/i.test(pointer)) return 'PROJECTION';
  if (/estimate/i.test(raw.basis || '')) return 'ESTIMATE';
  return 'PLAN DATA';
}

export function normalizePlan(document, { id, filename = 'financial-health.json', mapping = {}, displayName = '' } = {}) {
  const inspection = inspectPlan(document);
  const assigned = { ...inspection.mapping, ...mapping };
  const supported = ['name', 'score', 'household', 'summary', 'recommendations'];
  for (const [key, pointer] of Object.entries(assigned)) {
    if (!supported.includes(key) || typeof pointer !== 'string' || (pointer && atPointer(document, pointer) === undefined)) throw new Error(`Invalid field mapping: ${key}.`);
  }
  const read = key => assigned[key] ? atPointer(document, assigned[key]) : undefined;
  if (read('name') !== undefined && typeof read('name') !== 'string') throw new Error('The client name must be a text field.');
  for (const key of ['summary', 'recommendations']) {
    if (read(key) !== undefined && typeof read(key) !== 'string') throw new Error(`The ${key} must be a text field.`);
  }
  if (read('score') !== undefined && scoreNumber(read('score')) === null) throw new Error('Map a numeric financial health score between 0 and 100. Other score scales need conversion before import.');
  if (read('household') !== undefined && !Array.isArray(read('household'))) throw new Error('Household must be an array.');
  const root = inspection.rootPath !== null ? atPointer(document, inspection.rootPath) : {};
  const household = (read('household') || []).filter(object).map(person => ({ ...person, first_name: textValue(person.first_name) || textValue(person.name), role: textValue(person.role) }));
  const partners = household.filter(person => /^(client|spouse|partner|co-client|coclient)$/i.test(person.role)).map(person => person.first_name).filter(Boolean);
  const name = textValue(read('name')) || textValue(displayName) || partners.join(' & ') || 'Imported client';
  const score = scoreNumber(read('score'));
  const evidence = [];
  walkJson(document, (raw, pointer) => {
    if (!object(raw) || !textValue(raw.label)) return;
    if (raw.value === undefined && (raw.min === undefined || raw.max === undefined)) return;
    if (raw.value !== undefined && !['number', 'string'].includes(typeof raw.value)) return;
    if (raw.value === '' || raw.value === null) return;
    evidence.push({
      id: `e-${createHash('sha256').update(pointer).digest('hex').slice(0, 12)}`,
      title: raw.label, figure: displayMetric(raw), badge: kindFor(raw, pointer),
      explanation: [raw.label + '.', raw.period ? `The period covered is ${raw.period}.` : '', textValue(raw.note)].filter(Boolean).join(' '),
      whyItMatters: 'Read this in the context of your goals, alongside the rest of your plan.',
      source: { document: filename, path: pointer, raw, basis: textValue(raw.basis), period: textValue(raw.period) },
    });
  });
  for (const key of ['summary', 'recommendations']) {
    const value = textValue(read(key));
    if (value) evidence.push({ id: `e-${key}`, title: key === 'summary' ? 'The bigger picture' : 'What your plan recommends', figure: '', badge: 'PLAN TEXT', explanation: value, whyItMatters: 'This passage comes directly from your plan.', source: { document: filename, path: assigned[key], raw: value, basis: '', period: '' } });
  }
  if (score === null && !evidence.length) throw new Error('No usable plan content found. Map a summary, recommendations or a financial health score before importing.');
  const warning = evidence.find(item => /\/savingsRunOut$/.test(item.source.path) && /run(?:s)? out at age \d+/i.test(item.title) && !/\b(?:not|never)\b/i.test(item.title));
  const recommendations = textValue(read('recommendations'));
  const actions = (Array.isArray(root.score?.top_moves) ? root.score.top_moves : []).flatMap((move, index) => {
    if (!object(move) || !textValue(move.title) || !textValue(move.action)) return [];
    return [{ title: move.title, action: move.action, source: { document: filename, path: `${inspection.rootPath}/score/top_moves/${index}`, raw: move } }];
  });
  return {
    id, meta: { name, partners, coupleMode: partners.length >= 2, subtitle: '', description: '', hook: '' },
    score, scoreSource: score === null ? null : { document: filename, path: assigned.score, raw: score }, band: textValue(root.score?.band) || null,
    household, city: textValue(root.case?.city), state: textValue(root.case?.state),
    narrative: { ...(root.narrative || {}), summary_main: textValue(read('summary')), summary_recommendations: recommendations },
    facts: root.key_metrics?.facts || {}, ratios: root.key_metrics?.ratios || {}, evidence, recommendations, actions,
    recommendationSource: recommendations ? { document: filename, path: assigned.recommendations, raw: recommendations } : null,
    scoreContext: score !== null && score >= 80 && warning ? { evidenceId: warning.id, title: 'A strong score. A longer story.', explanation: 'Your overall score and your retirement projection answer different questions. Read both before deciding what to do next.' } : null,
    importInfo: { recognized: inspection.recognized, missing: [score === null ? 'Financial health score' : '', !recommendations ? 'Plan recommendations' : '', !household.length ? 'Household members' : ''].filter(Boolean) },
  };
}
