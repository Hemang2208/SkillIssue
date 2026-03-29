/**
 * API: Query indexed GitHub skills from MongoDB Atlas
 *
 * GET /api/github-skills?limit=48&page=1&sort=stars
 * GET /api/github-skills?limit=48&page=2&search=react&sort=stars
 * GET /api/github-skills?search=react&owner=vercel&min_stars=100
 *
 * Backed by MongoDB — no 5000-total cap, real counts, fast text search.
 * Returns paginated, metadata-only skill results.
 * Content is NOT stored — frontend fetches .md on-demand from GitHub.
 */

import { getDb, COLLECTIONS } from './lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const {
        limit = '48',
        page = '1',
        search = '',
        sort = 'stars',     // "stars" | "recent"
        owner = '',
        min_stars = '0',
    } = req.query;

    const limitNum  = Math.min(100, Math.max(1, parseInt(limit, 10) || 48));
    const pageNum   = Math.max(1, parseInt(page, 10) || 1);
    const skipNum   = (pageNum - 1) * limitNum;
    const minStars  = parseInt(min_stars, 10) || 0;

    try {
        const db   = await getDb();
        const coll = db.collection(COLLECTIONS.GITHUB_SKILLS);

        // ── Build filter ────────────────────────────────────────────
        const filter = {};

        if (minStars > 0) {
            filter.stars = { $gte: minStars };
        }

        if (owner.trim()) {
            filter.owner = owner.trim();
        }

        // Search: use regex for substring matching (partial words like "stan" → "standards")
        // MongoDB's $text only matches complete words. At ~7-25K docs, regex is fast enough.
        if (search.trim()) {
            // Escape regex special chars in user input
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'i');
            filter.$or = [
                { skill_name: re },
                { owner: re },
                { repo: re },
                { repo_description: re },
            ];
        }

        // ── Build sort ──────────────────────────────────────────────
        let sortSpec;
        if (sort === 'recent') {
            sortSpec = { last_indexed: -1 };
        } else {
            sortSpec = { stars: -1 };
        }

        // ── Execute query + count in parallel ───────────────────────
        const [docs, total] = await Promise.all([
            coll.find(filter)
                .sort(sortSpec)
                .skip(skipNum)
                .limit(limitNum)
                .project({
                    _id: 1,
                    skill_key: 1,
                    skill_name: 1,
                    repo: 1,
                    file_path: 1,
                    folder_path: 1,
                    owner: 1,
                    owner_avatar: 1,
                    repo_description: 1,
                    stars: 1,
                    html_url: 1,
                    language: 1,
                    topics: 1,
                    last_indexed: 1,
                })
                .toArray(),
            coll.countDocuments(filter),
        ]);

        // Map _id to string id for frontend compatibility
        const skills = docs.map(doc => ({
            id: doc._id.toString(),
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
            total,              // ← REAL count, no 5000 cap
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            skills,
            hasMore: skipNum + skills.length < total,
        });
    } catch (err) {
        console.error('MongoDB query error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
