import { Client, Databases, Permission, Role } from 'node-appwrite';

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '69a4504700384d63b782';
const API_KEY = 'standard_5753c1d0cdcd1d8266d844abd92924fa595e29ccdf268eccc22b729d35e1a7b7db7f91a6d557c833e4a9bb2b427280ca866fc9b2f5fadf718361f891601cb0e37f7135f3276f9ed5898172fcfea373a6bd443b09ae13aa9f9c481cc8f67e0bf29100111e11bf0edc79229e6b0f558068e8ef8c301d6d6ebe99dde2c1400ef6c1';
const DATABASE_ID = 'skill-issue-db';
const TESTIMONIALS_COLLECTION_ID = 'testimonials';

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const db = new Databases(client);

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
        }
    }
}

async function setup() {
    console.log('📦 Creating testimonials collection');
    await safeCreate('Collection: testimonials', () => 
        db.createCollection(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'testimonials', [
            Permission.read(Role.any())
        ])
    );
    
    // Attributes
    await safeCreate('Attr: name', () => db.createStringAttribute(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'name', 100, true));
    await safeCreate('Attr: username', () => db.createStringAttribute(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'username', 50, true));
    await safeCreate('Attr: body', () => db.createStringAttribute(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'body', 1000, true));
    await safeCreate('Attr: img', () => db.createUrlAttribute(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'img', false));
    await safeCreate('Attr: user_id', () => db.createStringAttribute(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'user_id', 36, false));
    
    console.log('Done creating attributes...');
}

setup();
