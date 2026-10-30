export default function GuidePage() {
  return (
    <div className="studio-page page-guide">
      <header className="page-hero page-hero-compact">
        <div>
          <p className="page-eyebrow">A little guidance, a lot of possibility</p>
          <h1 tabIndex={-1}>From first shape<br />to <em>finished composition.</em></h1>
          <p className="page-intro">The essentials for making, understanding, and keeping your work. Start small. Everything on the canvas is yours to adjust.</p>
          <div className="page-actions">
            <a className="page-button page-button-primary" href="#/editor">Open the editor <span aria-hidden="true">↗</span></a>
            <a className="page-text-link" href="#/templates">Choose a starter <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </header>

      <div className="page-guide-grid">
        <section className="page-guide-section" aria-labelledby="page-compose-heading">
          <span className="page-step-number" aria-hidden="true">01 / COMPOSE</span>
          <h2 id="page-compose-heading">Give your idea some shape.</h2>
          <ol className="page-task-list">
            <li><strong>Set the scene.</strong> Open Screen to choose a Phone, Tablet, Laptop, or Desktop layout. Custom lets you apply a width:height ratio at a chosen screen width, enter exact dimensions, or swap orientation. Each side supports 240–4,000 units. Layers retain their sizes and positions; content outside the screen is clipped. Set the background in the inspector, or begin with a starter.</li>
            <li><strong>Add the building blocks.</strong> Drag a box/panel, headline, paragraph, or button onto the Design canvas. You can also click a component or focus it and press Enter to create it.</li>
            <li><strong>Make it yours.</strong> Hover an element’s edge or corner and drag to resize it; drag the interior to move. You can resize an unselected element directly. Escape cancels the active drag, and completed drags support undo/redo. Select an element to edit position, dimensions, fill, and text properties. Double-click inside text or a button, or choose Edit text, to edit its plain text. Done or leaving the field commits the draft; Escape cancels it.</li>
            <li><strong>Bring things into balance.</strong> Use layers to select and reorder. Shift-click elements or layers for multiple selection. Alignment uses the artboard for one element and the selection bounds for multiple elements. Local guides and layout assistance work offline.</li>
          </ol>
          <p>Choose <strong>System, Light, or Dark</strong> for the interface. Your theme choice does not change the canvas colors or exported design.</p>
          <p className="page-callout">A box is one element, not a container. Headline text is a styled paragraph, not a semantic heading. This editor builds flat compositions, not nested page structures.</p>
        </section>

        <section className="page-guide-section" aria-labelledby="page-output-heading">
          <span className="page-step-number" aria-hidden="true">02 / UNDERSTAND</span>
          <h2 id="page-output-heading">See what you are making.</h2>
          <p><strong>Design, Code, and Preview</strong> are three views of the same committed document. An unaccepted AI suggestion is not included in the output.</p>
          <ul className="page-task-list">
            <li><strong>Design</strong> is where you arrange elements and edit their properties.</li>
            <li><strong>Code</strong> shows the generated HTML and CSS. Use the copy controls, or select and copy the code manually if browser clipboard permissions block the action.</li>
            <li><strong>Preview</strong> shows the composition without editing controls. Export standalone HTML to take the rendered page with you, or SVG for a vector representation.</li>
          </ul>
          <p className="page-callout">Output uses a fixed-size artboard with absolute positioning. It does not become a responsive website. Generated buttons have no authored navigation, form submission, or backend behavior.</p>
        </section>

        <section className="page-guide-section" aria-labelledby="page-keep-heading">
          <span className="page-step-number" aria-hidden="true">03 / KEEP</span>
          <h2 id="page-keep-heading">Give your work a safe place.</h2>
          <p><strong>Save locally</strong> writes to one saved slot in this browser. Saving a different document replaces that slot; this is not a project library or cloud backup. Use <strong>Open → Open saved project</strong> in the editor, or Open saved project on Home, to restore it.</p>
          <p>Moving between Picasso pages keeps your current session. Reloading or closing the tab does not save your changes, and a reload does not automatically reopen the saved project.</p>
          <p>For a portable, editable backup, <strong>export project JSON</strong>. Restore a Picasso version-1 file through <strong>Editor → Open → Import project JSON</strong>. HTML and SVG are output formats, not editable project imports.</p>
          <p className="page-callout">Browser storage can be cleared or unavailable. Keep a JSON copy of anything you want to keep long term, and check the editor’s save feedback before leaving.</p>
        </section>

        <section className="page-guide-section" aria-labelledby="page-shortcuts-heading">
          <span className="page-step-number" aria-hidden="true">04 / FIND YOUR FLOW</span>
          <h2 id="page-shortcuts-heading">A few useful shortcuts.</h2>
          <p>Use Control on Windows/Linux or Command on macOS. Document shortcuts are active in the editor, not on these pages.</p>
          <dl className="page-shortcuts">
            <div><dt>Undo</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Z</kbd></dd></div>
            <div><dt>Redo</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd><span>or <kbd>Ctrl / ⌘</kbd> + <kbd>Y</kbd></span></dd></div>
            <div><dt>Save locally</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>S</kbd></dd></div>
            <div><dt>Duplicate selection</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>D</kbd></dd></div>
            <div><dt>Delete selection</dt><dd><kbd>Delete</kbd> / <kbd>Backspace</kbd></dd></div>
            <div><dt>Nudge 1 pixel</dt><dd><kbd>Arrow keys</kbd></dd></div>
            <div><dt>Nudge 10 pixels</dt><dd><kbd>Shift</kbd> + <kbd>Arrow keys</kbd></dd></div>
            <div><dt>Cancel drag / text draft / clear selection</dt><dd><kbd>Escape</kbd></dd></div>
          </dl>
          <p className="page-small">Duplicate, delete, and nudge apply in Design with canvas or layer focus. While typing in a field, normal text-editing behavior takes priority. Nudge distances are document pixels, independent of zoom.</p>
        </section>
      </div>

      <section className="page-ai-note" aria-labelledby="page-ai-heading">
        <div>
          <p className="page-eyebrow">Optional assistance, deliberate choices</p>
          <h2 id="page-ai-heading">Your canvas.<br />Your decision.</h2>
        </div>
        <div>
          <p>Local editing, layout tools, and saving do not need AI. For optional assistance, configure <code>OPENAI_API_KEY</code> on the server. <code>OPENAI_MODEL</code> defaults to <code>gpt-5.4</code>; an optional <code>OPENAI_BASE_URL</code> must support OpenAI-compatible Chat Completions with image input and strict structured output. Keep credentials out of browser settings and project files.</p>
          <p>Describe your revision direction and optionally attach a PNG, JPEG, or WebP reference, up to 5 MiB. References are normalized to JPEG at at most 1600 pixels on the longest edge. A request sends your current canvas image, layout, direction, and attached reference to the provider. Attachments stay in the session, not in saves or exports.</p>
          <p>Review the suggestion’s preview and rationale, then <strong>Accept</strong> or <strong>Dismiss</strong>. Only Accept changes your document; you can undo it. Live AI starts off, is session-scoped, and switches off when you leave the editor. If you opt in, settled edits can also send requests.</p>
          <p className="page-small">Provider usage may cost money. Avoid sending sensitive content. Configuration does not guarantee connectivity or quota; if assistance fails, your canvas stays unchanged and you can keep working locally.</p>
        </div>
      </section>

      <footer className="page-guide-cta">
        <div><p className="page-eyebrow">Enough reading. A little making.</p><h2>See where your idea takes you.</h2></div>
        <a className="page-button page-button-primary" href="#/editor">Back to the canvas <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  );
}
