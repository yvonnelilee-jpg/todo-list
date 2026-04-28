/** @typedef {import('./todos.js').Todo} Todo */

import { reorderTodosCanonical } from './todos.js'

const addedFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * @param {string} iso
 * @returns {string}
 */
function formatAddedAt(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return addedFormatter.format(d)
}

/**
 * Fills the list from `<template id="todo-item-template">` clones.
 *
 * @param {HTMLUListElement} listEl
 * @param {HTMLTemplateElement} template
 * @param {Todo[]} todos
 */
export function renderTodoList(listEl, template, todos) {
  listEl.replaceChildren()

  const ordered = reorderTodosCanonical(todos)
  const frag = document.createDocumentFragment()

  for (const todo of ordered) {
    const node = template.content.cloneNode(true)
    const li = /** @type {HTMLElement | null} */ (node.querySelector('.todo-item'))
    const checkbox = /** @type {HTMLInputElement | null} */ (
      node.querySelector('.todo-checkbox')
    )
    const titleEl = node.querySelector('.todo-title')
    const timeEl = /** @type {HTMLTimeElement | null} */ (node.querySelector('.todo-time'))
    const delBtn = /** @type {HTMLButtonElement | null} */ (
      node.querySelector('.todo-delete')
    )
    const dragHandle = /** @type {HTMLElement | null} */ (
      node.querySelector('.todo-drag-handle')
    )
    if (!li || !checkbox || !titleEl || !timeEl || !delBtn || !dragHandle) continue

    const isSub = Boolean(todo.parentId)
    li.dataset.todoId = todo.id
    if (isSub) {
      li.classList.add('is-subtask')
      li.dataset.parentId = todo.parentId || ''
    }
    checkbox.checked = todo.done
    checkbox.setAttribute('aria-label', `Mark “${todo.title}” complete`)
    titleEl.textContent = todo.title
    if (todo.done) {
      titleEl.classList.add('is-done')
    }

    const iso = todo.createdAt
    timeEl.dateTime = iso
    timeEl.textContent = formatAddedAt(iso)

    const delLabel = `Delete “${todo.title}”`
    delBtn.setAttribute('aria-label', delLabel)
    delBtn.setAttribute('title', delLabel)

    const reorderLabel = `Drag to reorder: “${todo.title}”`
    dragHandle.setAttribute('aria-label', reorderLabel)
    dragHandle.setAttribute('title', reorderLabel)
    if (isSub) {
      dragHandle.hidden = true
      dragHandle.setAttribute('aria-hidden', 'true')
    }

    frag.appendChild(node)
  }

  listEl.appendChild(frag)
}
