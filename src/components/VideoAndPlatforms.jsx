import IconSphere from './IconSphere'

export default function VideoAndPlatforms() {
    return (
        <section className="relative py-20 md:py-28">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-10 lg:gap-14 items-start">

                    {/* ── Left: Video ── */}
                    <div className="flex flex-col">
                        <h3 className="text-2xl sm:text-3xl font-clash font-semibold text-white mb-2">
                            Meet the <span className="italic text-accent">maker</span>
                        </h3>
                        <p className="text-white/40 font-satoshi text-sm mb-5">
                            Abhishek explains what Skill Issue is and why he built it
                        </p>
                        <div className="video-glow-wrapper rounded-2xl overflow-hidden">
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                <iframe
                                    className="absolute inset-0 w-full h-full rounded-2xl"
                                    src="https://www.youtube.com/embed/JUjiVIz525A?rel=0"
                                    title="SkillIssue Demo"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Platforms ── */}
                    <div className="flex flex-col items-center text-center px-4 sm:px-0">
                        <h3 className="text-2xl sm:text-3xl font-clash font-semibold text-white mb-2 relative z-10">
                            Works with your favorite <span className="italic text-accent">AI</span>
                        </h3>
                        <p className="text-white/40 font-satoshi text-sm mb-4 relative z-10">
                            Drag to spin · click to visit
                        </p>

                        <div className="sphere-cloud-wrap max-sm:scale-[0.82] max-sm:origin-top">
                            <IconSphere size={400} />
                        </div>

                        <p className="mt-2 text-white/25 text-sm font-satoshi italic tracking-wide relative z-10">
                            and many more…
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
