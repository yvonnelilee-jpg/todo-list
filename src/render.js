/** @typedef {import('./todos.js').Todo} Todo */

/**
 * Fills the list from `<template id="todo-item-template">` clones.
 *
 * @param {HTMLUListElement} listEl
 * @param {HTMLTemplateElement} template
 * @param {Todo[]} todos
 */
export function renderTodoList(listEl, template, todos) {
  listEl.replaceChildren()

  const frag = document.createDocumentFragment()
  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i]
    const node = template.content.cloneNode(true)
    const li = /** @type {HTMLElement | null} */ (node.querySelector('.todo-item'))
    const checkbox = /** @type {HTMLInputElement | null} */ (
      node.querySelector('.todo-checkbox')
    )
    const titleEl = node.querySelector('.todo-title')
    const delBtn = /** @type {HTMLButtonElement | null} */ (
      node.querySelector('.todo-delete')
    )

    if (!li || !checkbox || !titleEl || !delBtn) continue

    li.dataset.todoId = todo.id
    li.style.setProperty('--todo-tilt', i % 2 === 0 ? '-0.4deg' : '0.35deg')
    checkbox.checked = todo.done
    checkbox.setAttribute('aria-label', `Mark “${todo.title}” complete`)
    titleEl.textContent = todo.title
    if (todo.done) {
      titleEl.classList.add('is-done')
    }
    delBtn.setAttribute('aria-label', `Delete “${todo.title}”`)

    frag.appendChild(node)
  }

  listEl.appendChild(frag)
}
