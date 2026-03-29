/**
 * GitHub Skill Crawler v4 — Deep Discovery with Trees API
 *
 * Pipeline:
 *   1. Size-partitioned Code Search → discover unique repos with SKILL.md
 *      (6 size ranges × 10 pages each = up to 6000 code results → 500+ repos)
 *   2. GraphQL batch (50/call) → filter repos by ≥MIN_STARS, get metadata
 *   3. Trees API → for each starred repo, find ALL SKILL.md files (not just
 *      the one Code Search returned). Repos like udecode/plate have 400+ skills.
 *   4. Parse + dedup + parallel-batch upsert into MongoDB Atlas
 *
 * Skips: openclaw/skills (user already fetches 7K skills from clawhub)
 * Cap: MAX_SKILLS_PER_REPO to avoid spam repos
 * Schedule: every 15 days (configured in vercel.json)
 *
 * Note: Full crawl takes ~5-8 minutes due to rate limits. Run locally or via
 * GitHub Actions. Vercel Hobby has 60s timeout — use for quick refresh only.
 */

import { MongoClient } from 'mongodb';

// ─── Config ─────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB  = process.env.MONGODB_DB || 'skillissue';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const COLLECTION_ID = 'github_skills';

const MIN_STARS = 10;
const MAX_SKILLS_PER_REPO = 500;
const GITHUB_API = 'https://api.github.com';
const GQL_BATCH = 50;
const SKIP_REPOS = new Set(['openclaw/skills']); // Already fetched via clawhub

// ─── Helpers ────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ghFetch(url, retries = 1) {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    const res = await fetch(url, { headers });

    if ((res.status === 403 || res.status === 429) && retries > 0) {
        const reset = res.headers.get('x-ratelimit-reset');
        const waitSec = reset ? Math.max(1, Number(reset) - Math.floor(Date.now() / 1000) + 1) : 30;
        console.log(`    ⏳ Rate limited, waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        return ghFetch(url, retries - 1);
    }
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return res.json();
}

async function ghGraphQL(query, retries = 1) {
    const res = await fetch(`${GITHUB_API}/graphql`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if ((res.status === 403 || res.status === 429) && retries > 0) {
        const reset = res.headers.get('x-ratelimit-reset');
        const waitSec = reset ? Math.max(1, Number(reset) - Math.floor(Date.now() / 1000) + 1) : 30;
        console.log(`    ⏳ GraphQL rate limited, waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        return ghGraphQL(query, retries - 1);
    }
    return res.json();
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 1: Size-partitioned Code Search → discover unique repos
// ═══════════════════════════════════════════════════════════════════════
// Each size range gets its own 1000-result window from GitHub.
// This lets us find far more repos than a single query (max 1000).
const SIZE_RANGES = [
    'size:<500',
    'size:500..1000',
    'size:1000..2000',
    'size:2000..4000',
    'size:4000..8000',
    'size:>8000',
];

async function discoverRepos() {
    const repos = new Set();
    let totalSearchResults = 0;

    for (const sizeQ of SIZE_RANGES) {
        const baseQuery = `filename:SKILL.md ${sizeQ}`;
        console.log(`\n  📦 Range: ${sizeQ}`);

        for (let page = 1; page <= 10; page++) {
            try {
                const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(baseQuery)}&per_page=100&page=${page}`;
                const data = await ghFetch(url);

                if (!data.items?.length) break;

                const exact = data.items.filter(i =>
                    i.name === 'SKILL.md' && !SKIP_REPOS.has(i.repository.full_name)
                );
                exact.forEach(i => repos.add(i.repository.full_name));
                totalSearchResults += exact.length;

                console.log(`    p${page}: +${exact.length} files, ${repos.size} repos total`);
                if (data.items.length < 100) break; // Last page
                await sleep(2200); // Search rate: 30/min
            } catch (err) {
                console.error(`    ⚠️ p${page}: ${err.message}`);
                if (err.message.includes('rate limited') || err.message.includes('422')) break;
                await sleep(3000);
            }
        }
        // Extra breathing room between ranges
        await sleep(3000);
    }

    console.log(`\n📊  Code Search complete: ${totalSearchResults} files → ${repos.size} unique repos`);
    return [...repos];
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 2: GraphQL batch → filter by stars, get metadata
// ═══════════════════════════════════════════════════════════════════════
async function fetchRepoDetails(repoNames) {
    const repoMap = new Map();
    const chunks = [];
    for (let i = 0; i < repoNames.length; i += GQL_BATCH) {
        chunks.push(repoNames.slice(i, i + GQL_BATCH));
    }

    console.log(`\n⭐  GraphQL: ${repoNames.length} repos in ${chunks.length} batch(es)`);
    let starred = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const fields = chunk.map((fullName, idx) => {
            const [owner, name] = fullName.split('/');
            return `r${idx}: repository(owner: "${owner}", name: "${name}") {
                nameWithOwner stargazerCount description
                primaryLanguage { name }
                owner { login avatarUrl }
                repositoryTopics(first: 10) { nodes { topic { name } } }
                defaultBranchRef { name }
            }`;
        }).join('\n');

        try {
            const json = await ghGraphQL(`{ ${fields} }`);
            if (json.errors && !json.data) {
                console.error(`    Batch ${ci + 1} error:`, json.errors[0]?.message);
                continue;
            }

            for (let idx = 0; idx < chunk.length; idx++) {
                const repo = json.data?.[`r${idx}`];
                if (!repo) { repoMap.set(chunk[idx], null); continue; }

                const entry = {
                    stars: repo.stargazerCount || 0,
                    description: (repo.description || '').slice(0, 2000),
                    language: repo.primaryLanguage?.name || '',
                    topics: (repo.repositoryTopics?.nodes || []).map(n => n.topic.name).slice(0, 10),
                    owner_avatar: repo.owner?.avatarUrl || '',
                    owner_login: repo.owner?.login || '',
                    default_branch: repo.defaultBranchRef?.name || 'main',
                };
                repoMap.set(chunk[idx], entry);
                if (entry.stars >= MIN_STARS) starred++;
            }
            console.log(`    Batch ${ci + 1}/${chunks.length}: ${chunk.length} repos`);
        } catch (err) {
            console.error(`    Batch ${ci + 1} failed: ${err.message}`);
            chunk.forEach(name => repoMap.set(name, null));
        }
        if (ci < chunks.length - 1) await sleep(500);
    }

    // Filter to starred repos only
    const starredRepos = new Map();
    for (const [name, details] of repoMap) {
        if (details && details.stars >= MIN_STARS) starredRepos.set(name, details);
    }
    console.log(`    ✅ ${starred} repos with ≥${MIN_STARS}⭐ (${repoMap.size - starred} filtered out)`);
    return starredRepos;
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 3: Trees API → find ALL SKILL.md in each starred repo
// ═══════════════════════════════════════════════════════════════════════
async function deepScanRepos(starredRepos) {
    const allSkills = [];
    let repoCount = 0;
    const total = starredRepos.size;

    console.log(`\n🌳  Trees API: scanning ${total} repos for all SKILL.md files...`);

    for (const [repoName, details] of starredRepos) {
        repoCount++;
        try {
            const branch = details.default_branch;
            const url = `${GITHUB_API}/repos/${repoName}/git/trees/${branch}?recursive=true`;
            const tree = await ghFetch(url);

            if (!tree.tree?.length) continue;

            // Find all SKILL.md files (exact case)
            const skillFiles = tree.tree.filter(f =>
                f.type === 'blob' && (f.path === 'SKILL.md' || f.path.endsWith('/SKILL.md'))
            );

            // Cap per repo
            const capped = skillFiles.slice(0, MAX_SKILLS_PER_REPO);

            for (const file of capped) {
                const filePath = file.path;
                const parts = filePath.split('/');
                const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : repoName.split('/')[1];
                const folderPath = parts.length >= 2 ? parts.slice(0, -1).join('/') : '';
                const skillName = parentFolder.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                allSkills.push({
                    skill_key: `${repoName}::${filePath}`,
                    skill_name: skillName,
                    repo: repoName,
                    file_path: filePath,
                    folder_path: folderPath,
                    owner: details.owner_login,
                    owner_avatar: details.owner_avatar,
                    repo_description: details.description,
                    stars: details.stars,
                    html_url: folderPath
                        ? `https://github.com/${repoName}/tree/${branch}/${folderPath}`
                        : `https://github.com/${repoName}`,
                    language: details.language,
                    topics: details.topics,
                    last_indexed: new Date().toISOString(),
                });
            }

            if (capped.length > 0 && repoCount % 10 === 0) {
                console.log(`    ${repoCount}/${total} repos scanned → ${allSkills.length} skills so far`);
            }
        } catch (err) {
            console.error(`    ⚠️ ${repoName}: ${err.message}`);
        }

        // Trees API uses REST rate: 5000/hr = ~1.4/sec. Stay safe.
        await sleep(250);
    }

    console.log(`    ✅ ${total} repos scanned → ${allSkills.length} total skills`);
    return allSkills;
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 4: Bulk upsert into MongoDB Atlas
// ═══════════════════════════════════════════════════════════════════════
async function upsertSkills(coll, skills) {
    let inserted = 0, modified = 0, errors = 0;
    const total = skills.length;
    const BATCH = 500;

    console.log(`\n📝  Upserting ${total} skills into MongoDB (batch of ${BATCH})...`);

    for (let i = 0; i < total; i += BATCH) {
        const batch = skills.slice(i, i + BATCH);
        const ops = batch.map(skill => ({
            updateOne: {
                filter: { skill_key: skill.skill_key },
                update: { $set: skill },
                upsert: true,
            },
        }));

        try {
            const result = await coll.bulkWrite(ops, { ordered: false });
            inserted += result.upsertedCount;
            modified += result.modifiedCount;
        } catch (err) {
            // bulkWrite with ordered:false reports errors but still processes the rest
            errors += (err.writeErrors?.length || 1);
            if (errors <= 5) console.error(`  ❌ ${err.message?.slice(0, 120)}`);
        }

        if ((i + BATCH) % 1000 < BATCH || i + BATCH >= total) {
            console.log(`    ${Math.min(i + BATCH, total)}/${total}  (new: ${inserted}, updated: ${modified}, err: ${errors})`);
        }
    }
    return { created: inserted, updated: modified, errors };
}

// ═══════════════════════════════════════════════════════════════════════
// CORE CRAWL LOGIC (used by both Vercel handler and CLI runner)
// ═══════════════════════════════════════════════════════════════════════
export async function runCrawl() {
    if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not configured');

    const t0 = Date.now();
    console.log(`\n🔍  Skill Crawler v4 (Deep Discovery) starting...`);
    console.log(`   Min stars: ${MIN_STARS} | Max per repo: ${MAX_SKILLS_PER_REPO}`);
    console.log(`   MongoDB: ${MONGODB_DB}/${COLLECTION_ID}`);
    console.log(`   Skipping: ${[...SKIP_REPOS].join(', ')}`);

    // 1. Size-partitioned Code Search → unique repos
    const repoNames = await discoverRepos();
    if (!repoNames.length) return { message: 'No repos found', created: 0, updated: 0, errors: 0 };

    // 2. GraphQL → filter by stars + get metadata
    const starredRepos = await fetchRepoDetails(repoNames);
    if (!starredRepos.size) return { message: 'No repos meet star threshold', created: 0, updated: 0, errors: 0 };

    // 3. Trees API → deep scan each starred repo for ALL SKILL.md
    const allSkills = await deepScanRepos(starredRepos);

    // 4. Dedup
    const uniqueSkills = [...new Map(allSkills.map(s => [s.skill_key, s])).values()];
    console.log(`\n🎯  ${uniqueSkills.length} unique skills after dedup`);
    if (!uniqueSkills.length) return { message: 'No skills found', created: 0, updated: 0, errors: 0 };

    // 5. Connect to MongoDB and upsert
    const mongoClient = new MongoClient(MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10_000,
    });
    try {
        await mongoClient.connect();
        const db = mongoClient.db(MONGODB_DB);
        const coll = db.collection(COLLECTION_ID);

        // Ensure the unique index exists (idempotent)
        await coll.createIndex({ skill_key: 1 }, { unique: true, name: 'idx_skill_key' });

        const result = await upsertSkills(coll, uniqueSkills);

        const totalInDb = await coll.countDocuments();
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n✅  Done in ${elapsed}s! New: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors}`);
        console.log(`    Total skills in MongoDB: ${totalInDb}`);

        return {
            message: 'Crawl complete',
            elapsed_seconds: Number(elapsed),
            repos_discovered: repoNames.length,
            repos_starred: starredRepos.size,
            total_skills: uniqueSkills.length,
            total_in_db: totalInDb,
            ...result,
        };
    } finally {
        await mongoClient.close();
    }
}

// ═══════════════════════════════════════════════════════════════════════
// VERCEL SERVERLESS HANDLER
// ═══════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    const querySecret = req.query?.secret;
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await runCrawl();
        return res.status(200).json(result);
    } catch (err) {
        console.error('💥 Crawler failed:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
