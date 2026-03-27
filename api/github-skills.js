/**
 * API: Query indexed GitHub skills from Appwrite
 *
 * GET /api/github-skills?page=1&limit=25&search=react&sort=stars
 *
 * Returns paginated, metadata-only skill results.
 * Content is NOT stored — frontend fetches .md on-demand from GitHub.
 */

import { Client, Databases, Query } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'skill-issue-db';
const COLLECTION_ID = process.env.APPWRITE_GITHUB_SKILLS_ID || process.env.VITE_APPWRITE_GITHUB_SKILLS_TABLE_ID || 'github_skills';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!APPWRITE_API_KEY) {
        return res.status(500).json({ error: 'APPWRITE_API_KEY not configured' });
    }

    const {
        page = '1',
        limit = '25',
        search = '',
        sort = 'stars',   // "stars" | "recent"
        owner = '',       // filter by owner
        min_stars = '0',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;
    const minStars = parseInt(min_stars, 10) || 50;

    try {
        const client = new Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);
        const db = new Databases(client);

        // Build query
        const queries = [
            Query.greaterThanEqual('stars', minStars),
            Query.limit(limitNum),
            Query.offset(offset),
        ];

        // Sort
        if (sort === 'recent') {
            queries.push(Query.orderDesc('last_indexed'));
        } else {
            queries.push(Query.orderDesc('stars'));
        }

        // Search by skill name
        if (search.trim()) {
            queries.push(Query.search('skill_name', search.trim()));
        }

        // Filter by owner
        if (owner.trim()) {
            queries.push(Query.equal('owner', owner.trim()));
        }

        const result = await db.listDocuments(DATABASE_ID, COLLECTION_ID, queries);

        // Map to clean response (strip Appwrite internals)
        const skills = result.documents.map(doc => ({
            id: doc.$id,
            skill_key: doc.skill_key,
            skill_name: doc.skill_name,
            repo: doc.repo,
            file_path: doc.file_path,
            folder_path: doc.folder_path,
            owner: doc.owner,
            owner_avatar: doc.owner_avatar,
            repo_description: doc.repo_description,
            stars: doc.stars,
            html_url: doc.html_url,
            language: doc.language,
            topics: doc.topics || [],
            last_indexed: doc.last_indexed,
        }));

        // Cache for 10 minutes
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

        return res.status(200).json({
            total: result.total,
            page: pageNum,
            limit: limitNum,
            skills,
        });
    } catch (err) {
        console.error('Query error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
