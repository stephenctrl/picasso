# Picasso page model

## Product boundary

Picasso remains a local-first, single-artboard HTML/CSS editor. These pages provide a clear entrance, usable local starters and workflow guidance; the existing editor remains the authoring application. There is one browser save slot (`picasso.project.v1`), not a project library. No authentication, cloud projects, collaboration, billing, image library, provider settings UI or responsive-layout generator is introduced.

Do not display invented project counts, saved timestamps, user accounts, recent-project lists, template popularity, AI results or service availability. Any project name, dimensions, layer count and thumbnail shown on Home must derive from the actual in-session `Project`. A starter is explicitly sample content, never presented as the user's saved work.

## Pages and responsibilities

| Page | Hash route | Responsibility | Real actions |
| --- | --- | --- | --- |
| Home | `#/home` | Orient the user around their current in-session composition and explain local persistence. | Open/continue editor, open the one saved project, browse starters, read the guide. |
| Templates | `#/templates` | Offer a small catalog of working local `Project` documents with truthful previews and dimensions. | Start a blank artboard or use either supplied composition; cancel replacement without changing work. |
| Guide | `#/guide` | Explain the existing edit → code → preview → save/export workflow and its limits. | Navigate to editor or starters; read keyboard, local-save and optional-AI guidance. |
| Editor | `#/editor` | Preserve the current full design workspace and every existing editing, history, import/export, code, preview and optional-AI operation. | Existing editor actions; navigate to other pages without losing in-session work. |

An empty hash opens Home. Unknown hashes show a small not-found recovery surface with Home and Editor links; they never reset the document. Routes are addressable and browser Back/Forward updates the active page. Hash routing requires no new routing dependency or server rewrite configuration. Design / Code / Preview remain editor modes, not additional global pages.

### Home

Use a welcoming heading and a single current-work card with the real project preview, project name (fallback `Untitled project`), artboard dimensions and actual element count. Label it **Current session**, not **Saved project**. Its save state is the editor's current comparison (`Saved locally` or `Unsaved changes`), not an invented save date. The initial example is a real editable document and should not be described as previously saved work.

The primary action opens the editor without replacing the document. Secondary links browse starters and the guide. A local-save explanation states that Save locally replaces the one slot in this browser and JSON export is the portable backup. Open saved invokes the existing validated load operation. Import remains in **Editor → Open → Import project JSON**; describe that route instead of adding a duplicate importer.

An empty current document is valid: show its actual background and dimensions, `0 elements`, and an editor link. A missing, corrupt or inaccessible save slot shows the returned actionable error next to Open saved, preserves current work and keeps all other actions usable. The page does not inspect storage independently or claim a saved project exists before a successful load. No automatic opening or saving occurs on page arrival.

### Templates

Offer exactly three local starters:

1. **Blank artboard** — 1200 × 800, no elements; a clean editable canvas.
2. **Studio composition** — the existing `initialProject()` composition, 800 × 680; reuse its real document rather than duplicate it or claim it is user work.
3. **Mobile card** — 390 × 844, a simple self-contained card composition built only from supported rectangle, text and button elements.

Each card has a project-derived preview, descriptive title, concise purpose, real dimensions and an explicit Use starter action. Blank is a deliberate empty document, not an unloaded preview. The small catalog needs no nonfunctional search, filters, favorites, premium tags or remote loading state.

Selection creates a fresh independent `Project`, validates it through the existing document boundary, confirms replacement when current work is unsaved, then opens the editor. Cancellation retains route and document. Starting a template does not write the save slot. Existing history, selection, gesture and AI-proposal state reset through the same replacement boundary as loading/importing. Render project text as text; starter buttons are visual design elements, not promises of implemented forms or navigation. These are fixed-size compositions, not responsive websites.

### Guide

Keep the guide practical, short and organized by task:

- **Compose:** choose screen dimensions; drag components or use their click/keyboard creation alternative; select and edit properties; edit plain text; use layers, local guides and alignment.
- **Inspect output:** Design, Code and Preview show one committed document; code is selectable/copyable; standalone HTML, JSON and SVG downloads have different purposes. Output is a flat, fixed-size, absolutely positioned composition. Generated buttons have no authored behavior.
- **Keep your work:** Save locally writes one browser slot; Open saved restores it; browser storage can fail or be cleared; export JSON for a portable editable backup and import it through Editor → Open. Ordinary route changes retain the session, but reloading is not an autosave mechanism.
- **Keyboard:** Ctrl/Command+Z undo, Ctrl/Command+Shift+Z or Ctrl/Command+Y redo, Ctrl/Command+S local save; in the Design canvas/layer context Ctrl/Command+D duplicates, Delete/Backspace removes, arrow keys nudge by 1 and Shift+arrow by 10. Text entry retains normal text-editing behavior; Escape cancels a text draft or clears selection as applicable.
- **Optional AI:** local tools work without AI; layout and instruction are sent to the configured provider only on an explicit request or disclosed automatic-assistance opt-in. Returned suggestions require explicit acceptance. Provider configuration is server-side, not a new browser settings page. Leaving Editor disables automatic assistance; returning never opts the user back in silently.

Clarify that headline text is still a paragraph element, Shift-click toggles multi-selection, single-item alignment targets the artboard and multi-item alignment targets selection bounds. Double-click/Edit text opens a plain-text draft; Done/blur commits and Escape cancels. HTML/SVG are output formats, not editable import round trips. Clipboard permission failures retain manual-copy recovery; clicking Copy is not proof of success. AI configuration is not proof of connectivity or quota, and provider usage may incur costs.

Do not show fake live AI health on the guide. Link back to the actual editor controls rather than adding disconnected demos. Native section links/details may organize content, but reading the essential local-save and fixed-size-output notes must not require an interaction.

### Editor

Move the existing editor into its dedicated page module without replacing its interface. Preserve artboard manipulation, inspectors, layer order, save/load/import/export, history, Design / Code / Preview, local assistance and guarded AI behavior. The Picasso brand must genuinely navigate Home rather than only clear selection. Global navigation must remain reachable without crowding essential save/open/export or canvas controls.

Navigating away resolves pending text drafts, cancels an unfinished gesture safely, invalidates/aborts AI work and turns off automatic assistance. Keep the editor mounted to retain the committed document, undo/redo, selection and mode, but hide its DOM from display, focus and the accessibility tree while inactive. Global keyboard handling must be gated by `active`; pressing save/undo on Home or Guide must not mutate the hidden editor. Returning to Editor restores the session without a document replacement or new AI request. Browser reload does not imply autosaving or reopening saved content.

Every document switch uses the same draft-aware replacement guard, including template creation, Open saved from either page and JSON import. Resolve pending text before comparing against the saved snapshot; otherwise an uncommitted draft could be discarded without a warning. Validate incoming content before adoption, preserve the current document on failure, and require confirmation before replacing unsaved work. Merely changing routes is not a document switch and must not prompt for replacement.

The guard cancels unfinished gestures and resolves inline/inspector drafts before reading the latest `projectRef.current`; it must not rely on the render's potentially stale `saved` boolean. For asynchronous JSON import, run the guard when file reading finishes, against the then-current session, so intervening edits are not silently replaced. User cancellation is not a storage failure: retain the current route/session without a misleading error.

## Visual model and accessibility

Extend the existing warm off-white, forest-green and sage palette, with serif editorial headings and the existing sans-serif body/control typography. Keep the lavender treatment specific to optional AI; do not make every card an AI affordance. Use restrained borders, generous spacing and project previews as meaningful visual content rather than decorative fake dashboards.

Non-editor pages use a centered readable content width, a clear heading, one dominant action and cards that move from a desktop grid to a single-column mobile layout. Scope page selectors so the existing editor's dense layout and toolbar styles do not leak into the new pages or regress. At narrow widths the global navigation wraps without clipping or an inaccessible icon-only menu. New pages should work at 360 CSS pixels; the editor remains desktop-first, with essential controls reachable at the existing 1024 × 768 and 1440 × 900 targets. Do not claim a new full mobile-authoring experience.

The editor's available height must account for the global navigation rather than stacking its old full-viewport shell beneath another header. At desktop target sizes, the canvas footer, zoom/fit, screen settings and AI proposal controls must remain reachable; use layout sizing and existing regional scrolling rather than clipping those controls.

Use a named primary `nav`, real links for routing, `aria-current="page"` on the active link, one visible page heading and semantic sections. Provide a skip-to-content link, visible focus, readable contrast and comfortably sized controls. Route changes update the document title and move focus to the visible page heading/content without leaving focus in the hidden editor. Native buttons perform actions; cards must not nest buttons inside links. Decorative previews are noninteractive and hidden from assistive technology when adjacent text already conveys their purpose; otherwise give them a concise accessible description. Do not expose sample buttons in thumbnails as focusable controls. Render text safely without raw document HTML injection. Errors use visible inline text and an appropriate live announcement; do not rely on color alone. Respect reduced-motion preferences.

## Developer contracts and file ownership

The application shell owns route selection, navigation and lifecycle coordination. The existing editor remains the sole owner of document state and its existing local-storage/history operations; pages must not create a second project store.

| File | Responsibility / public contract |
| --- | --- |
| `src/App.tsx` | Hash shell, inline primary navigation, route title/focus, unknown-route recovery, page callbacks and mounted-editor visibility. |
| `src/pages/editor/EditorPage.tsx` | Existing editor implementation. Receives `active: boolean` and `onSessionChange({ project, saved })`. Exposes a React ref with `startProject(project: Project): boolean` and `openSaved(): string \| null`. Starting returns false on cancellation; loading returns an actionable error/cancellation message or null on success. |
| `src/pages/home/HomePage.tsx` | Props: `{ project: Project; saved: boolean; onOpenSaved: () => string \| null }`. Show the returned error locally; `null` means no error. Shell routes to Editor only after successful loading. Navigation-only actions are hash links. |
| `src/pages/templates/TemplatesPage.tsx` | Props: `{ onStartProject: (project: Project) => void }`. Cards invoke the callback with a fresh starter; shell navigates only when editor adoption succeeds. |
| `src/pages/templates/templates.ts` | Typed local catalog and fresh-project factories; reuses `initialProject()` and supported element construction patterns. No storage writes or network calls. |
| `src/pages/guide/GuidePage.tsx` | Static truthful workflow guidance and route links; no required props or service calls. |
| `src/components/ProjectPreview.tsx` | Shared read-only thumbnail from the actual `Project`. Reuse `elementTag`/`elementStyles` from `src/render.ts` for faithful supported-node rendering, clipped/scaled within preview bounds. No selection, editing, AI requests or focusable sample buttons. |
| `src/pages/pages.css`, `src/app.css` | Scoped non-editor page/preview styles and shared shell/navigation styles, respectively. |
| `docs/pages.md` | This information architecture, responsibilities, integration contract and acceptance checklist. |

Use the existing `Project` version 1 and `parseProject` validation. No new persisted metadata is needed. The shell passes the editor's load error/cancellation message to Home and routes to Editor only on success; failed load feedback remains visible rather than existing only inside the hidden editor. Home does not duplicate document loading.

## Analyst improvements incorporated

The analyst approved the four-page scope and strengthened the integration requirements: retain one mounted authoritative session; make replacement protection draft-aware across every document-switch entry point; gate hidden-editor shortcuts and AI; account for navigation in editor height; provide route title/focus and unknown-route recovery; keep failed Open saved feedback visible on Home; and reuse the existing 800 × 680 starter rather than add an unnecessary new landing composition. These are part of the implementation and acceptance contract above, not optional future work.

## Acceptance checklist

1. All four routes, empty-hash entry, direct Editor entry, browser Back/Forward and unknown-route recovery work without resetting the in-session document.
2. Edit a document, visit all other pages and return: committed content, history, selection, mode and zoom remain. Hidden-editor shortcuts and automatic-request timers cannot run. Leaving Editor cancels transient gestures/AI and automatic assistance stays off on return.
3. Home's name, thumbnail, dimensions, element count and save label match the actual editor session, including a valid empty document. No invented projects, metrics or save metadata appear.
4. Each starter opens as its previewed valid document. Every replacement entry point (starters, Open saved and JSON import) resolves inline/inspector drafts and confirms against the latest session before replacing unsaved work; cancel retains existing work and storage without a false storage error. An asynchronous import cannot silently discard changes made while its file was reading. Starting a template never silently overwrites the local save slot.
5. Open saved restores the existing `picasso.project.v1` data. Missing, invalid or blocked storage displays a meaningful Home error and preserves current work. Successful load opens Editor and uses its normal history/selection/AI reset boundary.
6. Existing editor operations remain available, including import/export and all three workspace modes. JSON round trips retain the version-1 contract; ordinary navigation never sends a suggestion request or silently saves.
7. All visible page actions work with keyboard navigation; active-route, focus, page-title and hidden-content behavior are coherent. New pages reflow at 360px; Editor remains reachable at its established desktop sizes.
8. Guide copy matches real actions, save-slot semantics, fixed-size output, no-action generated buttons and optional-AI disclosure. It promises no unavailable product features.

This document defines acceptance requirements, not claimed runtime verification. Build, test, lint and browser exercises belong to the integrated implementation/test pass.
