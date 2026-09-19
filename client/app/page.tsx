// Landing page — assembles all luxury beige mobility sections in order
// Features:
// 1. Curated vertical color story: French Linen -> Toasted Cashmere -> Warm Oatmeal -> Multi-tonal Sand -> Charcoal Footer
// 2. Real-time fleet operations marquee ticker
// 3. Interactive Route R01 Corridor & Stop Inspector
// 4. Core fleet capabilities & 3-step operational pipeline
// 5. STCET campus roots & Sohom Giri UI/UX engineering showcase

import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Hero from "@/components/landing/Hero"
import FleetTicker from "@/components/landing/FleetTicker"
import RouteInspector from "@/components/landing/RouteInspector"
import Features from "@/components/landing/Features"
import HowItWorks from "@/components/landing/HowItWorks"
import About from "@/components/landing/About"
import Contact from "@/components/landing/Contact"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F6F4EE] text-[#1C1917] selection:bg-[#FEF3C7] selection:text-[#92400E]">
      <Navbar />
      <main className="flex flex-col">
        <Hero />
        <FleetTicker />
        <RouteInspector />
        <Features />
        <HowItWorks />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
