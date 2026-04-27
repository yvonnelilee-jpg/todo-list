/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   done: boolean,
 *   createdAt: string,
 *   parentId?: string | null
 * }} Todo
 */

const STORAGE_KEY = 'task-notebook-todos'

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isTodoShape(value) {
  if (value === null || typeof value !== 'object') return false
  const o = /** @type {Record<string, unknown>} */ (value)
  if (
    typeof o.id !== 'string' ||
    typeof o.title !== 'string' ||
    typeof o.done !== 'boolean'
  ) {
    return false
  }
  if (o.createdAt !== undefined && typeof o.createdAt !== 'string') return false
  if (
    o.parentId !== undefined &&
    o.parentId !== null &&
    typeof o.parentId !== 'string'
  ) {
    return false
  }
  return true
}

/**
 * @param {unknown[]} arr
 * @returns {Todo[]}
 */
export function sanitizeTodoList(arr) {
  return arr.filter(isTodoShape).map((item) => {
    const o = /** @type {Record<string, unknown>} */ (item)
    const parentId = o.parentId
    return /** @type {Todo} */ ({
      id: o.id,
      title: o.title,
      done: o.done,
      createdAt:
        typeof o.createdAt === 'string'
          ? o.createdAt
          : new Date().toISOString(),
      parentId:
        parentId === undefined || parentId === null
          ? null
          : typeof parentId === 'string'
            ? parentId
            : null,
    })
  })
}

/**
 * Drop invalid parent links; ensure one level only (no parent on subtasks).
 *
 * @param {Todo[]} todos
 * @returns {Todo[]}
 */
export function normalizeTodoList(todos) {
  const ids = new Set(todos.map((t) => t.id))
  const next = todos.map((t) => {
    let parentId = t.parentId ?? null
    if (parentId && !ids.has(parentId)) parentId = null
    return /** @type {Todo} */ ({ ...t, parentId })
  })
  const byId = new Map(next.map((t) => [t.id, t]))
  for (const t of next) {
    if (!t.parentId) continue
    const p = byId.get(t.parentId)
    if (!p || p.parentId) {
      t.parentId = null
    }
  }
  return reorderTodosCanonical(next)
}

/**
 * Parents in original order; each parent followed by its subtasks in list order.
 *
 * @param {Todo[]} todos
 * @returns {Todo[]}
 */
export function reorderTodosCanonical(todos) {
  const roots = todos.filter((t) => !t.parentId)
  const out = /** @type {Todo[]} */ ([])
  for (const r of roots) {
    out.push(r)
    out.push(...todos.filter((t) => t.parentId === r.id))
  }
  const seen = new Set(out.map((t) => t.id))
  for (const t of todos) {
    if (!seen.has(t.id)) out.push({ ...t, parentId: null })
  }
  return out
}

/**
 * @param {Todo[]} todos
 * @returns {Todo[]}
 */
export function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return normalizeTodoList(sanitizeTodoList(parsed))
    }
  } catch {
    /* ignore */
  }
  return []
}

/**
 * @param {Todo[]} todos
 */
export function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

/**
 * @param {string} title
 * @param {string | null} [parentId]
 * @returns {Todo}
 */
export function createTodo(title, parentId = null) {
  const t = title.trim()
  return {
    id: crypto.randomUUID(),
    title: t,
    done: false,
    createdAt: new Date().toISOString(),
    parentId: parentId || null,
  }
}

/**
 * @param {Todo[]} todos
 * @param {Todo} todo
 * @returns {Todo[]}
 */
export function appendTodo(todos, todo) {
  if (!todo.parentId) {
    return [...todos, todo]
  }
  const idx = todos.findIndex((t) => t.id === todo.parentId)
  if (idx === -1) {
    return [...todos, { ...todo, parentId: null }]
  }
  let insertAt = idx + 1
  while (
    insertAt < todos.length &&
    todos[insertAt].parentId === todo.parentId
  ) {
    insertAt++
  }
  const next = todos.slice()
  next.splice(insertAt, 0, todo)
  return next
}

/**
 * @param {Todo[]} todos
 * @param {string} rootId
 * @returns {{ start: number, end: number } | null}
 */
export function rootBlockRange(todos, rootId) {
  const idx = todos.findIndex((t) => t.id === rootId && !t.parentId)
  if (idx === -1) return null
  let end = idx + 1
  while (end < todos.length && todos[end].parentId === rootId) {
    end++
  }
  return { start: idx, end }
}

/**
 * @param {Todo[]} todos
 * @param {string} fromRootId
 * @param {string} toRootId
 * @param {boolean} placeAfter
 * @returns {Todo[]}
 */
export function moveRootBlock(todos, fromRootId, toRootId, placeAfter) {
  if (fromRootId === toRootId) return todos
  const fromRange = rootBlockRange(todos, fromRootId)
  const toRange = rootBlockRange(todos, toRootId)
  if (!fromRange || !toRange) return todos

  const block = todos.slice(fromRange.start, fromRange.end)
  let without = todos.slice()
  without.splice(fromRange.start, fromRange.end - fromRange.start)

  let toIdx = without.findIndex((t) => t.id === toRootId && !t.parentId)
  if (toIdx === -1) return todos

  if (fromRange.start < toRange.start) {
    toIdx = without.findIndex((t) => t.id === toRootId && !t.parentId)
  }

  let insertAt = toIdx
  if (placeAfter) {
    insertAt = toIdx + 1
    while (
      insertAt < without.length &&
      without[insertAt].parentId === toRootId
    ) {
      insertAt++
    }
  }

  without.splice(insertAt, 0, ...block)
  return without
}

/**
 * When a parent is deleted, promote children to root.
 *
 * @param {Todo[]} todos
 * @param {string} id
 * @returns {Todo[]}
 */
export function removeTodoById(todos, id) {
  const next = todos.filter((t) => t.id !== id)
  return normalizeTodoList(
    next.map((t) => (t.parentId === id ? { ...t, parentId: null } : t)),
  )
}
