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
  ensureDefaultTabs,
  loadTodosByTab,
  moveRootBlockPersist,
  removeTodoById,
  reorderTodosCanonical,
  updateTodoDone,
} from './todos.js'
import { tabFaceColor } from './notebook-state.js'
import { playCrinkleSound, playDeleteSound, playPinSound } from './sounds.js'
import {
  ensureSession,
  getCurrentUser,
  maybeRunPendingMerge,
  onAuthStateChange,
  rememberAnonymousUser,
  setStoredAnonymousUserId,
  signInWithMagicLink,
  signInWithPassword,
  signOutToAnonymousSession,
  signUpWithPassword,
} from './auth.js'

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

const notebookDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
})

/**
 * @returns {string}
 */
function formatNotebookDate() {
  return notebookDateFormatter.format(new Date())
}

/**
 * @param {import('@supabase/supabase-js').User | null} user
 * @returns {boolean}
 */
function isAnonymousUser(user) {
  return Boolean(user?.is_anonymous)
}

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
        <div class="auth-strip">
          <div class="auth-strip-left">
            <span class="auth-user" id="auth-user-label">Guest</span>
          </div>
          <div class="auth-strip-actions">
            <div
              class="auth-toolbar"
              role="group"
              aria-label="Sign in or create an account"
            >
              <button type="button" class="auth-btn" id="auth-create">Create account</button>
              <button type="button" class="auth-btn" id="auth-login">Login</button>
            </div>
            <button type="button" class="auth-btn auth-toolbar-solo" id="auth-logout" hidden>
              Log out
            </button>
          </div>
        </div>
        <div class="notebook-header-row">
          <div>
            <p class="notebook-date">${formatNotebookDate()}</p>
            <p class="eyebrow">Task Notebook</p>
          </div>
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
    <div class="auth-modal-backdrop" id="auth-modal-backdrop" hidden>
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="auth-modal-head">
          <h2 id="auth-modal-title" class="auth-modal-title">Account</h2>
          <button type="button" class="auth-close" id="auth-modal-close" aria-label="Close authentication dialog">×</button>
        </div>
        <form id="auth-form" class="auth-form">
          <label class="auth-label" for="auth-email">Email</label>
          <input id="auth-email" class="auth-input" type="email" required autocomplete="email" />
          <label class="auth-label" for="auth-password">Password</label>
          <input id="auth-password" class="auth-input" type="password" autocomplete="current-password" minlength="6" />
          <p id="auth-status" class="auth-status" aria-live="polite"></p>
          <div class="auth-form-actions">
            <button type="submit" class="quick-add-submit" id="auth-submit-btn">Login</button>
            <button type="button" class="auth-btn" id="auth-magic-link-btn">Send magic link</button>
          </div>
        </form>
      </div>
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
  const themeAuto = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-auto'))
  const themeDay = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-day'))
  const themeNight = /** @type {HTMLButtonElement} */ (
    root.querySelector('#theme-night')
  )
  const authUserLabel = /** @type {HTMLElement} */ (root.querySelector('#auth-user-label'))
  const authCreateBtn = /** @type {HTMLButtonElement} */ (root.querySelector('#auth-create'))
  const authLoginBtn = /** @type {HTMLButtonElement} */ (root.querySelector('#auth-login'))
  const authLogoutBtn = /** @type {HTMLButtonElement} */ (root.querySelector('#auth-logout'))
  const authModalBackdrop = /** @type {HTMLElement} */ (
    root.querySelector('#auth-modal-backdrop')
  )
  const authModalTitle = /** @type {HTMLElement} */ (root.querySelector('#auth-modal-title'))
  const authModalClose = /** @type {HTMLButtonElement} */ (root.querySelector('#auth-modal-close'))
  const authForm = /** @type {HTMLFormElement} */ (root.querySelector('#auth-form'))
  const authEmail = /** @type {HTMLInputElement} */ (root.querySelector('#auth-email'))
  const authPassword = /** @type {HTMLInputElement} */ (root.querySelector('#auth-password'))
  const authStatus = /** @type {HTMLElement} */ (root.querySelector('#auth-status'))
  const authSubmitBtn = /** @type {HTMLButtonElement} */ (root.querySelector('#auth-submit-btn'))
  const authMagicLinkBtn = /** @type {HTMLButtonElement} */ (
    root.querySelector('#auth-magic-link-btn')
  )

  /** @type {Element | null} */
  let authModalReturnFocus = null

  /** @type {'login' | 'signup'} */
  let authMode = 'login'
  /** @type {import('@supabase/supabase-js').User | null} */
  let currentUser = null

  function setAuthStatus(message) {
    authStatus.textContent = message
  }

  function applyAuthMode(mode) {
    authMode = mode
    const isLogin = mode === 'login'
    authModalTitle.textContent = isLogin ? 'Login' : 'Create account'
    authSubmitBtn.textContent = isLogin ? 'Login' : 'Signup'
    authMagicLinkBtn.hidden = !isLogin
    authPassword.autocomplete = isLogin ? 'current-password' : 'new-password'
    authPassword.required = true
    setAuthStatus('')
  }

  function openAuthModal(mode) {
    authModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    applyAuthMode(mode)
    authModalBackdrop.hidden = false
    authEmail.focus()
  }

  function closeAuthModal() {
    authModalBackdrop.hidden = true
    authForm.reset()
    setAuthStatus('')
    const el = authModalReturnFocus
    authModalReturnFocus = null
    if (el && root.contains(el)) {
      el.focus()
    }
  }

  function syncAuthBar() {
    const anonymous = isAnonymousUser(currentUser)
    authCreateBtn.hidden = !anonymous
    authLoginBtn.hidden = !anonymous
    authLogoutBtn.hidden = anonymous
    authUserLabel.textContent = anonymous ? 'Guest' : currentUser?.email || 'Signed in'
  }

  async function reloadNotebookForCurrentUser() {
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
  }

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

  authCreateBtn.addEventListener('click', () => openAuthModal('signup'))
  authLoginBtn.addEventListener('click', () => openAuthModal('login'))
  authModalClose.addEventListener('click', (e) => {
    e.stopPropagation()
    closeAuthModal()
  })
  authModalBackdrop.addEventListener('click', (e) => {
    if (e.target === authModalBackdrop) closeAuthModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (authModalBackdrop.hidden) return
    closeAuthModal()
  })

  authLogoutBtn.addEventListener('click', async () => {
    authLogoutBtn.disabled = true
    try {
      await signOutToAnonymousSession()
      const user = await getCurrentUser()
      currentUser = user
      if (isAnonymousUser(user)) setStoredAnonymousUserId(user.id)
      syncAuthBar()
      await reloadNotebookForCurrentUser()
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      authLogoutBtn.disabled = false
    }
  })

  authMagicLinkBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim()
    if (!email) {
      setAuthStatus('Enter your email first.')
      return
    }
    authMagicLinkBtn.disabled = true
    try {
      await signInWithMagicLink({ email })
      setAuthStatus('Magic link sent. Check your inbox.')
    } catch (error) {
      setAuthStatus('Unable to send magic link right now.')
      console.error('Failed to send magic link', error)
    } finally {
      authMagicLinkBtn.disabled = false
    }
  })

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = authEmail.value.trim()
    const password = authPassword.value
    if (!email || !password) {
      setAuthStatus('Email and password are required.')
      return
    }
    authSubmitBtn.disabled = true
    try {
      if (authMode === 'login') {
        await signInWithPassword({ email, password })
      } else {
        await signUpWithPassword({ email, password })
      }
      const user = await getCurrentUser()
      currentUser = user
      syncAuthBar()
      closeAuthModal()
      await reloadNotebookForCurrentUser()
    } catch (error) {
      setAuthStatus(
        authMode === 'login'
          ? 'Login failed. Check your credentials.'
          : 'Could not create account with those details.',
      )
      console.error('Auth submit failed', error)
    } finally {
      authSubmitBtn.disabled = false
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
    const initialSession = await ensureSession()
    rememberAnonymousUser(initialSession)
    await maybeRunPendingMerge()
    currentUser = await getCurrentUser()
    if (isAnonymousUser(currentUser)) {
      setStoredAnonymousUserId(currentUser.id)
    }
    syncAuthBar()
    await reloadNotebookForCurrentUser()
  } catch (error) {
    console.error('Failed to initialize notebook', error)
    renderApp()
  }

  onAuthStateChange(async (_event, session) => {
    rememberAnonymousUser(session)
    try {
      await maybeRunPendingMerge()
      currentUser = session?.user ?? null
      if (isAnonymousUser(currentUser)) {
        setStoredAnonymousUserId(currentUser.id)
      }
      syncAuthBar()
      await reloadNotebookForCurrentUser()
    } catch (error) {
      console.error('Failed to sync auth state', error)
    }
  })

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

  input.focus()
}

void mount()
