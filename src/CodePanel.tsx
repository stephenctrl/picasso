import type { Project } from './types';
import { elementTag } from './render';
import type { ProjectCode } from './render';
export type CopyPart = 'html' | 'css' | 'document' | 'node-html' | 'node-css';

function CodeBlock({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return <section className="code-block"><div className="code-block-heading"><h3>{label}</h3><button onClick={onCopy}>Copy {label}</button></div><textarea aria-label={`${label} generated code`} value={value} readOnly spellCheck={false} onFocus={event => event.currentTarget.select()} /></section>;
}

export function CodePanel({ project, code, selectedId, onSelect, onCopy }: {
  project: Project; code: ProjectCode; selectedId?: string; onSelect: (id: string) => void; onCopy: (part: CopyPart) => void;
}) {
  const node = code.nodes.find(entry => entry.elementId === selectedId);
  const element = project.elements.find(entry => entry.id === selectedId);
  return <section className="code-workspace" aria-label="Generated HTML and CSS">
    <div className="code-intro"><h2>Your design, as working code</h2><p>Read-only output from the committed design. Copy HTML with CSS, or copy the full standalone page. Editing source code here is not supported.</p></div>
    <label className="code-node-picker">Select a generated node<select aria-label="Select generated node" value={node?.elementId ?? ''} onChange={event => onSelect(event.target.value)}><option value="">Choose a layer…</option>{code.nodes.map(entry => { const item = project.elements.find(element => element.id === entry.elementId)!; return <option key={entry.elementId} value={entry.elementId}>{item.name || item.type} · {elementTag(item)} · {entry.selector}</option>; })}</select></label>
    <div className="code-columns"><CodeBlock label="HTML" value={code.html} onCopy={() => onCopy('html')} /><CodeBlock label="CSS" value={code.css} onCopy={() => onCopy('css')} /></div>
    <details className="full-page-code"><summary>Full standalone page</summary><CodeBlock label="full page" value={code.document} onCopy={() => onCopy('document')} /></details>
    {node && element ? <section className="node-code"><h2>{element.name || element.type} · &lt;{elementTag(element)}&gt; · <code>{node.selector}</code></h2><p>The selected snippet includes the fixed-size artboard wrapper for position, background and clipping. Copy its HTML and CSS together; it is not a bare node or a responsive component.</p><div className="code-columns"><CodeBlock label="node HTML" value={node.html} onCopy={() => onCopy('node-html')} /><CodeBlock label="node CSS" value={node.css} onCopy={() => onCopy('node-css')} /></div></section> : <p className="code-hint">Choose a node above or a layer on the left to inspect its individual markup and styles.</p>}
  </section>;
}
