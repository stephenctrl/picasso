import { useState } from 'react';
import ProjectPreview from '../../components/ProjectPreview';
import type { Project } from '../../types';
import { useErrors } from '../../components/ErrorHandling';

interface HomePageProps {
  project: Project;
  saved: boolean;
  onOpenSaved: () => string | null;
}

export default function HomePage({ project, saved, onOpenSaved }: HomePageProps) {
  const { reportError } = useErrors();
  const [openStatus, setOpenStatus] = useState<string | null>(null);

  function openSaved() {
    try {
      setOpenStatus(onOpenSaved());
    } catch (error) {
      const message = 'The saved project could not be opened. Open the editor for recovery options before trying again.';
      setOpenStatus(message);
      reportError({ title: 'Could not open saved project', message, recovery: { href: '#/editor', label: 'Open editor' } }, error);
    }
  }

  return (
    <div className="studio-page page-home">
      <header className="page-hero">
        <div>
          <p className="page-eyebrow">A quieter kind of creative tool</p>
          <h1 tabIndex={-1}>Make room for<br /><em>your next idea.</em></h1>
          <p className="page-intro">A canvas for your thoughts. Shape a composition, make it your own, and take the HTML &amp; CSS with you.</p>
          <div className="page-actions">
            <a className="page-button page-button-primary" href="#/editor">Continue in editor <span aria-hidden="true">↗</span></a>
            <a className="page-text-link" href="#/templates">Find a starting point <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <div className="page-hero-note">
          <span className="page-note-line" aria-hidden="true" />
          <p>Less setup.<br />More possibility.</p>
          <span>Local-first. Yours to shape.</span>
        </div>
      </header>

      <section className="page-current-card" aria-labelledby="page-current-heading">
        <ProjectPreview project={project} className="page-current-preview" />
        <div className="page-current-details">
          <div className="page-section-topline">
            <p className="page-eyebrow">Current session</p>
            <span className={`page-state ${saved ? 'page-state-saved' : ''}`}><span aria-hidden="true" />{saved ? 'Saved locally' : 'Unsaved changes'}</span>
          </div>
          <h2 id="page-current-heading">{project.name || 'Untitled project'}</h2>
          <p className="page-muted">Your actual canvas, right where you left it in this session.</p>
          <dl className="page-project-facts">
            <div><dt>Artboard</dt><dd>{project.width} × {project.height} <span>px</span></dd></div>
            <div><dt>Composition</dt><dd>{project.elements.length} <span>{project.elements.length === 1 ? 'element' : 'elements'}</span></dd></div>
          </dl>
          <a className="page-button page-button-outline" href="#/editor">Open this canvas <span aria-hidden="true">→</span></a>
          <p className="page-small">Moving between pages keeps this session. Save locally before reloading or closing the tab.</p>
        </div>
      </section>

      <div className="page-home-bottom">
        <section className="page-info-card" aria-labelledby="page-local-heading">
          <p className="page-eyebrow">A note on keeping your work</p>
          <h2 id="page-local-heading">One browser. One saved slot.</h2>
          <p>Save locally replaces the single saved project in this browser. There is no account or cloud library, and browser storage can be cleared or unavailable.</p>
          <p>Export project JSON from the editor for a portable, editable backup. To import one, use <strong>Editor → Open → Import project JSON</strong>.</p>
          <button className="page-button page-button-outline" type="button" onClick={openSaved}>Open saved project <span aria-hidden="true">↗</span></button>
          <p className={openStatus ? 'page-status' : 'page-status-empty'} role="status" aria-live="polite" aria-atomic="true">{openStatus}</p>
        </section>
        <section className="page-info-card page-guide-card" aria-labelledby="page-guide-heading">
          <p className="page-eyebrow">A good place to begin</p>
          <h2 id="page-guide-heading">From a shape to something yours.</h2>
          <p>Start with a canvas, add a few elements, then explore the code behind your composition. No setup required for the local tools.</p>
          <ol className="page-mini-steps">
            <li><span>01</span> Compose with shapes, text, and buttons.</li>
            <li><span>02</span> Inspect the HTML &amp; CSS.</li>
            <li><span>03</span> Save a backup. Take your work with you.</li>
          </ol>
          <a className="page-text-link" href="#/guide">Get to know Picasso <span aria-hidden="true">→</span></a>
        </section>
      </div>
      <footer className="page-footer-note">A single artboard. A little room to experiment.</footer>
    </div>
  );
}
