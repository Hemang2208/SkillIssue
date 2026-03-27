// ── Service: Fetch indexed GitHub skills from the /api/github-skills endpoint ──
// These are skills discovered by the cron crawler (SKILL.md files in repos with ≥50 stars).
// Only metadata is stored — content is fetched on-demand from GitHub.

const API_BASE = '/api/github-skills'

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
 * Fetch indexed skills with pagination, search, and sort.
 * @param {Object} params
 * @param {number} params.page - Page number (1-based)
 * @param {number} params.limit - Results per page
 * @param {string} params.search - Search query
 * @param {'stars'|'recent'} params.sort - Sort order
 * @param {string} params.owner - Filter by GitHub owner
 * @param {number} params.min_stars - Minimum star count
 * @returns {Promise<{ total: number, page: number, limit: number, skills: Array }>}
 */
export async function fetchIndexedSkills({
    page = 1,
    limit = 25,
    search = '',
    sort = 'stars',
    owner = '',
    min_stars = 0,
} = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        min_stars: String(min_stars),
    })
    if (search.trim()) params.set('search', search.trim())
    if (owner.trim()) params.set('owner', owner.trim())

    const cacheKey = params.toString()
    const cached = getCached(cacheKey)
    if (cached) return cached

    const res = await fetch(`${API_BASE}?${params}`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error ${res.status}`)
    }

    const data = await res.json()
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
