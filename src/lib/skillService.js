import { databases, isAppwriteConfigured, ID, Query, Permission, Role, DATABASE_ID, SKILLS_TABLE_ID } from './appwrite'
import { account } from './appwrite'

function requireAppwrite() {
    if (!isAppwriteConfigured || !databases) {
        throw new Error('Appwrite is not configured. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID to your .env file.')
    }
}

/** Normalise Appwrite $id → id so page components stay unchanged. */
function normalise(doc) {
    if (!doc) return null
    return { ...doc, id: doc.$id }
}

/** Save a generated skill to Appwrite. */
export async function saveSkill({ title, content, tags = [], visibility = 'private', description = '', category = '' }) {
    requireAppwrite()
    const user = await account.get()
    if (!user) throw new Error('You must be signed in to save a skill.')

    // ── Duplicate title check (per user) ────────────────────────
    const existing = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('user_id', user.$id),
            Query.equal('title', title),
            Query.limit(1),
        ]
    )
    if (existing.total > 0) {
        throw new Error(`You already have a skill named "${title}". Please rename it or update the existing one.`)
    }

    // ── Check if first skill ──────────────────────────────────
    const allUserSkills = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('user_id', user.$id),
            Query.limit(1),
        ]
    )
    const isFirstSkill = allUserSkills.total === 0

    const perms = [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
    ]

    const data = await databases.createDocument(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        ID.unique(),
        { user_id: user.$id, title, content, tags, visibility, description, category, copy_count: 0, download_count: 0, star_count: 0 },
        perms
    )
    return { ...normalise(data), isFirstSkill }
}


/** Fetch all skills belonging to the currently signed-in user. */
export async function getUserSkills() {
    requireAppwrite()
    const user = await account.get()
    if (!user) return []

    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('user_id', user.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(100),
        ]
    )
    return res.documents.map(normalise)
}

/** Fetch PUBLIC skills for a given user with optional sort and pagination.
 *  Returns { docs: SkillDoc[], total: number } */
export async function getPublicSkillsByUser(userId, sort = 'recent', limit = 12, offset = 0) {
    requireAppwrite()
    const sortQuery = {
        'recent': Query.orderDesc('$createdAt'),
        'most-rated': Query.orderDesc('star_count'),
        'most-copied': Query.orderDesc('copy_count'),
    }[sort] ?? Query.orderDesc('$createdAt')

    const queries = [
        Query.equal('user_id', userId),
        Query.equal('visibility', 'public'),
        sortQuery,
        Query.limit(limit),
    ]
    if (offset > 0) queries.push(Query.offset(offset))

    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        queries
    )
    return { docs: res.documents.map(normalise), total: res.total }
}

/** Fetch ALL public skills across all users (for the community browse section). */
export async function getAllPublicSkills(sort = 'recent', limit = 100) {
    requireAppwrite()
    const sortQuery = {
        'recent': Query.orderDesc('$createdAt'),
        'most-rated': Query.orderDesc('star_count'),
        'most-copied': Query.orderDesc('copy_count'),
    }[sort] ?? Query.orderDesc('$createdAt')

    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('visibility', 'public'),
            sortQuery,
            Query.limit(limit),
        ]
    )
    return res.documents.map(normalise)
}

/** Fetch all PRIVATE skills for the owner of a profile. */
export async function getPrivateSkillsByUser(userId) {
    requireAppwrite()
    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [
            Query.equal('user_id', userId),
            Query.equal('visibility', 'private'),
            Query.orderDesc('$createdAt'),
            Query.limit(100),
        ]
    )
    return res.documents.map(normalise)
}

/** Toggle a skill between public and private (also updates document permissions). */
export async function toggleVisibility(skillId, newVisibility) {
    requireAppwrite()
    const user = await account.get()
    if (!user) throw new Error('Not authenticated.')

    const perms = [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
    ]

    const data = await databases.updateDocument(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        skillId,
        { visibility: newVisibility },
        perms
    )
    return normalise(data)
}

/** Delete a skill by id. */
export async function deleteSkill(id) {
    requireAppwrite()
    await databases.deleteDocument(DATABASE_ID, SKILLS_TABLE_ID, id)
}

/** Update an existing skill. */
export async function updateSkill(id, { title, content, tags }) {
    requireAppwrite()
    const data = await databases.updateDocument(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        id,
        { title, content, tags }
    )
    return normalise(data)
}

/** Fetch a single skill by its Appwrite document ID.
 *  Public skills are readable by anyone.
 *  Private skills will throw a 401/403 from Appwrite if not the owner. */
export async function getSkillById(id) {
    requireAppwrite()
    const data = await databases.getDocument(DATABASE_ID, SKILLS_TABLE_ID, id)
    return normalise(data)
}

/** Fetch profile stats for a user. */
export async function getProfileStats(userId) {
    requireAppwrite()
    const res = await databases.listDocuments(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        [Query.equal('user_id', userId), Query.limit(100)]
    )
    const docs = res.documents
    return {
        total_skills: res.total,
        total_copies: docs.reduce((s, d) => s + (d.copy_count ?? 0), 0),
        total_downloads: docs.reduce((s, d) => s + (d.download_count ?? 0), 0),
        total_stars: docs.reduce((s, d) => s + (d.star_count ?? 0), 0),
    }
}

/** Increment star_count. Call after verifying the user hasn't already starred. */
export async function starSkill(skillId, currentCount) {
    requireAppwrite()
    const data = await databases.updateDocument(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        skillId,
        { star_count: (currentCount ?? 0) + 1 }
    )
    return normalise(data)
}

/** Decrement star_count (floor 0). */
export async function unstarSkill(skillId, currentCount) {
    requireAppwrite()
    const data = await databases.updateDocument(
        DATABASE_ID,
        SKILLS_TABLE_ID,
        skillId,
        { star_count: Math.max(0, (currentCount ?? 1) - 1) }
    )
    return normalise(data)
}
