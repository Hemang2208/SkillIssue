/**
 * Appwrite Setup Script — GitHub Indexed Skills collection
 * Creates the `github_skills` collection for storing crawled skill metadata.
 * Run once: node scripts/setup-github-skills.mjs
 */

import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '69a4504700384d63b782';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
    console.error('❌  Set APPWRITE_API_KEY env variable first.');
    console.error('   APPWRITE_API_KEY=standard_xxxx node scripts/setup-github-skills.mjs');
    process.exit(1);
}

const DATABASE_ID = 'skill-issue-db';
const COLLECTION_ID = 'github_skills';

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const db = new Databases(client);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safe(label, fn) {
    try {
        await fn();
        console.log(`  ✅ ${label}`);
    } catch (err) {
        if (err?.code === 409) console.log(`  ℹ️  ${label} — already exists`);
        else { console.error(`  ❌ ${label} — ${err.message}`); throw err; }
    }
}

async function main() {
    console.log('\n🚀  Setting up `github_skills` collection\n');

    // ── Collection ─────────────────────────────────────────────
    await safe('Collection: github_skills', () =>
        db.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            'GitHub Indexed Skills',
            [
                Permission.read(Role.any()),      // public read
                Permission.create(Role.any()),    // cron writes via API key (server-side)
                Permission.update(Role.any()),
                Permission.delete(Role.any()),
            ]
        )
    );
    await sleep(500);

    // ── Attributes ─────────────────────────────────────────────
    const attrs = [
        // Unique identifier: "owner/repo::path/to/SKILL.md"
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'skill_key', 512, true),

        // Skill display name (derived from parent folder name)
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'skill_name', 256, true),

        // GitHub repo full name e.g. "anthropics/skills"
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'repo', 256, true),

        // Path to SKILL.md in the repo e.g. "skills/seo-audit/SKILL.md"
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'file_path', 512, true),

        // Parent folder path e.g. "skills/seo-audit"
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'folder_path', 512, true),

        // GitHub owner/username
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'owner', 128, true),

        // Owner's avatar URL
        () => db.createUrlAttribute(DATABASE_ID, COLLECTION_ID, 'owner_avatar', false),

        // Repo description (from GitHub)
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'repo_description', 2000, false),

        // Repo star count
        () => db.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'stars', false, 0),

        // GitHub HTML URL to the skill folder
        () => db.createUrlAttribute(DATABASE_ID, COLLECTION_ID, 'html_url', true),

        // Repo language (e.g. "Python", "TypeScript")
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'language', 64, false),

        // Repo topics (array) e.g. ["ai-skills", "cursor"]
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'topics', 64, false, null, true),

        // Last time this record was updated by the crawler
        () => db.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'last_indexed', 64, true),
    ];

    console.log('  Adding attributes...');
    for (const fn of attrs) {
        await fn().then(() => console.log('    ✅ attribute')).catch(err => {
            if (err?.code === 409) console.log('    ℹ️  exists');
            else throw err;
        });
        await sleep(400);
    }

    console.log('  ⏳ Waiting for attributes to activate...');
    await sleep(5000);

    // ── Indexes ────────────────────────────────────────────────
    console.log('  Adding indexes...');

    await safe('Index: skill_key (unique)', () =>
        db.createIndex(DATABASE_ID, COLLECTION_ID, 'skill_key_unique', IndexType.Unique, ['skill_key'])
    );
    await sleep(500);

    await safe('Index: stars DESC', () =>
        db.createIndex(DATABASE_ID, COLLECTION_ID, 'stars_desc', IndexType.Key, ['stars'], ['DESC'])
    );
    await sleep(500);

    await safe('Index: owner', () =>
        db.createIndex(DATABASE_ID, COLLECTION_ID, 'owner_idx', IndexType.Key, ['owner'])
    );
    await sleep(500);

    await safe('Index: last_indexed', () =>
        db.createIndex(DATABASE_ID, COLLECTION_ID, 'last_indexed_idx', IndexType.Key, ['last_indexed'])
    );
    await sleep(500);

    await safe('Index: skill_name (fulltext)', () =>
        db.createIndex(DATABASE_ID, COLLECTION_ID, 'skill_name_ft', IndexType.Fulltext, ['skill_name'])
    );

    console.log('\n✨  github_skills collection ready!\n');
    console.log('Add to .env:');
    console.log(`  VITE_APPWRITE_GITHUB_SKILLS_TABLE_ID=${COLLECTION_ID}`);
    console.log('');
}

main().catch(err => {
    console.error('\n💥 Setup failed:', err.message);
    process.exit(1);
});
