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

                let skillName, description, previousMarkdown, refinementInstruction
                try {
                    const parsed = JSON.parse(body)
                    skillName = parsed.skillName
                    description = parsed.description
                    previousMarkdown = parsed.previousMarkdown
                    refinementInstruction = parsed.refinementInstruction
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
                    return
                }

                const isRefinement = !!refinementInstruction

                const systemPrompt = `You are a skill file generator for AI agents. A skill file is a markdown document that gives an AI agent specific instructions on how to behave for a particular task.

Generate a well-structured markdown skill file based on the user's requirements. The file should have these sections:

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

                let userPrompt = ''
                if (isRefinement) {
                    userPrompt = `I have a previously generated skill file and I want to improve it.

Original Skill Name: ${skillName}
Current Skill Content:
${previousMarkdown}

User Refinement Request:
"${refinementInstruction}"

Please update the skill file based on this request. Maintain the structure and improve the content as requested. Return only the updated markdown.`
                } else {
                    userPrompt = `Create a skill file with this information:

Skill Name: ${skillName}

What it should do:
${description}`
                }

                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
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
