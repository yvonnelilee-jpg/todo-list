import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPARBASE_PUBLISHABLE_KEY

if (
  !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY &&
  import.meta.env.VITE_SUPARBASE_PUBLISHABLE_KEY
) {
  console.warn(
    'Using deprecated env var VITE_SUPARBASE_PUBLISHABLE_KEY. Rename it to VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_PROJECT_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
