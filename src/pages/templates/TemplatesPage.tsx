import { useState } from 'react';
import ProjectPreview from '../../components/ProjectPreview';
import type { Project } from '../../types';
import { projectTemplates } from './templates';
import { useErrors } from '../../components/ErrorHandling';

interface TemplatesPageProps {
  onStartProject: (project: Project) => void;
}

export default function TemplatesPage({ onStartProject }: TemplatesPageProps) {
  const { reportError } = useErrors();
  const [previews] = useState(() => projectTemplates.map(template => template.createProject()));

  return (
    <div className="studio-page page-templates">
      <header className="page-hero page-hero-compact">
        <div>
          <p className="page-eyebrow">Small beginnings, open possibilities</p>
          <h1 tabIndex={-1}>Find your <em>starting point.</em></h1>
          <p className="page-intro">An open canvas or a little inspiration. Each starter is a real, editable composition, ready for your own point of view.</p>
        </div>
      </header>

      <div className="page-template-grid">
        {projectTemplates.map((template, index) => {
          const project = previews[index];
          return (
            <article className="page-template-card" key={template.id} aria-labelledby={`page-template-${template.id}`}>
              <div className="page-template-image">
                <ProjectPreview project={project} />
                <span className="page-template-number" aria-hidden="true">0{index + 1}</span>
              </div>
              <div className="page-template-content">
                <p className="page-eyebrow">{template.category}</p>
                <h2 id={`page-template-${template.id}`}>{template.name}</h2>
                <p className="page-template-description">{template.description}</p>
                <p className="page-template-meta">{project.width} × {project.height} px <span aria-hidden="true">/</span> {project.elements.length} {project.elements.length === 1 ? 'element' : 'elements'}</p>
                <button
                  className="page-button page-button-outline"
                  type="button"
                  onClick={() => {
                    try { onStartProject(template.createProject()); }
                    catch (error) { reportError({ title: 'Could not create starter', message: 'The starter could not be created. Your current document was not replaced. Try again when the browser is working normally.', recovery: { href: '#/editor', label: 'Return to editor' } }, error); }
                  }}
                  aria-label={`Use starter: ${template.name}`}
                >Use starter <span aria-hidden="true">↗</span></button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="page-template-note" aria-labelledby="page-template-note-heading">
        <div>
          <p className="page-eyebrow">A composition, not a complete website</p>
          <h2 id="page-template-note-heading">A clear canvas. An honest starting point.</h2>
        </div>
        <div>
          <p>These are fixed-size, flat artboards—not responsive layouts. Every shape, text block, and button can be edited. Sample buttons are visual elements with no application behavior.</p>
          <p>Using a starter replaces the current session after confirmation if you have unsaved work. It does not overwrite your browser’s saved slot until you choose Save locally.</p>
          <a className="page-text-link" href="#/guide">Learn how the editor works <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <footer className="page-footer-note"><a className="page-text-link" href="#/editor">Keep working on your current canvas <span aria-hidden="true">→</span></a></footer>
    </div>
  );
}
