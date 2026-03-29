#!/usr/bin/env node
/**
 * Standalone CLI runner for the GitHub Skill Crawler v4.
 * Used by GitHub Actions cron and for local manual runs.
 *
 * Usage:
 *   node scripts/run-crawler.mjs
 *
 * Required env vars:
 *   MONGODB_URI, GITHUB_TOKEN (or VITE_GITHUB_TOKEN)
 *
 * Optional:
 *   MONGODB_DB
 */

import { runCrawl } from '../api/cron/index-skills.js';

console.log('═══════════════════════════════════════════════════');
console.log(' GitHub Skill Crawler v4 — Standalone Runner');
console.log('═══════════════════════════════════════════════════');
console.log(` Started: ${new Date().toISOString()}`);

try {
    const result = await runCrawl();
    console.log('\n═══════════════════════════════════════════════════');
    console.log(' RESULT:', JSON.stringify(result, null, 2));
    console.log('═══════════════════════════════════════════════════');
    process.exit(0);
} catch (err) {
    console.error('\n💥 Crawler failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}
