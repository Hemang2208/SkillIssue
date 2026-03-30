import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function NotFound() {
    return (
        <>
            <SEO
                title="Page Not Found"
                description="The page you're looking for doesn't exist. Browse AI skills or return to the homepage."
                noindex={true}
            />
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-7xl font-bold text-white/20 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-white mb-3">Page not found</h2>
                <p className="text-white/60 mb-8 max-w-md">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex gap-4">
                    <Link
                        to="/"
                        className="px-6 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        Go Home
                    </Link>
                    <Link
                        to="/browse"
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                        Browse Skills
                    </Link>
                </div>
            </div>
        </>
    )
}
