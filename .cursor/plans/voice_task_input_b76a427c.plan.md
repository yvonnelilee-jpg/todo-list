---
name: Voice Task Input
overview: Assess effort and define a concrete path to add microphone-driven task capture in the existing quick-add form using browser speech APIs.
todos:
  - id: add-voice-ui
    content: Add microphone control and status region to quick-add form markup.
    status: completed
  - id: speech-recognition-state
    content: Implement SpeechRecognition setup and event/state handling with safe fallback.
    status: completed
  - id: style-mic-control
    content: Style mic button/listening states to match existing design system tokens.
    status: completed
  - id: verify-voice-flow
    content: Test supported/unsupported browsers and confirm existing submit flow remains stable.
    status: completed
isProject: false
---

# Add Voice Task Capture to Todo Input

## Effort Assessment
- **Overall difficulty:** Medium (roughly half day to 1.5 days depending on polish and cross-browser handling).
- **Why it is tractable here:** task creation is already centralized in one submit handler in [`/Users/yvonnelee/Projects/todo-list/src/main.js`](/Users/yvonnelee/Projects/todo-list/src/main.js), so voice input can reuse the existing path instead of adding new persistence logic.
- **Main complexity:** browser support/fallbacks (`SpeechRecognition` is strongest on Chromium), plus UX states (idle/listening/error/permission denied).

## Tech Involved
- **Web Speech API (SpeechRecognition):** use `window.SpeechRecognition || window.webkitSpeechRecognition` to transcribe microphone audio to text in-browser.
- **UI controls + state:** add a mic button beside `#todo-input`, toggle pressed/listening states, and show brief status text (`Listening…`, `No speech detected`, etc.).
- **Accessibility:** keyboard-triggerable button, `aria-pressed`, descriptive `aria-label`, and `aria-live="polite"` status updates.
- **No DB changes needed:** once text is transcribed into the existing input, submit continues through `createTodo()` unchanged.

## Implementation Steps
1. Update the quick-add markup in [`/Users/yvonnelee/Projects/todo-list/src/main.js`](/Users/yvonnelee/Projects/todo-list/src/main.js)
   - Add a `type="button"` mic control inside `#todo-form` near `#todo-input`.
   - Add a hidden/polite live region for recognition status.

2. Add voice recognition wiring in [`/Users/yvonnelee/Projects/todo-list/src/main.js`](/Users/yvonnelee/Projects/todo-list/src/main.js)
   - Initialize recognition only if supported.
   - Configure options (`lang`, `interimResults`, `continuous = false`).
   - Handle events:
     - `onstart`: set listening UI state.
     - `onresult`: append/fill transcript into `#todo-input`.
     - `onerror`/`onnomatch`/`onend`: reset UI, show status, keep app stable.
   - On mic click:
     - If active, stop listening.
     - If inactive, call `recognition.start()` and catch permission/start errors.

3. Reuse existing submit flow in [`/Users/yvonnelee/Projects/todo-list/src/main.js`](/Users/yvonnelee/Projects/todo-list/src/main.js)
   - Keep current `form.addEventListener('submit', ...)` logic as source of truth.
   - Optional UX: auto-submit after final transcript, or leave as manual “Add” click (safer default).

4. Style mic states in [`/Users/yvonnelee/Projects/todo-list/src/styles/components-header-auth-theme.css`](/Users/yvonnelee/Projects/todo-list/src/styles/components-header-auth-theme.css)
   - Add button sizing/spacing to fit current `quick-add` layout.
   - Add visual `is-listening`/pressed styles and focus-visible ring consistent with existing tokens.
   - Ensure responsive behavior remains intact.

5. Graceful fallback + safety
   - If unsupported browser, hide/disable mic button and keep text input fully functional.
   - Stop recognition on form submit, tab change, or unmount to avoid stray sessions.
   - Do not block typing flow if microphone permission is denied.

6. Verify behavior
   - Chromium path: start/stop, transcript insertion, permission prompts, background noise edge cases.
   - Non-supporting browser path: no runtime errors, normal add-task still works.
   - Keyboard/a11y checks for mic control and status announcements.

## Recommended Default Decisions
- Start with **manual submit after dictation** (more predictable than auto-create).
- Start with **single-shot listening** (`continuous = false`) and **final transcript only** (less noisy UX).
- Keep this as a **client-only enhancement** for now; no NLP backend required unless you later want intent parsing (e.g., due dates/priority extraction).