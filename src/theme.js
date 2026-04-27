/**
 * Day / night appearance: clock-based schedule plus optional manual override.
 * Day window: [DAY_START_HOUR, DAY_END_HOUR) — default 07:00–19:00 local time.
 *
 * Keep DAY_START_HOUR / DAY_END_HOUR in sync with the inline script in `index.html`.
 */

export const DAY_START_HOUR = 7
export const DAY_END_HOUR = 19

/** @typedef {'auto' | 'light' | 'dark'} ThemePreference */

export const THEME_PREFERENCE_STORAGE_KEY = 'task-notebook-theme-preference'

/** @type {ThemePreference | null} */
let preferenceCache = null

/** @type {ReturnType<typeof setTimeout> | null} */
let boundaryTimerId = null

/** @type {Set<() => void>} */
const appliedListeners = new Set()

/**
 * @param {Date} [date=new Date()]
 * @returns {'light' | 'dark'}
 */
export function themeForLocalTime(date = new Date()) {
  const h = date.getHours()
  const isDay = h >= DAY_START_HOUR && h < DAY_END_HOUR
  return isDay ? 'light' : 'dark'
}

/**
 * @returns {ThemePreference}
 */
export function loadPreference() {
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  } catch {
    /* private mode / blocked storage */
  }
  return 'auto'
}

/**
 * @param {ThemePreference} pref
 */
export function savePreference(pref) {
  try {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, pref)
  } catch {
    /* ignore */
  }
}

/**
 * @returns {ThemePreference}
 */
export function getPreference() {
  if (preferenceCache === null) preferenceCache = loadPreference()
  return preferenceCache
}

/**
 * @param {ThemePreference} pref
 */
export function setPreference(pref) {
  preferenceCache = pref
  savePreference(pref)
}

/**
 * Resolved visual theme (manual choice or clock).
 * @param {Date} [date=new Date()]
 * @returns {'light' | 'dark'}
 */
export function getResolvedTheme(date = new Date()) {
  const p = getPreference()
  if (p === 'light' || p === 'dark') return p
  return themeForLocalTime(date)
}

/**
 * Milliseconds until the next clock boundary (only meaningful when preference is `auto`).
 * @param {Date} [now=new Date()]
 */
export function msUntilNextBoundary(now = new Date()) {
  const next = new Date(now.getTime())
  const current = themeForLocalTime(now)

  if (current === 'light') {
    next.setHours(DAY_END_HOUR, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
  } else {
    next.setHours(DAY_START_HOUR, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
  }

  return Math.max(next.getTime() - now.getTime(), 1000)
}

function notifyThemeApplied() {
  for (const fn of appliedListeners) {
    try {
      fn()
    } catch {
      /* ignore listener errors */
    }
  }
}

/**
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function onThemeApplied(fn) {
  appliedListeners.add(fn)
  return () => appliedListeners.delete(fn)
}

/**
 * Sets `data-theme` / `theme-color` from the current preference + clock.
 */
export function applyDocumentTheme() {
  const theme = getResolvedTheme()
  const pref = getPreference()

  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.themePreference = pref
  document.documentElement.dataset.themePeriod = theme === 'light' ? 'day' : 'night'

  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute(
    'content',
    theme === 'dark' ? '#1e1c18' : '#0f0e0d',
  )

  notifyThemeApplied()
}

export function clearBoundarySchedule() {
  if (boundaryTimerId !== null) {
    clearTimeout(boundaryTimerId)
    boundaryTimerId = null
  }
}

export function rescheduleAutoTheme() {
  clearBoundarySchedule()
  if (getPreference() !== 'auto') return

  boundaryTimerId = window.setTimeout(() => {
    boundaryTimerId = null
    applyDocumentTheme()
    rescheduleAutoTheme()
  }, msUntilNextBoundary())
}

/**
 * Loads saved preference, applies theme, and starts the auto clock schedule when needed.
 */
export function initThemeFromStorage() {
  preferenceCache = loadPreference()
  applyDocumentTheme()
  rescheduleAutoTheme()
}

/**
 * @param {ThemePreference} pref
 */
export function setThemePreference(pref) {
  setPreference(pref)
  applyDocumentTheme()
  rescheduleAutoTheme()
}
