/**
 * @typedef {{ id: string, label: string }} NotebookTab
 */

/** @typedef {import('./todos.js').Todo} Todo */

/**
 * @typedef {{
 *   version: 2,
 *   tabs: NotebookTab[],
 *   activeTabId: string,
 *   todosByTabId: Record<string, Todo[]>
 * }} NotebookState
 */

import { normalizeTodoList, sanitizeTodoList } from './todos.js'

const STORAGE_KEY = 'task-notebook-todos'

export const MAX_TABS = 6

export const DEFAULT_TAB_DEFS = [
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'groceries', label: 'Groceries' },
]

/** Hex fills for tab faces (light theme); inactive uses softer variant in CSS */
export const TAB_FACE_COLORS = [
  '#e891a3',
  '#e8b4b8',
  '#f0c4b8',
  '#7ec4c4',
  '#c49fe8',
  '#9fd4e8',
]

/**
 * @returns {NotebookState}
 */
function emptyState() {
  const tabs = DEFAULT_TAB_DEFS.map((t) => ({ ...t }))
  const todosByTabId = /** @type {Record<string, Todo[]>} */ ({})
  for (const t of tabs) {
    todosByTabId[t.id] = []
  }
  return {
    version: 2,
    tabs,
    activeTabId: tabs[0].id,
    todosByTabId,
  }
}

/**
 * @param {unknown} value
 * @returns {value is Todo[]}
 */
function isLegacyTodoArray(value) {
  return Array.isArray(value)
}

/**
 * @param {unknown} parsed
 * @returns {NotebookState}
 */
function normalizeV2(parsed) {
  const tabsRaw = /** @type {unknown} */ (
    /** @type {Record<string, unknown>} */ (parsed).tabs
  )
  const activeRaw = /** @type {unknown} */ (
    /** @type {Record<string, unknown>} */ (parsed).activeTabId
  )
  const byIdRaw = /** @type {unknown} */ (
    /** @type {Record<string, unknown>} */ (parsed).todosByTabId
  )

  let tabs = /** @type {NotebookTab[]} */ (
    Array.isArray(tabsRaw)
      ? tabsRaw
          .filter(
            (t) =>
              t !== null &&
              typeof t === 'object' &&
              typeof /** @type {NotebookTab} */ (t).id === 'string' &&
              typeof /** @type {NotebookTab} */ (t).label === 'string',
          )
          .map((t) => ({
            id: /** @type {NotebookTab} */ (t).id,
            label: /** @type {NotebookTab} */ (t).label,
          }))
      : []
  )

  if (tabs.length === 0) {
    return emptyState()
  }

  tabs = tabs.slice(0, MAX_TABS)

  const todosByTabId = /** @type {Record<string, Todo[]>} */ ({})
  for (const t of tabs) {
    todosByTabId[t.id] = []
  }

  if (byIdRaw !== null && typeof byIdRaw === 'object') {
    for (const t of tabs) {
      const list = /** @type {Record<string, unknown>} */ (byIdRaw)[t.id]
      todosByTabId[t.id] = sanitizeTodoList(Array.isArray(list) ? list : [])
    }
  }

  for (const id of Object.keys(todosByTabId)) {
    todosByTabId[id] = normalizeTodoList(todosByTabId[id])
  }

  let activeTabId =
    typeof activeRaw === 'string' && tabs.some((t) => t.id === activeRaw)
      ? activeRaw
      : tabs[0].id

  return {
    version: 2,
    tabs,
    activeTabId,
    todosByTabId,
  }
}

/**
 * @returns {NotebookState}
 */
export function loadNotebookState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      /** @type {Record<string, unknown>} */ (parsed).version === 2
    ) {
      return normalizeV2(parsed)
    }
    if (isLegacyTodoArray(parsed)) {
      const state = emptyState()
      const firstId = state.tabs[0].id
      state.todosByTabId[firstId] = sanitizeTodoList(parsed)
      state.todosByTabId[firstId] = normalizeTodoList(state.todosByTabId[firstId])
      return state
    }
  } catch {
    /* ignore */
  }
  return emptyState()
}

/**
 * @param {NotebookState} state
 */
export function saveNotebookState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} label
 * @returns {string}
 */
export function createTabId(label) {
  const trimmed = label.trim()
  const base = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const slug = base || 'tab'
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * @param {NotebookState} state
 * @param {string} label
 * @returns {NotebookState | null}
 */
export function addTab(state, label) {
  if (state.tabs.length >= MAX_TABS) return null
  const id = createTabId(label)
  const tab = { id, label: label.trim() || 'New tab' }
  const tabs = [...state.tabs, tab]
  const todosByTabId = { ...state.todosByTabId, [id]: [] }
  return {
    ...state,
    tabs,
    todosByTabId,
    activeTabId: id,
  }
}

/**
 * @param {NotebookState} state
 * @param {string} tabId
 * @returns {NotebookState}
 */
export function removeTab(state, tabId) {
  if (state.tabs.length <= 1) return state
  const idx = state.tabs.findIndex((t) => t.id === tabId)
  if (idx === -1) return state

  const orphanTodos = state.todosByTabId[tabId] || []
  const nextTabs = state.tabs.filter((t) => t.id !== tabId)
  const fallbackId = nextTabs[0].id

  const todosByTabId = { ...state.todosByTabId }
  delete todosByTabId[tabId]
  todosByTabId[fallbackId] = [
    ...(todosByTabId[fallbackId] || []),
    ...orphanTodos,
  ]
  todosByTabId[fallbackId] = normalizeTodoList(todosByTabId[fallbackId])

  let activeTabId = state.activeTabId
  if (activeTabId === tabId) activeTabId = fallbackId

  return {
    ...state,
    tabs: nextTabs,
    todosByTabId,
    activeTabId,
  }
}

/**
 * @param {NotebookState} state
 * @param {string} tabId
 * @returns {NotebookState}
 */
export function setActiveTab(state, tabId) {
  if (!state.tabs.some((t) => t.id === tabId)) return state
  return { ...state, activeTabId: tabId }
}

/**
 * @param {NotebookTab} _tab
 * @param {number} index
 * @returns {string}
 */
export function tabFaceColor(_tab, index) {
  return TAB_FACE_COLORS[index % TAB_FACE_COLORS.length]
}
