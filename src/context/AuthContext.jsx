import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getProfile } from '../lib/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [needsOnboarding, setNeedsOnboarding] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showAuthModal, setShowAuthModal] = useState(false)

    const fetchProfile = useCallback(async (userId) => {
        try {
            const p = await getProfile(userId)
            setProfile(p)
            setNeedsOnboarding(!p)
        } catch (err) {
            console.error('fetchProfile error:', err)
            setNeedsOnboarding(false)
        }
    }, [])

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setLoading(false)
            return
        }

        // Restore existing session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const u = session?.user ?? null
            setUser(u)
            if (u) await fetchProfile(u.id)
            setLoading(false)
        })

        // React to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const u = session?.user ?? null
                setUser(u)
                if (u) {
                    await fetchProfile(u.id)
                    setShowAuthModal(false) // close auth modal after login
                } else {
                    setProfile(null)
                    setNeedsOnboarding(false)
                }
            }
        )
        return () => subscription.unsubscribe()
    }, [fetchProfile])

    // ── Auth methods ──────────────────────────────────────

    async function signIn() {
        if (!isSupabaseConfigured || !supabase) return
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        if (error) throw error
    }

    async function signInWithEmail(email, password) {
        if (!isSupabaseConfigured || !supabase) return
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }

    async function signUpWithEmail(email, password) {
        if (!isSupabaseConfigured || !supabase) return
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        return data
    }

    async function signInWithMagicLink(email) {
        if (!isSupabaseConfigured || !supabase) return
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
    }

    async function signOut() {
        if (!isSupabaseConfigured || !supabase) return
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setNeedsOnboarding(false)
    }

    async function refreshProfile() {
        if (user) await fetchProfile(user.id)
    }

    const value = {
        user,
        profile,
        isLoggedIn: !!user,
        needsOnboarding,
        setNeedsOnboarding,
        loading,
        showAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        signIn,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        signOut,
        refreshProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
