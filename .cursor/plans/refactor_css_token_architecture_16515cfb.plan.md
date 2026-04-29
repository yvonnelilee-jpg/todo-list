---
name: Refactor CSS Token Architecture
overview: Restructure `src/style.css` into concern-based layers/files and strengthen token architecture so future theme color changes are handled primarily through token overrides, not component rewrites.
todos:
  - id: define-token-hierarchy
    content: Create primitive, semantic, and component-alias token schema in a dedicated tokens layer/file
    status: completed
  - id: split-style-concerns
    content: Reorganize monolithic style.css into concern-based files/layers with deterministic load order
    status: completed
  - id: extract-repeated-literals
    content: Replace repeated spacing/radius/border/focus/shadow literals with reusable tokens
    status: completed
  - id: reduce-dark-overrides
    content: Move dark-mode component overrides into token remapping wherever possible
    status: completed
  - id: stabilize-theme-flow
    content: Keep JS theme switching attribute-based and ensure dynamic accents use CSS alias tokens
    status: completed
isProject: false
---

# Refactor `style.css` for separation and token-first theming

## Goal
Refactor styling so component rules are isolated from theme values, making future color/theme changes mostly a token update task.

## Current Baseline
- Existing semantic tokens and theme scopes are in [`/Users/yvonnelee/Projects/todo-list/src/style.css`](/Users/yvonnelee/Projects/todo-list/src/style.css) using `:root[data-theme='light']` and `:root[data-theme='dark']`.
- Theme behavior is controlled in [`/Users/yvonnelee/Projects/todo-list/src/theme.js`](/Users/yvonnelee/Projects/todo-list/src/theme.js) and early-applied in [`/Users/yvonnelee/Projects/todo-list/index.html`](/Users/yvonnelee/Projects/todo-list/index.html).
- Product/design intent already expects token-driven theming in [`/Users/yvonnelee/Projects/todo-list/design.md`](/Users/yvonnelee/Projects/todo-list/design.md).

## Best-Approach Architecture

### 1) Establish a token hierarchy
Create a 3-tier token model:
- **Primitive tokens**: raw scales (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--text-*`).
- **Semantic tokens**: UI meaning (`--surface`, `--surface-muted`, `--text-primary`, `--text-muted`, `--border-default`, `--interactive-accent`, `--focus-ring`).
- **Component alias tokens**: per subsystem (`--tab-bg`, `--tab-active-bg`, `--todo-row-bg`, `--btn-primary-bg`) mapped to semantic tokens.

Why this helps: theme changes are done by remapping primitives/semantic tokens, while component CSS stays stable.

### 2) Split CSS by concern (or by layers first)
Refactor into focused files under `src/styles/` (or mirror this with `@layer` if you want a gradual move):
- `tokens.css` (primitives + semantic + light/dark overrides)
- `base.css` (reset, typography, accessibility helpers)
- `utilities.css` (sizing helpers, reusable utility classes)
- `layout.css` (app shell, notebook layout)
- `components/*.css` (tabs, todo list, auth/header, modal)
- `states.css` (shared interaction/focus/drag states)

Load order should enforce override intent: `tokens -> base -> utilities -> layout -> components -> states`.

### 3) Centralize state recipes and remove repeated literals
- Convert repeated literals (`44px`, `10px`, `1px solid var(--border)`, repeated focus outlines, raw rgba shadows) into tokens.
- Define interaction tokens once (`--focus-ring-width`, `--focus-ring-color`, `--interactive-hover-bg`, `--interactive-active-bg`, `--elevation-1`).
- Replace scattered dark-only component overrides with token remaps whenever visuals are equivalent.

### 4) Keep JS theme controller minimal and token-agnostic
- Keep `data-theme` orchestration in `theme.js` as-is conceptually.
- Avoid JS color values except true dynamic cases (e.g., per-tab accent).
- For tab accent HSL in [`/Users/yvonnelee/Projects/todo-list/src/notebook-state.js`](/Users/yvonnelee/Projects/todo-list/src/notebook-state.js), prefer assigning semantic roles (`--tab-accent`) and letting component CSS derive all related shades from that alias.

### 5) Migrate incrementally to reduce risk
- First pass: no visual changes, only structural move and token extraction.
- Second pass: dedupe state/border/radius/spacing patterns.
- Third pass: tighten dark-mode logic so theme-specific differences live primarily in token scopes.

## What theme-color changes look like after refactor
Future palette update process:
1. Edit primitive/semantic values in `tokens.css` light/dark blocks.
2. Leave component files untouched unless introducing a new semantic concept.
3. Validate contrast/focus styles once globally via semantic tokens.

This turns “change theme colors” from a wide search-and-replace task into a mostly single-file token update.

## Recommended safeguards
- Add a short token naming convention doc section to [`/Users/yvonnelee/Projects/todo-list/design.md`](/Users/yvonnelee/Projects/todo-list/design.md).
- During migration, keep old token aliases temporarily (deprecated comments) to avoid large breakages.
- Add a quick visual checklist (tabs, todo rows, modal, hover/focus/drag) per theme before removing deprecated aliases.