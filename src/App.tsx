import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Circle, Copy, Download, FolderOpen, Layers, LoaderCircle, Minus, Plus, Redo2, RefreshCw, Save, Sparkles, Square, Trash2, Type, Undo2, Upload, X, MousePointer2 } from 'lucide-react';
import type { DesignElement, Project, Suggestion } from './types';
import { clamp, createElement, initialProject } from './document';
import { parseProject, parseSuggestion } from './validation';
import { download, projectSvg } from './export';
import { applyLayout, getAlignmentGuides } from './layout';
import type { AlignmentGuide, LayoutAction } from './layout';

type Gesture = { ids: string[]; mode: 'move' | 'resize'; startX: number; startY: number; before: Project; element: DesignElement; pointerId: number; collapseOnClick: string | null; moved: boolean };
type Proposal = { suggestion: Suggestion; revision: number; requestId: number };
type Health = { state: 'checking' | 'ready' | 'unconfigured' | 'unavailable'; model: string };

function Field({ label, value, onCommit, min, max, maxLength = 120, multiline = false }: {
  label: string; value: string | number; onCommit: (value: string) => void; min?: number; max?: number; maxLength?: number; multiline?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  const commit = () => {
    if (typeof value === 'number' && (draft.trim() === '' || !Number.isFinite(Number(draft)) || Number(draft) < min! || Number(draft) > max!)) {
      setError(`Enter a number from ${min} to ${max}.`);
      return;
    }
    setError('');
    if (draft !== String(value)) onCommit(draft);
  };
  const props = {
    'aria-label': label, 'aria-invalid': Boolean(error), value: draft, maxLength,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !multiline) { event.preventDefault(); commit(); }
      if (event.key === 'Escape') { setDraft(String(value)); setError(''); }
    },
  };
  return <label className={`field ${multiline ? 'wide' : ''}`}><span>{label}</span>
    {multiline ? <textarea {...props} rows={3} /> : <input {...props} type={typeof value === 'number' ? 'number' : 'text'} min={min} max={max} step="any" />}
    {error && <small className="field-error">{error}</small>}
  </label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <label className="field color-field"><span>{label}</span><div><input type="color" aria-label={label} value={draft} onChange={event => setDraft(event.target.value.toUpperCase())} onBlur={() => { if (draft !== value) onChange(draft); }} /><span>{draft.toUpperCase()}</span></div></label>;
}

function ElementView({ element }: { element: DesignElement }) {
  const style: CSSProperties = {
    position: 'absolute', left: element.x, top: element.y, width: element.width, height: element.height,
    background: element.fill, color: element.textColor, fontSize: element.fontSize, borderRadius: element.borderRadius,
    justifyContent: element.type === 'button' ? 'center' : 'flex-start',
    alignItems: element.type === 'button' ? 'center' : 'flex-start',
  };
  return <div className={`design-element ${element.type}`} style={style}>{element.type !== 'rectangle' && element.text}</div>;
}

export default function App() {
  const [project, setProject] = useState<Project>(initialProject);
  const projectRef = useRef(project);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guidesEnabled, setGuidesEnabled] = useState(true);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [notice, setNotice] = useState('Your space to make something good.');
  const gestureRef = useRef<Gesture | null>(null);
  const [scale, setScale] = useState(0.75);
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<{ past: Project[]; future: Project[] }>({ past: [], future: [] });
  const historyRef = useRef(history);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [health, setHealth] = useState<Health>({ state: 'checking', model: '' });
  const healthControllerRef = useRef<AbortController | null>(null);
  const [instruction, setInstruction] = useState('');
  const [aiStatus, setAIStatus] = useState<'idle' | 'requesting' | 'preview' | 'error'>('idle');
  const [aiMessage, setAIMessage] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const proposalRef = useRef<Proposal | null>(null);
  const revisionRef = useRef(0);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const autoEnabledRef = useRef(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const autoPausedRef = useRef(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const autoTimerRef = useRef<number | null>(null);
  const eligibleRevisionRef = useRef<number | null>(null);
  const lastAutoStartRef = useRef<number | null>(null);
  const requestKindRef = useRef<'manual' | 'automatic' | null>(null);
  const instructionRef = useRef(instruction);
  instructionRef.current = instruction;
  const healthRef = useRef(health);
  healthRef.current = health;
  const serialized = JSON.stringify(project);
  const saved = savedSnapshot === serialized;
  const selectedElements = project.elements.filter(element => selectedIds.includes(element.id));
  const selected = selectedElements.length === 1 ? selectedElements[0] : undefined;
  const selectedIndex = selected ? project.elements.findIndex(element => element.id === selected.id) : -1;
  const proposedIds = proposal ? new Set(proposal.suggestion.elements.map(element => element.id)) : null;
  const removedCount = proposedIds ? project.elements.filter(element => !proposedIds.has(element.id)).length : 0;
  const previewScale = Math.min(180 / project.width, 112 / project.height);
  const committedById = proposal ? new Map(project.elements.map((element, index) => [element.id, { element, index }])) : null;
  const proposalChanges = proposal ? proposal.suggestion.elements.filter((element, index) => {
    const committed = committedById!.get(element.id);
    return !committed || committed.index !== index || (Object.keys(element) as (keyof DesignElement)[]).some(key => element[key] !== committed.element[key]);
  }) : [];
  const proposalRemovals = proposedIds ? project.elements.filter(element => !proposedIds.has(element.id)) : [];

  function clearAutoSchedule() {
    if (autoTimerRef.current !== null) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
    eligibleRevisionRef.current = null;
    setAutoWaiting(false);
  }

  function scheduleAutoSuggestion() {
    clearAutoSchedule();
    if (!autoEnabledRef.current || autoPausedRef.current || healthRef.current.state !== 'ready' || gestureRef.current) return;
    const revision = revisionRef.current;
    eligibleRevisionRef.current = revision;
    const cadenceWait = lastAutoStartRef.current === null ? 0 : 15000 - (performance.now() - lastAutoStartRef.current);
    setAutoWaiting(true);
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null;
      eligibleRevisionRef.current = null;
      setAutoWaiting(false);
      if (revisionRef.current !== revision || !autoEnabledRef.current || autoPausedRef.current || gestureRef.current || requestControllerRef.current) return;
      void requestSuggestion('automatic');
    }, Math.ceil(Math.max(1500, cadenceWait)));
  }

  function toggleAutomatic(enabled: boolean) {
    autoEnabledRef.current = enabled;
    setAutoEnabled(enabled);
    clearAutoSchedule();
    if (!enabled && requestKindRef.current === 'automatic') invalidateAI('Live AI turned off. Automatic request cancelled; your design is unchanged.');
    if (enabled) {
      autoPausedRef.current = false;
      setAutoPaused(false);
    }
  }

  function resumeAutomatic() {
    autoPausedRef.current = false;
    setAutoPaused(false);
    setAIMessage('Live AI resumed. Make a new edit when you want another suggestion.');
  }

  function invalidateAI(message = '') {
    clearAutoSchedule();
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    requestKindRef.current = null;
    proposalRef.current = null;
    setProposal(null);
    setAIStatus('idle');
    setShowOriginal(false);
    setAIMessage(message);
  }

  function publish(next: Project, switchingDocument = false) {
    if (!switchingDocument && JSON.stringify(next) === JSON.stringify(projectRef.current)) return;
    const hadProposal = Boolean(proposalRef.current || requestControllerRef.current);
    revisionRef.current += 1;
    clearAutoSchedule();
    if (hadProposal || switchingDocument) invalidateAI(hadProposal ? 'The design changed. A fresh suggestion will use the new version.' : '');
    projectRef.current = next;
    setProject(next);
  }

  function record(before: Project) {
    const next = { past: [...historyRef.current.past.slice(-99), before], future: [] };
    historyRef.current = next;
    setHistory(next);
  }

  function commit(next: Project, eligibleForAI = true) {
    if (JSON.stringify(next) === JSON.stringify(projectRef.current)) return;
    record(projectRef.current);
    publish(next);
    if (eligibleForAI) scheduleAutoSuggestion();
  }

  function patchElement(patch: Partial<DesignElement>) {
    if (!selected) return;
    commit({ ...projectRef.current, elements: projectRef.current.elements.map(element => element.id === selected.id ? { ...element, ...patch } : element) });
  }

  function selectLayer(id: string, additive = false) {
    setSelectedIds(current => additive ? current.includes(id) ? current.filter(entry => entry !== id) : [...current, id] : [id]);
  }

  function layoutSelection(action: LayoutAction) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (gestureRef.current) return;
    try {
      const current = projectRef.current;
      const elements = applyLayout(current, selectedIds, action);
      if (elements === current.elements) { setNotice('Selected layers are already in this layout.'); return; }
      commit({ ...current, elements });
      setNotice('Local layout applied to selected layers only. Undo restores their positions.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not arrange these layers. Your layout is unchanged.');
    }
  }

  function resizeScreen(width: number, height: number) {
    commit({ ...projectRef.current, width, height });
    setNotice(`Screen set to ${width} × ${height}. Element sizes and positions are unchanged.`);
  }

  function fitToView() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const viewport = viewportRef.current;
    const area = boardAreaRef.current;
    if (!viewport || !area) return;
    const padding = getComputedStyle(area);
    const availableWidth = viewport.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const availableHeight = viewport.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - 26;
    setScale(clamp(Math.min(availableWidth / projectRef.current.width, availableHeight / projectRef.current.height), 0.02, 2));
    viewport.scrollTo({ left: 0, top: 0 });
  }
  function add(type: DesignElement['type']) {
    if (projectRef.current.elements.length >= 200) { setNotice('This artboard has reached the 200-element limit.'); return; }
    const element = createElement(type, projectRef.current.elements.length);
    commit({ ...projectRef.current, elements: [...projectRef.current.elements, element] });
    setSelectedIds([element.id]);
    setNotice(`${element.name} added. Drag to place it, or refine its properties.`);
  }

  function reorder(direction: number) {
    const elements = [...projectRef.current.elements];
    const index = selected ? elements.findIndex(element => element.id === selected.id) : -1;
    if (index < 0 || index + direction < 0 || index + direction >= elements.length) return;
    [elements[index], elements[index + direction]] = [elements[index + direction], elements[index]];
    commit({ ...projectRef.current, elements });
  }

  function removeSelected() {
    if (!selectedIds.length) return;
    commit({ ...projectRef.current, elements: projectRef.current.elements.filter(element => !selectedIds.includes(element.id)) });
    setSelectedIds([]);
    setNotice('Selected layers deleted. Undo is always an option.');
  }

  function duplicateSelected() {
    const current = projectRef.current;
    const sources = current.elements.filter(element => selectedIds.includes(element.id));
    if (!sources.length) return;
    if (current.elements.length + sources.length > 200) { setNotice('Duplicating this selection would exceed the 200-layer limit. Choose fewer layers.'); return; }
    const duplicates: string[] = [];
    const elements = current.elements.flatMap(source => {
      if (!selectedIds.includes(source.id)) return [source];
      const duplicate = { ...source, id: crypto.randomUUID(), name: `${source.name.slice(0, 115)} copy`, x: source.x > 7976 ? source.x - 24 : source.x + 24, y: source.y > 7976 ? source.y - 24 : source.y + 24 };
      duplicates.push(duplicate.id);
      return [source, duplicate];
    });
    commit({ ...current, elements });
    setSelectedIds(duplicates);
    setNotice('Selected layers duplicated. Each copy has a new identity and a small offset.');
  }

  function travel(direction: 'undo' | 'redo') {
    if (gestureRef.current) return;
    const current = historyRef.current;
    const source = direction === 'undo' ? current.past : current.future;
    const target = source[source.length - 1];
    if (!target) return;
    const next = direction === 'undo'
      ? { past: current.past.slice(0, -1), future: [...current.future, projectRef.current] }
      : { past: [...current.past, projectRef.current], future: current.future.slice(0, -1) };
    historyRef.current = next;
    setHistory(next);
    publish(target);
    scheduleAutoSuggestion();
    setSelectedIds(ids => ids.filter(id => target.elements.some(element => element.id === id)));
    setNotice(direction === 'undo' ? 'Last change undone.' : 'Change restored.');
  }

  function saveLocal() {
    try {
      const snapshot = JSON.stringify(projectRef.current);
      localStorage.setItem('picasso.project.v1', snapshot);
      setSavedSnapshot(snapshot);
      setNotice('Saved to this browser. Use Open saved to return to it.');
    } catch {
      setNotice('Browser storage is unavailable or full. Export JSON to keep a copy of your work.');
    }
  }

  function replaceDocument(next: Project) {
    gestureRef.current = null;
    publish(next, true);
    const empty = { past: [], future: [] };
    historyRef.current = empty;
    setHistory(empty);
    setSelectedIds([]);
    setGuides([]);
  }

  function loadLocal() {
    try {
      const stored = localStorage.getItem('picasso.project.v1');
      if (!stored) throw new Error('No saved project yet. Save locally first, or import a project JSON file.');
      const next = parseProject(JSON.parse(stored));
      replaceDocument(next);
      setSavedSnapshot(JSON.stringify(next));
      setNotice('Saved project opened. You’re right where you left off.');
    } catch (error) {
      setNotice(`Could not open saved project: ${error instanceof Error ? error.message : 'Storage is unavailable.'} Your current work is unchanged.`);
    }
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const next = parseProject(JSON.parse(await file.text()));
      replaceDocument(next);
      setNotice(`Imported “${next.name || 'Untitled project'}”. Save locally to keep it in this browser.`);
    } catch (error) {
      setNotice(`Import failed: ${error instanceof Error ? error.message : 'The file could not be read.'} Your current work is unchanged.`);
    }
  }

  function exportProject(format: 'json' | 'svg') {
    try {
      const current = projectRef.current;
      const filename = current.name.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) || 'picasso-project';
      download(format === 'json' ? JSON.stringify(current, null, 2) : projectSvg(current), `${filename}.${format}`, format === 'json' ? 'application/json' : 'image/svg+xml');
      setNotice(`${format.toUpperCase()} download prepared. Only your committed design is included.`);
    } catch (error) {
      setNotice(`Export failed: ${error instanceof Error ? error.message : 'Your browser could not start the download.'}`);
    }
  }

  // Register the current action closures so shortcuts always see the latest document and selection.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest('input, textarea, select, [contenteditable]') || gestureRef.current)) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && key === 'z') { event.preventDefault(); travel(event.shiftKey ? 'redo' : 'undo'); }
      else if (modifier && key === 'y') { event.preventDefault(); travel('redo'); }
      else if (modifier && key === 'd') { event.preventDefault(); duplicateSelected(); }
      else if (modifier && key === 's') { event.preventDefault(); saveLocal(); }
      else if (!modifier && (key === 'delete' || key === 'backspace')) { event.preventDefault(); removeSelected(); }
      else if (key === 'escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function startGesture(event: ReactPointerEvent<HTMLElement>, element: DesignElement, mode: Gesture['mode']) {
    if (event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault(); event.stopPropagation();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (event.shiftKey && mode === 'move') { selectLayer(element.id, true); return; }
    const current = projectRef.current.elements.find(entry => entry.id === element.id);
    if (!current) return;
    const pendingRevision = eligibleRevisionRef.current;
    clearAutoSchedule();
    eligibleRevisionRef.current = pendingRevision;
    const ids = mode === 'move' && selectedIds.includes(current.id) ? selectedIds : [current.id];
    const members = projectRef.current.elements.filter(entry => ids.includes(entry.id));
    const x = Math.min(...members.map(entry => entry.x));
    const y = Math.min(...members.map(entry => entry.y));
    const bounds = { ...current, x, y, width: Math.max(...members.map(entry => entry.x + entry.width)) - x, height: Math.max(...members.map(entry => entry.y + entry.height)) - y };
    setSelectedIds(ids);
    gestureRef.current = { ids, mode, startX: event.clientX, startY: event.clientY, before: projectRef.current, element: mode === 'move' ? bounds : current, pointerId: event.pointerId, collapseOnClick: ids.length > 1 ? current.id : null, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveGesture(event: ReactPointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = (event.clientX - gesture.startX) / scale;
    const dy = (event.clientY - gesture.startY) / scale;
    if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 2) return;
    gesture.moved = true;
    if (gesture.mode === 'resize') {
      publish({ ...gesture.before, elements: gesture.before.elements.map(element => element.id === gesture.ids[0] ? { ...element, width: clamp(Math.round(gesture.element.width + dx), 1, 4000), height: clamp(Math.round(gesture.element.height + dy), 1, 4000) } : element) });
      return;
    }
    const subject = { ...gesture.element, x: Math.round(gesture.element.x + dx), y: Math.round(gesture.element.y + dy) };
    const result = guidesEnabled && !event.altKey
      ? getAlignmentGuides({ ...gesture.before, elements: gesture.before.elements.filter(element => !gesture.ids.includes(element.id)) }, subject, 6 / scale)
      : { x: subject.x, y: subject.y, guides: [] };
    const members = gesture.before.elements.filter(element => gesture.ids.includes(element.id));
    const offsetX = clamp(result.x - gesture.element.x, Math.max(...members.map(element => -4000 - element.x)), Math.min(...members.map(element => 8000 - element.x)));
    const offsetY = clamp(result.y - gesture.element.y, Math.max(...members.map(element => -4000 - element.y)), Math.min(...members.map(element => 8000 - element.y)));
    setGuides(result.guides.filter(guide => guide.axis === 'x' ? offsetX === result.x - gesture.element.x : offsetY === result.y - gesture.element.y));
    publish({ ...gesture.before, elements: gesture.before.elements.map(element => gesture.ids.includes(element.id) ? { ...element, x: element.x + offsetX, y: element.y + offsetY } : element) });
  }

  function finishGesture(cancel = false) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    setGuides([]);
    if (cancel) {
      publish(gesture.before);
      if (eligibleRevisionRef.current === revisionRef.current) scheduleAutoSuggestion();
    }
    else if (JSON.stringify(gesture.before) !== JSON.stringify(projectRef.current)) { record(gesture.before); scheduleAutoSuggestion(); }
    else {
      if (gesture.collapseOnClick && !gesture.moved) setSelectedIds([gesture.collapseOnClick]);
      if (eligibleRevisionRef.current === revisionRef.current) scheduleAutoSuggestion();
    }
  }

  async function checkHealth() {
    healthControllerRef.current?.abort();
    const controller = new AbortController();
    healthControllerRef.current = controller;
    setHealth({ state: 'checking', model: '' });
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/health', { signal: controller.signal });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== 'object' || !('ok' in payload) || payload.ok !== true || !('aiConfigured' in payload) || typeof payload.aiConfigured !== 'boolean' || !('model' in payload) || typeof payload.model !== 'string') {
        throw new Error('The AI service returned an invalid health response.');
      }
      if (healthControllerRef.current !== controller) return;
      setHealth({ state: payload.aiConfigured ? 'ready' : 'unconfigured', model: payload.model.slice(0, 120) });
    } catch {
      if (healthControllerRef.current === controller) setHealth({ state: 'unavailable', model: '' });
    } finally {
      window.clearTimeout(timeout);
      if (healthControllerRef.current === controller) healthControllerRef.current = null;
    }
  }

  useEffect(() => {
    void checkHealth();
    return () => {
      if (autoTimerRef.current !== null) window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
      eligibleRevisionRef.current = null;
      const healthController = healthControllerRef.current;
      healthControllerRef.current = null;
      healthController?.abort();
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  async function requestSuggestion(kind: 'manual' | 'automatic' = 'manual') {
    if (requestControllerRef.current || healthRef.current.state !== 'ready' || gestureRef.current) return;
    if (kind === 'automatic' && (!autoEnabledRef.current || autoPausedRef.current)) return;
    if (kind === 'manual' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    invalidateAI();
    if (kind === 'manual') { autoPausedRef.current = false; setAutoPaused(false); }
    else lastAutoStartRef.current = performance.now();
    const controller = new AbortController();
    const requestId = requestIdRef.current;
    const revision = revisionRef.current;
    requestControllerRef.current = controller;
    requestKindRef.current = kind;
    setAIStatus('requesting');
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectRef.current, instruction: instructionRef.current }), signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (requestIdRef.current !== requestId || revisionRef.current !== revision) return;
      if (controller.signal.aborted) throw new Error('Request cancelled.');
      if (!payload || typeof payload !== 'object') throw new Error('The AI service returned an unreadable response. Please try again.');
      if (!response.ok) {
        throw new Error('error' in payload && typeof payload.error === 'string' ? payload.error.slice(0, 2000) : 'The AI service could not complete this request. Please try again.');
      }
      if (!('suggestion' in payload)) throw new Error('The response did not include a complete design. Please try again.');
      const suggestion = parseSuggestion(payload.suggestion);
      const next = { suggestion, requestId, revision };
      proposalRef.current = next;
      setProposal(next);
      setAIStatus('preview');
      setAIMessage('');
    } catch (error) {
      if (requestIdRef.current !== requestId || revisionRef.current !== revision) return;
      setAIStatus('error');
      if (autoEnabledRef.current) { autoPausedRef.current = true; setAutoPaused(true); }
      setAIMessage(timedOut ? 'The AI service took too long. Your design is unchanged. Try again.' : error instanceof SyntaxError ? 'The AI service returned invalid JSON. Your design is unchanged. Try again.' : error instanceof TypeError ? 'Could not reach the AI service. Check that the server is running, then try again.' : error instanceof Error ? error.message : 'The AI service could not be reached. Your design is unchanged. Try again.');
    } finally {
      window.clearTimeout(timeout);
      if (requestControllerRef.current === controller) { requestControllerRef.current = null; requestKindRef.current = null; }
    }
  }

  function acceptSuggestion() {
    const current = proposalRef.current;
    if (!current || current.requestId !== requestIdRef.current || current.revision !== revisionRef.current || gestureRef.current) {
      invalidateAI('This preview is no longer current. Request a fresh suggestion.');
      return;
    }
    const elements = current.suggestion.elements;
    invalidateAI();
    commit({ ...projectRef.current, elements }, false);
    setSelectedIds([]);
    setAIMessage('A fresh direction, made yours. You can undo this change.');
    setNotice('AI layout accepted. Undo restores your previous composition.');
  }

  const iconFor = (type: DesignElement['type']) => type === 'text' ? <Type size={15} /> : type === 'button' ? <Circle size={15} /> : <Square size={15} />;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setSelectedIds([]); }} aria-label="Picasso home"><span className="brand-mark">p<span>✳</span></span><span>picasso<span className="brand-dot">.</span></span></a>
      <span className="header-divider" />
      <div className="document-title"><span>{project.name || 'Untitled project'}</span><small>YOUR PERSONAL DESIGN STUDIO</small></div>
      <div className="topbar-end">
        <span className={`save-state ${saved ? 'is-saved' : ''}`}><span />{saved ? 'Saved locally' : 'Unsaved changes'}</span>
        <div className="history-actions"><button className="icon-button" aria-label="Undo (Ctrl or Command Z)" title="Undo · Ctrl/⌘ Z" disabled={!history.past.length} onClick={() => travel('undo')}><Undo2 size={17} /></button><button className="icon-button" aria-label="Redo (Ctrl or Command Shift Z)" title="Redo · Ctrl/⌘ Shift Z" disabled={!history.future.length} onClick={() => travel('redo')}><Redo2 size={17} /></button></div>
        <details className="file-menu"><summary><FolderOpen size={14} /> Open <ChevronDown size={12} /></summary><div className="menu-popover"><button onClick={loadLocal}><FolderOpen size={14} /> Open saved project</button><button onClick={() => importRef.current?.click()}><Upload size={14} /> Import project JSON</button></div></details>
        <button className="save-button" onClick={saveLocal}><Save size={14} /> Save locally</button>
        <details className="file-menu"><summary><Download size={14} /> Export <ChevronDown size={12} /></summary><div className="menu-popover"><button onClick={() => exportProject('json')}><Download size={14} /> Project JSON</button><button onClick={() => exportProject('svg')}><Download size={14} /> Design SVG</button></div></details>
        <input ref={importRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import Picasso project JSON" onChange={importProject} />
      </div>
    </header>

    <div className="workspace">
      <aside className="left-panel">
        <section className="tools-section"><div className="section-heading"><h2>Create</h2><span className="eyebrow">THE GOOD STUFF</span></div>
          <div className="tool-grid">
            <button onClick={() => add('rectangle')} disabled={project.elements.length >= 200}><Square size={22} /><span>Shape</span></button>
            <button onClick={() => add('text')} disabled={project.elements.length >= 200}><Type size={23} /><span>Text</span></button>
            <button onClick={() => add('button')} disabled={project.elements.length >= 200}><span className="button-tool-icon">↗</span><span>Button</span></button>
          </div>
        </section>
        <section className="layers-section"><div className="section-heading"><h2><Layers size={15} /> Layers</h2><span className="count">{project.elements.length}</span></div>
          <p className="section-caption">{proposal ? 'Committed layers · preview not applied.' : 'Your composition, piece by piece.'}</p>
          <div className="layer-list" aria-label="Design layers">
            {[...project.elements].reverse().map(element => <button key={element.id} className={`layer-row ${selectedIds.includes(element.id) ? 'active' : ''}`} aria-pressed={selectedIds.includes(element.id)} onClick={event => selectLayer(element.id, event.shiftKey)}>
              <span className="layer-icon">{iconFor(element.type)}</span><span>{element.name || `Untitled ${element.type}`}</span>{selectedIds.includes(element.id) && <span className="selected-dot" />}
            </button>)}
            {!project.elements.length && <div className="empty-layers"><Plus size={22} /><p>A blank canvas.<br />Add a shape, text, or button above.</p></div>}
          </div>
          {selected && <div className="layer-order"><button onClick={() => reorder(-1)} disabled={selectedIndex === 0}><ArrowDown size={14} /> Backward</button><button onClick={() => reorder(1)} disabled={selectedIndex === project.elements.length - 1}><ArrowUp size={14} /> Forward</button></div>}
        </section>
        <section className={`ai-section ${proposal ? 'has-proposal' : ''}`} aria-label="AI design partner">
          <div className="ai-heading"><span className="ai-symbol"><Sparkles size={16} /></span><div><h2>A fresh perspective</h2><span>YOUR AI DESIGN PARTNER</span></div><span className={`ai-status-dot ${health.state}`} title={`AI ${health.state}`} /></div>
          <p className="ai-intro">A second pair of eyes.<br />A whole new possibility.</p>
          <div className="ai-availability" role="status">
            {health.state === 'checking' && <span>Checking AI connection…</span>}
            {health.state === 'ready' && <span>Connected · {health.model}</span>}
            {health.state === 'unconfigured' && <span>AI isn’t configured yet. Set GEMINI_API_KEY in the server’s .env file and restart the server. Your editor is ready to use.</span>}
            {health.state === 'unavailable' && <span>AI service unavailable. Start the local server and check the connection. Your editor still works.</span>}
            <button className="health-refresh" aria-label="Check AI connection again" title="Check connection again" disabled={health.state === 'checking'} onClick={() => void checkHealth()}><RefreshCw size={12} /></button>
          </div>
          <>
            <label className="ai-direction"><span>What would you like to explore? <small>Optional</small></span><textarea value={instruction} onChange={event => setInstruction(event.target.value)} maxLength={2000} rows={2} placeholder="A calmer palette, a bolder headline…" /></label>
            <p className="ai-disclosure">Requesting sends your current layout and direction to the configured AI provider. Nothing changes until you accept.</p>
            <button className="ai-request-button" onClick={() => void requestSuggestion()} disabled={health.state !== 'ready' || aiStatus === 'requesting'}>
              {aiStatus === 'requesting' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
              {aiStatus === 'requesting' ? 'Finding a fresh direction…' : aiStatus === 'error' ? 'Try suggestion again' : 'Suggest a fresh direction'}
            </button>
            {aiStatus === 'requesting' && <button className="ai-cancel" onClick={() => invalidateAI('Request cancelled. Your design is unchanged.')}>Cancel request</button>}
          </>
          <div className="live-ai-settings">
            <p id="live-ai-disclosure">Optional live AI sends your current layout and direction to the configured provider after settled edits. Provider usage may incur costs. Nothing is applied automatically. Consent lasts only this session.</p>
            <label><input type="checkbox" aria-label="Enable live AI suggestions" aria-describedby="live-ai-disclosure" checked={autoEnabled} onChange={event => toggleAutomatic(event.target.checked)} /> Live AI after edits</label>
            <p>{!autoEnabled ? 'Off · manual requests only.' : autoPaused ? 'Paused after an AI failure. Editing stays local until you resume or retry.' : health.state !== 'ready' ? 'Waiting for an available provider. Local layout tools work offline.' : autoWaiting ? 'Waiting for edits to settle / request cadence.' : 'On · waits for a new edit. 1.5s settle; at least 15s between automatic starts.'}</p>
            {autoEnabled && autoPaused && <button className="compare-button" onClick={resumeAutomatic}>Resume live AI after next edit</button>}
          </div>
          {aiMessage && <p className={`ai-feedback ${aiStatus === 'error' ? 'error' : ''}`} role="status" aria-live="polite">{aiMessage}</p>}
        </section>
      </aside>

      <main className="canvas-panel">
        <div className="canvas-toolbar"><div><span className="page-chip">01</span>
          <details className="screen-settings"><summary aria-label="Screen settings"><strong>Screen</strong><span>{project.width} × {project.height}</span><ChevronDown size={13} /></summary>
            <div className="screen-popover"><h3>Screen dimensions</h3>
              <label className="field"><span>Screen preset</span><select aria-label="Screen preset" value={project.width === 1440 && project.height === 900 ? 'desktop' : project.width === 768 && project.height === 1024 ? 'tablet' : project.width === 390 && project.height === 844 ? 'mobile' : 'custom'} onChange={event => { const presets: Record<string, [number, number]> = { desktop: [1440, 900], tablet: [768, 1024], mobile: [390, 844] }; const preset = presets[event.target.value]; if (preset) resizeScreen(...preset); }}>
                <option value="custom">Custom dimensions</option><option value="desktop">Desktop · 1440 × 900</option><option value="tablet">Tablet · 768 × 1024</option><option value="mobile">Mobile · 390 × 844</option>
              </select></label>
              <div className="field-grid"><Field label="Screen width" value={project.width} min={240} max={4000} onCommit={value => resizeScreen(Number(value), projectRef.current.height)} /><Field label="Screen height" value={project.height} min={240} max={4000} onCommit={value => resizeScreen(projectRef.current.width, Number(value))} /></div>
              <button className="swap-orientation" onClick={() => resizeScreen(projectRef.current.height, projectRef.current.width)}><RefreshCw size={13} /> Swap orientation</button><p className="field-note">240–4,000 document units. Layers keep their size and position; content beyond the screen is clipped, not resized or repositioned.</p>
            </div>
          </details>
        </div><div className="selection-actions"><button aria-label="Duplicate selected layers (Ctrl or Command D)" title="Duplicate all selected layers · Ctrl/⌘ D" onClick={duplicateSelected} disabled={!selectedIds.length || project.elements.length + selectedIds.length > 200}><Copy size={14} /><span>Duplicate</span></button><button aria-label="Delete selected layers" title="Delete all selected layers" onClick={removeSelected} disabled={!selectedIds.length}><Trash2 size={14} /><span>Delete</span></button></div></div>
        <section className="local-assistance" aria-label="Local layout assistance">
          <div className="local-heading"><strong>Local layout</strong><span>{selectedElements.length} selected · Shift-click to toggle</span><label><input type="checkbox" checked={guidesEnabled} onChange={event => { setGuidesEnabled(event.target.checked); setGuides([]); }} /> Smart guides</label></div>
          <p>{selectedElements.length === 1 ? 'Align to screen.' : 'Align within selection; arrange selected layers only.'} Drag a selected layer to move the selection. Alt bypasses snapping. Works offline.</p>
          <div className="layout-buttons">
            {([['align-left', 'Align left'], ['align-center', 'Align center'], ['align-right', 'Align right'], ['align-top', 'Align top'], ['align-middle', 'Align middle'], ['align-bottom', 'Align bottom'], ['arrange-horizontal', 'Arrange horizontal'], ['arrange-vertical', 'Arrange vertical'], ['arrange-grid', 'Arrange grid']] as [LayoutAction, string][]).map(([action, label]) => <button key={action} aria-label={`${label} selected layers`} disabled={selectedElements.length < (action.startsWith('arrange') ? 2 : 1)} onClick={() => layoutSelection(action)}>{label.replace('Align ', '').replace('Arrange ', '')}</button>)}
          </div>
        </section>
        {(proposal || aiStatus === 'requesting' || aiStatus === 'error' || autoEnabled) && <section className={`canvas-ai-review ${proposal ? 'has-proposal' : ''}`} aria-label="Canvas AI review">
          <div className="canvas-ai-copy">
            <span className="proposal-eyebrow"><Sparkles size={12} /> PROVIDER AI · NEVER AUTO-APPLIED</span>
            <div role="status" aria-live="polite">
              <h3>{proposal ? proposal.suggestion.title || 'A fresh direction' : aiStatus === 'requesting' ? 'AI is reviewing this version…' : autoPaused ? 'Live AI is paused' : aiStatus === 'error' ? 'AI request failed' : autoWaiting ? 'Settling your latest edit…' : 'Live AI is ready for your next edit'}</h3>
            </div>
            {proposal ? <>
              <p className="proposal-rationale">{proposal.suggestion.rationale}</p>
              <p className="replacement-note">Complete replacement: {proposal.suggestion.elements.length} proposed layers; {removedCount} current {removedCount === 1 ? 'layer' : 'layers'} removed. Violet ghosts mark proposed additions/changes; removal outlines label deleted layers. Compare with original hides these marks. The committed canvas stays editable; screen settings stay unchanged.</p>
              <div className="canvas-review-actions"><button className="compare-button" aria-pressed={showOriginal} onClick={() => setShowOriginal(current => !current)}>{showOriginal ? 'View proposed layout' : 'Compare with original'}</button><button className="accept-button" onClick={acceptSuggestion}><Check size={14} /> Accept layout</button><button className="dismiss-button" onClick={() => invalidateAI('Suggestion dismissed. Your design is unchanged.')}>Dismiss</button></div>
            </> : <><p>{aiStatus === 'requesting' ? 'Keep editing. A document change cancels this request; only a current proposal can be accepted.' : autoPaused ? 'No automatic retries. Resume explicitly or retry manually; your design is unchanged.' : aiStatus === 'error' ? aiMessage : 'Local guides and layout tools are immediate and offline. AI waits for settled document edits, not selection or zoom.'}</p>
              {aiStatus === 'requesting' && <button className="ai-cancel" onClick={() => invalidateAI('Request cancelled. A new edit or manual request is required.')}>Cancel AI request</button>}
              {aiStatus === 'error' && <button className="compare-button" disabled={health.state !== 'ready'} onClick={() => void requestSuggestion()}>Retry AI request</button>}
            </>}
          </div>
          {proposal && <div className="proposal-preview"><span>{showOriginal ? 'ORIGINAL · COMMITTED' : 'PROPOSED · NOT APPLIED'}</span><div className="proposal-preview-viewport" aria-label={showOriginal ? 'Original committed layout comparison' : 'Proposed complete replacement layout, not yet applied'}><div className={`proposal-miniature ${showOriginal ? '' : 'is-proposed'}`} style={{ width: project.width, height: project.height, background: project.background, transform: `scale(${previewScale})` }}>
            {(showOriginal ? project.elements : proposal.suggestion.elements).map(element => <ElementView key={element.id} element={element} />)}
          </div></div></div>}
        </section>}
        <div ref={viewportRef} className="canvas-scroll" onPointerDown={event => { if (event.target === event.currentTarget || event.target === boardAreaRef.current) { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setSelectedIds([]); } }}>
          <div ref={boardAreaRef} className="artboard-area"><div className="artboard-label"><span>{project.name || 'Untitled project'} · COMMITTED DESIGN</span><span>{project.width} × {project.height}</span></div>
            <div className="artboard-frame" style={{ width: project.width * scale, height: project.height * scale }}>
              <div className="artboard" style={{ width: project.width, height: project.height, background: project.background, transform: `scale(${scale})` }} onPointerDown={event => { if (event.target === event.currentTarget) { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setSelectedIds([]); } }} onPointerMove={moveGesture} onPointerUp={() => finishGesture()} onPointerCancel={() => finishGesture(true)} onLostPointerCapture={() => finishGesture()}>
                {project.elements.map(element => <div className="element-hit-area" key={element.id} style={{ left: element.x, top: element.y, width: element.width, height: element.height }} onPointerDown={event => startGesture(event, element, 'move')} aria-label={`${element.name || element.type}, drag to move`}>
                  <ElementView element={{ ...element, x: 0, y: 0 }} />
                </div>)}
                {proposal && !showOriginal && <>
                  {proposalChanges.map(element => <div key={`proposal-${element.id}`} className="canvas-proposal-ghost" aria-label={`Proposed ${committedById!.has(element.id) ? 'change' : 'addition'}: ${element.name || element.type}, not applied`} style={{ left: element.x, top: element.y, width: element.width, height: element.height, outlineWidth: 1.5 / scale, borderRadius: element.borderRadius }}>
                    <ElementView element={{ ...element, x: 0, y: 0 }} />
                    <span className="canvas-proposal-badge" style={{ transform: `scale(${1 / scale})` }}>{committedById!.has(element.id) ? 'AI CHANGE' : 'AI ADDITION'} · NOT APPLIED</span>
                  </div>)}
                  {proposalRemovals.map(element => <div key={`removal-${element.id}`} className="canvas-proposal-removal" aria-label={`Proposed removal: ${element.name || element.type}, not applied`} style={{ left: element.x, top: element.y, width: element.width, height: element.height, outlineWidth: 1.5 / scale, borderRadius: element.borderRadius }}><span className="canvas-proposal-badge" style={{ transform: `scale(${1 / scale})` }}>AI REMOVAL · NOT APPLIED</span></div>)}
                </>}
                {selectedElements.map(element => <div key={element.id} className="selection-outline" style={{ left: element.x, top: element.y, width: element.width, height: element.height }}>{selected && <><span className="selection-size">{Math.round(element.width)} × {Math.round(element.height)}</span><i className="handle top-left" /><i className="handle top-right" /><i className="handle bottom-left" /><button className="handle resize-handle" style={{ width: 14 / scale, height: 14 / scale, right: -7 / scale, bottom: -7 / scale }} aria-label="Resize selected element" onPointerDown={event => startGesture(event, element, 'resize')} /></>}</div>)}
                {guides.map(guide => <div key={guide.axis} className={`alignment-guide guide-${guide.axis}`} style={guide.axis === 'x' ? { left: guide.position, width: 1 / scale } : { top: guide.position, height: 1 / scale }} />)}
                {!project.elements.length && <div className="artboard-empty"><span>Let’s make something.</span><p>Choose a tool on the left to begin.</p></div>}
              </div>
            </div>
          </div>
        </div>
        <footer className="canvas-footer"><span className="operation-notice" role="status" aria-live="polite"><Check size={13} /> {notice}</span><div className="zoom-controls"><button className="fit-button" onClick={fitToView} aria-label="Fit screen to view">Fit to view</button><button className="icon-button" aria-label="Zoom out" disabled={scale <= 0.02} onClick={() => setScale(current => clamp(Math.round((current - 0.25) * 100) / 100, 0.02, 2))}><Minus size={13} /></button><button className="zoom-reset" aria-label="Reset zoom to 100 percent" title="Reset to 100%" onClick={() => setScale(1)}>{Math.round(scale * 100)}%</button><button className="icon-button" aria-label="Zoom in" disabled={scale >= 2} onClick={() => setScale(current => clamp(Math.round((current + 0.25) * 100) / 100, 0.02, 2))}><Plus size={13} /></button></div></footer>
      </main>

      <aside className="right-panel">
        <div className="inspector-title"><h2>{selected ? 'Design properties' : selectedElements.length > 1 ? 'Selection' : 'Artboard settings'}</h2><span className="inspector-badge">{selected ? selected.type : selectedElements.length > 1 ? `${selectedElements.length} LAYERS` : 'PROJECT'}</span></div>
        <div className="inspector-scroll">
          {selected ? <div key={selected.id}>
            <section className="inspector-section"><div className="section-heading"><h3>Selected element</h3><button className="icon-button" onClick={() => setSelectedIds([])} aria-label="Deselect element"><X size={15} /></button></div>
              <Field label="Layer name" value={selected.name} onCommit={name => patchElement({ name })} />
            </section>
            <section className="inspector-section"><h3>Position & size</h3><div className="field-grid">
              {(['x', 'y', 'width', 'height'] as const).map(key => <Field key={key} label={key === 'x' ? 'X position' : key === 'y' ? 'Y position' : key === 'width' ? 'Width' : 'Height'} value={selected[key]} min={key === 'x' || key === 'y' ? -4000 : 1} max={key === 'x' || key === 'y' ? 8000 : 4000} onCommit={value => patchElement({ [key]: Number(value) })} />)}
            </div></section>
            <section className="inspector-section"><h3>Appearance</h3><ColorField label="Fill color" value={selected.fill} onChange={fill => patchElement({ fill })} /><Field label="Corner radius" value={selected.borderRadius} min={0} max={2000} onCommit={value => patchElement({ borderRadius: Number(value) })} /></section>
            {selected.type !== 'rectangle' && <section className="inspector-section"><h3>Typography</h3><Field label="Text content" value={selected.text} maxLength={2000} multiline onCommit={text => patchElement({ text })} /><Field label="Font size" value={selected.fontSize} min={1} max={300} onCommit={value => patchElement({ fontSize: Number(value) })} /><ColorField label="Text color" value={selected.textColor} onChange={textColor => patchElement({ textColor })} /></section>}
          </div> : selectedElements.length > 1 ? <section className="inspector-section"><h3>{selectedElements.length} layers selected</h3><p className="section-caption">Drag any selected layer to move all. Local align, arrange, Duplicate and Delete affect the entire selection. Select one layer to edit individual properties or stacking order.</p><button className="swap-orientation" onClick={() => setSelectedIds([])}>Clear selection</button></section> : <>
            <section className="inspector-section"><h3>A space of your own</h3><p className="section-caption">Set the stage for your next idea.</p><Field label="Project name" value={project.name} onCommit={name => commit({ ...projectRef.current, name })} /></section>
            <section className="inspector-section"><h3>Dimensions</h3><div className="field-grid"><Field label="Width" value={project.width} min={240} max={4000} onCommit={value => commit({ ...projectRef.current, width: Number(value) })} /><Field label="Height" value={project.height} min={240} max={4000} onCommit={value => commit({ ...projectRef.current, height: Number(value) })} /></div><p className="field-note">Document units · 240–4,000 px</p></section>
            <section className="inspector-section"><h3>Canvas</h3><ColorField label="Background" value={project.background} onChange={background => commit({ ...projectRef.current, background })} /></section>
            <div className="inspector-tip"><MousePointer2 size={19} /><h3>Find your flow</h3><p>Select any element to make it yours. Drag to move, use the corner to resize, or fine-tune the details right here.</p></div>
          </>}
        </div>
        <div className="inspector-footer"><span className="privacy-dot" /> Local-first. Always in your hands.</div>
      </aside>
    </div>
  </div>;
}
