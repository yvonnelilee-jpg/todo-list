import { supabase } from './supabase.js'

/**
 * @typedef {{ id: string, label: string, position: number, createdAt: string }} NotebookTab
 */

/**
 * @typedef {{
 *   id: string,
 *   tabId: string,
 *   title: string,
 *   done: boolean,
 *   createdAt: string,
 *   parentId: string | null,
 *   position: number
 * }} Todo
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   position: number,
 *   created_at: string
 * }} TabRow
 */

/**
 * @typedef {{
 *   id: string,
 *   tab_id: string,
 *   title: string,
 *   done: boolean,
 *   created_at: string,
 *   parent_id: string | null,
 *   position: number
 * }} TodoRow
 */

const POSITION_STEP = 1000
const LEGACY_TAB_ID = 'default'

/** @type {'modern' | 'legacy' | null} */
let schemaMode = null

/**
 * @returns {Promise<'modern' | 'legacy'>}
 */
async function detectSchemaMode() {
  if (schemaMode) return schemaMode
  const { error } = await supabase.from('tabs').select('id').limit(1)
  schemaMode = error ? 'legacy' : 'modern'
  return schemaMode
}

/**
 * @param {TabRow} row
 * @returns {NotebookTab}
 */
function mapRowToTab(row) {
  return {
    id: row.id,
    label: row.label,
    position: row.position,
    createdAt: row.created_at,
  }
}

/**
 * @param {TodoRow} row
 * @returns {Todo}
 */
function mapRowToTodo(row) {
  return {
    id: row.id,
    tabId: row.tab_id,
    title: row.title,
    done: row.done,
    createdAt: row.created_at,
    parentId: row.parent_id,
    position: row.position,
  }
}

/**
 * @returns {Promise<NotebookTab[]>}
 */
export async function loadTabs() {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    return [
      {
        id: LEGACY_TAB_ID,
        label: 'Today',
        position: POSITION_STEP,
        createdAt: new Date().toISOString(),
      },
    ]
  }

  const { data, error } = await supabase
    .from('tabs')
    .select('id,label,position,created_at')
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapRowToTab)
}

/**
 * @returns {Promise<NotebookTab[]>}
 */
export async function ensureDefaultTabs() {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') return loadTabs()

  const existing = await loadTabs()
  if (existing.length > 0) return existing

  const defaults = ['Work', 'Personal', 'Groceries'].map((label, index) => ({
    label,
    position: (index + 1) * POSITION_STEP,
  }))
  const { error } = await supabase.from('tabs').insert(defaults)
  if (error) throw error
  return loadTabs()
}

/**
 * @param {string} label
 * @returns {Promise<NotebookTab>}
 */
export async function createTab(label) {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    throw new Error('Creating tabs requires the new Supabase tabs schema.')
  }

  const name = label.trim() || 'New tab'
  const tabs = await loadTabs()
  const lastPos = tabs.length > 0 ? tabs[tabs.length - 1].position : 0
  const { data, error } = await supabase
    .from('tabs')
    .insert({ label: name, position: lastPos + POSITION_STEP })
    .select('id,label,position,created_at')
    .single()

  if (error) throw error
  return mapRowToTab(data)
}

/**
 * @param {string} tabId
 * @returns {Promise<void>}
 */
export async function deleteTab(tabId) {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    throw new Error('Deleting tabs requires the new Supabase tabs schema.')
  }

  const { error } = await supabase.from('tabs').delete().eq('id', tabId)
  if (error) throw error
}

/**
 * @param {string} tabId
 * @returns {Promise<Todo[]>}
 */
export async function loadTodosByTab(tabId) {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    const { data, error } = await supabase
      .from('todos')
      .select('id,title,done,created_at')
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map((row, index) => ({
      id: row.id,
      tabId: LEGACY_TAB_ID,
      title: row.title,
      done: row.done,
      createdAt: row.created_at,
      parentId: null,
      position: (index + 1) * POSITION_STEP,
    }))
  }

  const { data, error } = await supabase
    .from('todos')
    .select('id,tab_id,title,done,created_at,parent_id,position')
    .eq('tab_id', tabId)
    .order('position', { ascending: true })

  if (error) throw error
  return normalizeTodoList((data ?? []).map(mapRowToTodo))
}

/**
 * @param {string} tabId
 * @param {string | null} parentId
 * @returns {Promise<number>}
 */
async function nextTodoPosition(tabId, parentId) {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    const { data, error } = await supabase
      .from('todos')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return (data?.length ?? 0) > 0 ? POSITION_STEP * 2 : POSITION_STEP
  }

  let q = supabase
    .from('todos')
    .select('position')
    .eq('tab_id', tabId)
    .order('position', { ascending: false })
    .limit(1)

  q = parentId ? q.eq('parent_id', parentId) : q.is('parent_id', null)
  const { data, error } = await q
  if (error) throw error
  const max = data?.[0]?.position ?? 0
  return max + POSITION_STEP
}

/**
 * @param {{ tabId: string, title: string, parentId?: string | null }} input
 * @returns {Promise<Todo>}
 */
export async function createTodo(input) {
  const mode = await detectSchemaMode()
  const title = input.title.trim()
  if (mode === 'legacy') {
    const { data, error } = await supabase
      .from('todos')
      .insert({
        title,
        done: false,
      })
      .select('id,title,done,created_at')
      .single()

    if (error) throw error
    return {
      id: data.id,
      tabId: LEGACY_TAB_ID,
      title: data.title,
      done: data.done,
      createdAt: data.created_at,
      parentId: null,
      position: await nextTodoPosition(LEGACY_TAB_ID, null),
    }
  }

  const parentId = input.parentId ?? null
  const position = await nextTodoPosition(input.tabId, parentId)

  const { data, error } = await supabase
    .from('todos')
    .insert({
      tab_id: input.tabId,
      title,
      done: false,
      parent_id: parentId,
      position,
    })
    .select('id,tab_id,title,done,created_at,parent_id,position')
    .single()

  if (error) throw error
  return mapRowToTodo(data)
}

/**
 * @param {string} id
 * @param {boolean} done
 * @returns {Promise<void>}
 */
export async function updateTodoDone(id, done) {
  const { error } = await supabase.from('todos').update({ done }).eq('id', id)
  if (error) throw error
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
 * Drop invalid parent links; ensure one level only.
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
    const parent = byId.get(t.parentId)
    if (!parent || parent.parentId) {
      t.parentId = null
    }
  }
  return reorderTodosCanonical(next)
}

/**
 * @param {string} tabId
 * @param {Todo[]} todos
 * @returns {Promise<void>}
 */
async function persistTabOrder(tabId, todos) {
  const normalized = normalizeTodoList(todos)
  const updates = normalized.map((todo, index) => ({
    id: todo.id,
    tab_id: tabId,
    parent_id: todo.parentId,
    position: (index + 1) * POSITION_STEP,
  }))
  for (const row of updates) {
    const { error } = await supabase
      .from('todos')
      .update({ parent_id: row.parent_id, position: row.position })
      .eq('id', row.id)
      .eq('tab_id', row.tab_id)
    if (error) throw error
  }
}

/**
 * @param {string} tabId
 * @param {Todo[]} todos
 * @param {string} fromRootId
 * @param {string} toRootId
 * @param {boolean} placeAfter
 * @returns {Promise<Todo[]>}
 */
export async function moveRootBlockPersist(
  tabId,
  todos,
  fromRootId,
  toRootId,
  placeAfter,
) {
  const mode = await detectSchemaMode()
  const next = moveRootBlock(todos, fromRootId, toRootId, placeAfter)
  if (mode === 'legacy') return normalizeTodoList(next)
  await persistTabOrder(tabId, next)
  return normalizeTodoList(next)
}

/**
 * When a parent is deleted, promote children to root.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removeTodoById(id) {
  const mode = await detectSchemaMode()
  if (mode === 'legacy') {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) throw error
    return
  }

  const { error: promoteError } = await supabase
    .from('todos')
    .update({ parent_id: null })
    .eq('parent_id', id)
  if (promoteError) throw promoteError

  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}
