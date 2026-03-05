/**
 * Shared in-memory profile cache used by UserProfile page.
 * Any code that mutates a user's skills (save, delete, publish)
 * should call invalidateProfileCache(username) so the next profile
 * visit always fetches fresh data.
 */

export const CACHE_TTL = 30_000 // 30 seconds

// keyed by username → { profile, stats, publicSkills, … , cachedAt }
export const profileCache = {}

/** Immediately remove a user's cached profile data. */
export function invalidateProfileCache(username) {
    if (username) delete profileCache[username]
}

/** Remove ALL cached profiles (e.g. on sign-out). */
export function bustAllProfileCache() {
    Object.keys(profileCache).forEach((k) => delete profileCache[k])
}

/** Returns true when a cache entry exists but has expired. */
export function isCacheStale(username) {
    const entry = profileCache[username]
    if (!entry) return false
    return Date.now() - entry.cachedAt > CACHE_TTL
}
