import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { databases, DATABASE_ID, TESTIMONIALS_TABLE_ID } from "../lib/appwrite"
import { hasSubmittedTestimonial } from "../lib/userService"
import { useAuth } from "../context/AuthContext"
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
    const { user: authUser, profile: authProfile } = useAuth()
    const [hasReviewed, setHasReviewed] = useState(true) // default true to avoid flash

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

    useEffect(() => {
        if (!authUser || !authProfile?.user_id) {
            setHasReviewed(true) // not logged in — hide the nudge
            return
        }
        hasSubmittedTestimonial(authProfile.user_id).then(setHasReviewed)
    }, [authUser, authProfile])

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

            {/* Subtle nudge for logged-in users who haven't reviewed yet */}
            {authUser && !hasReviewed && (
                <div className="mt-8 flex items-center gap-2 text-white/25 font-satoshi text-sm">
                    <svg className="w-3.5 h-3.5 shrink-0 text-accent/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    <span>Enjoying Skill Issue?</span>
                    <Link
                        to={`/user/${authProfile?.username}`}
                        className="text-accent/60 hover:text-accent transition-colors duration-200 underline underline-offset-2 decoration-accent/30 hover:decoration-accent/60"
                    >
                        Leave a review on your profile
                    </Link>
                    <span>— you might get featured here ✨</span>
                </div>
            )}
        </div>
    )
}
