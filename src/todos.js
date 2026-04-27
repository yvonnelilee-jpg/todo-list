/**
 * @typedef {{ id: string, title: string, done: boolean }} Todo
 */

const STORAGE_KEY = 'task-notebook-todos'

/**
 * @returns {Todo[]}
 */
export function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTodo)
  } catch {
    return []
  }
}

/**
 * @param {Todo[]} todos
 */
export function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

/**
 * @param {string} title
 * @returns {Todo}
 */
export function createTodo(title) {
  const t = title.trim()
  return {
    id: crypto.randomUUID(),
    title: t,
    done: false,
  }
}

/**
 * @param {unknown} value
 * @returns {value is Todo}
 */
function isTodo(value) {
  if (value === null || typeof value !== 'object') return false
  const o = /** @type {Record<string, unknown>} */ (value)
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.done === 'boolean'
  )
}
