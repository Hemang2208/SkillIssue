import { Client, Account, Databases, Storage, ID, Query, Permission, Role, OAuthProvider } from 'appwrite'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? 'skill-issue-db'
export const USERS_TABLE_ID = import.meta.env.VITE_APPWRITE_USERS_TABLE_ID ?? 'users'
export const SKILLS_TABLE_ID = import.meta.env.VITE_APPWRITE_SKILLS_TABLE_ID ?? 'skills'
export const TESTIMONIALS_TABLE_ID = import.meta.env.VITE_APPWRITE_TESTIMONIALS_TABLE_ID ?? 'testimonials'
export const AVATARS_BUCKET_ID = import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID ?? 'avatars'

export const isAppwriteConfigured =
    typeof endpoint === 'string' && endpoint.startsWith('https://') &&
    typeof projectId === 'string' && projectId.length > 4

export const client = isAppwriteConfigured
    ? new Client().setEndpoint(endpoint).setProject(projectId)
    : null

export const account = isAppwriteConfigured ? new Account(client) : null
export const databases = isAppwriteConfigured ? new Databases(client) : null
export const storage = isAppwriteConfigured ? new Storage(client) : null

// Re-export helpers so service files don't need to import from 'appwrite' directly
export { ID, Query, Permission, Role, OAuthProvider }

if (!isAppwriteConfigured) {
    console.warn('⚠️  Appwrite: VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID not set — running without auth.')
}
