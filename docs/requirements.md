# Picasso release requirements

## 1. Product and release objective

Picasso is a local-first desktop-browser visual HTML/CSS editor. Users drag code-equivalent components onto an artboard instead of typing source: each box is a `div`, each text element a `p`, and each button a native `button`. Geometry and appearance become CSS. Design, generated code and standalone preview derive from the same committed document. The finished composition is copyable as HTML/CSS or a complete HTML page.

The existing editor, reversible/persistent workflow, contextual AI, screen controls and local layout assistance remain supported. The visual-code iteration adds genuine palette drag/drop, direct text editing, keyboard nudging, shared rendering/code generation, and Design / Code / Preview surfaces. AI remains optional: nothing changes until its proposal is explicitly accepted.

The page-navigation iteration adds Home (`#/home`), Templates (`#/templates`) and Guide (`#/guide`) around the retained Editor (`#/editor`). The designer's page responsibilities, analyst improvements, folder contracts and acceptance checklist are in [pages.md](pages.md). `src/App.tsx` now owns navigation; the previous editor implementation lives in `src/pages/editor/EditorPage.tsx`. Earlier implementation-file references below describe the historical editor work.

## 2. Personas and primary use cases

| Persona | Need | Successful use case |
| --- | --- | --- |
| Solo creator | Compose a small interface without a complex design tool | Add a heading, panel and button; position, resize and style them on an artboard. |
| Iterating designer | Experiment without losing work | Duplicate and reorder elements, undo an unwanted change, save locally, and reopen or exchange a project. |
| AI-assisted creator | Improve the actual current composition without surrendering control | Explicitly request a suggestion or opt into settled-edit assistance, inspect a clearly differentiated preview, then accept or dismiss it. |

Primary sequence: Home → continue Editor or choose a starter from Templates → choose screen dimensions → drag components → edit text, position and CSS properties → inspect corresponding HTML/CSS → preview → copy a full page or HTML/CSS → save/export. Guide explains the workflow. Optionally request or enable AI, review its proposal, and accept or dismiss. Ordinary editing, code generation and preview must not depend on AI availability. Navigation preserves the current editor session; reload does not autosave or automatically reopen the single saved browser slot.

## 3. Release boundary

**Included:** one fixed-size artboard per project; adjustable screen presets and dimensions; box, headline-text, paragraph-text and button presets using the existing rectangle/text/button model; real palette drag/drop and accessible click creation; direct plain-text editing; pointer manipulation and keyboard nudging; local smart guides/alignment/arrangement; project history; local save/load; JSON import/export; SVG and standalone HTML download; Design / Code / Preview modes; selectable generated HTML/CSS, selected-node correspondence and clipboard/manual copy; zoom and fit; explicit AI requests and opt-in settled-edit requests.

**Excluded:** authentication, cloud storage, collaboration, multiple artboards, nesting/groups, arbitrary vectors, uploaded or remote images, reusable component definitions, responsive layout generation, editable-source round trips and unattended AI changes. Output is a flat, fixed-size, absolute-positioned HTML/CSS layout. Headline text remains a paragraph, not a persisted heading tag. Layers represent paint order, not DOM nesting. A full mobile authoring experience is not a release criterion.

## 4. Data contract

The shared TypeScript contract is authoritative for implementation:

- `DesignElement`: `id`, `type` (`rectangle | text | button`), `name`, `x`, `y`, `width`, `height`, `fill`, `text`, `textColor`, `fontSize`, `borderRadius`.
- `Project`: `version: 1`, `name`, `width`, `height`, `background`, `elements: DesignElement[]`.
- `Suggestion`: `title`, `rationale`, `elements: DesignElement[]` — the **complete proposed replacement element array**, not a patch.
- `POST /api/suggest`: `{ project, instruction }` → `{ suggestion }`; failures use `{ error: string }`.
- `GET /api/health`: `{ ok: true, aiConfigured: boolean, model: string, configurationScope: 'local', configurationError?: string }`. This validates local settings only; it does not verify provider authentication, model entitlement, quota or connectivity, and never sends a design.

Project dimensions and element sizes must be finite and positive; coordinates must be finite; IDs must be unique within a project; element types and project version must be supported. Validation applies to external project and model data before it can replace current document content. All supported element properties must survive JSON save/export and reimport.

Shared validation limits apply equally to the editor, JSON import and API:

| Field | Accepted values |
| --- | --- |
| Project name | At most 120 characters |
| Artboard width and height | 240–4000 |
| Committed elements | 0–200 elements; an empty project is valid |
| Element ID | Nonempty, unique within the array, at most 120 characters |
| Element name / text | At most 120 / 2000 characters |
| Element x and y | Finite numbers from -4000 to 8000 |
| Element width and height | Finite numbers from 1 to 4000 |
| Background, fill and text color | Hex colors in `#RRGGBB` form |
| Font size | Finite number from 1 to 300 |
| Border radius | Finite number from 0 to 2000 |
| Suggestion title / rationale | At most 120 / 2000 characters |
| Suggested replacement array | 1–200 valid elements; all element limits above apply |

## 5. Functional requirements

### Increment 1 — Editor foundation

| ID | Requirement |
| --- | --- |
| E-01 | Present a named project and a clearly bounded artboard with editable project name, dimensions and background. Render elements consistently inside that coordinate system. |
| E-02 | Allow adding rectangle, text and button elements with visible, editable defaults and unique IDs. Text and button labels render their `text`; rectangles render as shapes. |
| E-03 | Allow selecting an element from the artboard or layer list, with explicit multi-selection for layout commands. Distinguish selected elements and the primary inspector target unambiguously; deselecting must return the inspector to the project state. |
| E-04 | Allow dragging the selected element and resizing it using visible handles. Direct manipulation must update document-space coordinates correctly and must not create zero or negative dimensions. |
| E-05 | Provide labeled inspector controls for element name, position, size, fill, text, text color, font size and corner radius where meaningful. Changes must visibly update the selected element. |
| E-06 | List every element as a selectable layer with a meaningful name and allow changing stacking order. Artboard stacking must agree with the list and exported content. |
| E-07 | Keep the editing surface, layer list and inspector synchronized after every operation. Empty artboards and no-selection states must provide a usable next action rather than an error or blank application. |

### Increment 2 — Reversible and persistent workflow

| ID | Requirement |
| --- | --- |
| W-01 | Delete and duplicate the selected element from visible controls. A duplicate has a distinct ID, is selected, and is visibly distinguishable by placement. Deletion removes stale selection. |
| W-02 | Undo and redo document mutations: add, delete, duplicate, move, resize, property changes, layer changes, screen dimensions, alignment/arrangement and accepted AI suggestions. A completed drag/resize gesture or layout command is one history action. A new mutation after undo clears redo. Selection and viewport zoom/fit are not document mutations. |
| W-03 | Provide explicit local save and load of the current project with visible success/error feedback. Saved content survives a page reload. Do not silently replace current work on failed load. |
| W-04 | Export the complete versioned project as downloadable JSON and import compatible JSON. Validate before replacing the document; unsupported, malformed or invalid data leaves current work intact and reports an actionable error. |
| W-05 | Export a standalone SVG reflecting artboard dimensions/background, supported element geometry, style, stacking and visible text. Encode text safely so labels do not become executable markup. |
| W-06 | Provide zoom controls with a visible scale indication. Zoom changes the viewport only; it must not change saved geometry. Dragging and resizing remain accurate at supported non-default zoom levels. |
| W-07 | Loading/importing a project establishes a coherent history boundary: previous-document undo/redo must not unexpectedly restore another project. Clear invalid selection and transient AI state when switching documents. |

### Increment 3 — Context-aware AI suggestions

| ID | Requirement |
| --- | --- |
| A-01 | Display whether AI is configured using the API health response. The editor remains available if the API is unreachable, health fails, or AI is unconfigured; show honest setup/unavailability guidance rather than fabricated recommendations. |
| A-02 | Send the current project and optional instruction only after an explicit AI request or explicit opt-in to automatic settled-edit assistance (I-03–I-04). Explain before either action that the layout and instruction are sent to the configured model provider. Automatic mode is off initially; no request occurs merely from opening the editor. |
| A-03 | The server calls an actual configured model using the submitted layout context. Keep provider credentials on the server. Validate the model's complete proposed element array before returning it; no mock, random or canned result may masquerade as AI. |
| A-04 | Show distinct idle, requesting, preview-ready and failed/unavailable states. Prevent duplicate concurrent submissions. A pending request must never change the current document by itself. |
| A-05 | Display the returned title and rationale with both a complete proposed-layout comparison and lightweight inline proposal feedback on the main artboard in document coordinates. Show changed/added elements as distinctly labeled translucent dashed ghosts and proposed removals with a distinguishable outline/badge; do not cover committed content with an opaque full-board blanket. A canvas-adjacent scaled full-artboard Original/Proposed comparison supplements, but does not replace, this inline layer. Explain complete element-array replacement/removals and retained project metadata. Inline feedback has no pointer interception; Compare can hide it to reveal the committed original, and editing invalidates it. Previewing never adopts proposed content or hides which layout is committed. |
| A-06 | Provide explicit Accept and Dismiss actions. Accept replaces the current element array in one undoable action; Dismiss removes the proposal without changing the project or adding a history entry. Preserve project metadata because the suggestion contract changes elements only. |
| A-07 | Invalidate a displayed suggestion whenever the document changes. If a request resolves after its source document changed, discard its result and explain that a fresh request is needed. Loading/importing, undo/redo and accepting a suggestion count as document changes; selection and zoom do not. |
| A-08 | Handle missing configuration, provider rejection, network failure, invalid model output and server errors with clear non-destructive feedback and an explicit retry path. Do not leave a permanent busy state or silently apply partial output. |

## 6. Interaction, accessibility and visual requirements

| ID | Requirement |
| --- | --- |
| U-01 | Use a coherent desktop workspace: clear primary toolbar, layer navigation, central artboard, property inspector and a discoverable AI review area. Distinguish committed content, selection outlines, local guides and AI proposal previews visually. |
| U-02 | Provide visible names or accessible labels for controls, visible keyboard focus, and readable contrast. Buttons, form fields and AI actions must be keyboard reachable. Avoid making icons or color alone the only way to identify an action or state. |
| U-03 | Provide numeric inspector controls as an alternative to precision pointer movement. Keyboard shortcuts, if supplied, must not intercept text entry in editable controls. |
| U-04 | Keep validation and operation feedback visible near the relevant workflow. Disable unavailable actions meaningfully; no selection, empty history and in-flight AI states must not cause exceptions. |
| U-05 | User text must render as text rather than injected HTML. Downloads must use safe serialization. The application must not fetch arbitrary remote resources from document content. |

### Increment 4 — Smooth editing and adjustable screen dimensions

| ID | Requirement and acceptance scenario |
| --- | --- |
| Q-01 | Keep editing controls reachable at desktop sizes, including 1024 × 768 and 1440 × 900 CSS pixels. Layers, inspector and AI content may scroll within their own regions; none may force essential screen settings, zoom/fit or proposal actions off an unreachable surface. Check both selected and deselected states and a long layer/proposal list. Preserve the existing visual hierarchy, visible focus and accessible labels. |
| Q-02 | Keep selection, dragging and resizing direct and nonblocking at supported zoom levels. A gesture updates matching inspector/document coordinates, ends cleanly even after leaving its starting element, and creates one undo action; cancellation restores its starting geometry. Numeric controls remain an alternative. Exercise selection from canvas and layers, move/resize at non-default zoom, and undo/redo without stale handles or accidental text-entry shortcuts. |
| Q-03 | Report observed runtime interaction evidence separately from source review, synthetic provider fixtures and browser-tool limitations. Capture representative screenshots and record the viewport and exercised actions. Do not infer smooth frame rates, exhaustive accessibility, live-provider success or complete acceptance from static code or a screenshot. No modal or opaque suggestion surface may block continued canvas editing. |
| D-01 | Provide a clearly named, accessible Screen/Artboard settings entry in the canvas toolbar that remains discoverable while an element is selected. Project dimensions and element dimensions must have unambiguous labels. Scenario: select an element, change screen width/height without deselecting, and still identify which dimensions each control edits. |
| D-02 | Offer named screen-size presets, custom width/height from 240 through 4000 document pixels and an orientation swap. Invalid values leave the document intact and show nearby feedback. Screen resizing changes artboard dimensions only, never silently rescales/repositions elements; clipping beyond the new board is explained. Scenario: apply a preset, enter custom portrait dimensions, swap orientation, undo/redo and export matching dimensions with unchanged element geometry. |
| D-03 | Provide Fit to view alongside zoom and make all parts of large artboards reachable with canvas scrolling or panning. Fit uses the available canvas viewport and does not mutate document geometry. Scenario: fit a 4000 × 4000 board, zoom in, navigate to its far edges and back, then edit accurately at non-default zoom without losing access to toolbar/footer controls. |

### Increment 5 — Local on-canvas layout assistance

| ID | Requirement and acceptance scenario |
| --- | --- |
| I-01 | Show local smart guides while dragging near artboard/other element edges and centers and snap in document coordinates using a screen-consistent tolerance across zoom levels. Guides disappear after the gesture. Label this deterministic behavior as local layout assistance, not AI; it works with the provider unavailable and sends no requests. Scenario: align an element with a board center and another element edge at two zoom levels, then undo the move once. |
| I-02 | Provide explicit, visible multi-selection instructions and selected-scope align left/center/right/top/middle/bottom plus horizontal/vertical/grid arrangement. One selection aligns to the artboard; multiple selections align within their bounding box. Arrangement affects only selected elements, preserves their sizes and stacking, and is deterministic. Insufficient room reports a useful non-destructive error rather than shrinking/overlapping content silently. Scenario: Shift-select layers/elements, align/arrange them, confirm unselected elements are unchanged and undo the command in one step; empty/insufficient selection is handled visibly. |

### Increment 6 — Integrated opt-in AI assistance

| ID | Requirement and acceptance scenario |
| --- | --- |
| I-03 | Offer an explicit, initially-off, session-scoped automatic AI assistance control with provider/data disclosure and a clear off action. After opt-in, request for new settled document edits only, never during drag/resize, per pointer frame, on selection/zoom/fit alone or just because the option was enabled. Instruction changes may accompany an explicit request or the next document edit, not trigger an undisclosed request. Scenario: observe zero suggestion requests before opt-in; opt in, complete several quick edits, and receive one request for the final settled revision. |
| I-04 | Debounce automatic requests for 1500 ms after settled edits and enforce at least 15 seconds between automatic request starts, with at most one concurrent request. Abort/invalidate on document mutations or disabling automatic mode; reject stale results by revision. A dismissed/cancelled proposal, completed request or accepted suggestion must not itself cause a request loop without a new user edit. After provider/network/invalid-output failure, suspend automatic retries until explicit retry; never silently retry in the background. Scenario: edit during a slow request, dismiss, switch off and exercise failure; the document stays editable, stale proposals never appear and no repeated request storm occurs. |
| I-05 | Make real AI proposals visible on the main artboard through lightweight changed/added ghosts and removal markers, with canvas-adjacent status, rationale, full-layout comparison and complete-replacement/removal disclosure. Keep Compare, Accept and Dismiss reachable without scrolling away from editing; preserve manual request/retry when automatic mode is off. Inline feedback is translucent, visually distinct from local guides/committed content and `pointer-events:none`, never an opaque full-board blocker. Compare hides inline ghosts; editing invalidates the proposal; Accept is explicit and undoable. Scenario: inspect inline differences at normal editing zoom, including a 4000px board where a miniature alone is insufficient; compare/dismiss and continue editing, then request again, accept and undo/redo with document changes only on acceptance. |

### Visual-code iteration — compiled analyst implementation checklist

The analyst identified a working freeform canvas, geometry/property editing, layers, history, persistence and guarded AI. Missing were genuine palette drag/drop, HTML/CSS generation, direct text authoring and the design-to-copy workflow. Keep version 1 and the three existing persisted types; a second document store or partial schema migration would break import, layout and complete-array AI proposals.

| ID | Files | Required implementation and acceptance |
| --- | --- | --- |
| VC-01 | `src/render.ts`, `src/App.tsx` | Share one tag/style description between real canvas nodes and generated markup. Map rectangle/text/button to div/p/button; reset native styles and explicitly encode fonts, metrics, wrap, clipping, geometry, paint order and colors. Generated buttons use `type="button"`. |
| VC-02 | `src/render.ts`, `src/render.test.ts` | Generate embeddable HTML, scoped CSS, a standalone UTF-8 document and element-ID-to-selector snippets. Escape user text/title; never interpolate IDs/names as CSS or executable markup. Literal quotes, ampersands and closing style/script tags remain text. Output needs no network, React or Picasso runtime. |
| VC-03 | `src/document.ts`, `src/App.tsx`, `src/styles.css` | Offer draggable Box, Headline text, Paragraph text and Button presets plus click/keyboard alternatives. Accept only internal allowlisted drags. Drop top-left at `(client - transformed artboard origin) / zoom`, including scroll and drops atop content. Valid creation is one undoable mutation; outside/cancelled/foreign drops do nothing; enforce the 200-element limit. |
| VC-04 | `src/App.tsx`, `src/styles.css` | Double-click or explicitly invoke Edit text. Use a plain multiline draft, at most 2,000 characters, with IME-safe entry. Blur/Done commits once; Escape cancels without history. Suppress dragging and document shortcuts while editing. Resolve drafts before output, mode changes and AI requests so exported content is never accidentally stale. |
| VC-05 | `src/App.tsx` | In Design, arrow keys nudge selected nodes by 1 document pixel; Shift uses 10. Preserve group offsets and coordinate bounds, independent of zoom. Do not intercept typing or unrelated focused controls. Existing history and AI invalidation/scheduling apply to committed edits, not draft keystrokes. |
| VC-06 | `src/App.tsx`, code/preview UI, `src/styles.css` | Keep Design / Code / Preview discoverable. Code exposes selectable HTML/CSS and the selected node's actual tag/selector. Selecting a code node selects the same layer; selection survives mode changes. Copy HTML, CSS, full page and selected-node snippets; explain snippet CSS/context dependencies. Await clipboard success; on rejection retain selectable code and accurate manual-copy instructions. |
| VC-07 | `src/App.tsx`, preview UI | Render exactly the generated full document in a titled sandboxed iframe. Keep large document edges reachable. Download the same standalone HTML and preserve JSON/SVG export. Unaccepted AI ghosts, selection chrome and editor controls never enter output. |
| VC-08 | `src/App.tsx`, `server/ai.ts` | Retain the authoritative Project, version-1 storage/import and all history boundaries. Code/preview/selection/copy are transient and send no AI requests. AI still returns validated structured elements, never HTML/CSS. Accept changes elements only, updates code and is one undoable action; preserve existing consent, cancellation and stale-result guards. |
| VC-09 | integrated runtime review | Exercise drag → text/style edit → code mapping → preview → copy/download, zoomed/scrolled placement, cancel/undo, manual-copy recovery, literal markup, save/reopen and 1024 × 768 / 1440 × 900 reachability. Run integrated build/regression checks after development. Independent analyst reviews the checklist and actionable findings are fixed before delivery. Report only observed runtime evidence. |

No new persisted metadata is needed. SVG retains its existing separate text renderer; HTML preview parity does not imply pixel-exact SVG parity. Fixed positioning and the absence of responsive behavior must be visible in the authoring/output workflow.

## 7. Privacy, persistence and failure policy

| ID | Requirement |
| --- | --- |
| P-01 | Keep ordinary editing, local layout assistance and persistence in the browser. Do not transmit the canvas on opening, selecting, zooming or local saving. Sending layout/instruction requires either an explicit AI request or the disclosed automatic mode opt-in in A-02; with that mode off, editing never sends the document. |
| P-02 | Never include provider credentials in frontend source, browser storage, downloaded projects or API responses. Provider/model configuration belongs to the server environment; do not log secrets. |
| P-03 | Persist only project content in project JSON; do not persist transient ghosts, pending request state, server errors or credentials. A reopened document starts without an AI proposal. |
| P-04 | Missing/corrupt local data, unavailable browser storage, invalid imports and failed downloads must not silently destroy the open project. Show a useful message and preserve a usable editor; available JSON export remains a recovery route when local storage is unavailable. |
| P-05 | API input and output are untrusted. Reject unsupported or invalid projects/elements and unsafe values before adoption; return actionable error messages without exposing secrets or raw provider internals. |
| P-06 | Show actionable operation failures in a shared dismissible error notification, including when the originating editor is hidden. Preserve inline/manual-copy recovery; do not turn normal cancellation, success or field validation into global errors. Unexpected browser errors/rejections remain diagnosable and must not imply automatic rollback. |
| P-07 | Contain surrounding-page crashes independently of the editor. Editor/root failure must not silently reset or overwrite storage; offer the last known committed JSON snapshot where available and disclose that later drafts/history may be unrecoverable. No automatic retry or reload. |
| P-08 | Ignore obsolete clipboard/import completions; leaving Editor permanently invalidates that pending import. Pointer-capture failure must not install a stuck gesture. Server startup failures produce safe terminal guidance and nonzero exit; request middleware preserves meaningful 400/413/415/500 classifications. |

The analyst defect inventory, original file/line references, implemented fixes and exercised failure scenarios are recorded in [error-audit.md](error-audit.md).

## 8. Observable acceptance by increment

### Gate 1: usable editor foundation

1. Starting with no elements, create a rectangle, text and button; all three appear on the artboard and in the layer list with distinct IDs (E-01, E-02, E-07).
2. Select each from either surface, edit its meaningful properties, drag and resize it, and observe matching inspector values and visible geometry (E-03–E-05).
3. Reorder overlapping elements and observe the corresponding stacking change; deselect without leaving stale controls (E-03, E-06, E-07).
4. Complete these actions without an AI provider or credentials. Controls are labeled, focus is visible, and numeric editing is available (U-01–U-04).

### Gate 2: recoverable real-work workflow

1. Duplicate and delete; undo and redo each operation, a property change, a drag gesture and a stacking change. One drag undoes as one action; editing after undo removes redo (W-01, W-02).
2. Save, reload the page, then load the saved project and observe matching document content. Failed or corrupt local loads leave the current canvas intact with an error (W-03, P-04).
3. Export JSON, change the canvas, then import the export and recover its supported fields. Reject malformed, unsupported-version or invalid-element JSON without replacing the canvas. Document switching clears unrelated history and selection (W-04, W-07).
4. Export SVG and observe the expected background, geometry, stacking and labels in an SVG viewer. Labels containing markup characters remain literal text (W-05, U-05).
5. Zoom away from 100%, move/resize an element accurately, and confirm JSON geometry reflects document units, not screen scale (W-06).

### Gate 3: trustworthy contextual AI

1. Without AI configuration, see explicit setup/unavailability feedback and retain a working editor. With configuration, an explicit request sends the current layout and supplied instruction to the server-backed model (A-01–A-04, P-01, P-02).
2. While requesting, the document stays unchanged. A successful result shows title/rationale, translucent inline changed/added ghosts and removal markers in artboard document coordinates, plus adjacent complete Original/Proposed comparison and replacement/removal disclosure. Compare hides the inline layer; Accept/Dismiss stay reachable. Inline feedback does not intercept pointer editing or obscure committed content with an opaque blanket, and no proposed content is adopted before acceptance (A-04, A-05, I-05).
3. Dismiss leaves the document unchanged. Accept replaces only the element array; undo restores the exact pre-accept layout and redo reapplies the accepted layout (A-06, W-02).
4. Edit during a pending request or while reviewing a suggestion; no stale proposal can later be accepted. Selection or zoom alone does not invalidate a proposal (A-07).
5. Exercise a provider/network failure and invalid response: the editor remains usable, no partial suggestion is applied, busy state ends and a new request is possible (A-08, P-05).
6. Save/export after previewing but before accepting: only committed project data is stored; reopening has no proposal or pending request (P-03).

### Gate 4: smooth editing and screen dimensions

1. Run the selected/deselected desktop reachability and move/resize/undo scenarios with runtime evidence, distinguishing tool failures from product defects (Q-01–Q-03).
2. Set a preset, custom screen dimensions and swapped orientation without losing element selection or silently rescaling elements. Invalid dimensions are non-destructive and dimension changes are undoable (D-01, D-02, W-02).
3. Fit and navigate the largest supported board, verify its far edges remain reachable, and edit accurately after zooming without mutating saved geometry (D-03, W-06).

### Gate 5: offline integrated layout assistance

1. With AI unavailable, observe on-canvas snapping/guides at multiple zooms and no model requests (I-01).
2. Explicitly select a subset, align and arrange it, verify unselected geometry is untouched, and undo/redo the command. Exercise no-op and cannot-fit states without data loss (I-02, W-02).

### Gate 6: safe opt-in AI while editing

1. With automatic mode initially off, opening/editing/selecting/zooming/fit and instruction-only changes send no suggestion requests. Disclose provider transmission before opt-in (I-03, A-02, P-01).
2. With an explicitly configured provider and consent, settled edits produce a bounded single-flight request for the latest revision; dragging causes no per-frame requests. Switching off, mutation, dismissal and errors cannot produce stale proposals or self-triggered retries (I-03, I-04, A-07, A-08).
3. Inspect main-artboard inline differences at editing zoom, including on a 4000px board, while retaining adjacent full-layout review and continued editing. Compare hides ghosts; compare/accept/dismiss and undo/redo an explicit acceptance work without pointer interception. Clearly distinguish real-provider evidence from any controlled fixture used to exercise proposal/failure/race states (I-05, Q-03, A-03–A-06).

## 9. Acceptance evidence and change control

Each increment report must identify completed requirement IDs, changed implementation paths and any known unmet criterion. The manager reviews the source and recorded behavior against that increment before giving written authorization for the next. Source review is not a claim that runtime checks ran: the parent runs integrated build/runtime acceptance after implementation. Requirements can be clarified with the manager, but scope may not be silently reduced, and final release acceptance requires all six gates.

### Iteration baseline quality-control evidence — 2026-10-22

This is a targeted baseline review, not final acceptance of increments 4–6 or an exhaustive UX/performance/accessibility audit. Source findings refer to the pre-iteration interaction implementation in `src/App.tsx` and `src/styles.css`; frontend changes made after the observations require the parent's integrated runtime acceptance.

| Evidence type | Exercised observation | Priority / requirement |
| --- | --- | --- |
| Actual browser, native layer activation and DOM inspection | The initial 800 × 680 board at 75% showed Artboard settings and project Width/Height. Selecting Hero headline changed the inspector to Design properties with element Width/Height; the canvas toolbar contained only Duplicate/Delete, so the screen dimensions were no longer editable there. | P1: persistent, explicitly labeled screen controls, D-01. |
| Actual browser screenshot | The baseline workspace showed a coherent palette, central artboard, reachable toolbar/footer and separate scrolling layer list at the page-reported 1699 × 982 CSS-pixel viewport. AI occupied the lower left panel rather than a canvas-adjacent review surface. Screenshot: `C:/Users/Saintan/AppData/Local/Temp/omp-sshots-15af2c4b8482cda8.webp` (temporary browser capture, not a checked-in release artifact). This is not evidence for smaller desktop viewports. | Preserve visual hierarchy; verify smaller desktop reachability, Q-01, I-05. |
| Actual browser, scripted control activation | Activating Zoom in changed 75% to 100%; selected Edition note geometry remained x=56, y=628, width=340, height=20. The artboard transform changed, not those document values. | Positive baseline for viewport-only zoom; drag accuracy at zoom still needs observation, Q-02, W-06. |
| Actual browser, scripted input/Enter activation and scrolling | Setting project width to 4000 rendered a 4000px-wide artboard with unchanged element geometry. Canvas client width was 1159px and scroll width 4130px; setting horizontal scroll reached about 2970.67px. Existing overflow access therefore works in this case. A draft width of 4001 showed “Enter a number from 240 to 4000.” and `aria-invalid=true`, retaining the committed 4000px board. | Preserve validation and scrolling; add presets, orientation swap and Fit, D-02, D-03. This does not establish native wheel/pan behavior or a 4000 × 4000 board acceptance. |
| Actual browser availability state | AI displayed honest unconfigured guidance and disabled Suggest a fresh direction. No provider request was made. The parent subsequently reported that restarting the server still returned `aiConfigured:false`; no credentials were inspected by this review. | Keep offline editing/local assistance usable, A-01, I-01, I-02. Live-provider success remains unestablished. |
| Source review only | Single selected ID, one move/resize gesture, only the bottom-right resize corner wired as a control, zoom without Fit, and no local guide/multi-select/align/arrange controls. The selected resize hit target computed to 6.75 CSS pixels at 75%; inspect usability rather than treating decorative corner dots as working handles. | P1 interaction/fit verification, Q-02, D-03; P2 deterministic selected-scope local assistance, I-01, I-02. |
| Source review only | AI was explicit-request-only in the left sidebar. Preview ghosts did not intercept pointer events, but selected handles were hidden in proposed view while committed element hit areas remained underneath; proposal editing must not be visually ambiguous. Existing abort/revision handling is a useful safety baseline, not evidence of runtime race acceptance. | P2/P3 opt-in settled-edit requests with bounded cadence and adjacent nonblocking proposal review, I-03–I-05. |

**Tooling limitations:** a second screenshot timed out; native drag automation then timed out and the browser bridge killed that tab. A reopened tab's native click/fill/Enter sequence did not reliably register (a fill cleared the numeric draft rather than entering its requested value). The successful zoom/dimension/boundary/scroll observations above therefore used explicitly scripted DOM control events, not trusted physical pointer/keyboard evidence. These tool failures are not product failures. Drag/resize smoothness, gesture undo/cancel, native wheel scrolling, smaller viewports, proposal interactions and live AI responses were not established by this baseline. The parent should exercise those scenarios on the integrated implementation, with any fixture distinctly labeled.
