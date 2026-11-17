const line = value => {
  const text = typeof value === 'string' ? value.trim() : '';
  return !text || /[.!?…][”"]?$/.test(text) ? text : `${text}.`;
};

export const narration = (...parts) => parts.map(line).filter(Boolean).join(' ');

export function shortNarration(value, limit = 260) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const limitAt = text.lastIndexOf(' ', limit);
  return `${text.slice(0, limitAt > 0 ? limitAt : limit)}…`;
}

export function concernNarration(quote) {
  return quote ? `You told us, “${shortNarration(quote)}”` : '';
}

function estimates({ expectedScore, partnerScores } = {}) {
  const partners = Object.entries(partnerScores || {});
  if (partners.length > 1) {
    return partners.map(([name, score]) => `${name} estimated ${score} out of 100`).join('. ');
  }
  return Number.isFinite(expectedScore) ? `Before seeing the plan, you estimated ${expectedScore} out of 100` : '';
}

export function summaryNarration(summary) {
  return narration(
    'Take a moment to review what matters to you',
    concernNarration(summary?.mainConcern),
    summary?.biggestPriority && `What you want to change is “${shortNarration(summary.biggestPriority)}”`,
    estimates(summary || {}),
    'You can edit your answers before we open the plan',
  );
}

export function revealNarration(reveal) {
  return narration(
    estimates(reveal),
    Number.isFinite(reveal.actualScore)
      ? `The published financial health score in your plan is ${reveal.actualScore} out of 100`
      : 'This plan does not include a published financial health score',
    concernNarration(reveal.userQuote?.text),
    shortNarration(reveal.auditorReaction, 520),
    reveal.discoveries?.length
      ? 'Take a moment to compare that with your first impression. Then choose the finding you want to understand. We can look at what it means for your priorities and where the plan gets its figures'
      : 'Review the available information and bring any remaining questions to your advisor',
  );
}

export function findingNarration(finding, detailed) {
  const { title, explanation, whyItMatters, figure, reflectionQuestion, source } = finding;
  const explanationText = explanation?.startsWith(`${title}.`) ? explanation.slice(title.length + 1).trim() : explanation;
  const notes = source?.raw && typeof source.raw.note === 'string' ? source.raw.note : '';
  return narration(
    title,
    shortNarration(explanationText, 480),
    figure && `The plan lists ${figure}`,
    source?.period && !explanationText?.includes(source.period) && `The period is ${source.period}`,
    detailed && source?.basis && `The figure is shown on this basis: ${source.basis}`,
    detailed && notes && !explanationText?.includes(notes) && shortNarration(notes),
    shortNarration(whyItMatters, 360),
    source?.report?.page && `You can check the source on page ${source.report.page} of the report`,
    reflectionQuestion,
  );
}

export function missionNarration(mission) {
  if (!mission) return '';
  return narration(
    'Here is the next step you can prepare',
    mission.title,
    shortNarration(mission.whyItMatters, 420),
    mission.firstAction && `Start here. ${shortNarration(mission.firstAction)}`,
    ...(mission.steps || []),
    mission.howToVerify,
    'Choose what feels realistic, or tell your advisor what might get in the way',
  );
}
