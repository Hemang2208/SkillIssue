import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin: intercepts POST /api/generate and proxies to Groq API
function groqApiPlugin() {
    let envVars = {}

    return {
        name: 'groq-api-proxy',
        configResolved(config) {
            envVars = loadEnv(config.mode, config.root, '')
        },
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url !== '/api/generate' || req.method !== 'POST') {
                    return next()
                }

                const apiKey = envVars.VITE_GROQ_API_KEY || envVars.NEXT_PUBLIC_GROQ_API_KEY
                if (!apiKey || apiKey === 'your_key_here') {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'GROQ_API_KEY not configured. Add VITE_GROQ_API_KEY to .env file.' }))
                    return
                }

                // Read request body
                let body = ''
                for await (const chunk of req) {
                    body += chunk
                }

                let skillName, description, previousMarkdown, refinementInstruction, images
                try {
                    const parsed = JSON.parse(body)
                    skillName = parsed.skillName
                    description = parsed.description
                    previousMarkdown = parsed.previousMarkdown
                    refinementInstruction = parsed.refinementInstruction
                    images = Array.isArray(parsed.images) ? parsed.images : [] // array of base64 data URIs
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
                    return
                }

                const hasImages = images.length > 0

                // ── DEBUG ─────────────────────────────────────────────────
                console.log(`\n[SkillIssue API] Request received:`)
                console.log(`  skillName: ${skillName}`)
                console.log(`  images count: ${images.length}`)
                console.log(`  isRefinement: ${!!refinementInstruction}`)
                images.forEach((img, i) => {
                    console.log(`  image[${i}]: ${img?.slice(0, 80)}...`)
                })

                // ── Model selection ──────────────────────────────────────
                // Use vision model when images are provided, text model otherwise
                const model = hasImages
                    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
                    : 'llama-3.3-70b-versatile'

                const isRefinement = !!refinementInstruction

                // ── System prompt ─────────────────────────────────────────
                const baseSystemPrompt = `You are an expert skill file generator for AI agents. A skill file is a markdown document that gives an AI agent precise, actionable instructions for a specific task.

Generate a well-structured markdown skill file. Use this exact format:

---
name: [skill name]
description: [one-line description]
---

# [Skill Name]

## Purpose
[What this skill helps the AI do, written clearly]

## Instructions
[Detailed step-by-step instructions for the AI to follow]

## Best Practices
[Tips and guidelines for optimal results]

## Examples
[2-3 concrete examples of input/output or scenarios]

Keep the tone professional but approachable. Make it immediately useful.`

                const visionSystemPrompt = `You are an expert skill file generator for AI agents. A skill file is a markdown document that gives an AI agent precise, actionable instructions for a specific task.

The user has attached reference images. You MUST deeply analyze every image before writing anything. For each image, observe and extract:
- Exact color palette (name the specific colors, hex-like descriptions, tones — e.g. "dark navy background #0a0d1a", "electric blue accent", "off-white body text")
- Layout structure (grid system, column count, spacing rhythm, section proportions)
- Typography choices (heading size hierarchy, font weight contrasts, letter-spacing, line height)
- UI components present (cards, buttons, navbars, hero sections, badges, etc.) and their exact visual treatment
- Visual mood and aesthetic keywords (e.g. "glassmorphism", "minimal", "editorial", "brutalist", "neon dark mode")
- Specific design patterns (e.g. "large hero text with gradient clip", "3-column feature grid with icon + heading + body", "sticky translucent navbar")

You MUST translate these concrete observations into the Instructions and Best Practices sections of the skill file. The skill file must be specific enough that an AI agent reading it could reproduce the same design language WITHOUT seeing the images.

DO NOT use vague phrases like "similar to the images", "as shown in the reference", "inspired by the provided images", or "based on the visual style in the images". Every instruction must be concrete and self-contained.

Generate a well-structured markdown skill file. Use this exact format:

---
name: [skill name]
description: [one-line description]
---

# [Skill Name]

## Purpose
[What this skill helps the AI do]

## Visual Design System
[Describe the exact design language extracted from the images: colors, typography, spacing, layout rules — written as instructions the AI must follow]

## Instructions
[Step-by-step instructions for the AI, referencing the specific design elements you extracted above]

## Best Practices
[Concrete do's and don'ts derived from the visual patterns observed]

## Examples
[2-3 concrete examples with specific design details, not vague descriptions]`

                const systemPrompt = hasImages ? visionSystemPrompt : baseSystemPrompt

                // ── User prompt ───────────────────────────────────────────
                let userPromptText = ''
                if (isRefinement) {
                    userPromptText = `Improve this existing skill file.

Skill Name: ${skillName}
Current Content:
${previousMarkdown}

Refinement Request: "${refinementInstruction}"

${hasImages ? 'Re-analyze the attached images and make sure the refined skill file reflects their specific design details concretely. Do not reference the images generically.' : ''}

Return only the updated markdown.`
                } else if (hasImages) {
                    userPromptText = `I am attaching ${images.length} reference image${images.length > 1 ? 's' : ''}. Study them carefully.

Skill Name: ${skillName}

What this skill should do:
${description}

IMPORTANT: Before writing the skill file, mentally list the specific design details you can see in the images (colors, layout, typography, components, spacing). Then use those specific observations — not generic placeholders — throughout the Instructions and Best Practices sections. An AI reading this skill file should be able to reproduce the exact design language without ever seeing the images.`
                } else {
                    userPromptText = `Create a skill file with this information:\n\nSkill Name: ${skillName}\n\nWhat it should do:\n${description}`
                }

                // ── Build messages ────────────────────────────────────────
                let userMessage
                if (hasImages) {
                    // Build content array: all images first, then the text prompt
                    const contentParts = images.map((dataUri) => ({
                        type: 'image_url',
                        image_url: { url: dataUri },
                    }))
                    contentParts.push({ type: 'text', text: userPromptText })

                    userMessage = { role: 'user', content: contentParts }
                } else {
                    userMessage = { role: 'user', content: userPromptText }
                }

                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                userMessage,
                            ],
                            temperature: 0.7,
                            max_tokens: 4096,
                        }),
                    })

                    if (!response.ok) {
                        const errorData = await response.json()
                        res.writeHead(response.status, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ error: `Groq API error: ${JSON.stringify(errorData)}` }))
                        return
                    }

                    const data = await response.json()
                    const markdown = data.choices?.[0]?.message?.content || ''

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ markdown }))
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: `Server error: ${err.message}` }))
                }
            })
        },
    }
}

export default defineConfig({
    plugins: [react(), groqApiPlugin()],
})
