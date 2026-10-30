import { useEffect, useId, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { screenDimensionsFromRatio } from '../screenSettings';

const presets = [
  { id: 'phone', label: 'Phone', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'laptop', label: 'Laptop', width: 1440, height: 900 },
  { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 },
] as const;

function ratioParts(width: number, height: number): [number, number] {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return [width, height];
  let a = width;
  let b = height;
  while (b !== 0) [a, b] = [b, a % b];
  return [width / a, height / a];
}

function DimensionField({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  const errorId = useId();
  useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  function commit() {
    const number = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(number) || number < 240 || number > 4000) {
      setError('Enter a number from 240 to 4,000.');
      return;
    }
    setError('');
    if (number !== value) onCommit(number);
  }
  return <label className="field"><span>{label}</span><input type="number" aria-label={label} min={240} max={4000} step="any" value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
    onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
      if (event.key === 'Escape') { setDraft(String(value)); setError(''); }
    }} />{error && <small id={errorId} className="field-error" role="alert">{error}</small>}</label>;
}

type ScreenSettingsProps = { width: number; height: number; onResize: (width: number, height: number) => void };

export function ScreenSettings({ width, height, onResize }: ScreenSettingsProps) {
  const [customSelected, setCustomSelected] = useState(false);
  const [initialRatioWidth, initialRatioHeight] = ratioParts(width, height);
  const [ratioWidth, setRatioWidth] = useState(String(initialRatioWidth));
  const [ratioHeight, setRatioHeight] = useState(String(initialRatioHeight));
  const [ratioSize, setRatioSize] = useState(String(width));
  const [ratioError, setRatioError] = useState('');
  const id = useId();
  const preset = !customSelected ? presets.find(item =>
    (item.width === width && item.height === height) || (item.width === height && item.height === width)) : undefined;
  const custom = !preset;
  const preview = screenDimensionsFromRatio(Number(ratioWidth), Number(ratioHeight), Number(ratioSize));
  const orientation = width === height ? 'Square' : width > height ? 'Landscape' : 'Portrait';

  useEffect(() => {
    if (customSelected) return;
    const [nextWidth, nextHeight] = ratioParts(width, height);
    setRatioWidth(String(nextWidth));
    setRatioHeight(String(nextHeight));
    setRatioSize(String(width));
    setRatioError('');
  }, [width, height, customSelected]);

  function selectPreset(value: string) {
    setRatioError('');
    if (value === 'custom') { setCustomSelected(true); return; }
    const next = presets.find(item => item.id === value);
    if (!next) return;
    setCustomSelected(false);
    onResize(next.width, next.height);
  }

  function applyRatio() {
    if (!preview.ok) { setRatioError(preview.error); return; }
    setRatioError('');
    setCustomSelected(true);
    onResize(preview.width, preview.height);
  }

  return <details className="screen-settings device-screen-settings">
    <summary aria-label="Screen settings"><strong>Screen</strong><span>{preset?.label ?? 'Custom'} · {width} × {height}</span><ChevronDown size={13} /></summary>
    <div className="screen-popover device-screen-popover">
      <h3>Screen dimensions</h3>
      <label className="field"><span>Device layout</span><select aria-label="Screen preset" value={preset?.id ?? 'custom'} onChange={event => selectPreset(event.target.value)}>
        {presets.map(item => <option key={item.id} value={item.id}>{item.label} · {item.width} × {item.height}</option>)}
        <option value="custom">Custom · dimensions & aspect ratio</option>
      </select></label>
      <p className="device-screen-current">{preset?.label ?? 'Custom'} <span>· {orientation} · {initialRatioWidth}:{initialRatioHeight}</span></p>
      {custom && <section className="device-screen-ratio" aria-labelledby={`${id}-ratio-heading`} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); applyRatio(); }
        if (event.key === 'Escape') {
          setRatioWidth(String(initialRatioWidth)); setRatioHeight(String(initialRatioHeight)); setRatioSize(String(width)); setRatioError('');
        }
      }}>
        <h4 id={`${id}-ratio-heading`}>Custom aspect ratio</h4>
        <div className="device-screen-ratio-parts">
          <label className="field"><span>Ratio width</span><input type="number" aria-label="Aspect ratio width" min={0} step="any" value={ratioWidth} aria-invalid={Boolean(ratioError)} aria-describedby={`${id}-ratio-note${ratioError ? ` ${id}-ratio-error` : ''}`} onChange={event => { setRatioWidth(event.target.value); setRatioError(''); }} /></label>
          <span className="device-screen-colon" aria-hidden="true">:</span>
          <label className="field"><span>Ratio height</span><input type="number" aria-label="Aspect ratio height" min={0} step="any" value={ratioHeight} aria-invalid={Boolean(ratioError)} aria-describedby={`${id}-ratio-note${ratioError ? ` ${id}-ratio-error` : ''}`} onChange={event => { setRatioHeight(event.target.value); setRatioError(''); }} /></label>
        </div>
        <label className="field"><span>Screen width for this ratio</span><input type="number" aria-label="Screen width for aspect ratio" min={240} max={4000} step="any" value={ratioSize} aria-invalid={Boolean(ratioError)} aria-describedby={`${id}-ratio-note${ratioError ? ` ${id}-ratio-error` : ''}`} onChange={event => { setRatioSize(event.target.value); setRatioError(''); }} /></label>
        <p id={`${id}-ratio-note`} className="device-screen-help">Enter width:height, such as 16:9 or 3:2, then choose the screen width. Height rounds to the nearest unit. This does not lock later resizing.</p>
        <div className="device-screen-apply-row"><span aria-live="polite">{preview.ok ? `${preview.width} × ${preview.height}` : 'Choose a valid ratio and width'}</span><button type="button" className="device-screen-apply" onClick={applyRatio}>Apply ratio</button></div>
        {ratioError && <p id={`${id}-ratio-error`} className="device-screen-error" role="alert">{ratioError}</p>}
      </section>}
      <div className="device-screen-exact">
        <h4>Exact dimensions</h4>
        <div className="field-grid"><DimensionField label="Screen width" value={width} onCommit={value => { setCustomSelected(true); onResize(value, height); }} /><DimensionField label="Screen height" value={height} onCommit={value => { setCustomSelected(true); onResize(width, value); }} /></div>
      </div>
      <button type="button" className="swap-orientation" onClick={() => {
        if (custom) { setRatioWidth(ratioHeight); setRatioHeight(ratioWidth); setRatioSize(String(height)); }
        setRatioError('');
        onResize(height, width);
      }}><RefreshCw size={13} /> Swap orientation</button>
      <p className="field-note device-screen-boundary">240–4,000 document units per side. Layers keep their size and position; content beyond the screen is clipped, not resized or repositioned.</p>
    </div>
  </details>;
}
