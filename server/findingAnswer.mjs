import { walkJson } from './planAdapter.mjs';

const commonWords = new Set('about after before could would should there their these those where which while with have does make this that your plan finding source more tell please hello what when will much many each exact amount'.split(' '));
const terms = text => new Set((text.toLowerCase().match(/\p{L}{4,}/gu) || [])
  .filter(word => !commonWords.has(word)).map(word => word.slice(0, 5)));

export function findQuestionEvidence(question, openFinding, evidence) {
  const text = question.toLowerCase().trim().replace(/’/g, "'").replace(/[?.!]+$/, '');
  const refersToOpenFinding = /^(?:what does (?:this|it) (?:mean|cover|show|tell)|what is (?:this|it|covered)|(?:can you )?explain (?:this|it)|how does (?:this|it) (?:affect|relate)|why (?:is|does) (?:this|it))\b/.test(text);
  const asksForOpenFigure = /^what(?: is|'s) the (?:exact )?(?:amount|number|figure)(?: here)?$/.test(text);
  if (refersToOpenFinding || asksForOpenFigure) return [openFinding];

  const questionTerms = terms(text);
  const ranked = evidence.map(item => {
    const titleTerms = terms(item.title);
    const path = item.source.path.replace(/([a-z])([A-Z])/g, '$1 $2');
    const contextTerms = terms(`${path} ${item.explanation.slice(0, 600)}`);
    let score = 0;
    for (const term of questionTerms) score += titleTerms.has(term) ? 3 : Number(contextTerms.has(term));
    return { item, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);

  return ranked.slice(0, 6).map(({ item }) => item);
}

const numberTokens = /(?:(?<!\d)[+\-−]\p{Sc}?)?(?:\d+(?:[.,\p{Zs}]\d+)*|[.,]\d+)(?:e[+\-−]?\d+)?/giu;

function decimalKey(token) {
  let decimal = token.replace(/\p{Zs}/gu, ' ').replace(/−/g, '-').replace(/\p{Sc}/gu, '');
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(decimal)) {
    decimal = decimal.replace(/,/g, '');
  } else if (/^[+-]?\d{1,3}(?:\.\d{3})+,\d+$/.test(decimal)) {
    decimal = decimal.replace(/\./g, '').replace(',', '.');
  } else if (/^[+-]?\d{1,3}(?: \d{3})+(?:[.,]\d+)?$/.test(decimal)) {
    decimal = decimal.replace(/ /g, '').replace(',', '.');
  } else {
    decimal = decimal.replace(',', '.');
  }

  const parts = /^([+-]?)(\d*)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(decimal);
  if (!parts || !(parts[2] || parts[3])) return null;
  const [, sign, whole, fraction = '', exponent = '0'] = parts;
  const significant = (whole + fraction).replace(/^0+/, '');
  if (!significant) return '0';

  // Compare exact decimal digits without rounding or expanding scientific notation.
  const digits = significant.replace(/0+$/, '');
  const power = BigInt(exponent) + BigInt(significant.length - digits.length - fraction.length);
  return `${sign === '-' ? '-' : ''}${digits}e${power}`;
}

export function groundFindingAnswer(answer, { source, title }) {
  if (typeof answer !== 'string' || answer.length > 550 || !answer.trim()) return null;
  const supported = new Set();
  const addTextNumbers = text => {
    for (const token of text.match(numberTokens) || []) supported.add(decimalKey(token));
  };
  walkJson(source.raw, value => {
    if (typeof value === 'number') supported.add(decimalKey(String(value)));
    if (typeof value === 'string') addTextNumbers(value);
  });
  addTextNumbers(title);

  for (const token of answer.match(numberTokens) || []) {
    const key = decimalKey(token);
    if (key === null || !supported.has(key)) return null;
  }
  return answer.trim();
}
