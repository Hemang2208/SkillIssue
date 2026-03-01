export function Marquee({
    className = "",
    reverse,
    pauseOnHover = false,
    children,
    vertical = false,
    repeat = 4,
    ...props
}) {
    // Parent div classes
    const baseClass = "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]";
    const dirClass = vertical ? "flex-col" : "flex-row";

    // Child repeating div classes
    const childBase = "flex shrink-0 justify-around [gap:var(--gap)]";
    const animClass = vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row";
    const hoverClass = pauseOnHover ? "group-hover:[animation-play-state:paused]" : "";
    const revClass = reverse ? "[animation-direction:reverse]" : "";

    return (
        <div
            {...props}
            className={`${baseClass} ${dirClass} ${className}`}
        >
            {Array(repeat)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className={`${childBase} ${animClass} ${hoverClass} ${revClass}`}
                    >
                        {children}
                    </div>
                ))}
        </div>
    )
}
