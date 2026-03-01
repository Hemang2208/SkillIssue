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

async function fix() {
    console.log('Fixing testimonials collection permissions...');
    try {
        await db.updateCollection(DATABASE_ID, TESTIMONIALS_COLLECTION_ID, 'testimonials', [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ], true);
        console.log('✅ Collection updated successfully');
    } catch (e) {
        console.error('❌ Failed to update collection:', e.message);
    }
}
fix();
