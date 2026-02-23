import { useScrollAnimation } from '../hooks/useScrollAnimation'

const FEATURES = [
    {
        title: 'Private Vault',
        description: 'Securely store your personal skill collection. Organize, tag, and access your skills anytime — they stay yours.',
        icon: (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
        ),
    },
    {
        title: 'Public Marketplace',
        description: 'Discover skills published by the community. Rate, review, and download the best skill files for every AI agent.',
        icon: (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.998 2.998 0 00-1.5-2.599V5.25A2.25 2.25 0 013.75 3h16.5A2.25 2.25 0 0122.5 5.25v1.5a2.997 2.997 0 00-1.5 2.599" />
            </svg>
        ),
    },
    {
        title: 'AI Skill Editor',
        description: 'Create and edit skill files with an intelligent markdown editor. Preview how your skills will work before publishing.',
        icon: (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
        ),
    },
    {
        title: 'Skill Combining',
        description: 'Merge multiple skills into powerful combos. Stack capabilities to create the ultimate AI agent configuration.',
        icon: (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875S10.5 3.09 10.5 4.125c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.421 48.421 0 01-4.185-.428.64.64 0 00-.74.587c-.01.093-.02.186-.028.28-.036.477.264.897.6 1.228a2.1 2.1 0 01.634 1.507v0c0 .572-.312 1.07-.77 1.334a2.14 2.14 0 01-1.16.346c-.574 0-1.07-.312-1.334-.77a2.14 2.14 0 01-.346-1.16v-.001c0-.461.186-.887.493-1.207a1.803 1.803 0 00.504-1.297v0c0-.373-.187-.708-.49-.938A48.394 48.394 0 003 7.848v-.038c0-.345.268-.636.61-.66A48.66 48.66 0 0112 6.75c2.836 0 5.607.244 8.29.715a45.38 45.38 0 01.1.717v0c.059.396-.222.747-.614.8a48.474 48.474 0 01-4.186.428A.64.64 0 0115 8.957v0c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c-2.472 0-4.9.184-7.274.54a.836.836 0 00-.476.345 48.202 48.202 0 00-.634 1.028.836.836 0 00.16.933A47.561 47.561 0 0012 18.75c3.016 0 5.934-.28 8.724-.84a.837.837 0 00.596-.68c.052-.328.098-.656.138-.986a.836.836 0 00-.278-.806 48.196 48.196 0 00-1.906-1.595.836.836 0 00-.652-.194A47.764 47.764 0 0012 14.25v-1.5" />
            </svg>
        ),
    },
]

export default function Features() {
    const sectionRef = useScrollAnimation()

    return (
        <section id="features" ref={sectionRef} className="relative py-16">
            <div className="section-divider mb-16" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="scroll-reveal text-center mb-12">
                    <span className="font-satoshi text-sm font-medium text-accent tracking-widest uppercase">
                        Features
                    </span>
                    <h2 className="font-clash font-bold text-4xl sm:text-5xl lg:text-6xl mt-4 tracking-tight">
                        Everything you need to
                        <br />
                        <span className="italic text-accent">master AI skills</span>
                    </h2>
                    <p className="font-satoshi text-lg text-white/40 mt-6 max-w-2xl mx-auto">
                        A complete toolkit for discovering, creating, and managing the skill files
                        that make AI agents truly powerful.
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {FEATURES.map((feature, i) => (
                        <div
                            key={feature.title}
                            className={`scroll-reveal scroll-reveal-delay-${i + 1} glass-card rounded-2xl p-8 group`}
                        >
                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/15 flex items-center justify-center text-accent mb-6 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                                {feature.icon}
                            </div>

                            {/* Title */}
                            <h3 className="font-clash font-semibold text-xl mb-3 text-white group-hover:text-accent-light transition-colors duration-300">
                                {feature.title}
                            </h3>

                            {/* Description */}
                            <p className="font-satoshi text-sm text-white/40 leading-relaxed">
                                {feature.description}
                            </p>

                            {/* Decorative corner accent */}
                            <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute top-4 right-4 w-8 h-[1px] bg-accent/30" />
                                <div className="absolute top-4 right-4 w-[1px] h-8 bg-accent/30" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
