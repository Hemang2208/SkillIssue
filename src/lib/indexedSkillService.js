// ── Service: Fetch indexed GitHub skills via API → MongoDB Atlas ─────────────
// The API endpoint queries MongoDB, which gives us:
// - Real total counts (no 5000 cap)
// - Weighted full-text search (skill_name > owner > repo > description)
// - Fast skip/limit pagination at any offset
//
// We go through the API because MongoDB can't be queried directly from the
// browser (unlike Appwrite's per-collection permissions).

// In-memory cache (session-level)
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key) {
    const entry = cache.get(key)
    if (entry && Date.now() < entry.expiresAt) return entry.data
    return null
}
function setCache(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

/**
 * Fetch indexed skills with page-based pagination, search, and sort.
 *
 * @param {Object} params
 * @param {number}  params.limit     - Results per page (max 100)
 * @param {number}  params.page      - Page number (1-based)
 * @param {string}  params.search    - Full-text search query
 * @param {'stars'|'recent'} params.sort - Sort order
 * @param {string}  params.owner     - Filter by GitHub owner
 * @param {number}  params.min_stars - Minimum star count
 * @returns {Promise<{ total: number, skills: Array, page: number, totalPages: number, hasMore: boolean }>}
 */
export async function fetchIndexedSkills({
    limit = 48,
    page = 1,
    search = '',
    sort = 'stars',
    owner = '',
    min_stars = 0,
} = {}) {
    // Build a stable cache key from all params
    const cacheKey = `idx:${limit}:${page}:${sort}:${min_stars}:${search}:${owner}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    // Build query string
    const params = new URLSearchParams({
        limit: String(Math.min(100, Math.max(1, limit))),
        page: String(Math.max(1, page)),
        sort,
    })
    if (search.trim())    params.set('search', search.trim())
    if (owner.trim())     params.set('owner', owner.trim())
    if (min_stars > 0)    params.set('min_stars', String(min_stars))

    const res = await fetch(`/api/github-skills?${params}`)
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `API error ${res.status}`)
    }

    const json = await res.json()

    const data = {
        total: json.total,          // ← real count from MongoDB, no cap
        skills: json.skills,
        page: json.page,
        totalPages: json.totalPages,
        hasMore: json.hasMore,
    }
    setCache(cacheKey, data)
    return data
}

/**
 * Transform an indexed skill record into the shape expected by FeaturedSkillCard.
 * This lets us reuse the existing card + modal infrastructure.
 */
export function toFeaturedSkillShape(indexedSkill) {
    return {
        name: indexedSkill.skill_name.toLowerCase().replace(/\s+/g, '-'),
        displayName: indexedSkill.skill_name,
        path: indexedSkill.folder_path,
        htmlUrl: indexedSkill.html_url,
        company: indexedSkill.owner,
        repo: indexedSkill.repo,
        githubUrl: indexedSkill.html_url,
        isOpenClaw: false,
        isCommunity: false,
        isIndexed: true,  // flag to identify indexed skills
        author: indexedSkill.owner,
        stars: indexedSkill.stars,
        language: indexedSkill.language,
        repoDescription: indexedSkill.repo_description,
        ownerAvatar: indexedSkill.owner_avatar,
        topics: indexedSkill.topics || [],
    }
}
