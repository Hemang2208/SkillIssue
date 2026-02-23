import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const MOCK_USER = {
    name: 'Demo User',
    email: 'demo@example.com',
    avatar: null,
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)

    const signIn = useCallback(() => {
        // Mock sign-in — replace with Supabase Google OAuth later
        setUser(MOCK_USER)
    }, [])

    const signOut = useCallback(() => {
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
