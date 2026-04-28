/**
 * Lightweight tab presentation helpers.
 *
 * Persistence for tabs/todos lives in Supabase (see `src/todos.js`).
 */

/**
 * @typedef {{ id: string, label: string }} NotebookTab
 */

/**
 * Tab accent stripes — orange / red family, shared saturation & lightness (HSL).
 */
export const TAB_FACE_COLORS = [
  'hsl(12, 78%, 54%)',
  'hsl(32, 78%, 54%)',
  'hsl(22, 78%, 54%)',
  'hsl(6, 78%, 54%)',
  'hsl(38, 78%, 54%)',
  'hsl(18, 78%, 54%)',
]

/**
 * @param {NotebookTab} _tab
 * @param {number} index
 * @returns {string}
 */
export function tabFaceColor(_tab, index) {
  return TAB_FACE_COLORS[index % TAB_FACE_COLORS.length]
}
