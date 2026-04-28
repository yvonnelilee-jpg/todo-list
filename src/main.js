import './style.css'
import {
  getPreference,
  initThemeFromStorage,
  onThemeApplied,
  setThemePreference,
} from './theme.js'
import { renderTodoList } from './render.js'
import { createTodo, deleteTodo, loadTodos, updateTodoDone } from './todos.js'
import { playCrinkleSound, playPinSound } from './sounds.js'

/** @typedef {import('./todos.js').Todo} Todo */

/** @type {Todo[]} */
let todos = []

initThemeFromStorage()

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

        <section class="list-section" aria-labelledby="list-heading">
          <h2 id="list-heading" class="list-heading">Tasks</h2>
          <ul id="todo-list" class="todo-list" role="list"></ul>
          <p id="todo-empty" class="todo-empty" hidden>No tasks yet — add one above.</p>
        </section>
      </main>
    </div>
  `

  const form = /** @type {HTMLFormElement} */ (root.querySelector('#todo-form'))
  const input = /** @type {HTMLInputElement} */ (root.querySelector('#todo-input'))
  const listEl = /** @type {HTMLUListElement} */ (root.querySelector('#todo-list'))
  const emptyEl = /** @type {HTMLElement} */ (root.querySelector('#todo-empty'))
  const themeAuto = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-auto'))
  const themeDay = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-day'))
  const themeNight = /** @type {HTMLButtonElement} */ (root.querySelector('#theme-night'))

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

  function syncEmptyState() {
    emptyEl.hidden = todos.length > 0
    listEl.hidden = todos.length === 0
  }

  function render() {
    renderTodoList(listEl, template, todos)
    syncEmptyState()
  }

  async function refreshTodos() {
    todos = await loadTodos()
    render()
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title = input.value
    if (!title.trim()) return
    try {
      const created = await createTodo(title)
      todos.push(created)
      input.value = ''
      playPinSound()
      render()
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
    const todo = todos.find((t) => t.id === id)
    if (!todo) return
    const wasDone = todo.done
    todo.done = target.checked
    try {
      await updateTodoDone(id, target.checked)
      if (todo.done && !wasDone) {
        playCrinkleSound()
      }
      render()
    } catch (error) {
      todo.done = wasDone
      target.checked = wasDone
      console.error('Failed to update todo', error)
    }
  })

  listEl.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('.todo-delete')
    if (!(btn instanceof HTMLButtonElement)) return
    const id = btn.closest('[data-todo-id]')?.getAttribute('data-todo-id')
    if (!id) return
    try {
      await deleteTodo(id)
      todos = todos.filter((t) => t.id !== id)
      render()
    } catch (error) {
      console.error('Failed to delete todo', error)
    }
  })

  try {
    await refreshTodos()
  } catch (error) {
    console.error('Failed to load todos', error)
    render()
  }
  input.focus()
}

void mount()
