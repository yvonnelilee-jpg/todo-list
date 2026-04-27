/**
 * @typedef {{ id: string, title: string, done: boolean, createdAt: string }} Todo
 */

const STORAGE_KEY = 'task-notebook-todos'

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isLegacyTodoShape(value) {
  if (value === null || typeof value !== 'object') return false
  const o = /** @type {Record<string, unknown>} */ (value)
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.done === 'boolean' &&
    (o.createdAt === undefined || typeof o.createdAt === 'string')
  )
}

/**
 * @returns {Todo[]}
 */
export function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    let mutated = false
    const list = parsed.filter(isLegacyTodoShape).map((item) => {
      const o = /** @type {Record<string, unknown>} */ (item)
      if (typeof o.createdAt !== 'string') {
        mutated = true
        return /** @type {Todo} */ ({
          id: o.id,
          title: o.title,
          done: o.done,
          createdAt: new Date().toISOString(),
        })
      }
      return /** @type {Todo} */ ({
        id: o.id,
        title: o.title,
        done: o.done,
        createdAt: o.createdAt,
      })
    })
    if (mutated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      } catch {
        /* ignore quota / private mode */
      }
    }
    return list
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
    createdAt: new Date().toISOString(),
  }
}
