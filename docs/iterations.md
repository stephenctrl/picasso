# Picasso implementation iterations

## Authority and scope

The Analyst owns `docs/requirements.md`; this manager specification translates those requirements into three baseline frontend increments and three ordered follow-on quality/assistance increments. The manager approves source evidence and controls progression. The parent integrates the shared types, geometry and API and performs final build and browser acceptance. Source approval is **not** runtime acceptance.

The release is a local-first, desktop-oriented design editor. No authentication, cloud storage, collaboration, external images, unattended model-applied changes, or fabricated suggestions are included. Provider requests are manual by default; the follow-on iteration adds explicitly enabled as-you-edit requests with a clear disclosure and bounded cadence. The shared wire contract is authoritative: a project contains a complete ordered elements array; a suggestion contains a complete proposed replacement elements array. No API keys may enter browser code.

## Implementation conventions

- The Developer owns frontend `src/**` except `src/types.ts` and the parent-owned `src/layout.ts`, plus `index.html`. The parent owns package/configuration files, shared types, deterministic geometry/regression coverage, and `server/**`. Do not change another owner's files without a contract correction through the parent.
- Reuse the shared `Project`, `DesignElement`, and `Suggestion` types rather than duplicating them.
- Coordinates and element sizes are document-space values. Zoom affects presentation and pointer conversion, never stored geometry. Element order is paint order.
- Keep document state separate from selection, view state, request state, and uncommitted AI suggestions.
- Use native accessible controls, visible focus, meaningful names, and actionable error messages. Keyboard editing shortcuts must not intercept text-entry controls.
- A user action is one undo transaction. A drag/resize must not create a history entry per pointer move. Applying an AI suggestion is one transaction.
- No builds, tests, lint, formatters, or browser smoke runs during increment implementation. Provide changed-file and source evidence to the manager; final verification belongs to the parent.

## Increment 1 — Editor foundation

**Status:** Source-reviewed and approved. Requirements: E-01–E-07, U-01–U-05, P-01–P-02 and safe-value aspects of P-05. Runtime acceptance remains pending parent.

### Developer instructions

1. Build a polished, coherent editor shell: top document toolbar, element tools, central artboard, layer list, and contextual properties inspector. Include a useful starter composition or deliberate empty-state guidance.
2. Render rectangle, text, and button elements from the shared contract. Support adding each kind and selecting an element from either canvas or layer list.
3. Implement document-space pointer drag and selected-element resize. Avoid canvas interactions when using inspector inputs. Support loss/cancellation of pointer interaction safely.
4. Edit selected geometry, name, fill, text, text color, font size, and corner radius where applicable. Provide project name, artboard width/height, and background editing. Reject invalid sizes and non-finite numeric input rather than corrupting the document.
5. Provide layer selection and explicit forward/backward ordering operations consistent with actual rendering order. Selected-element feedback and properties must remain synchronized.
6. Keep the architecture ready for immutable document transactions without prematurely implementing AI. Every visible control must work; omit unreleased controls rather than introducing no-op placeholders.

### Source acceptance evidence

- All three element kinds are created with unique IDs and valid values and rendered distinctly.
- Selection, drag, resize, property updates, and layer order share the same authoritative project state.
- Pointer coordinates are calculated against the artboard; interactions clean up capture/listeners.
- Properties are labeled, usable by keyboard, and do not silently commit invalid numeric state.
- The Developer identifies source locations covering each operation and reports any implementation/contract limitation explicitly.

## Increment 2 — Reversible and persistent workflow

**Status:** Source-reviewed and approved. Requirements: W-01–W-07, U-02–U-05, P-01, P-03–P-05. Runtime acceptance remains pending parent.

### Developer instructions

1. Add delete and duplicate for the selected element. Duplicates receive new IDs and an intentional position offset, and become selected.
2. Add bounded undo/redo for all committed document edits, including project properties and layer order. Clear redo after a new edit. Undo/redo restores a coherent selection; view-only state is not a document edit.
3. Add explicit local save and load, with a clear saved/unsaved indication and honest unavailable/corrupt-storage feedback. Loading must not silently overwrite the current document without an explicit user action.
4. Add downloadable project JSON and JSON import. Validate the complete incoming document before replacing current state, preserving the current document on failure. Imports require version 1, known element kinds, unique IDs, finite geometry, positive dimensions, and correctly typed properties.
5. Add a real SVG download representing the current artboard and all three supported element types, including escaped text and background. Export the document, not selection handles or AI preview chrome.
6. Add bounded zoom controls with correct pointer math at non-default zoom. Add keyboard shortcuts for delete, duplicate, undo/redo, and save while respecting text-entry focus and platform modifiers.
7. Report source evidence to the manager and wait for explicit increment 3 authorization.

### Source acceptance evidence

- Transactions do not flood history during continuous gestures; commit, undo, redo, and redo invalidation are easy to identify in source.
- Save/load and import/export have real serialization/download/file-read paths and report errors without clearing valid current work.
- Imported IDs cannot collide within the document. JSON failures are recoverable.
- SVG serialization escapes user-entered strings and excludes transient editor UI.
- Zoom leaves saved element geometry unchanged and pointer interactions compensate for display scale.

## Increment 3 — Context-aware AI previews

**Status:** Source-reviewed and approved. Requirements: A-01–A-08, W-02, U-01–U-05, P-01–P-05. The parent owns server requirement A-03 and server portions of P-02/P-05. Runtime acceptance remains pending parent.

### Developer instructions

1. Read `/api/health` to distinguish ready, not configured, and unreachable states. Show truthful setup/error guidance without inventing a successful response.
2. Provide an optional direction field and an explicit action that sends `{project, instruction}` to `POST /api/suggest`. Explain that requesting sends the current layout to the configured AI service. This baseline increment is manual-only; follow-on increment 6 supersedes that restriction with disclosed, explicit opt-in as-you-edit mode. Selection, zoom and page load never trigger layout transmission.
3. Capture a request identity and exact project revision. Ignore or cancel responses after any document mutation, load/import, undo/redo, a later request, or dismissal. A stale response must not restore an invalidated preview.
4. Present a valid returned complete replacement layout as a visually distinct transient overlay inside the artboard, with its title and rationale. Preserve the committed document until acceptance; do not substitute a list of advice for the required inline preview.
5. Provide Accept and Dismiss. Accept commits the exact proposed elements as one undoable transaction; Dismiss leaves document/history untouched. Every document edit invalidates an existing preview immediately.
6. Handle loading, malformed responses, and server/provider errors with readable messages and recovery. Preserve current work and clear loading state on every outcome. No fake fallback suggestions.
7. Report final source evidence for all three increments. The parent remains responsible for build and browser smoke acceptance.

### Source acceptance evidence

- In this baseline, network calls occur only at the explicit request action; health checking sends no canvas layout. Follow-on increment 6 adds the separately authorized opt-in path.
- Preview state is separate from project state. Serialization, exports, and undo history omit unapplied proposals.
- Both request completion and acceptance are guarded against stale document/request state.
- Accept changes only the committed elements through the normal transaction path and can be undone; Dismiss does not create history.
- The UI truthfully explains optional AI configuration and provider failures.

## Approval record

| Gate | Requirements traceability | Source review | Runtime acceptance |
| --- | --- | --- | --- |
| Specification | Analyst E/W/A/U/P IDs reviewed; scope and contract approved | `docs/requirements.md` reviewed in full | Not applicable |
| Increment 1 | E-01–E-07; U-01–U-05; P-01–P-02/P-05 | Source-reviewed and approved; see evidence below | Core editor browser smoke passed; see parent evidence |
| Increment 2 | W-01–W-07; U-02–U-05; P-01/P-03–P-05 | Source-reviewed and approved; see evidence below | Persistence/history/export browser smoke passed; see parent evidence |
| Increment 3 | A-01–A-08; W-02; U-01–U-05; P-01–P-05 | Source-reviewed and approved; see evidence below | End-to-end controlled-provider smoke passed; live provider requires credentials |

The manager records actual reviewed files and decisions below as each gate is reached. No source or runtime acceptance is implied by the implementation instructions.

### Specification decision

The manager reviewed the Analyst requirements and approved all three increment boundaries. External data validation must preserve the existing document on failure. Loading/importing establishes a new history boundary (W-07), rather than adding another project's history. A full-layout preview must make removals understandable (A-05), not merely overlay changed or added elements onto an otherwise indistinguishable original layout. No requirement is waived by source approval.

### Shared validation limits

The parent API establishes these consistent frontend/import/model limits: project name at most 120 characters; artboard dimensions 240–4000; at most 200 elements; nonempty unique element IDs at most 120 characters; element names at most 120 and text at most 2000 characters; coordinates −4000–8000; element width/height 1–4000; colors exactly `#RRGGBB`; font size 1–300; corner radius 0–2000. Suggestion titles are at most 120 characters, rationales at most 2000, and proposed arrays contain at least one element. Empty committed projects remain valid. Apply the same limits at creation, numeric inspector controls, and import rather than allowing editor-produced projects that the API rejects.

API calls use same-origin `/api/health` and `/api/suggest`; the parent serves the API at `http://127.0.0.1:3000` during local development. Server-only configuration uses `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` in `.env`.

Optional AI direction is limited to 2000 characters, matching the parent request parser.

### Increment 1 source approval

Reviewed `src/App.tsx`, `src/document.ts`, `src/main.tsx`, and the complete `src/styles.css` source, together with the Developer's report identifying `index.html`. `createElement` uses UUIDs and bounded defaults; `initialProject` supplies a complete starter composition. The shared project is authoritative for all three renderers, layer selection/order, and inspectors. Pointer handlers calculate deltas in document space, clamp valid geometry, capture the pointer, and support cancellation rollback. Field drafts validate finite bounds before commits, with selection-keyed inspector state preventing drafts leaking between elements. Native controls, focus styles, numeric alternatives, text rendering, and local-only state are present in source.

Decision: increment 1 is approved at source level; increment 2 is released. This does not assert that the application builds or that pointer, accessibility, or visual acceptance has been exercised in a browser. Parent runtime gates remain outstanding.

### Increment 2 source approval

Reviewed the workflow state, history, gesture, persistence, import/export, keyboard, toolbar, and zoom paths in `src/App.tsx`; complete `src/validation.ts`; and complete `src/export.ts`. The Developer also reports workflow styling in `src/styles.css`. `commit` records immutable prior projects and clears redo; continuous pointer updates publish without recording until gesture completion; cancellation restores the prior state. History is bounded to 100 snapshots and document replacement resets history and selection. Duplicate IDs, offset placement, deletion cleanup, safe shortcuts, and zoom-adjusted pointer math are represented in source.

Local save/load has explicit storage/error handling and a saved-state comparison. JSON import validates the entire canonical document before replacement, with finite/unique/type/value checks aligned with the API. Blob downloads include canonical JSON or standalone SVG; SVG uses ordered shapes/text, clipping, wrapping, escaped markup, and replacement of XML-forbidden characters. Source review is not an assertion that downloaded files or browser storage have been exercised.

Decision: increment 2 is approved at source level; increment 3 is released. The Developer must guard AI request completion and acceptance synchronously against the current document/request identity. Display the complete proposed replacement clearly enough that deletions are visible; do not let a ghost of retained content disguise removed elements.

### Server boundary source evidence for increment 3

Reviewed `server/validation.ts`, `server/index.ts`, and the request/response path in `server/ai.ts`. The parent API validates untrusted projects and instructions before calling the configured provider, health reports configuration without returning credentials, and missing configuration returns a truthful failure. `suggest` uses a real server-side model request with the current project/direction and structured-output schema, then validates the complete returned proposal before responding. The API exposes recoverable JSON errors rather than fabricated suggestions. This is source evidence for A-03 and server portions of P-02/P-05, not evidence of a live provider request or integrated runtime success.

### Increment 3 source approval

Reviewed the final AI state, health, request, invalidation, acceptance, and preview paths in `src/App.tsx`; `parseSuggestion` in `src/validation.ts`; and the finalized AI/ghost styles in `src/styles.css`, together with the Developer's complete requirement-mapped report. The health request sends no project. In this baseline, the disclosed request button is the only source path to `/api/suggest`; it captures the current project after flushing active inspector drafts, limits direction to 2000 characters, and synchronously prevents concurrent requests. Network, timeout, invalid JSON, server, and proposal validation failures preserve the document and expose a retry path. Follow-on increment 6 below supersedes the baseline's manual-only trigger policy without weakening its stale-response or adoption guards.

`publish` synchronously advances document revision and invalidates/aborts active proposals or requests before updating document state. Document replacement forces that boundary even for identical content. Request completion checks both request identity and revision; cancellation, dismissal, and cleanup invalidate identity. Selection and zoom are separate state. A proposal is validated, kept outside `Project`, and shown as an opaque-background complete artboard replacement with violet ghost styling, an unapplied badge, explicit removal count, and original/proposed comparison. Accept rechecks identity/revision and commits only elements through the normal single-transaction history path; Dismiss affects only AI state. Save/export remain committed-project-only paths.

Decision: increment 3 is approved at source level. All three ordered increments are source-complete with no requirement waiver or known source-review blocker. No build, test, lint, formatter, live-provider request, browser storage/download exercise, or browser smoke check was run by the manager or Developer. The parent must perform integrated acceptance before claiming runtime success.

## Parent runtime handoff

Use the Analyst's observable Gate 1–3 scenarios in `docs/requirements.md`. In particular, check real drag/resize at non-default zoom; one-gesture undo and redo invalidation; reload/local-save round trip and invalid import preservation; JSON/SVG download contents and literal markup text; truthful unconfigured/unreachable AI states; and configured-provider preview, dismiss, accept/undo/redo, edit-during-request, stale completion, and preview exclusion from persistence. A configured successful AI path requires real server-side provider credentials; without those, record that runtime prerequisite honestly rather than substituting canned output.

## Parent integration evidence

- `npm run build`: TypeScript checking and Vite production build passed.
- `npm test`: four regression tests passed, covering duplicate/unsupported identities, invalid geometry and colors, resource bounds, and the distinction between valid empty projects and invalid empty AI replacements.
- Real editor browser interactions created rectangle, text and button layers; committed names, text and geometry; reordered layers; duplicated/deleted; and exercised undo/redo. At 75% zoom a 30-by-15 screen-pixel drag changed document coordinates by 40-by-20, and one undo restored the entire gesture. Resize applied the same conversion. A new edit after undo disabled redo.
- Local save, page reload and explicit Open recovered all 12 smoke layers and cleared document history. Corrupt storage and invalid-version import preserved the open document. JSON export/import recovered the document. Generated SVG parsed without XML errors or script nodes, preserved literal `Hello <Picasso> & friends`, and opened as an 800-by-680 SVG document in the browser. SVG-viewer screenshot capture timed out in automation; no screenshot claim is made for that viewer.
- The real unconfigured API returned 503 with setup instructions; invalid input returned 400; a cross-origin request returned 403. The editor displayed the unconfigured notice and remained usable.
- A temporary local provider fixture exercised the actual server `/v1/chat/completions` request and structured-output contract without real credentials. The outbound request contained the current 12-element document and supplied direction. The visible full-layout ghost proposed 11 layers while committed layers and saved JSON remained at 12. Dismiss left history unchanged; Accept committed only elements; undo/redo restored/reapplied the layout with project metadata preserved.
- Editing during a deliberately delayed provider request invalidated it; releasing the obsolete response did not restore a preview. A fresh request used the updated document. Selection/zoom preserved previews; a property mutation invalidated them. Controlled provider 429 and malformed JSON responses exposed recoverable errors without changing the canvas.
- The production bundle served hashed assets without the Vite dev client and completed a provider-fixture preview/dismiss smoke with no recorded browser errors. Production checks used DOM activation after native-input automation became unreliable following SVG-tab inspection; earlier editor pointer checks used actual mouse gestures.
- Integration corrected the AI prompt to describe the renderer's opaque text fills and bound Vite HMR to the application HTTP server. An authenticated same-port WebSocket handshake succeeded.

**Verification boundary:** fixture responses are smoke data, never a product fallback or a claim of AI quality. No real provider call ran because `OPENAI_API_KEY` is unset. The live-provider success criterion remains credential-dependent. No comprehensive accessibility, mobile, or cross-browser audit was performed. Temporary provider infrastructure was removed after smoke verification.

## Follow-on quality and integrated-assistance iteration

The original three increments above are historical baseline evidence, not acceptance evidence for these changes. The user asks for Analyst quality control of smoothness/interactivity, adjustable screen/artboard dimensions, and assistance integrated into the canvas as edits happen. The Manager orders the following three short increments. The parent performs integrated build, regression and browser acceptance only after implementation; the Manager reviews source gates without running builds, tests, lint, formatters or runtime checks.

### Priority and shared invariants

1. **P0 — Discoverable dimensions and reliable viewport interaction (increment 4).** Current source places dimension inputs only in the no-selection inspector (`src/App.tsx`, baseline lines 461–475); selected users lose them. The canvas toolbar shows dimensions as inert text (baseline line 439), and zoom controls have no fit action (baseline line 457). These are source observations; Analyst-observed runtime findings are recorded separately below.
2. **P1 — Local layout assistance (increment 5).** Add deterministic guides, explicit multi-selection and scoped align/arrange so useful improvement is immediate and works without a provider. Label it local assistance, not AI.
3. **P2 — Disclosed as-you-edit provider assistance (increment 6).** After direct manipulation is reliable, allow opt-in settled-edit requests and keep proposal review next to the canvas without blocking editing. Never auto-apply.

Preserve the authoritative `Project`/`DesignElement`/`Suggestion` wire schema, complete replacement semantics, validation bounds, saved-project-only serialization, separate view/selection/proposal state, document revision and request identity guards, and one history transaction per user operation. No edits to `.env` or provider settings. Empty projects and offline editing remain usable. No fake provider fallback, hidden cloud transmission, polling-based retry loop, speculative responsive engine or element rescaling is authorized.

### Increment 4 — Screen dimensions, fit and interaction QC

**Status:** Source-reviewed and approved; parent runtime gate pending.

**Traceability:** D-01–D-03, Q-01–Q-03; E-01/E-04/E-07, W-02/W-06/W-07 and U-01–U-04. Analyst follow-on criteria are authoritative in `docs/requirements.md`.

1. Provide an accessible, visibly labeled screen/artboard settings control in the canvas toolbar, available while any element is selected. Keep width and height discoverable without requiring deselection. Use the existing field validation pattern and enforce 240–4000 document units.
2. Include named presets with dimensions, custom width/height, and orientation swap. A preset or swap is one undoable document transaction. Keep every element's geometry unchanged when the artboard changes; do not silently rescale, reposition or delete content. Explain that content beyond a smaller board is clipped.
3. Provide labeled Fit to view, available with or without selection. Compute scale from the available canvas viewport and artboard dimensions, retaining safe padding and all four artboard edges. Fit and zoom are view-only, create no history and do not trigger AI. Large 4000-unit boards must remain navigable through the canvas scroll area even when zoomed beyond fit.
4. Preserve document-space pointer conversion at fit/non-default zoom, safe pointer cancellation, draft flushing before actions and one-gesture history. Fix Analyst-observed interaction defects in this scope with direct evidence; do not treat browser automation failures as product defects.
5. Source gate: identify actual dimension/preset/swap commit paths, viewport measurement/fit calculation, scroll CSS, and gesture/history handling. Report changed files and any unresolved Analyst finding. Parent runtime gate covers selection-retaining settings access, preset/custom/swap undo, geometry preservation, invalid values, large-board access, fit and pointer accuracy.

### Increment 5 — Smart guides and scoped auto-layout

**Status:** Source-reviewed and approved; parent runtime gate pending.

**Traceability:** I-01/I-02, Q-01–Q-03; E-03/E-04/E-07, W-02/W-06 and U-01–U-04.

1. Provide explicit multi-selection on both canvas and layer list, preferably Shift-click additive/toggle selection, with a visible count/instruction and unambiguous per-element feedback. Normal click replaces selection; background/Escape clears it. Selection-only gestures must not mutate document/history or trigger provider requests.
2. Expose six align actions and horizontal, vertical and grid arrange with accessible labels and clear selected-only scope. One selected element aligns to the artboard; multiple align to their bounding box. Arrange requires at least two selected elements and operates only on selected IDs; leave all unselected elements and paint order unchanged.
3. Integrate parent-owned `src/layout.ts`: `applyLayout(project, selectedIds, action)` returns the replacement elements array, with original elements on a no-op and a useful error if arrangement cannot fit without resizing. Use its `LayoutAction` union (`align-left/center/right/top/middle/bottom`, `arrange-horizontal/vertical/grid`) rather than copying geometry into the component. Catch fit errors visibly and preserve the whole document/history on failure. A successful layout action is one undoable transaction; a no-op records none.
4. Integrate `getAlignmentGuides(project, element, tolerance)` for drag snapping to artboard and other-element edges/centers. Returned `{x,y,guides}` is document-space geometry; convert a modest screen-space snap tolerance using scale. Guides are transient, ignore pointer events, and clear when the gesture finishes/cancels. Preserve one-gesture undo and responsive local manipulation.
5. State clearly that guides and arrange are **local layout assistance**, available offline, not model output. Multi-selection group operations must have explicit semantics; selected elements cannot be silently omitted by a toolbar operation. Keep single-element property edits unambiguous and shortcuts safe in text fields.
6. Source gate: review selection transitions, selected-only layout calls, one-transaction/no-op/error paths, smart-guide conversion/cleanup, and interaction CSS. Parent regression coverage owns deterministic geometry; parent browser gate covers selected-only movement, layout rollback/undo, guides at fit/non-default zoom and offline availability.

### Increment 6 — Opt-in as-you-edit AI and canvas-adjacent review

**Status:** Source-reviewed and approved after inline correction; frontend frozen for parent integration acceptance.

**Traceability:** I-03–I-05, Q-01/Q-03; A-01–A-08, W-02/W-07, U-01–U-04 and P-01–P-05. This increment supersedes old manual-only A-02/P-01 language, not consent or adoption safeguards.

1. Keep manual requests and an off-by-default, explicitly labeled automatic mode. Explain **before enabling** that settled document edits send the current layout and direction to the configured provider and can incur usage/cost. Consent is session-local and must not silently restore from project JSON or local save. Health, opening the app, selecting, zooming, fitting and direction typing alone send no layout; enabling alone waits for a new eligible edit.
2. Use a concrete, bounded policy: debounce eligible settled document edits by 1500 ms and enforce at least 15 seconds between automatic request starts. At most one request is active; use current refs/identity, not only render-state disabling. No request during a drag/resize, no per-pointer-frame transmission, and no speculative parallel calls. Local draft changes that are not committed are not document edits.
3. Every document mutation immediately invalidates the proposal, cancels pending scheduling and aborts obsolete requests with revision/request identity checks at response and Accept. After a completed eligible edit, coalesce to the newest revision. Load/import clears scheduling and requires a subsequent edit; accepting AI does not cause a self-feeding automatic request. Undo/redo may schedule only after their completed document change.
4. Dismiss and cancel suppress a same-revision automatic re-request; no new request without a new eligible edit or explicit manual request. Turning automatic mode off clears timers and aborts an automatic request; do not let a late response restore a preview. Provider/network/invalid-output failure suspends automatic requests until explicit Retry/resume; edits must not create a retry or cost storm. Preserve a readable paused/error state and manual recovery.
5. Add a compact canvas-adjacent, nonblocking proposal/status surface with title/rationale, replacement/removal explanation, original/proposed full-layout comparison and Accept/Dismiss. Also show changed/added proposed layers directly on the main artboard as violet dashed translucent ghosts, and mark removals at committed geometry with distinct outlines/badges. Unchanged retained layers need no duplicate ghost. No opaque full-board blanket is allowed: preserve the visible committed design, pointer editing and selection handles. All preview/removal chrome ignores pointer events; Compare original hides the ghosts. A thumbnail alone is insufficient, especially on large boards. Keep inspector, screen settings and local layout tools reachable; edits invalidate everything above. Clearly distinguish local guides from provider AI.
6. Accept commits only the exact validated proposed elements once, keeps metadata and is undoable; Dismiss never changes history. Proposal/request/consent state never enters JSON, local save or SVG. Retain real configured-provider calls, validation, timeout, setup/unreachable feedback and server-only credentials.
7. Source gate: identify every `/api/suggest` caller, opt-in disclosure/default, eligibility and cadence scheduling, mutation/gesture/cleanup boundaries, failure suspension, dismissal/off guards and compare/accept controls. Parent runtime gate needs controlled delayed/failing provider scenarios plus a real-provider success when credentials are available; fixture evidence must be labeled and never claimed as AI quality.

### Follow-on source and evidence record

| Gate | Manager source decision | Parent runtime acceptance |
| --- | --- | --- |
| Increment 4 | Source-reviewed and approved; evidence below | Screen/viewport browser smoke passed; see parent follow-on evidence |
| Increment 5 | Source-reviewed and approved; evidence below | Geometry regressions and trusted-pointer/layout browser smoke passed |
| Increment 6 | Source-reviewed and approved after inline correction; evidence below | Controlled-provider production smoke passed; live-provider configuration remains required |

Analyst baseline runtime evidence: selecting “Hero headline” changed the inspector from Artboard settings to Design properties, removed project dimension controls, and left element Width/Height as the only visible size fields. This confirms the D-01 discoverability gap and drives P0. The baseline manual AI request was disabled with a truthful unconfigured status; that is not evidence of configured-provider success or a new defect. A second screenshot capture timed out in the browser tool; it is an automation limitation, not an application failure. Baseline source lacks fit, guides, multi-selection and layout actions. No source observation is promoted to runtime evidence.

Additional Analyst baseline browser evidence (scripted DOM activation after native input became unreliable): zooming 75%→100% preserved selected geometry; committing width 4000 retained element geometry and produced a 4000-pixel artboard. The canvas reported client width 1159 and scroll width 4130, and horizontal scroll reached approximately 2970.67. Entering 4001 showed the nearby 240–4000 validation message and `aria-invalid`, retaining width 4000. Thus baseline overflow navigation and numeric validation already work; this iteration adds discoverability/presets/swap/fit and preserves overflow rather than claiming a missing-scroll defect. The initial actual page screenshot was 1699 × 982 CSS pixels with controls reachable. Pointer drag/resize was not established because an automation timeout killed the tab; no 1024 × 768 runtime claim is made.

Historical baseline runtime evidence above does not satisfy these new acceptance scenarios. Concrete source-review locations and gate decisions follow as each increment lands.

#### Increment 4 source approval

Reviewed `src/App.tsx` `resizeScreen` (lines 125–128), `fitToView` (130–140), persistent screen settings/presets/custom fields/orientation control (457–467), canvas refs/structure (468–484), and fit/zoom controls (485). Reviewed `src/styles.css` screen-control and scroll-area rules (108–120) plus inherited `overflow:auto`, artboard-frame and document-transform rules. `resizeScreen` spreads the current project and changes only width/height through the normal commit path, preserving all element geometry and recording at most one transaction. Native Field controls retain finite-range validation. Fit reads viewport dimensions and current padding, changes only scale and scroll position, and does not call publish/commit. The block scroll container with max-content artboard area and explicit trailing padding preserves oversized-board overflow access in source.

**Decision:** Increment 4 is source-approved and increment 5 is released directly to DeveloperNext. The explicit downsizing/clipping disclosure was subsequently source-checked in increment 5 (`src/App.tsx`, line 509). This does not assert browser layout, pointer accuracy, focus, invalid-input feedback or large-board navigation has been exercised after the change; those runtime scenarios, including Q-01 desktop reachability at 1024 × 768 and 1440 × 900, remain with the parent.

#### Server cancellation integration evidence

The parent reported a controlled-provider observation: aborting the browser-side suggestion request returned `AbortError` to the client but initially left the provider-fixture request connected. This is a request-cancellation/cost-risk observation, not live-provider quality evidence. Reviewed the parent's corrective source in `server/index.ts` (44–55): the response `close` event aborts an active operation unless the response already ended, passes the signal to `suggest`, avoids writing an aborted result/error and removes its listener. Reviewed `server/ai.ts` (28–31): `suggest` requires the signal and combines it with the existing 45-second provider timeout in the outbound fetch. The parent subsequently reported that actual HTTP/upstream-disconnect verification passed after this fix; the Manager did not run it. Cancellation propagation reduces obsolete work; it cannot promise that a provider will reverse usage already incurred.

#### Increment 5 source approval

Reviewed `src/App.tsx` selection state/derived single-selection inspector (63–90), `selectLayer` and `layoutSelection` (131–147), multi-selection delete/duplicate (181–203), group pointer lifecycle (297–344), layer selection (463–464), local controls/scope text (513–519), selected outlines/guides (527–528), and multi-selection inspector explanation (553). Reviewed guide/local-control rules in `src/styles.css` (122–135). Shift-click toggles membership without publishing document changes; plain canvas clicks collapse selection on click completion while dragging an already selected member keeps the group. Layout calls use selected IDs with the parent helper, no-op identity produces no history, and thrown fit errors only set a notice. Successful actions use the normal single commit.

Group dragging translates all members by a shared legal offset, excludes selected peers from snap candidates, uses a six-screen-pixel tolerance divided by scale, and clears guides at completion/cancel. Cancellation restores the starting project; a completed gesture records one prior snapshot. Guides ignore pointer input. All selected members receive outlines, while individual properties/stacking are single-selection-only; duplicate/delete and their shortcuts explicitly apply to the whole selection. Labels identify local/offline assistance and scoped alignment/arrangement. Source also contains the requested D-02 clipping explanation and a resize hit area kept at 14 screen pixels across zoom.

**Decision:** Increment 5 is source-approved and increment 6 is released directly to DeveloperNext. Parent geometry regression and browser gates remain outstanding; source review does not establish perceived smoothness, rendered guide placement, pointer hit accuracy or offline/network behavior.

#### Increment 6 preliminary source review and inline correction

Reviewed `src/App.tsx` automatic-mode refs/defaults (86–98), timer/eligibility/cadence (108–145), mutation invalidation/commit scheduling (148–181), undo/redo scheduling (274–275), pointer scheduling suspension and completion (356–410), cleanup (436–448), sole `/api/suggest` fetch and failure suspension (451–494), acceptance with automatic rescheduling disabled (496–507), session consent/disclosure (565–570), adjacent review/comparison (594–612), and `src/styles.css` bounded review/miniature rules (130–154). Source provides off-by-default consent, 1500ms debounce, 15-second automatic-start cadence, guarded single flight, revision/request identity, mutation abort, failure pause, no same-revision dismiss/cancel loop and committed-project-only adoption/persistence.

Normal-flow review uses bounded internal scrolling rather than overlaying the canvas; existing responsive columns, wrapping local controls and independently scrolling panels support the required desktop layouts in source, not yet runtime. The main canvas remains committed and directly editable. The first submission only displayed a 180 × 112 complete-layout miniature adjacent to it. Parent priority clarification rejected miniature-only presentation as insufficiently visible on large boards and required on-artboard translucent changed/added ghosts and explicit removal marks without an opaque blanket. DeveloperNext is authorized to add that focused rendering/CSS correction; final gate 6 approval/freeze waits for its source review. No runtime acceptance is inferred from this preliminary review.

#### Increment 6 final source approval and runtime handoff

Reviewed the focused inline correction in `src/App.tsx` (107–112, 608, 626–632) and `src/styles.css` (156–162). The proposal derives additions/changes from the committed ID map, comparing each supported property and paint-order index; removals derive from missing committed IDs. Only changed/added proposals receive violet dashed translucent rendered ghosts at proposed geometry; missing IDs receive distinct removal outlines/labels at committed geometry. All badges say not applied. Compare original hides the inline layer. Container and descendant pointer events are disabled; annotation z-index 900 stays below selection outlines 1000 and guides 1100, with screen-compensated outline/badge sizes. No opaque board background replaces the committed drawing. The adjacent opaque complete-layout comparison remains available to understand the full replacement and removals, but is not the only visible suggestion.

**Decision:** Increment 6 is source-approved after the parent-directed correction. All three follow-on increments are source-complete, with no known source-review blocker or waived criterion. DeveloperNext is instructed to freeze frontend changes for parent integration. Manager approval covers actual source paths, not runtime smoothness or rendered usability. No builds, tests, lint, formatters, browser interactions or provider calls were run by the Manager or Developer.

Remaining parent acceptance scenarios:

- At 1024 × 768 and 1440 × 900 CSS pixels, check selected/deselected controls, long layers/rationale, keyboard focus and internal scrolling; screen settings, local actions, AI review/compare/accept/dismiss and footer must remain reachable while the canvas stays useful.
- With selection retained, apply presets/custom sizes/swap, reject invalid dimensions, undo/redo, and verify exported metadata with unchanged element geometry and truthful clipping disclosure. Fit a 4000 × 4000 board, zoom in, reach all edges and preserve precise document-space move/resize and one-gesture undo/cancel.
- Offline, Shift-select on canvas/layers, group-drag and apply all scoped align/arrange modes; confirm untouched unselected geometry/paint order, no-op history preservation, cannot-fit rollback, guide snapping/cleanup at multiple zooms and no network requests.
- Before consent, opening/editing/selecting/zooming/fitting/direction-only changes send no layout. After consent, enable-alone sends none; settled edits coalesce for the latest revision, with 1500ms debounce, at least 15-second automatic starts and one active request, never per drag frame. Check disable/cancel/dismiss/new-edit behavior, delayed stale completion, load/import boundaries, timeout/invalid/provider errors, failure pause and explicit retry/resume.
- Review changed/added/removal annotations directly on a 4000-pixel board at an editing zoom, compare original and complete proposal, select/drag/resize through annotations, and confirm edits immediately invalidate them. Accept changes only validated elements once; undo/redo restores exact layouts, no automatic accept/dismiss/completion loop occurs, and local save/JSON/SVG omit all unaccepted state and session consent.
- Label controlled-provider race/failure smoke separately from real configured-provider success and AI quality. Parent-reported disconnect verification covers upstream abort propagation; do not promise cancellation of already incurred provider charges. Current configured-provider success remains unavailable until health reports configured; preserve the user's server environment/settings.

### Parent follow-on runtime evidence

- `npm run build` passed TypeScript checking and production bundling; `npm test` passed all eight server-validation and local-layout regression tests. New layout coverage checks selected-only alignment, equal-gap arrangement, unchanged sizes/paint order, unequal-size grid non-overlap, impossible-layout rejection and nearest-anchor tolerance.
- An isolated Edge instance attached through CDP resolved the earlier browser-bridge input problems. Final pointer scenarios below used trusted browser mouse events, not synthetic movement. Pointer cancellation was deliberately dispatched as a `pointercancel` event to exercise rollback. These checks establish the exercised interactions, not a measured frame-rate or comprehensive UX/accessibility audit.
- With Hero headline selected, Mobile preset committed 390 × 844 without changing any element data or selection. One undo restored 800 × 680 and redo reapplied the preset. Swap produced 844 × 390. Draft width 4001 was rejected with nearby invalid feedback while committed width stayed 844.
- A custom 4000 × 4000 board fitted fully inside the viewport; at the measured desktop size its frame was 479 × 479 within a 950 × 619.61 canvas viewport. At 100% zoom both far-right and far-bottom scroll positions were reachable. At 1024 × 768 there was no root horizontal overflow, and Screen, Fit, align and arrange controls remained reachable. Proposal Compare/Accept/Dismiss were also visible at that size; AI content had its own scrolling region (356px viewport, 598px content).
- Trusted Shift-click selected a subset. Align-left affected only that subset; horizontal arrangement produced 24px gaps while leaving the unselected element unchanged. No-op alignment added no history. A 240px screen with two 200px-square layers rejected grid arrangement without changing the document or creating undo history.
- At 75% zoom a trusted group drag moved all three selected layers by 40 × 20 document pixels for a 30 × 15 screen-pixel movement, preserving the unselected layer; one undo restored the exact whole project. Neighbor-edge snapping produced x=220 at both 75% and 50% zoom. Guides cleared after completion/cancel. Cancellation restored x=100. The resize hit target measured 14 × 14 screen pixels at 50%; a 20 × 10 pixel gesture resized 100 × 60 to 140 × 80, and one undo restored it.
- Automatic assistance was exercised through the real production bundle and API against a temporary, explicitly controlled local provider, never a product fallback. Opening/editing before consent, enabling alone, selection, zoom, Fit and instruction-only changes sent no suggestion request. Rapid edits coalesced to the final x=130 layout and supplied direction.
- Measured automatic timing was 1503ms from committed edit to request and 15001ms between consecutive automatic starts. A held, multi-frame drag lasting over 1800ms sent no request; completion scheduled the settled revision. Across nine controlled requests, peak concurrent provider connections was one.
- Turning live mode off during a delayed request aborted the upstream provider connection. Separately, resizing during a delayed manual request invalidated it and aborted upstream; releasing obsolete responses did not restore a proposal. A controlled HTTP 429 preserved the document and paused automatic assistance across a subsequent edit, with no background retry. Explicit Resume required a new edit before a fresh successful request.
- Controlled suggestions contained one changed, one added and one removed layer, plus unchanged content. The main artboard showed exactly two violet ghosts and one removal marker, with no opaque blanket and `pointer-events:none`. Compare hid/restored annotations. Saving before acceptance retained committed content only. Trusted pointer hit-testing and dragging passed through a ghost to Beta; the edit cleared the proposal.
- Accept preserved project metadata, committed the proposal once and queued no automatic edit. Undo restored the exact saved pre-accept document; redo restored the exact accepted document. Reload reset session consent and left no proposal.
- On a 4000 × 4000 screen at 75% editing zoom, all three annotation badges measured approximately 16.39px high and review actions remained reachable. Editing the committed text immediately cleared ghosts/removal marks. Screenshots were inspected at 1440 × 900 and 1024 × 768. No runtime `pageerror` was recorded; observed aborted requests were expected cancellation/navigation effects.

**Boundary:** the local server still reports AI unconfigured after loading the user's environment. No real provider call or AI-quality claim is made; live-provider success requires valid supported configuration. Temporary provider/app/browser smoke infrastructure was stopped after verification. No exhaustive performance, keyboard-accessibility or cross-browser audit was performed, and aborting a request does not reverse charges a provider may already have incurred.

### Using the new controls

- Open **Screen** above the canvas even while layers are selected. Choose Desktop, Tablet, Mobile or custom dimensions, swap orientation, and use **Fit** beside zoom. Downsizing clips out-of-board content; it does not resize or delete layers.
- Shift-click canvas elements or layer rows to select a group. **Local layout** aligns/arranges only that group; one selected layer aligns to the screen. **Smart guides** work without AI; hold Alt while dragging to bypass snapping. Arrangements that cannot fit report an error instead of resizing content.
- With a configured provider, explicitly enable **Live AI after edits** after reading its transmission/cost disclosure. New settled edits request suggestions after 1.5 seconds, with at least 15 seconds between automatic starts. Violet ghosts and removal marks are unapplied proposals; Compare, Accept and Dismiss are next to the canvas. Editing dismisses obsolete proposals. Provider failures pause automatic requests until explicit recovery.

## Running Picasso

Use Node.js 22.12 or newer. Install dependencies with `npm install`, then run `npm run dev` and open `http://127.0.0.1:3000`. The editor, local save/load, JSON interchange and SVG export do not need an AI key. Local saves belong to the current browser and origin; export JSON for a portable backup.

To enable AI in PowerShell:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Set `OPENAI_API_KEY` in `.env` and restart the server. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; `OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`. An alternative provider must support the OpenAI chat-completions endpoint and strict JSON-schema structured outputs. Credentials stay server-side. Requesting a suggestion sends the current layout and direction to that provider; previews do not change the project until accepted.

For the production bundle, run `npm run build`, then `npm start`. `PORT` changes the local listening port. Run `npm test` for the untrusted-document regression suite. The application intentionally listens on loopback rather than exposing the editor/API to the network.
