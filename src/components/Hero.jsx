import { useEffect, useRef, useState } from 'react'

function CountUpNumber({ endValue = 70, duration = 2500 }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime = null

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            // cubic ease-out
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(easeOut * endValue))

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [endValue, duration])

    return <>{count}</>
}

const AI_LOGOS = [
    { name: 'Claude', x: '12%', y: '18%', anim: 'float-anim-1', color: '#D97757', icon: 'anthropic' },
    { name: 'ChatGPT', x: '78%', y: '12%', anim: 'float-anim-2', color: '#10A37F', icon: 'openai', overrideSrc: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
    { name: 'Gemini', x: '85%', y: '55%', anim: 'float-anim-3', color: '#4285F4', icon: 'googlegemini' },
    { name: 'Grok', x: '8%', y: '65%', anim: 'float-anim-4', color: '#FFFFFF', icon: 'x' },
    { name: 'Cursor', x: '25%', y: '78%', anim: 'float-anim-5', color: '#00D4FF', icon: 'cursor' },
    { name: 'Copilot', x: '70%', y: '75%', anim: 'float-anim-6', color: '#0078D4', icon: 'githubcopilot' },
]

// Define connections between logos (pairs of indices)
const CONNECTIONS = [
    [0, 1], [1, 2], [2, 5], [5, 4], [4, 3], [3, 0],
    [0, 2], [1, 5], [3, 2],
]

export default function Hero() {
    const svgRef = useRef(null)
    const logosRef = useRef([])

    useEffect(() => {
        // Animate the SVG lines to follow floating logos
        let animFrame
        const updateLines = () => {
            if (!svgRef.current) return
            const lines = svgRef.current.querySelectorAll('line')
            const container = svgRef.current.parentElement

            if (!container) return
            const rect = container.getBoundingClientRect()

            lines.forEach((line, i) => {
                const [a, b] = CONNECTIONS[i]
                const logoA = logosRef.current[a]
                const logoB = logosRef.current[b]
                if (!logoA || !logoB) return

                const rectA = logoA.getBoundingClientRect()
                const rectB = logoB.getBoundingClientRect()

                const ax = rectA.left + rectA.width / 2 - rect.left
                const ay = rectA.top + rectA.height / 2 - rect.top
                const bx = rectB.left + rectB.width / 2 - rect.left
                const by = rectB.top + rectB.height / 2 - rect.top

                line.setAttribute('x1', ax)
                line.setAttribute('y1', ay)
                line.setAttribute('x2', bx)
                line.setAttribute('y2', by)
            })

            animFrame = requestAnimationFrame(updateLines)
        }

        updateLines()
        return () => cancelAnimationFrame(animFrame)
    }, [])

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Orbs */}
            <div className="hero-orb w-[500px] h-[500px] bg-accent/10 top-[-10%] left-[-10%]" />
            <div className="hero-orb w-[400px] h-[400px] bg-accent/5 bottom-[5%] right-[-5%]" />
            <div className="hero-orb w-[300px] h-[300px] bg-blue-500/8 top-[40%] left-[50%]" />

            {/* Constellation */}
            <div className="constellation-container">
                <svg
                    ref={svgRef}
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4ba9ff" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#4ba9ff" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#4ba9ff" stopOpacity="0.4" />
                        </linearGradient>
                    </defs>
                    {CONNECTIONS.map((_, i) => (
                        <line
                            key={i}
                            className={`constellation-line line-pulse line-pulse-delay-${(i % 4) + 1}`}
                            x1="0" y1="0" x2="0" y2="0"
                        />
                    ))}
                </svg>

                {AI_LOGOS.map((logo, i) => (
                    <div
                        key={logo.name}
                        ref={(el) => (logosRef.current[i] = el)}
                        className={`constellation-logo ${logo.anim}`}
                        style={{ left: logo.x, top: logo.y }}
                    >
                        <img
                            src={logo.overrideSrc || `https://cdn.simpleicons.org/${logo.icon}/${logo.color.replace('#', '')}`}
                            alt={logo.name}
                            className={logo.overrideSrc ? "w-9 h-9 object-contain rounded-md" : "w-10 h-10 object-contain"}
                            style={logo.overrideSrc ? { filter: `drop-shadow(0 0 6px ${logo.color}50)` } : { filter: `drop-shadow(0 0 8px ${logo.color}70)` }}
                        />
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    {/* Left — Text */}
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                <span className="font-satoshi text-xs font-medium text-accent-light tracking-wide">
                                    The marketplace for AI skill files
                                </span>
                            </div>
                            <h1 className="font-clash font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                                Does your AI
                                <br />
                                agent have a
                                <br />
                                <span className="italic text-accent glow-text">skill issue?</span>
                            </h1>
                        </div>
                        <p className="font-satoshi text-lg text-white/50 max-w-lg leading-relaxed">
                            Discover, save, share and combine AI skill files that supercharge
                            your agents. Think GitHub, but for <span className="text-accent-light">.md skill files</span>.
                        </p>

                        {/* Animated Stat */}
                        <div className="py-3 pl-5 border-l-[3px] border-accent/40 flex flex-col justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <span className="font-satoshi text-[0.7rem] sm:text-xs font-bold tracking-[0.2em] uppercase text-white/50 mb-1">
                                Boost your AI productivity by up to
                            </span>
                            <div className="font-clash font-black text-7xl sm:text-8xl text-accent leading-none tracking-tighter" style={{ textShadow: '0 0 40px rgba(75, 169, 255, 0.5)' }}>
                                <CountUpNumber />%
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <a href="#browse" className="btn-primary">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                Browse Skills
                            </a>
                            <a href="#get-started" className="btn-outline">
                                Get Started Free
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </a>
                        </div>

                        {/* Social proof hint */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex -space-x-2">
                                {[...Array(4)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-full border-2 border-navy bg-navy-200 flex items-center justify-center text-[0.55rem] font-bold text-accent/60"
                                    >
                                        {['AB', 'CK', 'RJ', 'DM'][i]}
                                    </div>
                                ))}
                            </div>
                            <span className="font-satoshi text-sm text-white/30">
                                Join 2,400+ AI enthusiasts
                            </span>
                        </div>
                    </div>

                    {/* Right — Megamind */}
                    <div className="relative flex justify-center lg:justify-end">
                        <div className="relative">
                            {/* Glow behind megamind */}
                            <div className="absolute inset-0 bg-accent/10 rounded-3xl blur-3xl scale-110" />
                            <img
                                src="/megamind.png"
                                alt="Megamind — Does your AI have a skill issue?"
                                className="relative z-10 w-full max-w-md lg:max-w-lg rounded-2xl"
                                style={{
                                    filter: 'drop-shadow(0 0 60px rgba(75, 169, 255, 0.15))',
                                }}
                            />
                            {/* Floating badge */}
                            <div className="absolute -bottom-4 -left-4 z-20 px-4 py-2 rounded-xl bg-navy-100 border border-accent/20 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="font-satoshi text-xs text-white/70">12,847 skills available</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
