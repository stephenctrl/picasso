# Error handling audit — 2026-10-27

## Scope and evidence

Browser and server analysts inspected action, asynchronous, render, persistence, import/export, AI and HTTP/startup failure paths. The parent reproduced the failures below before assigning frontend and server developers; EH-09 was reproduced during integrated verification and returned to the frontend developer for repair. Controlled failure injection demonstrates error handling behavior; it does not imply the supported starter data or browser APIs routinely fail. No credentials were inspected and no live AI-provider submission was required.

Line references in the inventory refer to the original code before these repairs. Current implementation locations and verification evidence are recorded after integration.

## Findings and required fixes

| ID | Original file and lines | Defect / observed consequence | Sufficient fix |
| --- | --- | --- | --- |
| EH-01 | `src/main.tsx:6–8`; `src/App.tsx:59–67`; `src/pages/templates/TemplatesPage.tsx:10–11` | A template render exception blanked the entire React root, unmounting the otherwise healthy editor. Reproduced by making UUID generation throw while entering Templates. | Isolate surrounding-page render/effect failures from the editor; add editor and root containment, truthful recovery and independent JSON backup of a known committed snapshot where available. Never silently remount a fresh editor or autosave over the browser slot. |
| EH-02 | `src/App.tsx:28–42`; `src/pages/editor/EditorPage.tsx:338–346,382–397`; `src/pages/templates/TemplatesPage.tsx:37–42` | Action exceptions and unhandled rejections had no application-visible feedback. Injected UUID failure during Add/Use starter retained the project but only logged a browser error. Scheduled rejected promise produced no popup. | Targeted action catches plus a shared accessible, dismissible popup; global error/rejection fallback that retains native diagnostics rather than swallowing errors. Use safe operation-specific messages. |
| EH-03 | `src/pages/editor/EditorPage.tsx:308–319,418–427,473–521,877`; `src/pages/home/HomePage.tsx:14–19` | Expected failures were caught but mostly confined to a transient checkmark footer. Quota failure showed only footer text. Asynchronous failures could be hidden on another route or inside collapsed AI details. | Report failures through the app-wide popup while retaining useful inline guidance, distinguishing failure from success, preserving content and avoiding popups for intentional cancellation or normal unconfigured startup health. |
| EH-04 | `src/pages/editor/EditorPage.tsx:278–295,793,875`; `src/render.ts:110–111` | Copy performs potentially throwing draft resolution/code generation outside its catch, and callers discard the promise. Source-proven conditional handling gap; no ordinary valid project was found to trigger generation failure. | Catch code preparation separately from clipboard writing. Generation failure must not be described as clipboard denial or offer fabricated/stale recovery text. |
| EH-05 | `src/pages/editor/EditorPage.tsx:278–295,795` | Older copy completion can clear newer failed-copy recovery. Reproduced with deferred writes: recovery count went from 1 to 0 when older success settled after newer rejection. | Track copy operation identity as well as document revision; only the latest operation may change its recovery/status. Keep exact selectable text for current clipboard failures. |
| EH-06 | `src/pages/editor/EditorPage.tsx:463–471,491–508` | Slow import survives leave-and-return because only current activity and document revision are checked. Reproduced from a saved session: a different project was adopted after leaving and returning before the file read resolved. | Invalidate import identity on leaving and on newer import; reject obsolete completion before adoption or failure reporting. Keep validation, revision and unsaved-draft guards. |
| EH-07 | `server/index.ts:60–72` | Occupied port emitted an unhandled Node `error` event and raw EADDRINUSE stack. PORT validation happens after Vite setup. Actual `npm run dev` reproduced this on occupied port 3000. | Validate first; handle startup/listen failures, close owned resources and exit nonzero with actionable terminal guidance. Never kill the existing listener. A server that cannot start cannot show a browser popup. |
| EH-08 | `server/index.ts:67–68` | Every non-413 middleware error becomes 400, misclassifying unsupported encodings and unexpected failures; no headers-sent delegation. Actual unsupported JSON charset returned 400. | Safe fixed responses: malformed JSON 400, body too large 413, unsupported encoding/charset 415, unexpected server error 500; delegate when headers are already sent. |
| EH-09 | `src/pages/editor/EditorPage.tsx:563–573` | Gesture bookkeeping was installed before pointer capture. Injected capture failure followed by releasing outside the artboard left Undo enabled but ineffective: the ten-layer document stayed unchanged. | Acquire pointer capture before installing gesture state or clearing pending scheduling. On failure, report a contextual drag/resize error with numeric-inspector guidance and leave history usable. |

## Constraints

- Popups must not claim that arbitrary unexpected failures rolled back safely. Preserve diagnostic details separately from user-facing text.
- No automatic retries, reloads or storage writes during recovery.
- Clipboard rejection retains the existing manual-copy workflow. AI failures retain stale-result rejection, cancellation, explicit retry and paused automatic assistance.
- Field validation and ordinary operation cancellation remain local/informational, not global failures.
- Startup diagnostics belong in the terminal; client-side network failures should point the user to the local server.

## Implemented locations

| Finding | Current implementation |
| --- | --- |
| EH-01 | `src/components/ErrorHandling.tsx`: `ErrorBoundary`, `CrashRecovery`; `src/main.tsx`: root containment; `src/App.tsx`: separate surrounding-page and editor boundaries, committed snapshot forwarding. |
| EH-02 / EH-03 | `src/components/ErrorHandling.tsx`: `ErrorProvider`, `useErrors`, global error/rejection listeners and bounded dismissible alert; `src/pages/editor/EditorPage.tsx`: `failOperation` and targeted catches; `src/pages/templates/TemplatesPage.tsx`: activation catch; `src/pages/home/HomePage.tsx`: safe fallback; `src/app.css`: popup/error styles. |
| EH-04 / EH-05 | `src/pages/editor/EditorPage.tsx`: `copyCode`, `copyIdRef`; generation and transport failures are separate, with latest-operation-only UI updates and manual-copy recovery. |
| EH-06 | `src/pages/editor/EditorPage.tsx`: `importIdRef`, inactive lifecycle effect and `importProject`; obsolete completions cannot adopt or report stale errors. |
| EH-07 | `server/startup.ts`: `parsePort`, `serverFailureMessage`; `server/index.ts`: `start`, `stopAfterFailure` and HTTP error listener. |
| EH-08 | `server/errors.ts`: `handleRequestError`; integration in `server/index.ts`; behavior coverage in `server/errors.test.ts`. |
| EH-09 | `src/pages/editor/EditorPage.tsx`: `startGesture` capture-before-bookkeeping boundary. |

## Exercised verification

- Integrated build and TypeScript checking passed. `npm test` passed **54 tests**, including real-HTTP middleware status/body cases, unexpected safe 500 responses, headers-sent delegation, aborted bodies and startup validation. The subsequent frontend pointer-capture and AI-message refinements were browser-exercised and included in the final build.
- Actual server commands with an occupied port and invalid PORT exited with status 1 and actionable diagnostics, without the former unhandled-event stack. The pre-existing listener remained healthy. Actual `/api/suggest` requests returned 400 for malformed JSON, 413 for oversized JSON, and 415 for unsupported charset and encoding. No provider invocation was needed for these rejected requests.
- Injected Add and starter-creation failures displayed contextual popups without adopting a new document. A quota-denied Save displayed JSON-export guidance, retained unsaved status and used an error-marked footer. Malformed import and download-preparation failure produced distinct messages while preserving the ten-layer document.
- Templates render failure displayed a local fallback rather than a blank application. After explicit page retry, the editor retained ten layers, its selected layer and enabled Undo; Undo remained usable.
- Global uncaught errors and a rejected promise from an injected page script displayed sanitized unexpected-error notifications; original diagnostics remained visible in developer tools. Code-generation injection displayed “Could not generate code” without bogus clipboard recovery.
- Deferred clipboard writes now retain the newer failed-copy recovery after an older success. A clipboard rejection after navigating Home displayed a visible popup with a manual-copy Editor link, without forcing navigation.
- A deferred import resolved after leaving and returning to Editor no longer replaced the current document and produced no stale-error popup.
- A controlled local fetch response carrying a quota/billing message appeared verbatim in the safe UI message while AI details were collapsed and Code mode was active. An initial status-only implementation lost this guidance; the developer restored the bounded, safe message supplied by the local API.
- Injected editor-render and shell-effect failures displayed recovery surfaces instead of silently resetting. Both exposed a parseable ten-element JSON snapshot matching the last known committed shell snapshot. These surfaces explicitly warn that later drafts/history may be unavailable.
- After the EH-09 repair, the same injected pointer-capture failure produced contextual drag guidance and Undo reduced eleven layers to ten, proving it no longer left a stuck gesture.
- Screenshots were inspected at 1440 × 900 and 390 × 844. The phone-width popup stayed inside the viewport with no horizontal overflow; its dismiss control worked with keyboard Enter. Normal startup displayed no error popup.

**Limits:** Chromium development-server smoke and controlled failures, not a cross-browser, exhaustive accessibility/performance, live-provider or production-server audit. The snapshot is a last-known committed backup, not a full history/draft restore. Global notifications report unexpected failures but do not promise rollback. Temporary browser patches were restored or discarded with their test tab; no runtime fault hooks were added to application source.
