# Feature walkthrough and repairs — 2026-10-28

## Result and scope

Two independent runtime testers exercised the editor/output and navigation/persistence/AI/API surfaces against [requirements.md](requirements.md) and [pages.md](pages.md). They found six actionable defects or usability improvements. Developers implemented all six; targeted browser and HTTP scenarios verified the repairs. No known finding from this walkthrough remains open. This is scenario coverage, not a claim of exhaustive correctness, accessibility, performance or cross-browser acceptance.

Testing used isolated Edge browser profiles, CSS viewports 1440 × 900 and 1024 × 768, and surrounding pages at 360px width. Broad testing used the development server; final smoke also exercised the actual built production app. Managed Chrome failed to launch, and initial shared Edge sessions caused input instability; dedicated CDP instances resolved those tooling problems. Critical pointer scenarios were completed with native browser input.

## Findings and resolution

| ID | Severity / affected feature | Reproduction and observed problem | Implemented repair | Post-fix evidence |
| --- | --- | --- | --- | --- |
| WF-01 | P2 — AI full-artboard comparison | Receive a suggestion at 1440px, then resize to 1024 × 768. `.proposal-preview` becomes `display:none`; Compare toggles ghosts but cannot reveal the complete miniature. | `src/styles.css` keeps a compact two-column review, visible miniature, independently scrolling explanation and persistent actions. Existing review height remains bounded. | Miniature and actions fit inside the review at both desktop sizes. Compare shows Original and removes ghosts. Actual production 1024px smoke accepted a synthetic two-element proposal and Undo restored the original nine elements. |
| WF-02 | P2 — compressed API request errors | POST JSON with `Content-Encoding: gzip` and body `not gzip`. Actual response was HTTP 500 although the client body was malformed. | `server/errors.ts` recognizes body-parser's malformed native inflater failures using the request encoding and native error metadata. Unknown/internal failures remain 500. Added real-HTTP regressions in `server/errors.test.ts`. | Production gzip, deflate and Brotli corrupt/truncated requests all returned 400 `Invalid request body.` Valid compressed JSON reached project validation, and compressed oversized input retained 413. Integrated safeguards keep genuine internal failures at 500. |
| WF-03 | P2 usability — JSON import diagnostics | Import malformed JSON, version 2, width 239/4001, duplicate IDs, 201 elements or an unreadable file. Adoption was correctly rejected, but every failure had the same generic message. | `EditorPage.importProject` separates file reading, JSON syntax and trusted project-parser validation. Keeps import identity/revision/adoption guards and avoids arbitrary file-error disclosure. | Malformed JSON, unsupported version, invalid width, duplicate IDs and unreadable file now have distinct actionable messages. All five retained the original project name and nine layers; injected private file-error text was not exposed. |
| WF-04 | P2 usability — invalid AI response diagnostics | Synthetic HTTP 200 `{}` or an invalid suggestion cleared busy safely but incorrectly advised checking configuration/connection. | `EditorPage.requestSuggestion` distinguishes unreadable response and invalid/incomplete design from transport, timeout and sanitized API rejection. Automatic failure pause and stale-result guards remain. | Missing and empty-element suggestions show invalid/incomplete-design guidance, keep nine committed layers, create no proposal, clear busy and allow manual retry. No provider contacted. |
| ED-01 | Medium usability — error notifications versus navigation | Set a 240 × 240 screen, select Sage backdrop and Quiet arch, Arrange horizontal. The persistent popup covered every Fit/zoom control center at 1024 × 768; also reproduced at 1440 × 900 and with denied clipboard writes. | `src/app.css` moves desktop notifications below the main header, caps their height above the footer, and keeps long messages scrollable. Phone-width containment and dismissal remain. | Actual production failure showed all four Fit/zoom centers uncovered; native Reset zoom worked. Long synthetic API error preserved hit targets for Open, Save, Export and every Fit/zoom control at both desktop sizes. At 360 × 844 the popup stayed within the viewport and keyboard Enter dismissed it. |
| ED-02 | Low usability — local arrangement diagnostics | The same cannot-fit arrangement preserved geometry, but replaced the known reason with generic advice mixing fit and alignment remedies. | `EditorPage.layoutSelection` retains fixed guidance from the isolated local layout calculation; unrelated operation failures retain a generic fallback. | Natural production failure now says layers cannot fit without resizing and recommends fewer layers or a larger screen. Selection and document remain usable. |

Notification tradeoff: a dismissible floating panel can still cover workspace content. The repair specifically preserves desktop header recovery actions and footer navigation, rather than claiming a completely overlay-free interface.

## Feature coverage

PASS means the listed scenario ran. Synthetic/failure fixtures are identified; passed scenarios do not imply every possible input or OS behavior was exercised.

| Feature | Observed walkthrough coverage and result |
| --- | --- |
| Navigation and routing | PASS: Home, Templates, Editor and Guide; empty/direct/unknown routes; Back/Forward; route title, current nav, focus and recovery. Session is not reset by navigation. |
| Session retention / inactive editor | PASS: name, history, selection, Code mode and zoom survive other pages. Hidden editor is excluded from focus, and off-editor save/undo do not mutate it. Leaving disables automatic AI and invalidates pending work. |
| Home metadata | PASS: actual project name, dimensions, element count and saved status, including empty name and zero elements. No invented save/library metadata. |
| Templates | PASS: Blank 1200 × 800 / 0 elements, Studio 800 × 680 / 9, Mobile 390 × 844 / 10; matching previews/adoption, independent documents and noninteractive sample controls. |
| Replacement protection | PASS with confirmation-response fixture: cancellation retains work/route/storage; inline and inspector drafts are resolved before comparison; successful replacement resets history/selection/proposals. |
| Guide / narrow pages | PASS: task/keyboard/save-slot/fixed-output/AI disclosures match available actions. Home/Templates/Guide reflow at 360px with reachable navigation and no horizontal overflow. |
| Palette creation | PASS: native click/keyboard Box, Headline, Paragraph and Button creation; actual native drag/drop and one-action undo/redo. |
| Palette coordinates / cancellation | PASS: native zoomed/scrolled drop on a 4000px board at 50% matched rounded document coordinates. Outside drop and Escape made no mutation. Foreign drop rejection used synthetic DataTransfer. |
| Selection | PASS: native canvas/layer selection, Shift multi-selection, single-target inspector and clearing selection. |
| Moving and resizing | PASS: native 50%, 75% and 100% pointer scenarios; group offsets retained, inspector synchronized, completed gesture one undo action. Native-started gestures plus explicitly synthetic pointercancel restored starting geometry. |
| Element inspector | PASS: native name, geometry, radius, font size and text; invalid width/font rejected. Fill/text color used synthetic input/blur events, not an OS color picker. |
| Project inspector | PASS: project name, dimensions and background; literal markup stays text. Background color used a synthetic color-control event. |
| Direct text | PASS: native double-click/Edit text, Done, blur, Escape, mode/export draft resolution, literal closing style/script/image labels safely escaped. Physical OS IME composition not tested. |
| Layers / paint order | PASS: Backward/Forward agree with canvas and generated order; layers remain flat rather than nested. |
| Duplicate / delete / shortcuts | PASS: new IDs and visible offsets, group duplicate/delete, undo/redo, Ctrl/Command-style shortcuts in Design context, and input typing protection. |
| Nudging | PASS: native arrow 1px and Shift-arrow 10px changes in document coordinates. |
| History | PASS: authoring/property/gesture/screen/order/layout/delete actions; new mutation clears redo; document replacement resets the prior document history. |
| Screen controls | PASS: Desktop/Tablet/Mobile presets, custom size, orientation, selected-layer retention, unchanged element geometry, undo/redo; 239 and 4001 rejected. Clipping disclosure present. |
| Zoom / Fit / large boards | PASS: Fit of 4000 × 4000, native far-edge Design and Preview scrolling, unchanged geometry. ED-01 notification obstruction repaired and retested. |
| Smart guides | PASS: native board-center and neighboring-edge snapping at multiple scales, screen-consistent guides, cleanup and undo; no AI required. |
| Alignment / arrangement | PASS: all six single/multi alignment commands, horizontal/vertical/grid arrangement, unchanged unselected geometry/sizes/order, undo and non-destructive cannot-fit failure. ED-02 guidance improved. |
| Empty / long documents / limits | PASS: empty inspector/artboard recovery; synthetic stress creation to exactly 200 disables creation; long layer list remains scrollable/selectable at 1024px. |
| Design / Code / Preview | PASS: matching selected-node mapping and semantic div/p/button output; selection retained across modes; titled empty-sandbox iframe and exact generated document. |
| Output safety | PASS: literal hostile markup remains text; generated buttons have `type=button`; observed Preview contains no executable script/image payload. No unaccepted proposal state enters saved/generated output. |
| Clipboard | PASS: real HTML/CSS/full-page/node copies matched selectable output with isolated-browser permission and Windows newline normalization. Synthetic denial retains selectable recovery, latest operation wins and late hidden-editor failure remains recoverable. |
| JSON / HTML / SVG export | PASS payload/render: real Blob content, metadata/geometry/style/paint order and safe text; SVG parsed and opened in viewer; HTML rendered in Preview. Filesystem download completion not observed. |
| Local save / reopen | PASS: explicit one-slot save, persisted slot after reload, no automatic reopen, Home/Editor load and reset boundaries. Missing/corrupt/denied/quota storage used controlled fixtures and retained current work. |
| JSON imports | PASS: valid version-1 round trip; malformed/schema/type/limit/duplicate rejection; exact accepted boundary project including 200 elements. Read/supersession/route-exit/intervening-edit fixtures preserved current work. WF-03 messages repaired. |
| AI health and consent | PASS: real local health only establishes configuration. No suggestion traffic before manual action/opt-in; selection/zoom/Fit/modes/instruction-only cause none. Synthetic health failure/timeout keeps editing available. |
| AI proposals | PASS with synthetic responses: changed/added ghosts/removal markers, no pointer interception, Original/Proposed comparison, dismiss without history, explicit accept preserving metadata and one-action undo. WF-01 compact comparison repaired. |
| AI lifecycle / races | PASS with synthetic pending/error responses: one in flight, stale-result rejection, edit/cancel/route aborts, auto off on return, failure pause, explicit recovery and no accept/dismiss request loop. |
| AI timing | PASS with recorded synthetic interception and real wall time: settled edit 1510ms; minimum automatic start spacing 15005.8ms; request abort 55000.1ms; health deadline 8023ms. This is not provider latency evidence. |
| AI failure guidance | PASS safety for quota/network/invalid/timeout/retry fixtures; WF-04 invalid-output classification repaired. No invalid output adopted. |
| Error notifications / crash isolation | PASS with controlled error/rejection and UUID faults: safe diagnostics, keyboard dismissal, isolated Templates failure and explicit retry preserving editor and storage. Last-known-snapshot crash recovery was not exhaustively retested. |
| Actual API boundaries | PASS: safe health fields, local-host/origin guards, unknown/method 404, malformed 400, oversized 413, unsupported charset/encoding 415, invalid project/instruction 400. WF-02 compressed-body repair verified on production. |

## Integrated verification

- `npm test`: **70 passed, 0 failed**. Includes real-HTTP compressed-body regressions and genuine-internal-error safeguards, existing provider/validation/render/layout/startup tests. Controlled test diagnostics for internal failures are intentional.
- Final `npm run build`: TypeScript and production bundling passed after all code and notification-placement changes.
- Production `npm start` served the built application on a separate loopback port for actual browser and HTTP smoke. No live valid suggestion was submitted to the server/provider.
- Production compressed corrupt/truncated gzip, deflate and Brotli each returned 400; valid compressed invalid-version project returned the expected project-validation 400, and oversized compressed JSON returned 413.
- Development browser smoke verified five distinct import categories, absence of arbitrary injected read-error disclosure, invalid/missing AI guidance and full comparison at both desktop sizes.
- Production browser smoke verified natural cannot-fit guidance, usable zoom during errors, long-notification desktop recovery controls, phone containment/keyboard dismissal, compact proposal comparison, explicit acceptance and undo from two elements back to nine.

## Evidence boundaries

Successful/error AI proposals were explicitly synthetic browser fixtures. Actual configuration health reported configured, but no paid provider request was made; authentication, model entitlement, quota, connectivity, model quality and real provider response success remain unverified. Fixtures are not a product fallback.

Imports used real File objects with synthetic file-selection delivery; delayed reads, storage denial/quota, clipboard failure and confirmation decisions were controlled fixtures. Native pointer/keyboard actions were used for ordinary authoring and navigation. Color picker UI and physical OS gesture cancellation/IME were not driven. Export Blobs and rendering were verified; the connected browser did not expose completed downloaded files. No exhaustive screen-reader, contrast, frame-rate, cross-browser or mobile-editor-authoring claim is made.

Representative repair screenshots were inspected during the session: compact comparison at 1024 × 768 and desktop comparison at 1440 × 900; production natural arrangement error with visible zoom controls. Screenshot files are session-local rather than permanent repository assets.
