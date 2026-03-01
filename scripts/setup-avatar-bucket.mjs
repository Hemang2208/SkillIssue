/**
 * Creates an Appwrite Storage bucket for user avatars.
 * Run once: node scripts/setup-avatar-bucket.mjs
 */

import { Client, Storage, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69a4504700384d63b782')
    .setKey('standard_5753c1d0cdcd1d8266d844abd92924fa595e29ccdf268eccc22b729d35e1a7b7db7f91a6d557c833e4a9bb2b427280ca866fc9b2f5fadf718361f891601cb0e37f7135f3276f9ed5898172fcfea373a6bd443b09ae13aa9f9c481cc8f67e0bf29100111e11bf0edc79229e6b0f558068e8ef8c301d6d6ebe99dde2c1400ef6c1');

const storage = new Storage(client);

try {
    const bucket = await storage.createBucket(
        'avatars',
        'User Avatars',
        [
            Permission.read(Role.any()),           // public read for avatar display
            Permission.create(Role.users()),       // logged-in users can upload
            Permission.update(Role.users()),       // per-file perms restrict edits
            Permission.delete(Role.users()),
        ],
        false,   // fileSecurity — use document-level permissions
        true,    // enabled
        2 * 1024 * 1024,   // maxFileSize: 2 MB
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
    console.log('✅ Avatar bucket created:', bucket.$id);
} catch (err) {
    if (err?.code === 409) {
        console.log('ℹ️  Bucket already exists — nothing to do.');
    } else {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
}
