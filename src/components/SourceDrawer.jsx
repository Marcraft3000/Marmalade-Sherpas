import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, FileText, X } from 'lucide-react';

function displayValue(raw) {
  const value = raw.value ?? (raw.min != null && raw.max != null ? `${raw.min}–${raw.max}` : null);
  if (value == null) return null;
  if (typeof value === 'number') {
    const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    if (raw.unit === 'USD') return `$${formatted}`;
    if (raw.unit === 'USD/yr') return `$${formatted} per year`;
    if (raw.unit === 'percent') return `${formatted}%`;
    return `${formatted}${raw.unit && raw.unit !== 'n/a' ? ` ${raw.unit}` : ''}`;
  }
  const text = String(value);
  if (raw.unit === 'percent' && !text.includes('%')) return `${text}%`;
  return text;
}

export default function SourceDrawer({ source, title = 'Original source', label = 'Open the source' }) {
  if (!source || typeof source !== 'object') return null;
  const raw = source.raw;
  const metric = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  const value = metric && displayValue(metric);
  return <Dialog.Root>
    <Dialog.Trigger asChild><button className="source-link"><FileText size={15} />{label}<ArrowUpRight size={14} /></button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content className="source-sheet">
        <div className="sheet-top"><span className="eyebrow">From your Sherpas plan</span><Dialog.Close asChild><button className="icon-button" aria-label="Close source"><X size={22} /></button></Dialog.Close></div>
        <Dialog.Title className="sheet-title">{metric?.label || metric?.title || title}</Dialog.Title>
        <Dialog.Description className="sheet-description">This is the information in your plan behind the finding. Projections depend on the plan's assumptions.</Dialog.Description>
        {metric ? <div className="source-readable">
          {value && <div className="source-highlight"><span>In your plan</span><strong>{value}</strong></div>}
          {metric.action && <p className="source-passage">{metric.action}</p>}
          {metric.period && <div><span>Time period</span><p>{metric.period}</p></div>}
          {metric.basis && <div><span>How to read it</span><p>{metric.basis}</p></div>}
          {metric.note && <div><span>Additional context</span><p>{metric.note}</p></div>}
          {!value && !metric.action && !metric.period && !metric.basis && !metric.note && <p>Ask your advisor to walk through this figure with you.</p>}
        </div> : <blockquote className="source-passage">{typeof raw === 'number' && /score/i.test(title) ? `${raw} / 100` : String(raw ?? 'Not supplied')}</blockquote>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
