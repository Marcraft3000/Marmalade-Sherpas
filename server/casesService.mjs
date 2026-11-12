import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.resolve(here, '../cases');

// In-memory cache
const cache = {
  cases: {},
  overviews: null,
};

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading JSON ${filePath}:`, err.message);
  }
  return null;
}

function readTextSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.error(`Error reading text ${filePath}:`, err.message);
  }
  return '';
}

/**
 * Metadata hooks and descriptions for the 4 families
 */
const CASE_HOOKS = {
  'timothy-melanie-weah': {
    name: 'Timothy & Melanie Weah',
    subtitle: 'High income, $150k cash reserve, and a lingering 18% credit card',
    hook: 'One hundred and fifty thousand in cash, and an 18% credit card. That is an expensive way to keep your options open.',
    description: 'Timothy (40) and Melanie (38) earn $270k in San Francisco with two young kids. They sit on huge cash while paying high-interest debt and hold different views on investment risk.',
    coupleMode: true,
    partners: ['Timothy', 'Melanie'],
    avatar: '👨‍👩‍👦‍👦'
  },
  'michael-carter': {
    name: 'Michael Carter',
    subtitle: 'Tech professional with high salary, ambitious goals, and a critical score of 26',
    hook: 'A $550,000 house in 2027 and retirement at 58. Ambitious. Let us see if your cash flow agrees.',
    description: 'Michael (37) earns $180,000 in Austin. He wants a luxury home in 2027 and early retirement at 58, but current cash flow is negative and debt payments are eating his savings.',
    coupleMode: false,
    partners: ['Michael'],
    avatar: '👨‍💻'
  },
  'daniel-emily-johnson': {
    name: 'Daniel & Emily Johnson',
    subtitle: 'Denver family balancing a $560k mortgage, 24.9% credit card, and two kids approaching college',
    hook: 'You have worked hard to build a future for your family. Let us make sure that future is properly protected.',
    description: 'Daniel (44) and Emily (42) have two children (Oliver and Sophia). They manage high expenses, high-interest credit card debt, and carry a major life insurance protection gap.',
    coupleMode: true,
    partners: ['Daniel', 'Emily'],
    avatar: '🏡'
  },
  'samantha-lewis': {
    name: 'Samantha Lewis',
    subtitle: 'High-earning single mother in Miami with a strong 82 score concealing a retirement cliff',
    hook: 'An 82. Very impressive on paper. But there is a silent shock hiding in your retirement projection.',
    description: 'Samantha (47) earns $250,000, is completely debt-free, and has strong coverage. But upcoming college tuition for two teens and a 2030 home purchase threaten to deplete savings by age 73.',
    coupleMode: false,
    partners: ['Samantha'],
    avatar: '💼'
  }
};

/**
 * Parse persona markdown into sections
 */
function parsePersonaSections(markdown) {
  const sections = {};
  if (!markdown) return sections;

  const lines = markdown.split('\n');
  let currentHeader = 'intro';
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentContent.length > 0) {
        sections[currentHeader] = currentContent.join('\n').trim();
        currentContent = [];
      }
      currentHeader = line.replace(/^#+\s*/, '').trim();
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections[currentHeader] = currentContent.join('\n').trim();
  }
  return sections;
}

export function getAllCasesOverview() {
  if (cache.overviews) return cache.overviews;

  const caseIds = fs.readdirSync(CASES_DIR).filter(id => {
    return fs.existsSync(path.join(CASES_DIR, id, 'financial-health.json'));
  });

  const overviews = caseIds.map(id => {
    const fh = readJsonSafe(path.join(CASES_DIR, id, 'financial-health.json'));
    const meta = CASE_HOOKS[id] || {
      name: id,
      subtitle: '',
      hook: '',
      description: '',
      coupleMode: false,
      partners: [],
      avatar: '📊'
    };

    return {
      id,
      name: meta.name,
      subtitle: meta.subtitle,
      hook: meta.hook,
      description: meta.description,
      coupleMode: meta.coupleMode,
      partners: meta.partners,
      avatar: meta.avatar,
      score: fh?.score?.published_score ?? 50,
      band: fh?.score?.band ?? 'moderate',
      city: fh?.case?.city ?? '',
      state: fh?.case?.state ?? '',
      household: fh?.case?.household ?? [],
    };
  });

  cache.overviews = overviews;
  return overviews;
}

export function getCaseDetails(caseId) {
  if (cache.cases[caseId]) return cache.cases[caseId];

  const caseDir = path.join(CASES_DIR, caseId);
  if (!fs.existsSync(caseDir)) return null;

  const fh = readJsonSafe(path.join(caseDir, 'financial-health.json'));
  const inv = readJsonSafe(path.join(caseDir, 'investment-analysis.json'));
  const personaMd = readTextSafe(path.join(caseDir, 'persona.md'));
  const personaSections = parsePersonaSections(personaMd);
  const meta = CASE_HOOKS[caseId] || {};

  const facts = fh?.key_metrics?.facts || {};
  const ratios = fh?.key_metrics?.ratios || {};
  const narrative = fh?.narrative || {};

  // Extract key normalized facts deterministically
  const score = fh?.score?.published_score ?? 50;
  const band = fh?.score?.band ?? 'moderate';

  const details = {
    id: caseId,
    meta,
    score,
    band,
    household: fh?.case?.household ?? [],
    city: fh?.case?.city ?? '',
    state: fh?.case?.state ?? '',
    narrative: {
      summary_main: narrative.summary_main || '',
      summary_recommendations: narrative.summary_recommendations || '',
      debt_short_observations: narrative.debt_short_observations || '',
      savings_short_observations: narrative.savings_short_observations || '',
      protection_intro: narrative.protection_intro || '',
      retirement_short_observations: narrative.retirement_short_observations || '',
    },
    facts: {
      cash: facts.cash || {},
      debt: facts.debt || fh?.key_metrics?.debtManagement?.listOfDebts || [],
      retirement: facts.retirement || {},
      protection: facts.protection || {},
      education: facts.education || {},
    },
    ratios,
    personaRaw: personaMd,
    personaSections,
  };

  cache.cases[caseId] = details;
  return details;
}

/**
 * Concise case brief for LLM prompt context to keep tokens small (<600 tokens)
 */
export function getCaseBriefForLLM(caseId) {
  const c = getCaseDetails(caseId);
  if (!c) return '';

  const people = c.household.map(h => `${h.first_name} (${h.role}, ${h.age})`).join(', ');
  const recs = c.narrative.summary_recommendations || '';
  const main = c.narrative.summary_main || '';

  return `
CASE: ${c.meta.name} (${c.id})
LOCATION: ${c.city}, ${c.state}
HOUSEHOLD: ${people}
SHERPAS VERIFIED FINANCIAL HEALTH SCORE: ${c.score}/100 (Band: ${c.band})

OFFICIAL PLAN SUMMARY:
${main.slice(0, 500)}

OFFICIAL RECOMMENDATIONS:
${recs.slice(0, 500)}

KEY FACTUAL METRICS:
- Accessible Cash: $${c.facts.cash?.accessibleCash?.value ?? 'N/A'}
- Emergency Target: $${c.facts.cash?.emergencyReserve?.min ?? 'N/A'} - $${c.facts.cash?.emergencyReserve?.max ?? 'N/A'}
- Debts: ${JSON.stringify(c.facts.debt).slice(0, 200)}
- Retirement status: ${JSON.stringify(c.facts.retirement?.savingsRunOut || {}).slice(0, 150)}
`.trim();
}
