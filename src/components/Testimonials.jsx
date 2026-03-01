import { useState, useEffect } from "react"
import { databases, DATABASE_ID, TESTIMONIALS_TABLE_ID } from "../lib/appwrite"
import { Marquee } from "./Marquee"

const ReviewCard = ({ img, name, username, body }) => {
    return (
        <figure className="relative w-64 shrink-0 cursor-pointer overflow-hidden rounded-xl border p-4 transition-colors border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]">
            <div className="flex flex-row items-center gap-2">
                <img className="rounded-full opacity-90" width="32" height="32" alt="" src={img} />
                <div className="flex flex-col">
                    <figcaption className="text-sm font-medium text-white/90">
                        {name}
                    </figcaption>
                    <p className="text-xs font-medium text-white/40">{username}</p>
                </div>
            </div>
            <blockquote className="mt-3 text-sm text-white/70 leading-relaxed font-satoshi">{body}</blockquote>
        </figure>
    )
}

export function Testimonials() {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchReviews() {
            try {
                if (!databases) {
                    setLoading(false)
                    return
                }
                const res = await databases.listDocuments(
                    DATABASE_ID,
                    TESTIMONIALS_TABLE_ID
                )
                setReviews(res.documents)
            } catch (err) {
                console.error("Failed to load testimonials:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchReviews()
    }, [])

    if (loading) return null
    if (!reviews || reviews.length === 0) return null

    const firstRow = reviews.slice(0, Math.ceil(reviews.length / 2))
    const secondRow = reviews.slice(Math.ceil(reviews.length / 2))

    return (
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden mb-20 mt-10">
            {/* Header section */}
            <div className="text-center mb-10 max-w-3xl mx-auto px-6">
                <span className="inline-block font-satoshi text-sm font-medium tracking-widest uppercase text-accent/70 mb-3">
                    Testimonials
                </span>
                <h2 className="font-clash font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-4">
                    What people say
                </h2>
            </div>

            {/* Marquee rows */}
            <div className="flex flex-col gap-4">
                {firstRow.length > 0 && (
                    <Marquee pauseOnHover className="[--duration:12s] py-2">
                        {firstRow.map((review) => (
                            <ReviewCard key={review.$id || review.username} {...review} />
                        ))}
                    </Marquee>
                )}
                {secondRow.length > 0 && (
                    <Marquee reverse pauseOnHover className="[--duration:12s] py-2">
                        {secondRow.map((review) => (
                            <ReviewCard key={review.$id || review.username} {...review} />
                        ))}
                    </Marquee>
                )}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-navy to-transparent"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-navy to-transparent"></div>
        </div>
    )
}
