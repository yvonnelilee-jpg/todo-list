import { supabase } from './supabase.js'

/**
 * @typedef {{ id: string, title: string, done: boolean, createdAt: string }} Todo
 */

/**
 * @typedef {{ id: string, title: string, done: boolean, created_at: string }} TodoRow
 */

/**
 * @param {TodoRow} row
 * @returns {Todo}
 */
function mapRowToTodo(row) {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    createdAt: row.created_at,
  }
}

/**
 * @returns {Promise<Todo[]>}
 */
export async function loadTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('id,title,done,created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapRowToTodo)
}

/**
 * @param {string} title
 * @returns {Promise<Todo>}
 */
export async function createTodo(title) {
  const t = title.trim()
  const { data, error } = await supabase
    .from('todos')
    .insert({ title: t, done: false })
    .select('id,title,done,created_at')
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
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTodo(id) {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}
