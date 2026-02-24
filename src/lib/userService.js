import { supabase, isSupabaseConfigured } from './supabase'

function requireSupabase() {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.')
    }
}

/** Fetch a user's public profile by their auth user ID. Returns null if not found. */
export async function getProfile(userId) {
    requireSupabase()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
    if (error) throw error
    return data
}

/** Returns true if the username is not taken. */
export async function isUsernameAvailable(username) {
    requireSupabase()
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle()
    if (error) throw error
    return data === null
}

/** Create a new public profile row linked to auth.users. */
export async function createProfile({ id, username, email, avatar_url }) {
    requireSupabase()
    const { data, error } = await supabase
        .from('users')
        .insert([{ id, username, email: email ?? null, avatar_url: avatar_url ?? null }])
        .select()
        .single()
    if (error) throw error
    return data
}

/**
 * Derive a safe username suggestion from an email address.
 * E.g. "abhishek.bajpai@gmail.com" → "abhishek-bajpai"
 */
export function suggestUsername(email) {
    if (!email) return ''
    const prefix = email.split('@')[0]
    return prefix
        .toLowerCase()
        .replace(/\./g, '-')        // dots → hyphens
        .replace(/[^a-z0-9-]/g, '') // strip anything else
        .replace(/^-+|-+$/g, '')    // trim leading/trailing hyphens
}

/**
 * Find the first available username from a base suggestion:
 * tries base, then base2, base3, etc. via Supabase.
 */
export async function findAvailableUsername(base) {
    const clean = base.replace(/\d+$/, '') // strip any trailing number
    if (await isUsernameAvailable(clean)) return clean
    for (let i = 2; i <= 20; i++) {
        const candidate = `${clean}${i}`
        if (await isUsernameAvailable(candidate)) return candidate
    }
    return clean // fallback — validation will show it's taken
}
