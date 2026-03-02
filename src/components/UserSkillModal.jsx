import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ConfirmDialog from './ConfirmDialog'

const SITE = 'https://skillissue.bajpai.tech'
function skillShareUrl(id) { return `${SITE}/skill/${id}` }

// Module-level: persists the last-used modal size for the whole browser session
// so reopening a different skill keeps your preferred size.
let _cachedSize = null
function getDefaultSize() {
    return _cachedSize || { width: Math.min(1100, Math.round(window.innerWidth * 0.90)), height: Math.round(window.innerHeight * 0.88) }
}

// Reusable modal for viewing a user-created skill (content stored in Appwrite).
// Mirrors the SkillModal design in BrowseSkills exactly.
export default function UserSkillModal({ skill, onClose, isOwner = false, onDelete, onTogglePrivate }) {
    const [copied, setCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const [viewMode, setViewMode] = useState('rendered')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [working, setWorking] = useState(false)

    // ── Resize state ──────────────────────────────────────────────────────
    const MIN_W = 480
    const MIN_H = 400
    const [size, setSize] = useState(getDefaultSize)
    const dragRef = useRef(null)
    const isResizing = useRef(false)

    const onResizeMouseDown = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        isResizing.current = true
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startW: size.width,
            startH: size.height,
        }

        const onMove = (ev) => {
            if (!isResizing.current) return
            const dx = ev.clientX - dragRef.current.startX
            const dy = ev.clientY - dragRef.current.startY
            const newW = Math.min(Math.max(dragRef.current.startW + dx, MIN_W), window.innerWidth - 32)
            const newH = Math.min(Math.max(dragRef.current.startH + dy, MIN_H), window.innerHeight - 32)
            const next = { width: newW, height: newH }
            _cachedSize = next   // save for next open
            setSize(next)
        }
        const onUp = () => {
            isResizing.current = false
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }

        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'se-resize'
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }, [size])

    // Reset view on each new skill
    useEffect(() => { setViewMode('rendered'); setShowDeleteConfirm(false) }, [skill])

    // Close on Escape
    useEffect(() => {
        const h = (e) => e.key === 'Escape' && !showDeleteConfirm && onClose()
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [onClose, showDeleteConfirm])

    function handleCopy() {
        if (!skill?.content) return
        navigator.clipboard.writeText(skill.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function handleDownload() {
        const blob = new Blob([skill.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${skill.title.toLowerCase().replace(/\s+/g, '-')}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleShare() {
        const url = skillShareUrl(skill.id)
        if (navigator.share) {
            try { await navigator.share({ title: skill.title, url }) } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(url)
            setLinkCopied(true)
            setTimeout(() => setLinkCopied(false), 2000)
        }
    }

    async function handleDelete() {
        setWorking(true)
        try {
            await onDelete?.(skill.id)
            onClose()
        } finally {
            setWorking(false)
            setShowDeleteConfirm(false)
        }
    }

    async function handleTogglePrivate() {
        setWorking(true)
        try {
            const next = skill.visibility === 'public' ? 'private' : 'public'
            await onTogglePrivate?.(skill.id, next)
            onClose()
        } finally {
            setWorking(false)
        }
    }

    if (!skill) return null

    const isPrivate = skill.visibility === 'private'

    return (
        <>
            {/* ── Main modal ── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                {/* Modal panel — size driven by inline style so the drag-handle can resize it */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative rounded-2xl border border-white/10 bg-navy overflow-hidden flex flex-col animate-fade-in-up"
                    style={{ width: size.width, height: size.height, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 16px)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                                <h2 className="font-clash font-bold text-lg text-white truncate">{skill.title}</h2>
                                {skill.category && (
                                    <p className="font-satoshi text-xs text-white/35 capitalize">{skill.category}</p>
                                )}
                            </div>

                            {/* Visibility badge */}
                            {isPrivate ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-white/30 text-[10px] font-satoshi font-bold uppercase tracking-wider shrink-0">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                    Private
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-satoshi font-bold uppercase tracking-wider shrink-0">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438a2.253 2.253 0 01-1.699 2.652l-.829.207a8.96 8.96 0 01-3.085.29" />
                                    </svg>
                                    Public
                                </span>
                            )}
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

                    {/* Content — flex-1 fills whatever height the modal is dragged to */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                        <div className="rounded-2xl border border-accent/15 bg-[#0a0d17] overflow-hidden flex flex-col h-full">
                            {/* Editor bar */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02] shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                </div>
                                <span className="font-mono text-xs text-white/20">
                                    {skill.title.toLowerCase().replace(/\s+/g, '-')}.md
                                </span>
                                {/* Rendered | Raw icon toggle */}
                                <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5" role="group">
                                    {/* Eye = rendered/preview */}
                                    <button
                                        onClick={() => setViewMode('rendered')}
                                        title="Rendered view"
                                        className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'rendered' ? 'bg-accent/20 text-accent shadow-sm' : 'text-white/30 hover:text-white/55'}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                    {/* Code brackets = raw */}
                                    <button
                                        onClick={() => setViewMode('raw')}
                                        title="Raw markdown"
                                        className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'raw' ? 'bg-accent/20 text-accent shadow-sm' : 'text-white/30 hover:text-white/55'}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Rendered — fills available height */}
                            {viewMode === 'rendered' && (
                                <div key="rendered" className="flex-1 p-6 overflow-y-auto styled-scrollbar modal-view-enter">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ children }) => <h1 className="font-satoshi font-semibold text-2xl text-white mb-4 mt-6 first:mt-0 pb-2 border-b border-white/10">{children}</h1>,
                                            h2: ({ children }) => <h2 className="font-satoshi font-semibold text-xl text-white/90 mb-3 mt-5 first:mt-0 pb-1.5 border-b border-white/[0.07]">{children}</h2>,
                                            h3: ({ children }) => <h3 className="font-satoshi font-medium text-base text-white/85 mb-2 mt-4 first:mt-0">{children}</h3>,
                                            h4: ({ children }) => <h4 className="font-satoshi font-medium text-sm text-white/80 mb-2 mt-3 first:mt-0">{children}</h4>,
                                            p: ({ children }) => <p className="font-satoshi text-sm text-white/60 mb-3 leading-relaxed last:mb-0">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="font-satoshi text-sm text-white/60 leading-relaxed">{children}</li>,
                                            strong: ({ children }) => <strong className="font-semibold text-white/85">{children}</strong>,
                                            em: ({ children }) => <em className="italic text-white/70">{children}</em>,
                                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-[#6bbcff] underline underline-offset-2 transition-colors">{children}</a>,
                                            code: ({ inline, children }) => inline
                                                ? <code className="font-mono text-[12px] text-accent/90 bg-accent/10 px-1.5 py-0.5 rounded">{children}</code>
                                                : <code className="block font-mono text-[12px] text-white/70 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 overflow-x-auto mb-3 leading-relaxed">{children}</code>,
                                            pre: ({ children }) => <>{children}</>,
                                            blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/40 pl-4 my-3 italic text-white/45">{children}</blockquote>,
                                            hr: () => <hr className="border-none h-px bg-white/10 my-5" />,
                                            table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="w-full text-sm font-satoshi border-collapse">{children}</table></div>,
                                            thead: ({ children }) => <thead className="border-b border-white/10">{children}</thead>,
                                            th: ({ children }) => <th className="text-left py-2 px-3 text-white/70 font-semibold text-xs uppercase tracking-wide">{children}</th>,
                                            td: ({ children }) => <td className="py-2 px-3 text-white/50 border-t border-white/[0.05]">{children}</td>,
                                            img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full rounded-lg my-3" />,
                                        }}
                                    >
                                        {skill.content}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Raw — fills available height */}
                            {viewMode === 'raw' && (
                                <pre key="raw" className="flex-1 p-5 text-sm font-mono text-white/70 whitespace-pre-wrap overflow-x-auto leading-relaxed overflow-y-auto styled-scrollbar modal-view-enter">
                                    {skill.content}
                                </pre>
                            )}
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex flex-wrap items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] transition-all duration-300 group"
                        >
                            {copied
                                ? <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                : <svg className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                            }
                            <span className="font-satoshi text-sm text-white/60 group-hover:text-white/80 transition-colors hidden sm:inline">
                                {copied ? 'Copied!' : 'Copy'}
                            </span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] transition-all duration-300 group"
                        >
                            {linkCopied
                                ? <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                : <svg className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                            }
                            <span className="font-satoshi text-sm text-white/60 group-hover:text-white/80 transition-colors hidden sm:inline">
                                {linkCopied ? 'Link copied!' : 'Share'}
                            </span>
                        </button>

                        {/* Download */}
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-accent text-navy font-satoshi font-bold text-sm hover:bg-[#6bbcff] hover:shadow-[0_0_20px_rgba(75,169,255,0.3)] transition-all duration-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            <span className="hidden sm:inline">Download .md</span>
                        </button>

                        {/* Owner-only actions — push to new row on mobile with w-full, align right with ml-auto on sm+ */}
                        {isOwner && (
                            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                                {/* Toggle visibility */}
                                <button
                                    onClick={handleTogglePrivate}
                                    disabled={working}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 font-satoshi text-xs font-medium hover:text-accent/70 hover:border-accent/20 hover:bg-accent/[0.04] transition-all duration-300 disabled:opacity-40"
                                >
                                    {isPrivate ? (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                            <span className="hidden sm:inline">Make Public</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                            <span className="hidden sm:inline">Make Private</span>
                                        </>
                                    )}
                                </button>

                                {/* Delete — opens the confirm dialog */}
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={working}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 font-satoshi text-xs font-medium hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/[0.04] transition-all duration-300 disabled:opacity-40"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Resize handle ── */}
                    <div
                        onMouseDown={onResizeMouseDown}
                        className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-10 flex items-end justify-end p-2 group"
                        title="Drag to resize"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                            className="text-white/40 group-hover:text-accent transition-colors duration-150 drop-shadow-[0_0_3px_rgba(75,169,255,0.4)] group-hover:drop-shadow-[0_0_6px_rgba(75,169,255,0.7)]">
                            <path d="M1 11 L11 11 L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* ── Delete confirmation dialog (z-[60] sits above the modal) ── */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Skill"
                    message={
                        <>
                            <span className="text-white/70 font-semibold">"{skill.title}"</span>
                            {' '}will be permanently deleted.{' '}
                            This action cannot be undone.
                        </>
                    }
                    confirmLabel="Delete"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    working={working}
                />
            )}
        </>
    )
}
