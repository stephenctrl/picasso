import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { importHtml } from '../importHtml';
import type { HtmlImportResult } from '../importHtml';
import ProjectPreview from './ProjectPreview';
import './HtmlImportDialog.css';

interface HtmlImportDialogProps {
  width: number;
  height: number;
  onImport: (result: HtmlImportResult) => boolean;
  onClose: () => void;
}

type InvalidField = 'html' | 'width' | 'height' | null;

export function HtmlImportDialog({ width, height, onImport, onClose }: HtmlImportDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const htmlInput = useRef<HTMLTextAreaElement>(null);
  const widthInput = useRef<HTMLInputElement>(null);
  const heightInput = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const active = useRef(false);
  const revision = useRef(0);
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [name, setName] = useState('Imported design');
  const [viewportWidth, setViewportWidth] = useState(String(width));
  const [viewportHeight, setViewportHeight] = useState(String(height));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [prepared, setPrepared] = useState<{ result: HtmlImportResult; revision: number } | null>(null);

  useEffect(() => {
    const node = dialog.current;
    active.current = true;
    if (node && !node.open) node.showModal();
    return () => {
      active.current = false;
      revision.current += 1;
      if (node?.open) node.close();
    };
  }, []);

  useEffect(() => {
    if (prepared) reviewHeading.current?.focus();
  }, [prepared]);

  function invalidate() {
    revision.current += 1;
    setPrepared(null);
    setBusy('');
    setError('');
    setNotice('');
    setInvalidField(null);
    return revision.current;
  }

  function close() {
    if (!active.current) return;
    active.current = false;
    revision.current += 1;
    dialog.current?.close();
    onClose();
  }

  function isCurrent(operation: number) {
    return active.current && revision.current === operation;
  }

  async function readFiles(kind: 'html' | 'css', files: File[]) {
    if (!files.length) return;
    const operation = invalidate();
    if (files.some(file => !(kind === 'html' ? /\.html?$/i : /\.css$/i).test(file.name))) {
      setError(kind === 'html' ? 'Choose an .html or .htm file.' : 'Choose .css files.');
      return;
    }
    setBusy(kind === 'html' ? 'Reading HTML file…' : 'Reading CSS files…');
    try {
      const contents = await Promise.all(files.map(file => file.text()));
      if (!isCurrent(operation)) return;
      if (kind === 'html') {
        setHtml(contents[0]);
        if (name === 'Imported design') setName(files[0].name.replace(/\.html?$/i, '').slice(0, 120) || 'Imported design');
      } else {
        setCss(contents.join('\n\n'));
      }
      setNotice(kind === 'html' ? `Loaded ${files[0].name}. Prepare the design to review it.` : `Loaded ${files.length} CSS ${files.length === 1 ? 'file' : 'files'} in selection order. Prepare the design to review it.`);
    } catch (cause) {
      if (isCurrent(operation)) setError(`Could not read the selected ${kind.toUpperCase()} ${kind === 'html' ? 'file' : 'files'}. ${cause instanceof Error ? cause.message : 'Try choosing the files again.'}`);
    } finally {
      if (isCurrent(operation)) setBusy('');
    }
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !active.current) return;
    const operation = invalidate();
    const nextWidth = Number(viewportWidth);
    const nextHeight = Number(viewportHeight);
    if (!html.trim()) {
      setInvalidField('html');
      setError('Paste HTML or choose an HTML file before preparing.');
      htmlInput.current?.focus();
      return;
    }
    if (!viewportWidth.trim() || !Number.isFinite(nextWidth) || nextWidth < 240 || nextWidth > 4000) {
      setInvalidField('width');
      setError('Viewport width must be a number from 240 to 4,000.');
      widthInput.current?.focus();
      return;
    }
    if (!viewportHeight.trim() || !Number.isFinite(nextHeight) || nextHeight < 240 || nextHeight > 4000) {
      setInvalidField('height');
      setError('Viewport height must be a number from 240 to 4,000.');
      heightInput.current?.focus();
      return;
    }
    setBusy('Preparing editable design…');
    try {
      const result = await importHtml({ html, css, name: name.trim() || 'Imported design', width: nextWidth, height: nextHeight });
      if (isCurrent(operation)) setPrepared({ result, revision: operation });
    } catch (cause) {
      if (isCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Could not prepare this HTML. Check the source and try again.');
    } finally {
      if (isCurrent(operation)) setBusy('');
    }
  }

  function adopt() {
    if (!prepared || !isCurrent(prepared.revision)) return;
    setError('');
    try {
      if (onImport(prepared.result)) close();
      else setNotice('Import cancelled. Your current design is unchanged; the prepared design is still available below.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import the prepared design.');
    }
  }

  return <dialog ref={dialog} className="html-import-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); close(); }}>
    <div className="html-import-shell">
      <header className="html-import-header">
        <div><h2 id={`${id}-title`}>Import HTML / CSS</h2><p id={`${id}-description`}>Convert local HTML into an editable Picasso design. Your current design stays unchanged until you choose Import design.</p></div>
        <button type="button" className="html-import-close" aria-label="Close HTML import" onClick={close}>Close</button>
      </header>
      <form className="html-import-form" onSubmit={prepare} noValidate>
        <div className="html-import-content">
          <aside className="html-import-limits" aria-label="Import capabilities and privacy">
            <strong>Local only. No scripts or external resources are loaded.</strong>
            <p>Paste a complete HTML document (including inline styles) or an HTML fragment with separate CSS. Layout is flattened at one viewport into up to 200 editable rectangles, text layers, and buttons, not a responsive website. Images, custom fonts, effects, and other unsupported features may be omitted or approximated. Review the preview and warnings before importing.</p>
          </aside>
          <div className="html-import-settings">
            <label className="html-import-field html-import-name"><span>Design name</span><input type="text" maxLength={120} value={name} onChange={event => { invalidate(); setName(event.target.value); }} aria-describedby={`${id}-name-note`} /><small id={`${id}-name-note`}>An HTML document title may take precedence.</small></label>
            <label className="html-import-field"><span>Viewport width</span><input ref={widthInput} type="number" min={240} max={4000} step="any" required value={viewportWidth} onChange={event => { invalidate(); setViewportWidth(event.target.value); }} aria-invalid={invalidField === 'width'} aria-describedby={`${id}-viewport-note${invalidField === 'width' ? ` ${id}-error` : ''}`} /></label>
            <label className="html-import-field"><span>Viewport height</span><input ref={heightInput} type="number" min={240} max={4000} step="any" required value={viewportHeight} onChange={event => { invalidate(); setViewportHeight(event.target.value); }} aria-invalid={invalidField === 'height'} aria-describedby={`${id}-viewport-note${invalidField === 'height' ? ` ${id}-error` : ''}`} /></label>
          </div>
          <p className="html-import-help" id={`${id}-viewport-note`}>240–4,000 pixels per side. Viewport controls layout; an explicit imported artboard size may be preserved.</p>
          <div className="html-import-sources">
            <section aria-labelledby={`${id}-html-heading`}>
              <h3 id={`${id}-html-heading`}>HTML</h3>
              <label className="html-import-field"><span>Choose HTML file</span><input type="file" accept=".html,.htm,text/html" disabled={Boolean(busy)} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles('html', files); }} aria-describedby={`${id}-html-file-note`} /></label>
              <p className="html-import-help" id={`${id}-html-file-note`}>Choosing a file replaces the HTML below.</p>
              <label className="html-import-field"><span>HTML source</span><textarea ref={htmlInput} autoFocus rows={12} required spellCheck={false} autoCapitalize="off" autoCorrect="off" value={html} placeholder={'<main style="padding: 32px">\n  <h1>Hello, Picasso</h1>\n</main>'} onChange={event => { invalidate(); setHtml(event.target.value); }} aria-invalid={invalidField === 'html'} aria-describedby={invalidField === 'html' ? `${id}-error` : undefined} /></label>
            </section>
            <section aria-labelledby={`${id}-css-heading`}>
              <h3 id={`${id}-css-heading`}>CSS <span>(optional)</span></h3>
              <label className="html-import-field"><span>Choose CSS files</span><input type="file" accept=".css,text/css" multiple disabled={Boolean(busy)} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles('css', files); }} aria-describedby={`${id}-css-file-note`} /></label>
              <p className="html-import-help" id={`${id}-css-file-note`}>Files replace the CSS below, combined in selection order.</p>
              <label className="html-import-field"><span>Additional CSS source</span><textarea rows={12} spellCheck={false} autoCapitalize="off" autoCorrect="off" value={css} placeholder={'main { background: #f5f5f0; }\nh1 { color: #253c32; }'} onChange={event => { invalidate(); setCss(event.target.value); }} /></label>
            </section>
          </div>
          <p className="html-import-status" role="status" aria-live="polite">{busy || notice || (prepared ? 'Design prepared. Review the preview and warnings below, then choose Import design.' : 'Prepare a design to preview the editable result. Editing any input clears the prepared result.')}</p>
          {error && <p id={`${id}-error`} className="html-import-error" role="alert">{error}</p>}
          {prepared && <section className="html-import-review" aria-labelledby={`${id}-review-heading`}>
            <h3 id={`${id}-review-heading`} ref={reviewHeading} tabIndex={-1}>Prepared design</h3>
            <p className="html-import-summary"><strong>{prepared.result.project.name || 'Untitled design'}</strong><span>{prepared.result.project.width} × {prepared.result.project.height} pixels · {prepared.result.project.elements.length} editable {prepared.result.project.elements.length === 1 ? 'layer' : 'layers'}</span></p>
            <ProjectPreview project={prepared.result.project} className="html-import-preview" />
            <h4>Import warnings ({prepared.result.warnings.length})</h4>
            {prepared.result.warnings.length ? <ul className="html-import-warnings">{prepared.result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : <p className="html-import-help">No import warnings. The result is still a fixed-size, flat editable design.</p>}
          </section>}
        </div>
        <footer className="html-import-footer">
          <button type="button" onClick={close}>Cancel</button>
          <div><button type="submit" disabled={Boolean(busy)}>{busy.startsWith('Preparing') ? 'Preparing…' : 'Prepare design'}</button><button type="button" className="html-import-primary" disabled={!prepared || Boolean(busy)} onClick={adopt}>Import design</button></div>
        </footer>
      </form>
    </div>
  </dialog>;
}
