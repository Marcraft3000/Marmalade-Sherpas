import React, { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X, ArrowRight, Check } from 'lucide-react';

async function post(endpoint, body) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not read this plan.');
  return data;
}

export default function PlanImport({ onImported }) {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState(null);
  const [filename, setFilename] = useState('');
  const [inspection, setInspection] = useState(null);
  const [mapping, setMapping] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  async function load(file) {
    if (!file) return;
    setBusy(true); setError(''); setInspection(null); setDocument(null);
    try {
      if (file.size > 4.8 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 4.8 MB.');
      let parsed;
      try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON. Check its format and try again.'); }
      const result = await post('/api/plans/inspect', { document: parsed });
      setDocument(parsed); setFilename(file.name); setInspection(result.inspection); setMapping(result.inspection.mapping);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const result = await post('/api/plans/import', { document, options: { filename, mapping, displayName } });
      await onImported(result.case);
      setOpen(false); setInspection(null); setDocument(null); setDisplayName('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
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
        <p className="import-notice"><Check size={16} />{inspection.recognized ? 'Sherpas plan detected. Review the fields below.' : 'Choose the matching fields. Leave unavailable information blank.'}</p>
        <label className="field-label">Display name (optional)<input className="editorial-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name shown in your client list" maxLength={150} /></label>
        {options.map(option => <label key={option.key} className="field-label">{option.label}<select aria-label={option.label} className="editorial-input" value={mapping[option.key] || ''} onChange={e => setMapping(prev => ({ ...prev, [option.key]: e.target.value }))}><option value="">Not provided</option>{inspection.fields.filter(field => field.type === option.type).map(field => <option key={field.path} value={field.path}>{field.path} — {field.preview}</option>)}</select></label>)}
        {inspection.fieldsTruncated && <p>Some fields are not listed because this file is very large. Import a smaller export of the relevant plan sections.</p>}
        <p className="sheet-description">Missing scores stay missing. Numbers keep their original labels and units. Imported plans are saved on this app’s server and available from its client list.</p>
        <button className="primary-action" disabled={busy} onClick={save}>Add this client <ArrowRight size={18} /></button>
      </div>}
      {error && <p role="alert" className="inline-error">{error}</p>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
