import { Client, Databases } from 'node-appwrite';

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '69a4504700384d63b782';
const API_KEY = 'standard_5753c1d0cdcd1d8266d844abd92924fa595e29ccdf268eccc22b729d35e1a7b7db7f91a6d557c833e4a9bb2b427280ca866fc9b2f5fadf718361f891601cb0e37f7135f3276f9ed5898172fcfea373a6bd443b09ae13aa9f9c481cc8f67e0bf29100111e11bf0edc79229e6b0f558068e8ef8c301d6d6ebe99dde2c1400ef6c1';
const DATABASE_ID = 'skill-issue-db';
const USERS_COLLECTION_ID = 'users';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

async function main() {
    try {
        console.log('Adding saved_skills attribute to users collection...');
        await db.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'saved_skills', 36, false, null, true);
        console.log('Successfully added saved_skills attribute.');
    } catch (err) {
        if (err?.code === 409) {
            console.log('saved_skills attribute already exists.');
        } else {
            console.error('Error:', err);
        }
    }
}
main();
