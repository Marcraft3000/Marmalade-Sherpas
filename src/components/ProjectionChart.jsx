import React, { useId } from 'react';
import { ReportPageLink } from './SourceDrawer';

function valueFormatter(unit, notation = 'standard') {
  const currency = /^[A-Z]{3}$/.test(unit);
  const options = { notation, maximumFractionDigits: 2, ...(currency ? { style: 'currency', currency: unit } : {}) };
  const number = new Intl.NumberFormat('en-US', options);
  return value => number.format(value) + (!currency && unit ? ` ${unit}` : '');
}

export default function ProjectionChart({ projection }) {
  const titleId = useId();
  const { points, title, basis, note, unit, report } = projection;
  const formatValue = valueFormatter(unit);
  const formatAxis = valueFormatter(unit, 'compact');
  const first = points[0];
  const last = points.at(-1);
  const lower = Math.min(0, ...points.map(point => point.value));
  const upper = Math.max(0, ...points.map(point => point.value));
  const range = upper - lower || 1;
  const y = value => 202 - (value - lower) / range * 174;
  const x = year => 68 + (year - first.year) / (last.year - first.year) * 517;
  const line = points.map(point => `${x(point.year)},${y(point.value)}`).join(' ');
  const levels = range === 1 && lower === upper ? [lower] : [...new Set([lower, lower + range / 2, upper, 0])].sort((a, b) => a - b);

  return <figure className="projection-chart" aria-labelledby={titleId}>
    <figcaption>
      <h2 id={titleId}>{title}</h2>
      {(basis || note) && <p>{[basis, note].filter(Boolean).join(' · ')}</p>}
    </figcaption>
    <svg viewBox="0 0 600 238" aria-hidden="true" focusable="false">
      {levels.map(level => <g key={level}>
        <line x1="68" x2="585" y1={y(level)} y2={y(level)} className="projection-gridline" />
        <text x="60" y={y(level) + 4} textAnchor="end">{formatAxis(level)}</text>
      </g>)}
      <polyline points={line} className="projection-line" />
      <circle cx={x(first.year)} cy={y(first.value)} r="4" />
      <circle cx={x(last.year)} cy={y(last.value)} r="4" />
      <text x={x(first.year)} y="229">{first.year}</text>
      <text x={x(last.year)} y="229" textAnchor="end">{last.year}</text>
    </svg>
    <p>{first.year} · {formatValue(first.value)} <span aria-hidden="true">→</span> {last.year} · {formatValue(last.value)}</p>
    <details>
      <summary>View yearly figures</summary>
      <div className="projection-data">
        <table aria-label={`${title} by year`}>
          <thead><tr><th scope="col">Year</th><th scope="col">{title}{unit && ` (${unit})`}</th></tr></thead>
          <tbody>{points.map(point => <tr key={point.year}><th scope="row">{point.year}</th><td>{formatValue(point.value)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
    <ReportPageLink report={report} />
  </figure>;
}
