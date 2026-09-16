// Landing page — assembles all sections in order
// This is a Server Component (no "use client") because the sections handle
// their own client-side animations internally

import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Hero from "@/components/landing/Hero"
import Features from "@/components/landing/Features"
import HowItWorks from "@/components/landing/HowItWorks"
import About from "@/components/landing/About"
import Pricing from "@/components/landing/Pricing"
import Careers from "@/components/landing/Careers"
import Contact from "@/components/landing/Contact"

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col">
        <Hero />
        <Features />
        <HowItWorks />
        <About />
        <Pricing />
        <Careers />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
