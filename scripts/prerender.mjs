#!/usr/bin/env node
/**
 * Post-build prerendering script.
 *
 * Spins up a local server on the built dist/ folder, then uses Puppeteer
 * to crawl each route and save the fully-rendered HTML back into dist/.
 *
 * This means every static route gets an index.html with full content —
 * headings, text, structured data, meta tags — visible to any crawler
 * that doesn't execute JavaScript.
 *
 * Usage:
 *   node scripts/prerender.mjs          (after `vite build`)
 *   npm run build && npm run prerender  (combined)
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

// Routes to pre-render (static pages only — dynamic routes need SSR)
const ROUTES = [
    '/',
    '/browse',
    '/build',
    '/community',
    '/about',
    '/privacy',
    '/terms',
]

const PORT = 4173
const ORIGIN = `http://localhost:${PORT}`

// ── Mime types for static serving ──────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.webmanifest': 'application/manifest+json',
}

function serveStatic(req, res) {
    let urlPath = req.url.split('?')[0]
    if (urlPath === '/') urlPath = '/index.html'

    // Try exact file first, then .html extension, then fallback to index.html (SPA)
    let filePath = join(DIST_DIR, urlPath)
    if (!existsSync(filePath)) {
        filePath = join(DIST_DIR, urlPath + '.html')
    }
    if (!existsSync(filePath)) {
        filePath = join(DIST_DIR, 'index.html')
    }

    try {
        const content = readFileSync(filePath)
        const ext = extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        res.end(content)
    } catch {
        res.writeHead(404)
        res.end('Not Found')
    }
}

async function prerender() {
    console.log('\n🚀 Pre-rendering static routes...\n')

    // 1. Start a local server
    const server = createServer(serveStatic)
    await new Promise(resolve => server.listen(PORT, resolve))
    console.log(`  📦 Serving dist/ on ${ORIGIN}`)

    // 2. Launch headless browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    })

    let successCount = 0

    for (const route of ROUTES) {
        const url = `${ORIGIN}${route}`
        console.log(`  ⏳ Rendering ${route} ...`)

        try {
            const page = await browser.newPage()

            // Set a bot-like user agent so the app skips splash screen
            await page.setUserAgent('Mozilla/5.0 (compatible; Prerender/1.0; +https://skillissue.bajpai.tech)')

            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

            // Wait for React to hydrate and render content
            await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {})

            // Extra wait for helmet-async to inject meta tags
            await new Promise(r => setTimeout(r, 2000))

            // Get the fully rendered HTML
            let html = await page.content()

            // Clean up: remove splash screen overlay if still present
            html = html.replace(
                /<div id="si-splash"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
                ''
            )
            // Also strip the inline <style> for splash
            html = html.replace(
                /<style>\s*#si-splash[\s\S]*?<\/style>/g,
                ''
            )

            // Write the pre-rendered HTML
            const outDir = route === '/'
                ? DIST_DIR
                : join(DIST_DIR, route)
            
            if (!existsSync(outDir)) {
                mkdirSync(outDir, { recursive: true })
            }

            const outFile = join(outDir, 'index.html')
            writeFileSync(outFile, html, 'utf-8')
            console.log(`  ✅ ${route} → ${outFile.replace(DIST_DIR, 'dist')}`)
            successCount++

            await page.close()
        } catch (err) {
            console.error(`  ❌ ${route} failed: ${err.message}`)
        }
    }

    await browser.close()
    server.close()

    console.log(`\n🎉 Pre-rendered ${successCount}/${ROUTES.length} routes.\n`)
}

prerender().catch(err => {
    console.error('⚠️  Prerender failed (non-fatal, deploy will continue):', err.message)
    // Exit 0 so CI/CD doesn't fail — the noscript fallback + JSON-LD in index.html
    // still provides SEO value even without pre-rendered pages
    process.exit(0)
})
