import { supabase } from './supabase.js'

const ANON_USER_ID_KEY = 'todoList.anonymousUserId'
const configuredAppUrl = import.meta.env.VITE_APP_URL

/**
 * Build a stable redirect URL for auth emails.
 *
 * Prefer explicit `VITE_APP_URL` so production emails never point at localhost.
 *
 * @returns {string}
 */
function getAuthRedirectUrl() {
  const fallbackOrigin = window.location.origin
  const base = configuredAppUrl && configuredAppUrl.trim() ? configuredAppUrl : fallbackOrigin
  return new URL('/', base).toString()
}

/**
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function ensureSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session) return data.session

  const anonResult = await supabase.auth.signInAnonymously()
  if (anonResult.error) throw anonResult.error
  return anonResult.data.session ?? null
}

/**
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user ?? null
}

/**
 * @returns {Promise<string>}
 */
export async function getCurrentUserId() {
  const user = await getCurrentUser()
  if (!user) throw new Error('No authenticated user')
  return user.id
}

/**
 * @param {(event: string, session: import('@supabase/supabase-js').Session | null) => void} callback
 * @returns {() => void}
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

/**
 * @returns {string | null}
 */
export function getStoredAnonymousUserId() {
  return window.localStorage.getItem(ANON_USER_ID_KEY)
}

/**
 * @param {string | null} userId
 */
export function setStoredAnonymousUserId(userId) {
  if (!userId) {
    window.localStorage.removeItem(ANON_USER_ID_KEY)
    return
  }
  window.localStorage.setItem(ANON_USER_ID_KEY, userId)
}

/**
 * @param {import('@supabase/supabase-js').Session | null} session
 */
export function rememberAnonymousUser(session) {
  if (!session?.user) return
  if (session.user.is_anonymous) {
    setStoredAnonymousUserId(session.user.id)
  }
}

/**
 * @param {{ email: string, password: string }} input
 */
export async function signUpWithPassword(input) {
  const sourceAnonId = getStoredAnonymousUserId()
  const result = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })
  if (result.error) throw result.error
  await mergeAnonymousIntoCurrentUser(sourceAnonId)
  return result
}

/**
 * @param {{ email: string, password: string }} input
 */
export async function signInWithPassword(input) {
  const sourceAnonId = getStoredAnonymousUserId()
  const result = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (result.error) throw result.error
  await mergeAnonymousIntoCurrentUser(sourceAnonId)
  return result
}

/**
 * @param {{ email: string }} input
 */
export async function signInWithMagicLink(input) {
  const sourceAnonId = getStoredAnonymousUserId()
  const result = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })
  if (result.error) throw result.error
  if (sourceAnonId) {
    window.localStorage.setItem('todoList.pendingMergeSourceUserId', sourceAnonId)
  }
  return result
}

/**
 * @returns {Promise<void>}
 */
export async function signOutToAnonymousSession() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  setStoredAnonymousUserId(null)
  const session = await ensureSession()
  rememberAnonymousUser(session)
}

/**
 * @param {string | null} sourceUserId
 */
export async function mergeAnonymousIntoCurrentUser(sourceUserId) {
  if (!sourceUserId) return
  const current = await getCurrentUser()
  if (!current || current.id === sourceUserId) return
  const { error } = await supabase.rpc('merge_anonymous_data', {
    source_user_id: sourceUserId,
  })
  if (error) throw error
  setStoredAnonymousUserId(null)
  window.localStorage.removeItem('todoList.pendingMergeSourceUserId')
}

/**
 * @returns {Promise<void>}
 */
export async function maybeRunPendingMerge() {
  const pendingSource = window.localStorage.getItem('todoList.pendingMergeSourceUserId')
  if (!pendingSource) return
  await mergeAnonymousIntoCurrentUser(pendingSource)
}
