import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import WhatIsSkillFile from './components/WhatIsSkillFile'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import CTA from './components/CTA'
import Footer from './components/Footer'
import SkillBuilder from './pages/SkillBuilder'

function LandingPage() {
    return (
        <>
            <Hero />
            <WhatIsSkillFile />
            <HowItWorks />
            <Features />
            <CTA />
            <Footer />
        </>
    )
}

export default function App() {
    return (
        <div className="relative min-h-screen bg-navy text-white">
            {/* Grid Background */}
            <div className="grid-bg" />

            {/* Content */}
            <div className="relative z-10">
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/build" element={<SkillBuilder />} />
                </Routes>
            </div>
        </div>
    )
}
