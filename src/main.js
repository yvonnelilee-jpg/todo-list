import './style.css'
import {
  getPreference,
  initThemeFromStorage,
  onThemeApplied,
  setThemePreference,
} from './theme.js'
import { renderTodoList } from './render.js'
import {
  appendTodo,
  createTodo,
  createTab,
  deleteTab,
  ensureDefaultTabs,
  loadTabs,
  loadTodosByTab,
  moveRootBlockPersist,
  removeTodoById,
  reorderTodosCanonical,
  updateTodoDone,
} from './todos.js'
import { tabFaceColor } from './notebook-state.js'
import { playCrinkleSound, playDeleteSound, playPinSound } from './sounds.js'

/** @typedef {import('./todos.js').Todo} Todo */

/**
 * @typedef {{
 *   tabs: { id: string, label: string }[],
 *   activeTabId: string,
 *   todosByTabId: Record<string, Todo[]>
 * }} NotebookState
 */

/** @type {NotebookState} */
let notebook = { tabs: [], activeTabId: '', todosByTabId: {} }

initThemeFromStorage()

function currentTodos() {
  return notebook.todosByTabId[notebook.activeTabId] || []
}

/**
 * @param {Todo[]} next
 */
function setCurrentTodos(next) {
  notebook = {
    ...notebook,
    todosByTabId: {
      ...notebook.todosByTabId,
      [notebook.activeTabId]: reorderTodosCanonical(next),
    },
  }
}

async function mount() {
  const root = document.querySelector('#app')
  const template = document.querySelector('#todo-item-template')
  if (!root || !(template instanceof HTMLTemplateElement)) return

  root.innerHTML = `
    <div class="notebook">
      <header class="notebook-header">
        <div class="notebook-header-row">
          <p class="eyebrow">Task Notebook</p>
          <div
            class="theme-toolbar"
            role="group"
            aria-label="Theme: time of day, day, or night"
          >
            <button
              type="button"
              class="theme-btn"
              id="theme-auto"
              data-theme-pref="auto"
              title="Match time of day"
              aria-pressed="false"
            >
              <span class="sr-only">Match time of day</span>
              <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.75"/>
                <path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              type="button"
              class="theme-btn"
              id="theme-day"
              data-theme-pref="light"
              title="Day — light theme"
              aria-pressed="false"
            >
              <span class="sr-only">Day — light theme</span>
              <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.75"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              type="button"
              class="theme-btn"
              id="theme-night"
              data-theme-pref="dark"
              title="Night — dark theme"
              aria-pressed="false"
            >
              <span class="sr-only">Night — dark theme</span>
              <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <h1 class="notebook-title">Today</h1>
        <p class="lede">Quick capture — warm paper, simple lists.</p>
      </header>

      <main id="main" class="notebook-main">
        <form id="todo-form" class="quick-add" aria-label="Add a new task">
          <label class="sr-only" for="todo-input">Task title</label>
          <input
            id="todo-input"
            name="title"
            type="text"
            class="quick-add-input"
            placeholder="Write a task…"
            autocomplete="off"
            maxlength="500"
            required
          />
          <button type="submit" class="quick-add-submit">Add</button>
        </form>

        <div class="notebook-tabs-shell">
          <div class="notebook-folder-frame">
            <div class="notebook-tabs-row">
              <div class="notebook-tabs-actions" aria-label="Folder actions">
                <button type="button" class="tab-action-btn" id="tab-add">+ Tab</button>
                <button type="button" class="tab-action-btn" id="tab-delete">Delete Tab</button>
              </div>
              <div
                class="notebook-tabs"
                role="tablist"
                aria-label="Task folders"
              ></div>
            </div>
            <div
              class="notebook-tab-panel"
              id="notebook-tab-panel"
              role="tabpanel"
              tabindex="0"
            >
              <div class="notebook-folder-inner">
                <section class="list-section">
                  <ul id="todo-list" class="todo-list" role="list"></ul>
                  <p id="todo-empty" class="todo-empty" hidden>No tasks yet — add one above.</p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `

  const form = /** @type {HTMLFormElement} */ (root.querySelector('#todo-form'))
  const input = /** @type {HTMLInputElement} */ (root.querySelector('#todo-input'))
  const listEl = /** @type {HTMLUListElement} */ (root.querySelector('#todo-list'))
  const emptyEl = /** @type {HTMLElement} */ (root.querySelector('#todo-empty'))
  const tabPanel = /** @type {HTMLElement} */ (
    root.querySelector('#notebook-tab-panel')
  )
  const tabsEl = /** @type {HTMLElement} */ (root.querySelector('.notebook-tabs'))
  const addTabBtn = /** @type {HTMLButtonElement} */ (root.querySelector('#tab-add'))
  const deleteTabBtn = /** @type {HTMLButtonElement} */ (
    root.querySelector('#tab-delete')
  )
  const themeAuto = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-auto'))
  const themeDay = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-day'))
  const themeNight = /** @type {HTMLButtonElement} */ (
    root.querySelector('#theme-night')
  )

  function syncThemeToolbar() {
    const pref = getPreference()
    themeAuto.setAttribute('aria-pressed', pref === 'auto' ? 'true' : 'false')
    themeDay.setAttribute('aria-pressed', pref === 'light' ? 'true' : 'false')
    themeNight.setAttribute('aria-pressed', pref === 'dark' ? 'true' : 'false')
  }

  syncThemeToolbar()
  onThemeApplied(syncThemeToolbar)

  root.querySelector('.theme-toolbar')?.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement | null} */ (e.target).closest('.theme-btn')
    if (!(btn instanceof HTMLButtonElement)) return
    const pref = btn.dataset.themePref
    if (pref === 'auto' || pref === 'light' || pref === 'dark') {
      setThemePreference(pref)
    }
  })

  function triggerTabPanelAnimation() {
    tabPanel.classList.remove('is-tab-animating')
    void tabPanel.offsetWidth
    tabPanel.classList.add('is-tab-animating')
  }

  function syncTabPanelAttrs() {
    const panelId = 'notebook-tab-panel'
    tabPanel.id = panelId
    for (const btn of tabsEl.querySelectorAll('.notebook-tab')) {
      const id = btn.getAttribute('data-tab-id')
      if (!id) continue
      btn.setAttribute('aria-controls', panelId)
    }
  }

  function renderTabButtons() {
    tabsEl.replaceChildren()
    notebook.tabs.forEach((tab, index) => {
      const isActive = tab.id === notebook.activeTabId
      const tabBtn = document.createElement('button')
      tabBtn.type = 'button'
      tabBtn.className = 'notebook-tab'
      tabBtn.setAttribute('role', 'tab')
      tabBtn.setAttribute('data-tab-id', tab.id)
      tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false')
      tabBtn.setAttribute('tabindex', isActive ? '0' : '-1')
      tabBtn.setAttribute('id', `tab-${tab.id}`)
      tabBtn.style.setProperty('--tab-accent', tabFaceColor(tab, index))
      tabBtn.title = tab.label
      const labelSpan = document.createElement('span')
      labelSpan.className = 'notebook-tab-label'
      labelSpan.textContent = tab.label.toUpperCase()
      tabBtn.appendChild(labelSpan)

      const wrap = document.createElement('div')
      wrap.className = 'notebook-tab-wrap'
      /* First tab highest among inactives so each tab tucks under the one to its left. */
      const stack = notebook.tabs.length - 1
      wrap.style.zIndex = isActive
        ? '50'
        : String(10 + Math.max(0, stack - index))
      wrap.appendChild(tabBtn)
      tabsEl.appendChild(wrap)
    })

    syncTabPanelAttrs()

    const active = notebook.tabs.find((t) => t.id === notebook.activeTabId)
    if (active) {
      tabPanel.setAttribute('aria-labelledby', `tab-${active.id}`)
    } else {
      tabPanel.removeAttribute('aria-labelledby')
    }
  }

  function syncEmptyState() {
    const todos = currentTodos()
    emptyEl.hidden = todos.length > 0
    listEl.hidden = todos.length === 0
  }

  function renderApp() {
    renderTabButtons()
    renderTodoList(listEl, template, currentTodos())
    syncEmptyState()
    deleteTabBtn.disabled = notebook.tabs.length <= 1
    form.querySelector('.quick-add-submit')?.toggleAttribute(
      'disabled',
      !notebook.activeTabId,
    )
  }

  /**
   * Recover active tab state after failed initialization/migration mismatch.
   *
   * @returns {Promise<boolean>}
   */
  async function ensureActiveTabReady() {
    if (notebook.activeTabId) return true
    try {
      const tabs = await ensureDefaultTabs()
      notebook.tabs = tabs.map((t) => ({ id: t.id, label: t.label }))
      notebook.activeTabId = notebook.tabs[0]?.id ?? ''
      notebook.todosByTabId = Object.fromEntries(notebook.tabs.map((t) => [t.id, []]))
      if (notebook.activeTabId) {
        notebook.todosByTabId[notebook.activeTabId] = await loadTodosByTab(
          notebook.activeTabId,
        )
      }
      renderApp()
      return Boolean(notebook.activeTabId)
    } catch (error) {
      console.error('Failed to recover active tab', error)
      return false
    }
  }

  /** @type {string | null} */
  let draggingRootId = null

  function clearDragUi() {
    draggingRootId = null
    for (const el of listEl.querySelectorAll('.todo-item')) {
      el.classList.remove('is-dragging', 'drag-before', 'drag-after')
    }
    for (const h of listEl.querySelectorAll('.todo-drag-handle')) {
      h.setAttribute('aria-grabbed', 'false')
    }
  }

  listEl.addEventListener('dragstart', (e) => {
    const handle = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.todo-drag-handle')
    )
    if (!handle || handle.hidden) return
    const li = handle.closest('.todo-item')
    if (!(li instanceof HTMLElement)) return
    if (li.classList.contains('is-subtask')) return
    const id = li.dataset.todoId
    if (!id) return
    draggingRootId = id
    handle.setAttribute('aria-grabbed', 'true')
    li.classList.add('is-dragging')
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    }
  })

  listEl.addEventListener('dragend', () => {
    clearDragUi()
  })

  listEl.addEventListener('dragover', (e) => {
    if (!draggingRootId) return
    const li = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.todo-item')
    )
    if (!(li instanceof HTMLElement)) return
    if (li.classList.contains('is-subtask')) return
    const overId = li.dataset.todoId
    if (!overId || overId === draggingRootId) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    for (const el of listEl.querySelectorAll('.todo-item')) {
      el.classList.remove('drag-before', 'drag-after')
    }
    const rect = li.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    li.classList.add(before ? 'drag-before' : 'drag-after')
  })

  listEl.addEventListener('drop', async (e) => {
    const fromId = draggingRootId || e.dataTransfer?.getData('text/plain')
    if (!fromId) return
    const li = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.todo-item')
    )
    if (!(li instanceof HTMLElement)) return
    if (li.classList.contains('is-subtask')) {
      clearDragUi()
      return
    }
    const toId = li.dataset.todoId
    if (!toId || toId === fromId) {
      clearDragUi()
      return
    }
    e.preventDefault()
    const todos = currentTodos()
    const placeAfter = li.classList.contains('drag-after')
    try {
      const next = await moveRootBlockPersist(
        notebook.activeTabId,
        todos,
        fromId,
        toId,
        placeAfter,
      )
      setCurrentTodos(next)
      clearDragUi()
      renderApp()
    } catch (error) {
      console.error('Failed to reorder todos', error)
      clearDragUi()
    }
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title = input.value
    if (!title.trim()) return
    const ready = await ensureActiveTabReady()
    if (!ready) return
    try {
      const created = await createTodo({ tabId: notebook.activeTabId, title })
      setCurrentTodos(appendTodo(currentTodos(), created))
      input.value = ''
      playPinSound()
      renderApp()
      input.focus()
    } catch (error) {
      console.error('Failed to create todo', error)
    }
  })

  listEl.addEventListener('change', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target)
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
    const id = target.closest('[data-todo-id]')?.getAttribute('data-todo-id')
    if (!id) return
    const todos = currentTodos()
    const todo = todos.find((t) => t.id === id)
    if (!todo) return
    const wasDone = todo.done
    todo.done = target.checked
    try {
      await updateTodoDone(id, target.checked)
      if (todo.done && !wasDone) {
        playCrinkleSound()
      }
      renderApp()
    } catch (error) {
      todo.done = wasDone
      target.checked = wasDone
      console.error('Failed to update todo', error)
    }
  })

  listEl.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.todo-delete')
    )
    if (!(btn instanceof HTMLButtonElement)) return
    const id = btn.closest('[data-todo-id]')?.getAttribute('data-todo-id')
    if (!id) return
    try {
      await removeTodoById(id)
      setCurrentTodos(
        currentTodos()
          .filter((t) => t.id !== id)
          .map((t) => (t.parentId === id ? { ...t, parentId: null } : t)),
      )
      playDeleteSound()
      renderApp()
    } catch (error) {
      console.error('Failed to delete todo', error)
    }
  })

  try {
    const initialTabs = await ensureDefaultTabs()
    notebook.tabs = initialTabs.map((t) => ({ id: t.id, label: t.label }))
    notebook.activeTabId = notebook.tabs[0]?.id ?? ''
    notebook.todosByTabId = {}
    for (const tab of notebook.tabs) {
      notebook.todosByTabId[tab.id] = []
    }
    if (notebook.activeTabId) {
      notebook.todosByTabId[notebook.activeTabId] = await loadTodosByTab(
        notebook.activeTabId,
      )
    }
    renderApp()
  } catch (error) {
    console.error('Failed to initialize notebook', error)
    renderApp()
  }

  tabsEl.addEventListener('click', async (e) => {
    const tabBtn = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.notebook-tab')
    )
    if (!(tabBtn instanceof HTMLButtonElement)) return
    const id = tabBtn.getAttribute('data-tab-id')
    if (!id || id === notebook.activeTabId) return
    notebook = { ...notebook, activeTabId: id }
    if (!notebook.todosByTabId[id]) {
      notebook.todosByTabId[id] = await loadTodosByTab(id)
    }
    triggerTabPanelAnimation()
    renderApp()
  })

  tabPanel.addEventListener('animationend', () => {
    tabPanel.classList.remove('is-tab-animating')
  })

  addTabBtn.addEventListener('click', async () => {
    const label = window.prompt('Folder name', '')
    if (label === null) return
    try {
      const tab = await createTab(label)
      notebook = {
        ...notebook,
        tabs: [...notebook.tabs, { id: tab.id, label: tab.label }],
        activeTabId: tab.id,
        todosByTabId: { ...notebook.todosByTabId, [tab.id]: [] },
      }
      triggerTabPanelAnimation()
      renderApp()
    } catch (error) {
      console.error('Failed to create tab', error)
    }
  })

  deleteTabBtn.addEventListener('click', async () => {
    if (notebook.tabs.length <= 1) return
    const current = notebook.tabs.find((t) => t.id === notebook.activeTabId)
    if (!current) return
    const confirmed = window.confirm(`Delete folder "${current.label}" and its todos?`)
    if (!confirmed) return
    try {
      await deleteTab(current.id)
      const tabs = await loadTabs()
      notebook = {
        ...notebook,
        tabs: tabs.map((t) => ({ id: t.id, label: t.label })),
        activeTabId: tabs[0]?.id ?? '',
        todosByTabId: Object.fromEntries(
          tabs.map((t) => [t.id, notebook.todosByTabId[t.id] ?? []]),
        ),
      }
      if (notebook.activeTabId) {
        notebook.todosByTabId[notebook.activeTabId] = await loadTodosByTab(
          notebook.activeTabId,
        )
      }
      triggerTabPanelAnimation()
      renderApp()
    } catch (error) {
      console.error('Failed to delete tab', error)
    }
  })

  listEl.addEventListener('click', async (e) => {
    const subtaskBtn = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('.todo-subtask')
    )
    if (!(subtaskBtn instanceof HTMLButtonElement)) return
    const ready = await ensureActiveTabReady()
    if (!ready) return
    const parentId = subtaskBtn.closest('[data-todo-id]')?.getAttribute('data-todo-id')
    if (!parentId) return
    const title = window.prompt('Subtask title', '')
    if (!title || !title.trim()) return
    try {
      const created = await createTodo({
        tabId: notebook.activeTabId,
        title,
        parentId,
      })
      setCurrentTodos(appendTodo(currentTodos(), created))
      renderApp()
      input.focus()
    } catch (error) {
      console.error('Failed to create subtask', error)
    }
  })

  input.focus()
}

void mount()
