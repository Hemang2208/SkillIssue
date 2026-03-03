import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isUsernameAvailable, createProfile, suggestUsername, findAvailableUsername } from '../lib/userService'

// Username validation regex: lowercase letters, numbers, hyphens, 3–30 chars
const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{1,30}$/

export default function OnboardingModal() {
    const { user, refreshProfile, setNeedsOnboarding } = useAuth()

    const [username, setUsername] = useState('')
    const [status, setStatus] = useState('idle') // idle | checking | available | taken | invalid
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const debounceRef = useRef(null)
    const initialised = useRef(false)

    // Pre-fill username from email on mount
    useEffect(() => {
        if (!user?.email || initialised.current) return
        initialised.current = true

        const base = suggestUsername(user.email)
        if (!base) return

        setUsername(base)
        setStatus('checking')

        findAvailableUsername(base).then(suggestion => {
            setUsername(suggestion)
            setStatus(suggestion === base ? 'available' : 'available')
        })
    }, [user])

    // Real-time availability check (300ms debounce)
    const checkUsername = useCallback((value) => {
        clearTimeout(debounceRef.current)

        if (!value) { setStatus('idle'); return }
        if (!USERNAME_RE.test(value)) { setStatus('invalid'); return }

        setStatus('checking')
        debounceRef.current = setTimeout(async () => {
            try {
                const available = await isUsernameAvailable(value)
                setStatus(available ? 'available' : 'taken')
            } catch {
                setStatus('idle')
            }
        }, 300)
    }, [])

    function handleChange(e) {
        const raw = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')   // strip invalid chars
        setUsername(raw)
        setError('')
        checkUsername(raw)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (status !== 'available') return
        setSubmitting(true)
        setError('')
        try {
            await createProfile({
                id: user.id,
                username,
                email: user.email,
                avatar_url: user.avatar_url ?? user.user_metadata?.avatar_url ?? null,
                display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            })
            await refreshProfile()
            setNeedsOnboarding(false)
        } catch (err) {
            setError(err.message || 'Failed to save. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Status indicator ──────────────────────────────────
    const indicator = {
        idle: null,
        checking: <span className="font-satoshi text-xs text-white/30 flex items-center gap-1"><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Checking…</span>,
        available: <span className="font-satoshi text-xs text-emerald-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Available</span>,
        taken: <span className="font-satoshi text-xs text-red-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Already taken</span>,
        invalid: <span className="font-satoshi text-xs text-orange-400">Only lowercase letters, numbers, and hyphens allowed</span>,
    }[status]

    const canSubmit = status === 'available' && !submitting

    return (
        <div className="fixed inset-0 bg-[#040712]/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* User preview */}
                {(user?.avatar_url || user?.user_metadata?.avatar_url) && (
                    <div className="flex justify-center mb-6">
                        <img
                            src={user.avatar_url ?? user.user_metadata?.avatar_url}
                            alt="Your avatar"
                            className="w-16 h-16 rounded-full border-2 border-accent/30 ring-4 ring-accent/10"
                        />
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="font-clash font-bold text-3xl sm:text-4xl tracking-tight mb-3">
                        One last thing 👋
                    </h2>
                    <p className="font-satoshi text-base text-white/40 max-w-sm mx-auto">
                        Pick a username for your Skill Issue profile. You can always change this later.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-[#080b14] border border-white/[0.08] rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block font-satoshi text-xs font-medium text-white/40 mb-2 tracking-wide uppercase">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-satoshi text-white/25 text-sm select-none">
                                    @
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={handleChange}
                                    placeholder="your-username"
                                    maxLength={30}
                                    autoFocus
                                    className={`w-full pl-8 pr-4 py-3.5 rounded-xl bg-white/[0.04] border font-satoshi text-base text-white placeholder:text-white/15 outline-none transition-all duration-200 ${status === 'available' ? 'border-emerald-500/40 bg-emerald-500/[0.03]' :
                                        status === 'taken' ? 'border-red-400/40 bg-red-500/[0.03]' :
                                            status === 'invalid' ? 'border-orange-400/30' :
                                                'border-white/[0.08] focus:border-accent/40'
                                        }`}
                                />
                            </div>

                            {/* Indicator */}
                            <div className="mt-2 min-h-[18px]">
                                {indicator}
                            </div>
                        </div>

                        {/* Rules */}
                        <p className="font-satoshi text-xs text-white/20">
                            Letters, numbers, and hyphens only • 3–30 characters
                        </p>

                        {error && (
                            <p className="font-satoshi text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`w-full py-3.5 rounded-xl font-satoshi font-bold text-base transition-all duration-300 ${canSubmit
                                ? 'bg-accent text-navy hover:bg-[#6bbcff] hover:shadow-[0_0_30px_rgba(75,169,255,0.25)] hover:-translate-y-0.5'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {submitting ? 'Setting up your profile…' : 'Claim Username →'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
