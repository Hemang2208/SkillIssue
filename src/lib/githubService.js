// ─── GitHub Service — Fetch featured skills from GitHub repos ───────────
import JSZip from 'jszip'

// ── Hardcoded featured sources ──────────────────────────────────────────
export const FEATURED_SOURCES = [
    {
        company: 'Anthropic',
        repo: 'anthropics/skills',
        skills_path: 'skills',
        github_url: 'https://github.com/anthropics/skills/tree/main/skills',
    },
    {
        company: 'Vercel',
        repo: 'vercel-labs/agent-skills',
        skills_path: 'skills',
        github_url: 'https://github.com/vercel-labs/agent-skills/tree/main/skills',
    },
    {
        company: 'OpenAI',
        repo: 'openai/skills',
        skills_path: 'skills/.curated',
        github_url: 'https://github.com/openai/skills/tree/main/skills/.curated',
    },
    {
        company: 'OpenClaw',
        repo: 'openclaw/skills',
        skills_path: 'skills',
        github_url: 'https://github.com/openclaw/skills/tree/main/skills',
    },
    {
        company: 'HuggingFace',
        repo: 'huggingface/skills',
        skills_path: 'skills',
        github_url: 'https://github.com/huggingface/skills/tree/main/skills',
    },
]

// ── In-memory cache ─────────────────────────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const cache = new Map() // key → { data, expiresAt }

function getCached(key) {
    const entry = cache.get(key)
    if (entry && Date.now() < entry.expiresAt) return entry.data
    return null
}

function setCache(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

// ── Authenticated fetch ────────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN

async function ghFetch(url) {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
}

async function ghFetchRaw(url) {
    const headers = {}
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`GitHub raw fetch ${res.status}`)
    return res.text()
}

// ── Repo star count ────────────────────────────────────────────────────
export async function fetchRepoStars(repo) {
    const cacheKey = `stars:${repo}`
    const cached = getCached(cacheKey)
    if (cached !== null) return cached

    try {
        const data = await ghFetch(`https://api.github.com/repos/${repo}`)
        const stars = data.stargazers_count ?? 0
        setCache(cacheKey, stars)
        return stars
    } catch {
        return 0
    }
}

// ── Repo avatar URL ────────────────────────────────────────────────────
export function getOrgAvatarUrl(repo) {
    const owner = repo.split('/')[0]
    return `https://avatars.githubusercontent.com/${owner}`
}

// ── List skill folders in a source ─────────────────────────────────────
export async function fetchSkillFolders(source) {
    const cacheKey = `folders:${source.repo}:${source.skills_path}`
    const cached = getCached(cacheKey)
    if (cached !== null) return cached

    const url = `https://api.github.com/repos/${source.repo}/contents/${source.skills_path}`
    const items = await ghFetch(url)

    // Only keep directories (each is one skill package)
    const folders = items
        .filter((item) => item.type === 'dir')
        .map((item) => ({
            name: item.name,
            displayName: item.name
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            path: item.path,
            htmlUrl: item.html_url,
            company: source.company,
            repo: source.repo,
            githubUrl: source.github_url,
        }))

    setCache(cacheKey, folders)
    return folders
}

// ── List files inside a skill folder ───────────────────────────────────
export async function fetchSkillFiles(repo, folderPath) {
    const url = `https://api.github.com/repos/${repo}/contents/${folderPath}`
    const items = await ghFetch(url)
    return items.filter((item) => item.type === 'file')
}

// ── Fetch raw content of a single file ─────────────────────────────────
export async function fetchFileContent(downloadUrl) {
    return ghFetchRaw(downloadUrl)
}

// ── Fetch all featured skills (orchestrator) ───────────────────────────
export async function fetchAllFeaturedSkills() {
    const cacheKey = 'all-featured'
    const cached = getCached(cacheKey)
    if (cached !== null) return cached

    // Fetch all sources in parallel — failures don't break others
    const results = await Promise.allSettled(
        FEATURED_SOURCES.map(async (source) => {
            const [folders, stars] = await Promise.all([
                fetchSkillFolders(source),
                fetchRepoStars(source.repo),
            ])
            return folders.map((folder) => ({ ...folder, stars }))
        })
    )

    const allSkills = []
    const errors = []

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            allSkills.push(...result.value)
        } else {
            errors.push({
                company: FEATURED_SOURCES[i].company,
                error: result.reason?.message || 'Unknown error',
            })
        }
    })

    const payload = { skills: allSkills, errors }
    setCache(cacheKey, payload)
    return payload
}

// ── Download skill as .zip ─────────────────────────────────────────────
export async function downloadSkillAsZip(repo, folderPath, skillName) {
    const files = await fetchSkillFiles(repo, folderPath)
    const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith('.md'))

    if (mdFiles.length === 0) throw new Error('No .md files found in this skill.')

    // Fetch all .md file contents in parallel
    const contents = await Promise.all(
        mdFiles.map(async (f) => {
            const text = await fetchFileContent(f.download_url)
            return { name: f.name, text }
        })
    )

    // Build zip
    const zip = new JSZip()
    const folder = zip.folder(skillName)
    contents.forEach(({ name, text }) => folder.file(name, text))

    const blob = await zip.generateAsync({ type: 'blob' })

    // Trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skillName}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
