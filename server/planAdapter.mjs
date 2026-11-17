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
      const field = { path: pointer, type: Array.isArray(value) ? 'array' : typeof value, preview: Array.isArray(value) ? `${value.length} items` : String(value).slice(0, 110) };
      if (Array.isArray(value) && value.length >= 2 && object(value[0])) {
        const keys = Object.keys(value[0]).filter(key => Number.isFinite(value[0][key])).slice(0, 20);
        if (keys.length >= 2) field.seriesKeys = keys;
      }
      fields.push(field);
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

export function mappedProjection(document, mapping) {
  if (!mapping || typeof mapping.path !== 'string' || typeof mapping.yearKey !== 'string' || typeof mapping.valueKey !== 'string') return null;
  const title = textValue(mapping.title).slice(0, 120);
  const rows = atPointer(document, mapping.path);
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 200 || !title || mapping.yearKey === mapping.valueKey) return null;
  const points = rows.map(row => ({ year: row?.[mapping.yearKey], value: row?.[mapping.valueKey] }));
  if (!points.every((point, i) => Number.isSafeInteger(point.year) && point.year >= 1000 && point.year <= 9999
    && Number.isFinite(point.value) && (!i || point.year > points[i - 1].year))) return null;
  if (!Number.isFinite(Math.max(0, ...points.map(p => p.value)) - Math.min(0, ...points.map(p => p.value)))) return null;
  return {
    title,
    unit: textValue(mapping.unit).slice(0, 24),
    basis: textValue(mapping.basis).slice(0, 200),
    path: mapping.path,
    points,
  };
}

export function normalizePlan(document, { id, filename = 'financial-health.json', mapping = {}, displayName = '', metricMappings = [], projectionMapping = null, reportSources = null } = {}) {
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
  const reviewedProjection = mappedProjection(document, projectionMapping);
  if (projectionMapping && !reviewedProjection) throw new Error('The chart needs a title and a source series with distinct, increasing years and numeric values.');
  const projection = inspection.recognized ? mappedProjection(document, {
    path: `${inspection.rootPath}/projections/yearly`, yearKey: 'year', valueKey: 'net_worth_todays_dollars',
    title: 'Projected net worth', unit: 'USD', basis: "Today's dollars at the plan date",
  }) : null;
  function sourceFor(pointer, raw) {
    const reference = reportSources?.[pointer];
    const report = Number.isSafeInteger(reference?.page) && reference.page > 0
      ? { caseId: id, page: reference.page, section: reference.section, excerpt: reference.excerpt }
      : null;
    return { document: filename, path: pointer, raw, basis: textValue(raw?.basis), period: textValue(raw?.period), ...(report ? { report } : {}) };
  }
  if (projection) {
    projection.note = 'Net worth includes assets such as your home.';
    projection.report = sourceFor(projection.path).report;
  }
  const household = (read('household') || []).filter(object).map(person => ({ ...person, first_name: textValue(person.first_name) || textValue(person.name), role: textValue(person.role) }));
  const partners = household.filter(person => /^(client|spouse|partner|co-client|coclient)$/i.test(person.role)).map(person => person.first_name).filter(Boolean);
  const name = textValue(read('name')) || textValue(displayName) || partners.join(' & ') || 'Imported client';
  const score = scoreNumber(read('score'));
  const evidence = [];
  function addEvidence(pointer, raw, details, unit) {
    evidence.push({
      id: `e-${createHash('sha256').update(pointer).digest('hex').slice(0, 12)}`,
      ...details, source: { ...sourceFor(pointer, raw), unit },
    });
  }
  if (inspection.recognized) {
    const ratios = `${inspection.rootPath}/key_metrics/ratios`;
    const cardBalance = `${ratios}/creditCardDebt/balance`;
    const balance = atPointer(document, cardBalance);
    if (Number.isFinite(balance)) addEvidence(cardBalance, balance, {
      title: 'Credit card balance', figure: displayMetric({ value: balance, unit: 'USD' }), badge: 'PLAN DATA',
      explanation: 'This is the credit card balance recorded in your plan.',
      whyItMatters: 'Review the card rate, payments and available cash together to understand the trade-off with your reserve.',
    }, 'USD');
    if (Array.isArray(root.profile?.liabilities)) {
      for (const [index, liability] of root.profile.liabilities.entries()) {
        const rate = liability?.interest_rate;
        if (liability?.type !== 'PERSONAL_CREDIT_CARD' || !Number.isFinite(rate) || rate < 0 || rate > 1) continue;
        const path = inspection.rootPath + '/profile/liabilities/' + index + '/interest_rate';
        const title = textValue(liability.name);
        addEvidence(path, rate, {
          title: title ? 'Credit card interest rate (' + title + ')' : 'Credit card interest rate',
          figure: new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 4 }).format(rate),
          badge: 'PLAN DATA', explanation: 'This is the interest rate listed for this card in the plan.',
          whyItMatters: 'Compare it with the rate on your latest card statement when discussing repayment.',
        }, 'decimal-rate');
      }
    }
    const coverageGaps = `${ratios}/lifeInsurance/lifeInsuranceCoverageGapsAndExcess`;
    for (const [index, key] of ['clientShortfall', 'coClientShortfall'].entries()) {
      const path = `${coverageGaps}/${key}`;
      const shortfall = atPointer(document, path);
      if (!Number.isFinite(shortfall) || shortfall <= 0) continue;
      addEvidence(path, shortfall, {
        title: partners[index] ? `${partners[index]}'s life insurance shortfall` : 'Life insurance shortfall',
        figure: displayMetric({ value: shortfall, unit: 'USD' }), badge: 'PLAN DATA',
        explanation: 'This is the gap the plan reports between current life insurance and the lower end of its recommended coverage range.',
        whyItMatters: 'Review the policies and the expenses that would still need paying if the household lost an income.',
      }, 'USD');
    }
  }
  walkJson(document, (raw, pointer) => {
    if (!object(raw) || !textValue(raw.label)) return;
    if (raw.value === undefined && (raw.min === undefined || raw.max === undefined)) return;
    if (raw.value !== undefined && !['number', 'string'].includes(typeof raw.value)) return;
    if (raw.value === '' || raw.value === null) return;
    evidence.push({
      id: `e-${createHash('sha256').update(pointer).digest('hex').slice(0, 12)}`,
      title: raw.label, figure: displayMetric(raw), badge: kindFor(raw, pointer),
      explanation: [raw.label + '.', raw.period ? `The period covered is ${raw.period}.` : ''].filter(Boolean).join(' '),
      whyItMatters: 'Read this in the context of your goals, alongside the rest of your plan.',
      source: sourceFor(pointer, raw),
      ...((projection && pointer.startsWith(`${inspection.rootPath}/key_metrics/facts/retirement/`)
        && !/\/netCashFlowThisYear$/.test(pointer)) ? { projection } : {}),
    });
  });
  if (!Array.isArray(metricMappings) || metricMappings.length > 8) throw new Error('Choose up to eight additional findings.');
  for (const metric of metricMappings) {
    const pointer = metric?.path;
    const value = atPointer(document, pointer);
    const title = textValue(metric?.label).slice(0, 140);
    if (!title || !['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
      throw new Error('Each additional finding needs a label and a value from the source file.');
    }
    if (evidence.some(({ source }) => source.path === pointer
      || (object(source.raw) && ['value', 'min', 'max'].some(key => pointer === `${source.path}/${key}`)))) continue;
    const unit = textValue(metric.unit).slice(0, 24);
    const period = textValue(metric.period).slice(0, 120);
    evidence.push({
      id: `e-${createHash('sha256').update(pointer).digest('hex').slice(0, 12)}`,
      title, figure: displayMetric({ value, unit }), badge: 'PLAN DATA',
      explanation: `Your plan lists ${displayMetric({ value, unit })} for this item.`,
      whyItMatters: 'Discuss what this figure means for your goals with your advisor.',
      source: { ...sourceFor(pointer, value), unit, period },
    });
  }
  for (const key of ['summary', 'recommendations']) {
    const value = textValue(read(key));
    if (value) evidence.push({ id: `e-${key}`, title: key === 'summary' ? 'The bigger picture' : 'What your plan recommends', figure: '', badge: 'PLAN TEXT', explanation: value, whyItMatters: 'This passage comes directly from your plan.', source: sourceFor(assigned[key], value) });
  }
  if (score === null && !evidence.length && !reviewedProjection) throw new Error('No usable plan content found. Map a summary, recommendations or a financial health score before importing.');
  const warning = evidence.find(item => /\/savingsRunOut$/.test(item.source.path) && /run(?:s)? out at age \d+/i.test(item.title) && !/\b(?:not|never)\b/i.test(item.title));
  const recommendations = textValue(read('recommendations'));
  const actions = (Array.isArray(root.score?.top_moves) ? root.score.top_moves : []).flatMap((move, index) => {
    if (!object(move) || !textValue(move.title) || !textValue(move.action)) return [];
    return [{ title: move.title, action: move.action, source: sourceFor(`${inspection.rootPath}/score/top_moves/${index}`, move) }];
  });
  return {
    id, meta: { name, partners, coupleMode: partners.length >= 2, subtitle: '', description: '', hook: '' },
    score, scoreSource: score === null ? null : sourceFor(assigned.score, score), band: textValue(root.score?.band) || null,
    household, city: textValue(root.case?.city), state: textValue(root.case?.state),
    narrative: { ...(root.narrative || {}), summary_main: textValue(read('summary')), summary_recommendations: recommendations },
    facts: root.key_metrics?.facts || {}, ratios: root.key_metrics?.ratios || {}, evidence, recommendations, actions, reviewedProjection,
    recommendationSource: recommendations ? sourceFor(assigned.recommendations, recommendations) : null,
    scoreContext: score !== null && score >= 80 && warning ? { evidenceId: warning.id, title: 'A strong score. A longer story.', explanation: 'Your overall score and your retirement projection answer different questions. Read both before deciding what to do next.' } : null,
    importInfo: { recognized: inspection.recognized, missing: [score === null ? 'Financial health score' : '', !recommendations ? 'Plan recommendations' : '', !household.length ? 'Household members' : ''].filter(Boolean) },
  };
}
