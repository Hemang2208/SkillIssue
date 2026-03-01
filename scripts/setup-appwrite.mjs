/**
 * Appwrite Setup Script — Skill Issue
 * Creates database, collections (users + skills), attributes, and indexes.
 * Run once: node scripts/setup-appwrite.mjs
 */

import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '69a4504700384d63b782';
const API_KEY = 'standard_5753c1d0cdcd1d8266d844abd92924fa595e29ccdf268eccc22b729d35e1a7b7db7f91a6d557c833e4a9bb2b427280ca866fc9b2f5fadf718361f891601cb0e37f7135f3276f9ed5898172fcfea373a6bd443b09ae13aa9f9c481cc8f67e0bf29100111e11bf0edc79229e6b0f558068e8ef8c301d6d6ebe99dde2c1400ef6c1';

const DATABASE_ID = 'skill-issue-db';
const USERS_COLLECTION_ID = 'users';
const SKILLS_COLLECTION_ID = 'skills';

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const db = new Databases(client);

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function safeCreate(label, fn) {
    try {
        const result = await fn();
        console.log(`  ✅ ${label}`);
        return result;
    } catch (err) {
        if (err?.code === 409) {
            console.log(`  ℹ️  ${label} — already exists, skipping`);
        } else {
            console.error(`  ❌ ${label} — ${err.message}`);
            throw err;
        }
    }
}

async function main() {
    console.log('\n🚀  Appwrite Setup — Skill Issue\n');

    // ── 1. Database ───────────────────────────────────────────────────────────
    console.log('📦  Creating database...');
    await safeCreate('Database: skill-issue-db', () =>
        db.create(DATABASE_ID, 'Skill Issue DB')
    );

    // ── 2. users collection ───────────────────────────────────────────────────
    console.log('\n👤  Creating `users` collection...');
    await safeCreate('Collection: users', () =>
        db.createCollection(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            'users',
            [
                Permission.read(Role.any()),          // profiles are public
                Permission.create(Role.users()),      // any logged-in user can create their profile
                Permission.update(Role.users()),      // per-document perms restrict who can update
                Permission.delete(Role.users()),
            ]
        )
    );
    await sleep(500);

    // users attributes
    const usersAttrs = [
        () => db.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'user_id', 36, true),
        () => db.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'username', 64, true),
        () => db.createEmailAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'email', false),
        () => db.createUrlAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'avatar_url', false),
        () => db.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'display_name', 128, false),
        () => db.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'bio', 1000, false),
    ];

    console.log('  Adding attributes to `users`...');
    for (const fn of usersAttrs) {
        await fn().then(() => console.log('    ✅ attribute created')).catch(err => {
            if (err?.code === 409) console.log('    ℹ️  attribute exists');
            else throw err;
        });
        await sleep(300);
    }

    // Wait for attributes to be active before creating indexes
    console.log('  ⏳ Waiting for attributes to activate...');
    await sleep(3000);

    // users indexes
    console.log('  Adding indexes to `users`...');
    await safeCreate('Index: username (unique)', () =>
        db.createIndex(DATABASE_ID, USERS_COLLECTION_ID, 'username_unique', IndexType.Unique, ['username'])
    );
    await sleep(500);
    await safeCreate('Index: user_id', () =>
        db.createIndex(DATABASE_ID, USERS_COLLECTION_ID, 'user_id_idx', IndexType.Key, ['user_id'])
    );

    // ── 3. skills collection ──────────────────────────────────────────────────
    console.log('\n🧠  Creating `skills` collection...');
    await safeCreate('Collection: skills', () =>
        db.createCollection(
            DATABASE_ID,
            SKILLS_COLLECTION_ID,
            'skills',
            [
                Permission.read(Role.any()),          // public read — per-doc perms filter private ones
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ]
        )
    );
    await sleep(500);

    // skills attributes
    const skillsAttrs = [
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'user_id', 36, true),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'title', 256, true),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'content', 500000, true),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'description', 2000, false),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'category', 64, false),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'visibility', 16, false, 'private'),
        () => db.createStringAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'tags', 64, false, null, true),  // array
        () => db.createIntegerAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'copy_count', false, 0),
        () => db.createIntegerAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'download_count', false, 0),
        () => db.createIntegerAttribute(DATABASE_ID, SKILLS_COLLECTION_ID, 'star_count', false, 0),
    ];

    console.log('  Adding attributes to `skills`...');
    for (const fn of skillsAttrs) {
        await fn().then(() => console.log('    ✅ attribute created')).catch(err => {
            if (err?.code === 409) console.log('    ℹ️  attribute exists');
            else throw err;
        });
        await sleep(300);
    }

    // Wait for attributes to activate
    console.log('  ⏳ Waiting for attributes to activate...');
    await sleep(4000);

    // skills indexes
    console.log('  Adding indexes to `skills`...');
    await safeCreate('Index: user_id', () =>
        db.createIndex(DATABASE_ID, SKILLS_COLLECTION_ID, 'user_id_idx', IndexType.Key, ['user_id'])
    );
    await sleep(500);
    await safeCreate('Index: visibility', () =>
        db.createIndex(DATABASE_ID, SKILLS_COLLECTION_ID, 'visibility_idx', IndexType.Key, ['visibility'])
    );
    await sleep(500);
    await safeCreate('Index: created_at DESC', () =>
        db.createIndex(DATABASE_ID, SKILLS_COLLECTION_ID, 'created_at_idx', IndexType.Key, ['$createdAt'], ['DESC'])
    );
    await sleep(500);
    await safeCreate('Index: user_id + visibility', () =>
        db.createIndex(DATABASE_ID, SKILLS_COLLECTION_ID, 'user_visibility_idx', IndexType.Key, ['user_id', 'visibility'])
    );

    console.log('\n✨  Setup complete!\n');
    console.log('Add these to your .env:');
    console.log(`  VITE_APPWRITE_DATABASE_ID=${DATABASE_ID}`);
    console.log(`  VITE_APPWRITE_USERS_TABLE_ID=${USERS_COLLECTION_ID}`);
    console.log(`  VITE_APPWRITE_SKILLS_TABLE_ID=${SKILLS_COLLECTION_ID}`);
    console.log('');
}

main().catch(err => {
    console.error('\n💥 Setup failed:', err.message);
    process.exit(1);
});
