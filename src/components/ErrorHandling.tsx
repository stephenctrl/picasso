import { Component, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { download } from '../export';
import type { Project } from '../types';

type Failure = { title: string; message: string; recovery?: { href: string; label: string } };
type ReportError = (failure: Failure, diagnostic?: unknown) => void;
type ErrorServices = { reportError: ReportError; rememberProject: (project: Project) => void; snapshot: { current: string | null } };
const ErrorContext = createContext<ErrorServices | null>(null);

export function useErrors() {
  const services = useContext(ErrorContext);
  if (!services) throw new Error('Error reporting provider is missing.');
  return services;
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [failure, setFailure] = useState<Failure | null>(null);
  const snapshot = useRef<string | null>(null);
  const lastDiagnostic = useRef<{ value: unknown; at: number } | null>(null);
  const reportError = useCallback<ReportError>((next, diagnostic) => {
    // Diagnostics stay in developer tools, never in the user-facing message.
    console.error(`[Picasso] ${next.title}`, diagnostic);
    const value = diagnostic && typeof diagnostic === 'object' && 'error' in diagnostic ? diagnostic.error : diagnostic;
    const now = Date.now();
    if (value != null && lastDiagnostic.current?.value === value && now - lastDiagnostic.current.at < 1000) return;
    lastDiagnostic.current = { value, at: now };
    setFailure(current => current?.title === next.title && current.message === next.message && current.recovery?.href === next.recovery?.href ? current : next);
  }, []);
  const rememberProject = useCallback((project: Project) => {
    try { snapshot.current = JSON.stringify(project, null, 2); }
    catch (error) { reportError({ title: 'Recovery snapshot unavailable', message: 'The latest recovery snapshot could not be prepared. Try exporting project JSON before leaving this tab.' }, error); }
  }, [reportError]);

  useEffect(() => {
    const reportUnexpected = (diagnostic: unknown) => reportError({ title: 'Unexpected application error', message: 'An unexpected error occurred. Check your current work before continuing. No automatic rollback or reload was performed; export project JSON if the editor is available.' }, diagnostic);
    const onError = (event: ErrorEvent) => reportUnexpected(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportUnexpected(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [reportError]);

  return <ErrorContext.Provider value={{ reportError, rememberProject, snapshot }}>
    {children}
    <aside className="error-popup-host" aria-label="Application notifications">
      {failure && <section className="error-popup" aria-label={failure.title}>
        <div role="alert" aria-atomic="true"><strong><AlertCircle size={18} aria-hidden="true" />{failure.title}</strong><p>{failure.message}</p></div>
        {failure.recovery && <a href={failure.recovery.href}>{failure.recovery.label}</a>}
        <button type="button" className="error-popup-dismiss" aria-label="Dismiss error notification" onClick={() => setFailure(null)}><X size={18} aria-hidden="true" /></button>
      </section>}
    </aside>
  </ErrorContext.Provider>;
}

type BoundaryProps = { children: ReactNode; title: string; reportError: ReportError; fallback: (retry: () => void) => ReactNode };
export class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.reportError({ title: this.props.title, message: 'This part of the application could not be displayed. Use the recovery options on the page; no automatic reload was performed.' }, { error, componentStack: info.componentStack });
  }
  render() { return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children; }
}

export function CrashRecovery({ root = false }: { root?: boolean }) {
  const { snapshot, reportError } = useErrors();
  const backup = snapshot.current;
  function saveBackup() {
    if (!backup) return;
    try { download(backup, 'picasso-recovery.json', 'application/json'); }
    catch (error) { reportError({ title: 'Recovery download failed', message: 'Select the recovery JSON below and copy it into a .json file manually.' }, error); }
  }
  return <section className="failure-page" aria-labelledby="crash-heading">
    <h1 id="crash-heading">{root ? 'The workspace could not be displayed.' : 'The editor could not be displayed.'}</h1>
    <p>The editor has not been reset to a new document. Unsaved drafts and history may not be recoverable. Nothing was automatically saved or reloaded.</p>
    {backup ? <><p>This is the last committed session snapshot received by the shell, not a guarantee of the latest draft. Keep a backup before manually reloading, then import the JSON to restore that snapshot.</p><button type="button" onClick={saveBackup}>Download recovery JSON</button><label className="recovery-json">Recovery JSON<textarea readOnly value={backup} onFocus={event => event.currentTarget.select()} /></label></> : <p>No committed session snapshot is available. An existing browser save or previously exported JSON may still be available after a manual reload.</p>}
    {!root && <a href="#/home">Back to Home</a>}
  </section>;
}
