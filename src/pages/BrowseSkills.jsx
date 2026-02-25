import { useState, useEffect, useCallback } from 'react'
import {
    fetchAllFeaturedSkills,
    fetchSkillFiles,
    fetchFileContent,
    downloadSkillAsZip,
    getOrgAvatarUrl,
    FEATURED_SOURCES,
} from '../lib/githubService'
import FeaturedSkillCard from '../components/FeaturedSkillCard'

// ── Skeleton loader ─────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-navy-50 to-navy p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/5" />
                    <div className="w-16 h-5 rounded-lg bg-white/5" />
                </div>
                <div className="w-14 h-4 rounded bg-white/5" />
            </div>
            <div className="w-3/4 h-5 rounded bg-white/5 mb-2" />
            <div className="w-1/2 h-4 rounded bg-white/[0.03] mb-4" />
            <div className="border-t border-white/[0.04] pt-3 flex justify-between">
                <div className="w-16 h-4 rounded bg-white/[0.03]" />
                <div className="w-12 h-6 rounded-lg bg-white/5" />
            </div>
        </div>
    )
}

// ── Skill Detail Modal ──────────────────────────────────────────────────
function SkillModal({ skill, onClose }) {
    const [content, setContent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        if (!skill) return
        setLoading(true)
        setError(null)

        fetchSkillFiles(skill.repo, skill.path)
            .then((files) => {
                // Look for SKILL.md first, then any .md file
                const skillMd = files.find(
                    (f) => f.name.toUpperCase() === 'SKILL.MD'
                )
                const anyMd = files.find((f) =>
                    f.name.toLowerCase().endsWith('.md')
                )
                const target = skillMd || anyMd
                if (!target) throw new Error('No .md file found')
                return fetchFileContent(target.download_url)
            })
            .then((text) => setContent(text))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [skill])

    // Close on Escape
    useEffect(() => {
        const handler = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    async function handleCopy() {
        if (!content) return
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function handleDownload() {
        setDownloading(true)
        try {
            await downloadSkillAsZip(skill.repo, skill.path, skill.name)
        } catch (err) {
            console.error('Download failed:', err)
        } finally {
            setDownloading(false)
        }
    }

    if (!skill) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl max-h-[85vh] mx-4 rounded-2xl border border-white/10 bg-navy overflow-hidden flex flex-col animate-fade-in-up"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src={getOrgAvatarUrl(skill.repo)}
                            alt={skill.company}
                            className="w-8 h-8 rounded-lg border border-white/10"
                        />
                        <div className="min-w-0">
                            <h2 className="font-clash font-bold text-lg text-white truncate">
                                {skill.displayName}
                            </h2>
                            <p className="font-satoshi text-xs text-white/35">
                                {skill.company} · ⭐ {skill.stars?.toLocaleString()}
                            </p>
                        </div>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-satoshi font-bold uppercase tracking-wider shrink-0">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                            </svg>
                            Official
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors shrink-0 ml-3"
                    >
                        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <svg className="w-6 h-6 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <p className="font-satoshi text-sm text-white/40">{error}</p>
                        </div>
                    )}

                    {content && (
                        <div className="rounded-2xl border border-accent/15 bg-[#0a0d17] overflow-hidden">
                            {/* Editor bar */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                </div>
                                <span className="font-mono text-xs text-white/20">SKILL.md</span>
                            </div>
                            {/* Content */}
                            <pre className="p-5 text-sm font-mono text-white/70 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[50vh] overflow-y-auto">
                                {content}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                {content && (
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] transition-all duration-300 group"
                        >
                            {copied ? (
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                            )}
                            <span className="font-satoshi text-sm text-white/60 group-hover:text-white/80 transition-colors">
                                {copied ? 'Copied!' : 'Copy'}
                            </span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-navy font-satoshi font-bold text-sm hover:bg-[#6bbcff] hover:shadow-[0_0_20px_rgba(75,169,255,0.3)] transition-all duration-300 disabled:opacity-50"
                        >
                            {downloading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Zipping…
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Download .zip
                                </>
                            )}
                        </button>

                        <a
                            href={skill.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] transition-all duration-300 group ml-auto"
                        >
                            <svg className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span className="font-satoshi text-sm text-white/60 group-hover:text-white/80 transition-colors">
                                View on GitHub
                            </span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function BrowseSkills() {
    const [skills, setSkills] = useState([])
    const [errors, setErrors] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState('All')
    const [selectedSkill, setSelectedSkill] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchAllFeaturedSkills()
            .then(({ skills: s, errors: e }) => {
                setSkills(s)
                setErrors(e)
            })
            .catch((err) => {
                console.error('Failed to fetch featured skills:', err)
                setErrors([{ company: 'All', error: err.message }])
            })
            .finally(() => setLoading(false))
    }, [])

    const companies = ['All', ...FEATURED_SOURCES.map((s) => s.company)]

    const filteredSkills = skills.filter((s) => {
        const matchesCompany = activeFilter === 'All' || s.company === activeFilter
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch = !q || s.displayName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.company.toLowerCase().includes(q)
        return matchesCompany && matchesSearch
    })

    const handleDownload = useCallback(async (skill) => {
        const id = `${skill.repo}:${skill.path}`
        setDownloadingId(id)
        try {
            await downloadSkillAsZip(skill.repo, skill.path, skill.name)
        } catch (err) {
            console.error('Download failed:', err)
        } finally {
            setDownloadingId(null)
        }
    }, [])

    return (
        <div className="relative min-h-screen pt-32 pb-20">
            {/* Ambient glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/[0.04] rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* ── Header ─────────────────────────── */}
                <div className="text-center mb-12 max-w-3xl mx-auto">
                    <span className="inline-block font-satoshi text-sm font-medium tracking-widest uppercase text-accent/70 mb-4">
                        Marketplace
                    </span>
                    <h1 className="font-clash font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-5">
                        Featured{' '}
                        <span className="italic text-accent glow-text">Skills</span>
                    </h1>
                    <p className="font-satoshi text-lg text-white/40 max-w-xl mx-auto">
                        Official skill packages from the world's leading AI companies — always fresh from GitHub.
                    </p>
                </div>

                {/* ── Search bar ──────────────────────── */}
                <div className="max-w-lg mx-auto mb-8">
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skills by name or company..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent/40 focus:bg-white/[0.05] text-white placeholder:text-white/20 font-satoshi text-sm outline-none transition-all duration-300"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Company filter tabs ─────────────── */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                    {companies.map((name) => {
                        const isActive = activeFilter === name
                        const source = FEATURED_SOURCES.find((s) => s.company === name)
                        return (
                            <button
                                key={name}
                                onClick={() => setActiveFilter(name)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-satoshi text-sm font-medium transition-all duration-300 border ${isActive
                                    ? 'bg-accent/15 border-accent/30 text-accent shadow-[0_0_15px_rgba(75,169,255,0.1)]'
                                    : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:border-white/15 hover:text-white/60'
                                    }`}
                            >
                                {source && (
                                    <img
                                        src={getOrgAvatarUrl(source.repo)}
                                        alt={name}
                                        className="w-4 h-4 rounded"
                                    />
                                )}
                                {name}
                                {name !== 'All' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/25'}`}>
                                        {skills.filter((s) => s.company === name).length}
                                    </span>
                                )}
                                {name === 'All' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/25'}`}>
                                        {skills.length}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* ── Error notices (per-source) ─────── */}
                {errors.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-8 justify-center">
                        {errors.map((err, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/15 text-red-300/70 font-satoshi text-xs">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                                <span><strong>{err.company}</strong> — {err.error}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Loading skeleton ────────────────── */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}

                {/* ── Skills grid ────────────────────── */}
                {!loading && filteredSkills.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSkills.map((skill) => (
                            <FeaturedSkillCard
                                key={`${skill.repo}:${skill.path}`}
                                skill={skill}
                                onClick={setSelectedSkill}
                                onDownload={handleDownload}
                                isDownloading={downloadingId === `${skill.repo}:${skill.path}`}
                            />
                        ))}
                    </div>
                )}

                {/* ── Empty state ─────────────────────── */}
                {!loading && filteredSkills.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center">
                            <svg className="w-6 h-6 text-accent/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                        <p className="font-clash font-semibold text-white/25 text-lg">No skills found</p>
                        <p className="font-satoshi text-sm text-white/15">{searchQuery ? 'Try a different search term' : 'Try selecting a different company filter'}</p>
                    </div>
                )}
            </div>

            {/* ── Skill Detail Modal ──────────── */}
            {selectedSkill && (
                <SkillModal
                    skill={selectedSkill}
                    onClose={() => setSelectedSkill(null)}
                />
            )}
        </div>
    )
}
