#!/usr/bin/env node
/**
 * One-time migration: Appwrite github_skills → MongoDB Atlas
 *
 * Reads ALL documents from Appwrite's `github_skills` collection
 * (using cursor pagination to bypass the 5000 limit) and bulk-upserts
 * them into MongoDB's `github_skills` collection.
 *
 * After inserting, it creates the necessary indexes for fast queries
 * and Atlas Search for full-text search.
 *
 * Usage:
 *   node scripts/migrate-github-skills-to-mongo.mjs
 *
 * Required env vars:
 *   MONGODB_URI          — Atlas connection string
 *   APPWRITE_API_KEY     — Appwrite server API key
 *
 * Optional:
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID,
 *   APPWRITE_GITHUB_SKILLS_ID, MONGODB_DB
 */

import { Client, Databases, Query } from 'node-appwrite'
import { MongoClient } from 'mongodb'

// ─── Appwrite config ────────────────────────────────────────────────
const AW_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const AW_PROJECT  = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID
const AW_KEY      = process.env.APPWRITE_API_KEY
const AW_DB       = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'skill-issue-db'
const AW_COLL     = process.env.APPWRITE_GITHUB_SKILLS_ID || process.env.VITE_APPWRITE_GITHUB_SKILLS_TABLE_ID || 'github_skills'

// ─── MongoDB config ─────────────────────────────────────────────────
const MONGO_URI   = process.env.MONGODB_URI
const MONGO_DB    = process.env.MONGODB_DB || 'skillissue'
const MONGO_COLL  = 'github_skills'

// ─── Validate env ───────────────────────────────────────────────────
if (!AW_KEY)    { console.error('❌ APPWRITE_API_KEY not set'); process.exit(1) }
if (!MONGO_URI) { console.error('❌ MONGODB_URI not set');      process.exit(1) }

console.log('═══════════════════════════════════════════════════════════')
console.log(' Migrate: Appwrite github_skills → MongoDB Atlas')
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Appwrite: ${AW_ENDPOINT}  db=${AW_DB}  coll=${AW_COLL}`)
console.log(`  MongoDB:  ${MONGO_URI.replace(/\/\/[^@]+@/, '//***:***@')}  db=${MONGO_DB}  coll=${MONGO_COLL}`)
console.log()

// ─── Step 1: Read all docs from Appwrite ────────────────────────────
const awClient = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT).setKey(AW_KEY)
const awDb     = new Databases(awClient)

const PAGE_SIZE = 100
let cursor = null
let allDocs = []

console.log('📖 Reading all documents from Appwrite (cursor pagination)...')

while (true) {
    const queries = [Query.limit(PAGE_SIZE), Query.orderDesc('stars')]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    const page = await awDb.listDocuments(AW_DB, AW_COLL, queries)
    if (!page.documents.length) break

    allDocs.push(...page.documents)
    cursor = page.documents[page.documents.length - 1].$id

    process.stdout.write(`\r   ${allDocs.length} documents read...`)

    if (page.documents.length < PAGE_SIZE) break
}

console.log(`\n✅ Read ${allDocs.length} documents from Appwrite\n`)

if (!allDocs.length) {
    console.log('Nothing to migrate. Exiting.')
    process.exit(0)
}

// ─── Step 2: Transform docs (strip Appwrite internals) ─────────────
const mongoDocs = allDocs.map(doc => ({
    skill_key:        doc.skill_key,
    skill_name:       doc.skill_name,
    repo:             doc.repo,
    file_path:        doc.file_path,
    folder_path:      doc.folder_path,
    owner:            doc.owner,
    owner_avatar:     doc.owner_avatar,
    repo_description: doc.repo_description,
    stars:            doc.stars,
    html_url:         doc.html_url,
    language:         doc.language,
    topics:           doc.topics || [],
    last_indexed:     doc.last_indexed,
}))

// ─── Step 3: Bulk upsert into MongoDB ───────────────────────────────
console.log('📝 Connecting to MongoDB Atlas...')
const mongoClient = new MongoClient(MONGO_URI)
await mongoClient.connect()
const db   = mongoClient.db(MONGO_DB)
const coll = db.collection(MONGO_COLL)

console.log(`📝 Bulk upserting ${mongoDocs.length} documents...`)

// Batch upserts (use skill_key as the unique identifier)
const BATCH = 500
let inserted = 0, modified = 0

for (let i = 0; i < mongoDocs.length; i += BATCH) {
    const batch = mongoDocs.slice(i, i + BATCH)
    const ops = batch.map(doc => ({
        updateOne: {
            filter: { skill_key: doc.skill_key },
            update: { $set: doc },
            upsert: true,
        },
    }))
    const result = await coll.bulkWrite(ops, { ordered: false })
    inserted += result.upsertedCount
    modified += result.modifiedCount
    process.stdout.write(`\r   ${Math.min(i + BATCH, mongoDocs.length)}/${mongoDocs.length} processed...`)
}

console.log(`\n✅ Upsert complete: ${inserted} new, ${modified} updated\n`)

// ─── Step 4: Create indexes ─────────────────────────────────────────
console.log('🔧 Creating indexes...')

// Unique index on skill_key (for fast upserts by the crawler)
await coll.createIndex({ skill_key: 1 }, { unique: true, name: 'idx_skill_key' })
console.log('   ✓ idx_skill_key (unique)')

// Sort indexes
await coll.createIndex({ stars: -1 }, { name: 'idx_stars_desc' })
console.log('   ✓ idx_stars_desc')

await coll.createIndex({ last_indexed: -1 }, { name: 'idx_last_indexed_desc' })
console.log('   ✓ idx_last_indexed_desc')

// Filter indexes
await coll.createIndex({ owner: 1, stars: -1 }, { name: 'idx_owner_stars' })
console.log('   ✓ idx_owner_stars')

// Text search index (for skill_name + repo_description full-text search)
// We set language_override to '_none' because our docs have a `language`
// field that refers to programming languages (Python, JavaScript, etc.),
// NOT MongoDB text-search languages (english, french, etc.).
await coll.createIndex(
    { skill_name: 'text', repo_description: 'text', repo: 'text', owner: 'text' },
    {
        name: 'idx_text_search',
        weights: { skill_name: 10, owner: 5, repo: 3, repo_description: 1 },
        default_language: 'english',
        language_override: '_none',   // prevents MongoDB from reading `language` field
    }
)
console.log('   ✓ idx_text_search (weighted: skill_name=10, owner=5, repo=3, desc=1)')

console.log('\n═══════════════════════════════════════════════════════════')
console.log(` ✅ Migration complete!`)
console.log(`    ${allDocs.length} skills in MongoDB  •  5 indexes created`)
console.log('═══════════════════════════════════════════════════════════')

// ─── Step 5: Quick verification ─────────────────────────────────────
const count = await coll.countDocuments()
console.log(`\n🔍 Verification: countDocuments() = ${count}`)
console.log(`   (Appwrite showed total: 5000 — real count is ${count})`)

const sample = await coll.findOne({}, { sort: { stars: -1 } })
if (sample) {
    console.log(`   Top skill: "${sample.skill_name}" from ${sample.repo} (${sample.stars}⭐)`)
}

await mongoClient.close()
process.exit(0)
