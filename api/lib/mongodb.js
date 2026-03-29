/**
 * Shared MongoDB client for Vercel serverless functions.
 *
 * Uses a module-level cached connection so warm invocations reuse
 * the same MongoClient instead of opening a new socket every request.
 *
 * Required env var:  MONGODB_URI
 * (e.g. mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/skillissue)
 *
 * The database name defaults to "skillissue" but can be overridden
 * via the MONGODB_DB env var.
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || 'skillissue'

if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set — MongoDB features will fail at runtime.')
}

/** @type {MongoClient} */
let _client = null
/** @type {Promise<MongoClient>} */
let _clientPromise = null

/**
 * Returns the connected MongoClient (cached across warm invocations).
 * @returns {Promise<MongoClient>}
 */
function getClient() {
    if (!_clientPromise) {
        _client = new MongoClient(MONGODB_URI, {
            // Vercel functions are short-lived — keep pool small
            maxPoolSize: 5,
            minPoolSize: 0,
            maxIdleTimeMS: 10_000,
            serverSelectionTimeoutMS: 5_000,
        })
        _clientPromise = _client.connect()
    }
    return _clientPromise
}

/**
 * Returns the default database handle.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
    const client = await getClient()
    return client.db(DB_NAME)
}

/**
 * Collection names (centralised so we change them in one place).
 * Future: add 'skills' here when user-uploaded skills move to Mongo.
 */
export const COLLECTIONS = {
    GITHUB_SKILLS: 'github_skills',
    // SKILLS: 'skills',  // ← uncomment when you migrate user-uploaded skills
}
