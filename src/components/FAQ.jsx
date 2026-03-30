import { useState } from 'react'
import SEO, { jsonLdSchemas } from './SEO'

const FAQS = [
    {
        question: 'What are AI skills?',
        answer: 'AI skills are structured markdown (.md) instruction files that give AI agents like Claude, ChatGPT, Gemini, and Cursor specific expertise. They contain prompts, rules, examples, and best practices that make your AI agent expert-level at a particular task — from writing blog posts and debugging code to creating marketing copy and building APIs.',
    },
    {
        question: 'How do I use a skill?',
        answer: 'Copy or download the skill file from Skill Issue, then add it to your AI agent. For Claude, paste it into your Project instructions or system prompt. For Cursor, save it as a .md file in your .cursor/rules folder. For ChatGPT, paste it into the Custom Instructions. The AI agent immediately gains the capability described in the skill.',
    },
    {
        question: 'Is Skill Issue free?',
        answer: 'Yes! Browsing, downloading, and using AI skills is completely free. You can also create and share your own skills at no cost using our AI-powered skill builder. We believe every developer should have access to tools that make their AI agents smarter.',
    },
    {
        question: 'Which AI agents are supported?',
        answer: 'Skills work with any AI agent that accepts text instructions. This includes Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google), Cursor, GitHub Copilot, Windsurf, and any other LLM-based tool. Most skills are agent-agnostic — they work across all platforms.',
    },
    {
        question: 'How do I create my own skill?',
        answer: 'Use our AI Skill Builder at skillissue.bajpai.tech/build. Describe what you want the skill to do, and our AI generates a complete, structured skill file for you. You can edit, refine, and publish it to the marketplace — or keep it private in your personal vault.',
    },
    {
        question: 'What makes skills different from regular prompts?',
        answer: 'Regular prompts are one-off instructions. Skills are structured, reusable documents with sections for purpose, instructions, edge cases, output format, and examples. They follow the SKILL.md format — a standardized spec that ensures consistent, high-quality AI behavior across sessions. Think of prompts as commands and skills as installed apps.',
    },
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null)

    return (
        <section id="faq" className="relative py-20">
            <div className="section-divider mb-16" />

            {/* FAQ structured data for Google & AI search engines */}
            <SEO
                title={null}
                path="/"
                jsonLd={jsonLdSchemas.faqPage(FAQS)}
            />

            <div className="max-w-3xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="font-satoshi text-sm font-medium text-accent tracking-widest uppercase">
                        FAQ
                    </span>
                    <h2 className="font-clash font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
                        Frequently asked
                        <br />
                        <span className="italic text-accent">questions</span>
                    </h2>
                </div>

                <div className="space-y-3">
                    {FAQS.map((faq, i) => {
                        const isOpen = openIndex === i
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border transition-all duration-300 ${
                                    isOpen
                                        ? 'border-accent/20 bg-accent/5'
                                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                                }`}
                            >
                                <button
                                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                >
                                    <h3 className={`font-clash font-semibold text-lg transition-colors duration-300 ${
                                        isOpen ? 'text-accent-light' : 'text-white/80'
                                    }`}>
                                        {faq.question}
                                    </h3>
                                    <svg
                                        className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                                            isOpen ? 'rotate-180 text-accent' : 'text-white/30'
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${
                                        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <p className="px-6 pb-5 font-satoshi text-[0.95rem] text-white/50 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
