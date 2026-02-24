import { supabase, isSupabaseConfigured } from './supabase'

function requireSupabase() {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
    }
}

/**
 * Save a generated skill to Supabase.
 * Requires the user to be signed in (row-level security uses auth.uid()).
 */
export async function saveSkill({ title, content, tags = [], visibility = 'private' }) {
    requireSupabase()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('You must be signed in to save a skill.')

    const { data, error } = await supabase
        .from('skills')
        .insert([
            {
                user_id: user.id,
                title,
                content,
                tags,
                visibility, // 'public' | 'private'
            },
        ])
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Fetch all skills belonging to the currently signed-in user.
 */
export async function getUserSkills() {
    requireSupabase()
    const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

/**
 * Delete a skill by id.
 */
export async function deleteSkill(id) {
    requireSupabase()
    const { error } = await supabase.from('skills').delete().eq('id', id)
    if (error) throw error
}

/**
 * Update an existing skill.
 */
export async function updateSkill(id, { title, content, tags }) {
    requireSupabase()
    const { data, error } = await supabase
        .from('skills')
        .update({ title, content, tags, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}
