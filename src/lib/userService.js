import { databases, account, isAppwriteConfigured, ID, Query, Permission, Role, DATABASE_ID, USERS_TABLE_ID, SKILLS_TABLE_ID, TESTIMONIALS_TABLE_ID } from './appwrite'

function requireAppwrite() {
    if (!isAppwriteConfigured || !databases) {
        throw new Error('Appwrite is not configured.')
    }
}

/** Normalise Appwrite $id → id so page components stay unchanged. */
function normalise(doc) {
    if (!doc) return null
    return { ...doc, id: doc.$id, created_at: doc.$createdAt, updated_at: doc.$updatedAt }
}

export async function submitTestimonial({ name, username, body, img }) {
    requireAppwrite()
    const user = await account.get()
    if (!user) throw new Error('Not signed in')

    // Fetch the actual profile to ensure the username matches exactly what's saved in the app
    const profile = await getProfile(user.$id)
    const finalUsername = profile?.username || username || 'user'
    const finalName = profile?.display_name || profile?.username || name || 'Anonymous'
    const finalImg = profile?.avatar_url || img

    const perms = [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
    ]

    const data = await databases.createDocument(
        DATABASE_ID,
        TESTIMONIALS_TABLE_ID,
        ID.unique(),
        {
            name: finalName,
            username: `@${finalUsername.replace(/^@/, '')}`, // Ensure single @ prefix
            body,
            img: finalImg,
            user_id: user.$id
        },
        perms
    )
    return normalise(data)
}

export async function hasSubmittedTestimonial(userId) {
    if (!userId) return false;
    requireAppwrite()
    try {
        const res = await databases.listDocuments(
            DATABASE_ID,
            TESTIMONIALS_TABLE_ID,
            [
                Query.equal('user_id', userId),
                Query.limit(1)
            ]
        )
        return res.total > 0
    } catch (e) {
        return false
    }
}

/** Fetch a user's public profile by their auth user ID (stored as user_id attribute). */
export async function getProfile(userId) {
    requireAppwrite()
    try {
        const res = await databases.listDocuments(
            DATABASE_ID,
            USERS_TABLE_ID,
            [Query.equal('user_id', userId), Query.limit(1)]
        )
        return res.documents.length > 0 ? normalise(res.documents[0]) : null
    } catch (err) {
        if (err?.code === 404) return null
        throw err
    }
}

/** Fetch a user's public profile by username (for profile page URL). */
export async function getProfileByUsername(username) {
    requireAppwrite()
    try {
        const res = await databases.listDocuments(
            DATABASE_ID,
            USERS_TABLE_ID,
            [Query.equal('username', username), Query.limit(1)]
        )
        return res.documents.length > 0 ? normalise(res.documents[0]) : null
    } catch (err) {
        if (err?.code === 404) return null
        throw err
    }
}

/** Batch-fetch profiles for an array of auth user_ids.
 *  Returns a map of { [user_id]: profile } for quick lookup. */
export async function getProfilesByUserIds(userIds) {
    if (!userIds || userIds.length === 0) return {}
    requireAppwrite()
    try {
        const unique = [...new Set(userIds)]
        const res = await databases.listDocuments(
            DATABASE_ID,
            USERS_TABLE_ID,
            [Query.equal('user_id', unique), Query.limit(unique.length)]
        )
        const map = {}
        for (const doc of res.documents) {
            map[doc.user_id] = normalise(doc)
        }
        return map
    } catch {
        return {}
    }
}

/** Returns aggregate stats for a user's public skills. */
export async function getProfileStats(userId) {
    requireAppwrite()
    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('user_id', userId),
            Query.equal('visibility', 'public'),
            Query.limit(100),
            Query.select(['copy_count', 'download_count', 'star_count']),
        ]
    )
    return (res.documents || []).reduce(
        (acc, s) => ({
            total_skills: acc.total_skills + 1,
            total_copies: acc.total_copies + (s.copy_count || 0),
            total_downloads: acc.total_downloads + (s.download_count || 0),
            total_stars: acc.total_stars + (s.star_count || 0),
        }),
        { total_skills: 0, total_copies: 0, total_downloads: 0, total_stars: 0 }
    )
}

/** Update a user's editable profile fields. */
export async function updateProfile({ id, display_name, bio, avatar_url }) {
    requireAppwrite()
    const patch = { display_name: display_name ?? null, bio: bio ?? null }
    if (avatar_url !== undefined) patch.avatar_url = avatar_url
    const data = await databases.updateDocument(
        DATABASE_ID,
        USERS_TABLE_ID,
        id,
        patch
    )
    return normalise(data)
}

/** Toggles a skill in the user's saved_skills array */
export async function toggleSavedSkill(profileId, skillId, action) {
    requireAppwrite()
    const profile = await databases.getDocument(DATABASE_ID, USERS_TABLE_ID, profileId)
    let saved = profile.saved_skills || []
    if (action === 'save' && !saved.includes(skillId)) saved.push(skillId)
    else if (action === 'unsave') saved = saved.filter(id => id !== skillId)

    const data = await databases.updateDocument(DATABASE_ID, USERS_TABLE_ID, profileId, { saved_skills: saved })
    return normalise(data)
}

/** Fetch skills saved by the user */
export async function getSavedSkills(profileId) {
    requireAppwrite()
    const profile = await databases.getDocument(DATABASE_ID, USERS_TABLE_ID, profileId)
    if (!profile.saved_skills || profile.saved_skills.length === 0) return []

    const res = await databases.listDocuments(DATABASE_ID, SKILLS_TABLE_ID, [
        Query.equal('$id', profile.saved_skills),
        Query.limit(100)
    ])
    return res.documents.map(normalise)
}


/** Returns true if the username is not taken. */
export async function isUsernameAvailable(username) {
    requireAppwrite()
    const res = await databases.listDocuments(
        DATABASE_ID,
        USERS_TABLE_ID,
        [Query.equal('username', username), Query.limit(1)]
    )
    return res.documents.length === 0
}

/** Create a new public profile row linked to Appwrite auth user. */
export async function createProfile({ id, username, email, avatar_url }) {
    requireAppwrite()
    const data = await databases.createDocument(
        DATABASE_ID,
        USERS_TABLE_ID,
        ID.unique(),
        { user_id: id, username, email: email ?? null, avatar_url: avatar_url ?? null },
        [
            Permission.read(Role.any()),                 // profiles are publicly readable
            Permission.update(Role.user(id)),            // only owner can edit
            Permission.delete(Role.user(id)),
        ]
    )
    return normalise(data)
}

/** Derive a safe username suggestion from an email address. */
export function suggestUsername(email) {
    if (!email) return ''
    const prefix = email.split('@')[0]
    return prefix
        .toLowerCase()
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/^-+|-+$/g, '')
}

/** Find the first available username from a base suggestion. */
export async function findAvailableUsername(base) {
    const clean = base.replace(/\d+$/, '')
    if (await isUsernameAvailable(clean)) return clean
    for (let i = 2; i <= 20; i++) {
        const candidate = `${clean}${i}`
        if (await isUsernameAvailable(candidate)) return candidate
    }
    return clean
}
