import React, { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X, ArrowRight, Check } from 'lucide-react';
import { advisorRequest } from '../utils/api';

async function post(endpoint, body) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not read this plan.');
  return data;
}

export default function PlanImport({ onImported, privateAdvisor = false }) {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState(null);
  const [filename, setFilename] = useState('');
  const [inspection, setInspection] = useState(null);
  const [mapping, setMapping] = useState({});
  const [metrics, setMetrics] = useState([]);
  const [projection, setProjection] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const request = (action, body) => privateAdvisor
    ? advisorRequest(`/plans/${action}`, { method: 'POST', body })
    : post(`/api/plans/${action}`, body);
  async function load(file) {
    if (!file) return;
    setBusy(true); setError(''); setInspection(null); setDocument(null);
    try {
      if (file.size > 4.8 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 4.8 MB.');
      let parsed;
      try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON. Check its format and try again.'); }
      const { inspection: reviewed } = await request('inspect', { document: parsed });
      setDocument(parsed);
      setFilename(file.name);
      setInspection(reviewed);
      setMapping(reviewed.mapping);
      setMetrics(reviewed.suggestedMetrics || []);
      setProjection(reviewed.suggestedProjection || null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const result = await request('import', { document, options: { filename, mapping, displayName, metricMappings: metrics, projectionMapping: projection } });
      await onImported(result.case);
      setOpen(false); setInspection(null); setDocument(null); setDisplayName(''); setMetrics([]); setProjection(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function editMetric(index, update) {
    setMetrics(previous => previous.map((metric, i) => i === index ? { ...metric, ...update } : metric));
  }
  const availableFindings = inspection?.fields.filter(field => field.path
    && ['number', 'string'].includes(field.type)
    && !Object.values(mapping).includes(field.path)
    && !metrics.some(metric => metric.path === field.path)) || [];
  const seriesFields = inspection?.fields.filter(field => field.path && field.seriesKeys) || [];
  const seriesKeys = seriesFields.find(field => field.path === projection?.path)?.seriesKeys || [];
  const options = [{ key: 'name', label: 'Client name', type: 'string' }, { key: 'score', label: 'Financial health score · 0–100', type: 'number' }, { key: 'summary', label: 'Plan summary', type: 'string' }, { key: 'recommendations', label: 'Recommendations', type: 'string' }, { key: 'household', label: 'Household members', type: 'array' }];
  return <Dialog.Root open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <Dialog.Trigger asChild><button className="import-trigger"><Upload size={17} /> Import a client plan</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="source-sheet import-sheet">
      <div className="sheet-top"><span className="eyebrow">Your own client</span><Dialog.Close asChild><button className="icon-button" aria-label="Close import"><X /></button></Dialog.Close></div>
      <Dialog.Title className="sheet-title">Every plan has<br />a different story.</Dialog.Title>
      <Dialog.Description className="sheet-description">Import one client’s JSON export. Standard Sherpas fields are detected automatically. For another layout, choose where the plan information lives.</Dialog.Description>
      <input ref={input} type="file" accept=".json,application/json" aria-label="Choose a client JSON file" className="sr-only" onChange={event => { load(event.target.files?.[0]); event.target.value = ''; }} />
      <button className="upload-zone" disabled={busy} onClick={() => input.current.click()}><Upload size={26} /><strong>{busy ? 'Reading your plan…' : filename && inspection ? filename : 'Choose a JSON file'}</strong><span>One client · up to 4.8 MB</span></button>
      {inspection && <div className="import-mapping">
        <p className="import-notice"><Check size={16} />{inspection.analyzedWithAI ? 'AI suggested fields and findings. Review them against the original plan.' : inspection.recognized ? 'Sherpas plan detected. Review the fields below.' : 'Choose the matching fields. Leave unavailable information blank.'}</p>
        <label className="field-label">Display name (optional)<input className="editorial-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name shown in your client list" maxLength={150} /></label>
        {options.map(option => <label key={option.key} className="field-label">{option.label}<select aria-label={option.label} className="editorial-input" value={mapping[option.key] || ''} onChange={e => setMapping(prev => ({ ...prev, [option.key]: e.target.value }))}><option value="">Not provided</option>{inspection.fields.filter(field => field.type === option.type).map(field => <option key={field.path} value={field.path}>{field.path} — {field.preview}</option>)}</select></label>)}
        {inspection.fieldsTruncated && <p>Some fields are not listed because this file is very large. Import a smaller export of the relevant plan sections.</p>}
        {(metrics.length > 0 || availableFindings.length > 0) && <section className="import-findings">
          <h3>Findings to include</h3>
          {metrics.map((metric, index) => <fieldset key={metric.path}>
            <legend>{inspection.fields.find(field => field.path === metric.path)?.preview} · {metric.path}</legend>
            <label className="field-label">Finding label<input className="editorial-input" value={metric.label} maxLength={140} onChange={e => editMetric(index, { label: e.target.value })} /></label>
            <div className="import-finding-units">
              <label className="field-label">Unit<input className="editorial-input" value={metric.unit} maxLength={24} onChange={e => editMetric(index, { unit: e.target.value })} /></label>
              <label className="field-label">Period<input className="editorial-input" value={metric.period} maxLength={120} onChange={e => editMetric(index, { period: e.target.value })} /></label>
            </div>
            <button className="quiet-action" onClick={() => setMetrics(previous => previous.filter((_, i) => i !== index))}>Remove finding</button>
          </fieldset>)}
          {metrics.length < 8 && availableFindings.length > 0 && <label className="field-label">
            Add a finding from the plan
            <select className="editorial-input" value="" onChange={event => {
              const path = event.target.value;
              if (path) setMetrics(previous => [...previous, { path, label: '', unit: '', period: '' }]);
            }}>
              <option value="">Choose a field</option>
              {availableFindings.map(field => <option key={field.path} value={field.path}>{field.path} · {field.preview}</option>)}
            </select>
          </label>}
        </section>}
        {seriesFields.length > 0 && <details className="import-projection" open={inspection.suggestedProjection ? true : undefined}>
          <summary>{inspection.suggestedProjection ? 'Review suggested chart' : 'Add a chart from a yearly series'}</summary>
          <label className="field-label">Source series<select className="editorial-input" value={projection?.path || ''} onChange={event => {
            const path = event.target.value;
            setProjection(path ? { path, yearKey: '', valueKey: '', title: '', unit: '', basis: '' } : null);
          }}>
            <option value="">No chart</option>
            {seriesFields.map(field => <option key={field.path} value={field.path}>{field.path} · {field.preview}</option>)}
          </select></label>
          {projection && <>
            <div className="import-finding-units">
              {[['yearKey', 'Year field'], ['valueKey', 'Value field']].map(([key, label]) => <label className="field-label" key={key}>{label}
                <select className="editorial-input" value={projection[key]} onChange={event => setProjection(previous => ({ ...previous, [key]: event.target.value }))}>
                  <option value="">Choose a field</option>
                  {seriesKeys.map(field => <option key={field}>{field}</option>)}
                </select>
              </label>)}
            </div>
            {[['title', 'Chart title', 120], ['unit', 'Unit', 24], ['basis', 'Basis or assumptions', 200]].map(([key, label, maxLength]) => (
              <label className="field-label" key={key}>{label}<input className="editorial-input" value={projection[key]} maxLength={maxLength}
                onChange={event => setProjection(previous => ({ ...previous, [key]: event.target.value }))} /></label>
            ))}
          </>}
        </details>}
        <p className="sheet-description">{privateAdvisor ? 'The plan becomes available in your advisor workspace after you save it.' : 'Imported plans are saved on this app’s server and available from its client list.'}</p>
        <button className="primary-action" disabled={busy} onClick={save}>Add this client <ArrowRight size={18} /></button>
      </div>}
      {error && <p role="alert" className="inline-error">{error}</p>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
