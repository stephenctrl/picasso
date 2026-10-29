import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Home, LayoutTemplate, PenTool } from 'lucide-react';
import EditorPage from './pages/editor/EditorPage';
import type { EditorHandle, EditorSession } from './pages/editor/EditorPage';
import HomePage from './pages/home/HomePage';
import TemplatesPage from './pages/templates/TemplatesPage';
import GuidePage from './pages/guide/GuidePage';
import type { Project } from './types';
import { CrashRecovery, ErrorBoundary, useErrors } from './components/ErrorHandling';
import './pages/pages.css';
import './app.css';

const pages = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/templates', label: 'Templates', icon: LayoutTemplate },
  { path: '/editor', label: 'Editor', icon: PenTool },
  { path: '/guide', label: 'Guide', icon: BookOpen },
] as const;


export default function App() {
  const { reportError, rememberProject } = useErrors();
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/home');
  const [session, setSession] = useState<EditorSession | null>(null);
  const editor = useRef<EditorHandle>(null);
  const main = useRef<HTMLElement>(null);
  const updateSession = useCallback((next: EditorSession) => {
    rememberProject(next.project);
    setSession(next);
  }, [rememberProject]);
  const isEditor = path === '/editor';
  const page = pages.find(entry => entry.path === path);

  useEffect(() => {
    const navigate = () => setPath(window.location.hash.slice(1) || '/home');
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    document.title = `${page?.label ?? 'Page not found'} — Picasso`;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [path, page]);

  function startProject(project: Project) {
    try {
      if (!editor.current) throw new Error('Editor handle is unavailable.');
      if (editor.current.startProject(project)) window.location.hash = '/editor';
    } catch (error) {
      reportError({ title: 'Could not open starter', message: 'The starter could not be opened. Check the editor and keep a JSON backup of your current work before trying again.', recovery: { href: '#/editor', label: 'Open editor' } }, error);
    }
  }

  function openSaved() {
    try {
      if (!editor.current) throw new Error('Editor handle is unavailable.');
      const error = editor.current.openSaved();
      if (!error) window.location.hash = '/editor';
      return error;
    } catch (error) {
      const message = 'The saved project could not be opened. Open the editor for available recovery options.';
      reportError({ title: 'Could not open saved project', message, recovery: { href: '#/editor', label: 'Open editor' } }, error);
      return message;
    }
  }

  return <div className={`site-shell${isEditor ? ' site-shell-editor' : ''}`}>
    <a className="site-skip-link" href="#page-content" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Skip to page content</a>
    <header className="site-header">
      <a className="site-wordmark" href="#/home" aria-label="Picasso workspace home">picasso<span>.</span></a>
      <nav aria-label="Main navigation">
        {pages.map(({ path: destination, label, icon: Icon }) => <a key={destination} href={`#${destination}`} aria-current={path === destination ? 'page' : undefined}><Icon size={16} aria-hidden="true" /><span>{label}</span></a>)}
      </nav>
      <span className="site-local-note">Your local design studio</span>
    </header>
    <main id="page-content" ref={main} tabIndex={-1} aria-label={page?.label ?? 'Page not found'}>
      <ErrorBoundary key={path} title={`${page?.label ?? 'Page'} unavailable`} reportError={reportError} fallback={retry => <section className="failure-page"><h1>This page could not be displayed.</h1><p>The editor session remains separate from this page. You can return to it or explicitly retry this page.</p><button type="button" onClick={retry}>Retry page</button><a href="#/editor">Open editor</a></section>}>
      {path === '/home' && session && <HomePage project={session.project} saved={session.saved} onOpenSaved={openSaved} />}
      {path === '/templates' && <TemplatesPage onStartProject={startProject} />}
      {path === '/guide' && <GuidePage />}
      {!page && <section className="site-not-found"><span className="site-kicker">A little off canvas</span><h1>That page isn’t here.</h1><p>Your current design is still in the editor. Choose a page above or head home.</p><a href="#/home"><ArrowLeft size={16} /> Back to Home</a></section>}
      </ErrorBoundary>
      <div hidden={!isEditor} className="site-editor-page">
        <h1 className="visually-hidden">Design editor</h1>
        <ErrorBoundary title="Editor unavailable" reportError={reportError} fallback={() => <CrashRecovery />}>
          <EditorPage ref={editor} active={isEditor} onSessionChange={updateSession} />
        </ErrorBoundary>
      </div>
    </main>
  </div>;
}
