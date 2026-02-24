import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only reliable check: does the URL look like a real Supabase project URL?
export const isSupabaseConfigured =
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

if (!isSupabaseConfigured) {
    console.warn('⚠️  Supabase: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running without auth.')
}
