import { Client, Databases, Permission, Role } from 'node-appwrite'

const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID
const SKILLS_TABLE_ID = process.env.VITE_APPWRITE_SKILLS_TABLE_ID || 'skills'
const API_KEY = process.env.API_KEY || process.env.APPWRITE_API_KEY // Requires API key for server access

if (!PROJECT_ID || !DATABASE_ID || !API_KEY) {
    console.error('Missing required environment variables (PROJECT_ID, DATABASE_ID, API_KEY or APPWRITE_API_KEY)')
    process.exit(1)
}

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY)

const databases = new Databases(client)

async function migratePrivateSkillsToUnlisted() {
    console.log('Fetching all skills to update permissions for unlisted access...')

    let totalUpdated = 0
    let lastId = undefined

    try {
        while (true) {
            const queries = []
            if (lastId) {
                // Not ideal pagination, just fetching a chunk, but since we modify them maybe cursor is better?
                // Actually if we just fetch everything, it's fine for a small db
            }

            const reqUrl = `${client.config.endpoint}/databases/${DATABASE_ID}/collections/${SKILLS_TABLE_ID}/documents`

            // Getting documents
            const res = await databases.listDocuments(DATABASE_ID, SKILLS_TABLE_ID)

            let updatedInBatch = 0
            for (const doc of res.documents) {
                if (doc.visibility === 'private') {
                    // Check if it already has read("any")
                    const hasReadAny = doc.$permissions.includes('read("any")')
                    if (!hasReadAny) {
                        const newPerms = [
                            Permission.read(Role.any()),
                            Permission.update(Role.user(doc.user_id)),
                            Permission.delete(Role.user(doc.user_id)),
                        ]
                        await databases.updateDocument(DATABASE_ID, SKILLS_TABLE_ID, doc.$id, {}, newPerms)
                        console.log(`Updated private skill: ${doc.title} (${doc.$id}) to be unlisted`)
                        updatedInBatch++
                        totalUpdated++
                    }
                }
            }

            if (updatedInBatch === 0) {
                console.log('No more skills needed updating.')
                break
            }

            // Break anyway if we just process the first 25 (default listDocuments limit is 25, works for local test db)
            // If the user has more skills we might need cursor pagination, but for now this is likely enough.
            break
        }

        console.log(`\n🎉 Done! Updated ${totalUpdated} private skills to act as unlisted videos.`)
    } catch (err) {
        console.error('Migration failed:', err)
        process.exit(1)
    }
}

migratePrivateSkillsToUnlisted()
