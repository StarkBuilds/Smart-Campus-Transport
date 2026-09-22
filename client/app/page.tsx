"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import TransitSmartCard from "@/components/landing/TransitSmartCard"

interface RouteStop { stopId: string; name: string }
interface RouteData { routeId: string; name: string; stops: RouteStop[] }
interface BusData {
  busId: string
  status: string
  routeId?: string
  etaMinutes?: number
  nextStop?: { name: string }
}

export default function LandingPage() {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [buses, setBuses] = useState<BusData[]>([])
  const [userName, setUserName] = useState("Student")
  const [showPass, setShowPass] = useState(false)

  const [heroText, setHeroText] = useState("")
  const fullHeroText = "Know when\nto ride."
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) {
      setHeroText(fullHeroText)
      return
    }
    let i = 0
    let timeout: NodeJS.Timeout
    const typeWriter = () => {
      if (i <= fullHeroText.length) {
        setHeroText(fullHeroText.substring(0, i))
        i++
        timeout = setTimeout(typeWriter, 80)
      }
    }
    timeout = setTimeout(typeWriter, 300)
    return () => clearTimeout(timeout)
  }, [reduceMotion])

  useEffect(() => {
    const storedName = localStorage.getItem("user_name")
    if (storedName) setUserName(storedName)
    Promise.all([
      fetch("/api/routes").then((response) => response.ok ? response.json() : []),
      fetch("/api/buses").then((response) => response.ok ? response.json() : []),
    ]).then(([routeData, busData]) => {
      setRoutes(Array.isArray(routeData) ? routeData : [])
      setBuses(Array.isArray(busData) ? busData : [])
    }).catch(() => {})
  }, [])

  const activeRoute = routes.find((route) => route.routeId === "R01") ?? routes[0]
  const activeBus = buses.find((bus) => bus.routeId === activeRoute?.routeId) ?? buses[0]
  const routeStops = activeRoute?.stops ?? []

  return (
    <main className="flex-grow w-full">
      <style jsx>{`
        @keyframes campusride-caret { 0%, 45% { opacity: 1; } 46%, 100% { opacity: 0; } }
        .hero-caret { animation: campusride-caret .9s steps(1, end) infinite; }
        @media (prefers-reduced-motion: reduce) { .hero-caret { animation: none; opacity: 1; } }
      `}</style>
      {/* 1. HERO — FULL-WIDTH BACKGROUND VISUAL */}
      <section className="relative min-h-[550px] lg:min-h-[720px] flex items-center justify-center overflow-hidden border-b border-stone-subtle" id="planner">
        {/* Full-width Responsive Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bus.png"
            alt="CampusRide Visual Artwork"
            fill
            priority
            className="object-cover object-center scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Subtle Multi-stage Gradient Overlays for Guaranteed Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-parchment/95 via-parchment/85 to-parchment/40 sm:to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-parchment via-transparent to-parchment/20 z-10" />
        </div>

        {/* Content Over Background */}
        <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 sm:px-10 py-20 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-terracotta mb-6 bg-parchment/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-stone-subtle shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse"></span>
              <span>Live Campus Transit Companion</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal leading-[1.04] tracking-tight text-espresso mb-6 drop-shadow-xs">
              Track your campus bus.<br />
              <span className="italic font-serif text-stone-dark whitespace-pre-line">
                {heroText}
                <span className="hero-caret text-terracotta ml-1">|</span>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-stone-dark leading-relaxed font-normal mb-10 max-w-xl bg-parchment/40 backdrop-blur-sm p-4 rounded-2xl border border-stone-subtle/40 shadow-xs">
              CampusRide connects students with real-time shuttle telemetry, stop-by-stop schedule adherence, and delay predictions across STCET routes.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="bg-terracotta hover:bg-terracotta-dark text-parchment px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2">
                <span>Find My Bus &rarr;</span>
              </Link>
              <Link href="/routes" className="px-6 py-4 rounded-xl bg-parchment/90 backdrop-blur-md border border-stone-subtle text-espresso text-sm font-semibold hover:bg-parchment transition-colors shadow-xs">
                Explore Routes &amp; Stops
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Natural Language Transit Bar (Positioned as an accessible connector strip) */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 relative z-30 -mt-8 mb-20">
        <div className="bg-parchment-warm border border-stone-subtle p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-base sm:text-lg">
            <div className="flex flex-wrap items-center gap-2 text-stone-dark font-medium">
              <span>I need to go from</span>
              <div className="relative inline-flex items-center">
                <select className="bg-parchment border-b-2 border-stone-dark py-1 pl-2.5 pr-7 text-espresso font-semibold rounded focus:ring-0 focus:border-terracotta h-9 cursor-pointer border-x-0 border-t-0" defaultValue="1">
                  {routeStops.length > 0 ? routeStops.map((stop) => <option key={stop.stopId}>{stop.name}</option>) : <option>Route data unavailable</option>}
                </select>
              </div>
              <span>to</span>
              <div className="relative inline-flex items-center">
                <select className="bg-parchment border-b-2 border-stone-dark py-1 pl-2.5 pr-7 text-espresso font-semibold rounded focus:ring-0 focus:border-terracotta h-9 cursor-pointer border-x-0 border-t-0" defaultValue="1">
                  {routeStops.length > 0 ? routeStops.map((stop) => <option key={stop.stopId}>{stop.name}</option>) : <option>Route data unavailable</option>}
                </select>
              </div>
              <span>arriving by</span>
              <div className="relative inline-flex items-center">
                <select className="bg-parchment border-b-2 border-terracotta text-terracotta-dark font-semibold py-1 pl-2.5 pr-7 rounded focus:ring-0 focus:border-terracotta h-9 cursor-pointer border-x-0 border-t-0" defaultValue="1">
                  <option>{activeBus?.etaMinutes != null ? `Next bus in ${activeBus.etaMinutes} min` : "Live ETA unavailable"}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/dashboard" className="bg-espresso hover:bg-stone-dark text-parchment px-6 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2">
                <span>View Live Telemetry &rarr;</span>
              </Link>
            </div>
          </div>
          
          {/* Micro Recommendations Strip */}
          <div className="mt-4 pt-4 border-t border-stone-subtle/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-text">
            <div className="flex items-center gap-4">
                <span className="font-medium text-espresso">Active route:</span>
                <span className="inline-flex items-center gap-1.5 text-stone-dark">
                <span className="w-2 h-2 rounded-full bg-transitblue"></span> {activeRoute?.name ?? "Live route data unavailable"} {activeBus ? `• ${activeBus.busId} • ${activeBus.status}` : ""}
              </span>
              <span className="hidden sm:inline text-stone-medium">|</span>
              <span className="inline-flex items-center gap-1 text-sage font-medium">
                <span className="material-symbols-outlined text-xs">directions_walk</span> 6 min walk via North Promenade
              </span>
            </div>
            <span className="italic font-serif text-stone-text">{activeBus?.nextStop ? `Next stop: ${activeBus.nextStop.name}` : "Live updates refresh from CampusRide telemetry"}</span>
          </div>
        </div>
      </section>

      {/* 2. LARGE "CAMPUS MOBILITY" SECTION */}
      <section className="mb-24 py-8">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-terracotta mb-4">
              CAMPUS MOBILITY, WITHOUT THE GUESSWORK.
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-espresso mb-6">
              One campus. Every ride, in view.
            </h2>
            <p className="text-stone-text text-base sm:text-lg leading-relaxed max-w-2xl">
              Live shuttle locations, stop-level ETAs, and delay predictions that help students know when to leave, where to wait, and when to board.
            </p>
          </div>

          {/* TWO LARGE FEATURE CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Card 01: Live Bus Tracking */}
            <motion.div initial={reduceMotion ? false : { opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={reduceMotion ? { duration: 0 } : { duration: 0.55 }} className="group relative bg-parchment-warm border border-stone-subtle rounded-3xl overflow-hidden flex flex-col justify-between h-[480px] sm:h-[520px] shadow-xs hover:border-stone-medium transition-colors">
              {/* Background large faint 01 */}
              <div className="absolute -bottom-10 -right-4 text-[220px] font-serif italic text-stone-subtle/30 z-0 select-none pointer-events-none leading-none">
                01
              </div>
              
              <div className="p-8 sm:p-12 relative z-10 flex-1 flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-widest text-transitblue mb-3">
                  01 &mdash; Live Bus Tracking
                </div>
                <h3 className="font-serif text-3xl sm:text-4xl text-espresso mb-4">Live Bus Tracking</h3>
                <p className="text-stone-text text-base leading-relaxed mb-6 max-w-md">
                  Watch active campus shuttles move across their routes in real time.
                </p>
                <div>
                  <Link href="/dashboard" className="text-sm font-semibold text-espresso group-hover:text-terracotta transition-colors inline-flex items-center gap-1.5">
                    <span>Explore Live Map</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Reusable Visual Area */}
              <div className="relative h-44 sm:h-52 w-full px-8 sm:px-12 pb-8 z-10">
                <div className="w-full h-full relative rounded-2xl overflow-hidden border border-stone-subtle/60 shadow-sm transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out">
                  <Image
                    src="/assets/campusride-bus.png"
                    alt="Live Bus Tracking Demonstration"
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-espresso/5 pointer-events-none" />
                </div>
              </div>
            </motion.div>

            {/* Card 02: Smart ETA Prediction */}
            <motion.div initial={reduceMotion ? false : { opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={reduceMotion ? { duration: 0 } : { duration: 0.55, delay: 0.08 }} className="group relative bg-parchment-warm border border-stone-subtle rounded-3xl overflow-hidden flex flex-col justify-between h-[480px] sm:h-[520px] shadow-xs hover:border-stone-medium transition-colors">
              {/* Background large faint 02 */}
              <div className="absolute -bottom-10 -right-4 text-[220px] font-serif italic text-stone-subtle/30 z-0 select-none pointer-events-none leading-none">
                02
              </div>
              
              <div className="p-8 sm:p-12 relative z-10 flex-1 flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-widest text-sage mb-3">
                  02 &mdash; Smart ETA Prediction
                </div>
                <h3 className="font-serif text-3xl sm:text-4xl text-espresso mb-4">Smart ETA Prediction</h3>
                <p className="text-stone-text text-base leading-relaxed mb-6 max-w-md">
                  Get stop-level arrival times shaped by current bus movement and route conditions.
                </p>
                <div>
                  <Link href="/routes" className="text-sm font-semibold text-espresso group-hover:text-terracotta transition-colors inline-flex items-center gap-1.5">
                    <span>See How It Works</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Reusable Visual Area */}
              <div className="relative h-44 sm:h-52 w-full px-8 sm:px-12 pb-8 z-10">
                <div className="w-full h-full relative rounded-2xl overflow-hidden border border-stone-subtle/60 shadow-sm transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out">
                  <Image 
                    src="/hero-bus.png" 
                    alt="Smart ETA Prediction Demonstration" 
                    fill 
                    className="object-cover object-bottom" 
                  />
                  <div className="absolute inset-0 bg-espresso/5 pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Horizontal Information Strip */}
          <div className="border-t border-stone-subtle pt-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-dark mb-2">Mission</span>
                <p className="text-stone-text text-sm leading-relaxed">Real-time campus visibility.</p>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-dark mb-2">What We Do</span>
                <p className="text-stone-text text-sm leading-relaxed">Stop-level ETA and route tracking.</p>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-dark mb-2">Model</span>
                <p className="text-stone-text text-sm leading-relaxed">Delay-aware arrival prediction.</p>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-dark mb-2">Experience</span>
                <p className="text-stone-text text-sm leading-relaxed">Digital student transit pass.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. REDESIGNED HOW IT WORKS — DARK REFINED SECTION */}
      <section className="bg-espresso text-parchment py-24 my-16 border-y border-stone-dark relative overflow-hidden" id="how-it-works">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="max-w-3xl mb-16 text-center mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest text-terracotta mb-4">
              THE CAMPUSRIDE JOURNEY
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-parchment mb-6">
              Every ride, in motion.
            </h2>
            <p className="text-stone-medium text-base sm:text-lg leading-relaxed">
              From choosing your stop to tracking the bus, CampusRide keeps your daily campus journey clear and predictable.
            </p>
          </div>

          {/* Connected Bus Journey Flow */}
          <div className="relative mb-8 max-w-5xl mx-auto">
            {/* Horizontal Line Connector on Desktop */}
            <div className="hidden md:block absolute top-[120px] left-20 right-20 h-[1px] bg-stone-dark z-0">
              <div className="h-full bg-terracotta w-full origin-left motion-reduce:!animate-none" style={{ animation: 'grow 6s ease-in-out infinite' }}></div>
            </div>

            {/* Three Large Refined Glass-like Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Card 01 */}
              <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }} className="bg-stone-dark/20 border border-stone-dark/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between group hover:border-terracotta/40 transition-colors">
                <div className="absolute -bottom-6 -right-2 text-[140px] font-serif italic text-stone-dark/20 select-none pointer-events-none leading-none z-0">
                  01
                </div>

                <div className="relative z-10">
                  <div className="relative w-12 h-12 rounded-2xl bg-espresso border border-stone-dark flex items-center justify-center text-terracotta mb-8 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">pin_drop</span>
                    <span className="absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-terracotta text-parchment shadow-md" aria-hidden="true">
                      <span className="material-symbols-outlined text-[10px]">directions_bus</span>
                    </span>
                  </div>
                  <span className="text-xs uppercase font-semibold tracking-widest text-stone-medium block mb-2">Step 01</span>
                  <h3 className="font-serif text-2xl text-parchment mb-3">Choose Your Stop</h3>
                  <p className="text-stone-medium text-sm leading-relaxed mb-6">
                    Pick the boarding stop closest to your route.
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-stone-dark/50 flex items-center justify-between text-xs text-stone-medium group-hover:text-terracotta transition-colors">
                  <span>Locate Platforms</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </motion.div>

              {/* Card 02 */}
              <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: 0.12 }} className="bg-stone-dark/20 border border-stone-dark/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between group hover:border-terracotta/40 transition-colors">
                <div className="absolute -bottom-6 -right-2 text-[140px] font-serif italic text-stone-dark/20 select-none pointer-events-none leading-none z-0">
                  02
                </div>

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-espresso border border-stone-dark flex items-center justify-center text-terracotta mb-6 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">my_location</span>
                  </div>
                  <span className="text-xs uppercase font-semibold tracking-widest text-stone-medium block mb-2">Step 02</span>
                  <h3 className="font-serif text-2xl text-parchment mb-3">Find Your Bus</h3>
                  <p className="text-stone-medium text-sm leading-relaxed mb-6">
                    See the approaching shuttle and its live position.
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-stone-dark/50 flex items-center justify-between text-xs text-stone-medium group-hover:text-terracotta transition-colors">
                  <span>Live Telemetry</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </motion.div>

              {/* Card 03 */}
              <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: 0.24 }} className="bg-stone-dark/20 border border-stone-dark/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between group hover:border-terracotta/40 transition-colors">
                <div className="absolute -bottom-6 -right-2 text-[140px] font-serif italic text-stone-dark/20 select-none pointer-events-none leading-none z-0">
                  03
                </div>

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-espresso border border-stone-dark flex items-center justify-center text-terracotta mb-6 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">schedule</span>
                  </div>
                  <span className="text-xs uppercase font-semibold tracking-widest text-stone-medium block mb-2">Step 03</span>
                  <h3 className="font-serif text-2xl text-parchment mb-3">Track Arrival</h3>
                  <p className="text-stone-medium text-sm leading-relaxed mb-6">
                    Follow the ETA and know when it is time to board.
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-stone-dark/50 flex items-center justify-between text-xs text-stone-medium group-hover:text-terracotta transition-colors">
                  <span>Delay Mitigation</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STUDENT DIGITAL PASS CALLOUT */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 mb-20" id="portal">
        <div className="bg-parchment-warm border border-stone-subtle rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xs">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-parchment border border-stone-subtle text-xs font-semibold text-stone-dark mb-4 shadow-2xs">
              <span className="material-symbols-outlined text-sm text-terracotta">contactless</span>
              <span>Apple Wallet &amp; Google Wallet Ready</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-espresso mb-3">
              Add your digital CampusRide Pass in one tap.
            </h2>
            <p className="text-stone-text text-sm sm:text-base leading-relaxed mb-6">
              No separate transit card needed. Tap your phone at any shuttle sensor or present your digital QR code to evening SafeRide captains.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" className="px-5 py-2.5 rounded-xl bg-espresso text-parchment text-sm font-semibold hover:bg-stone-dark transition-colors flex items-center gap-2 shadow-xs">
                <span className="material-symbols-outlined text-base">add_to_home_screen</span>
                <span>Add to Student Wallet</span>
              </Link>
              <Link href="/login" className="px-5 py-2.5 rounded-xl bg-parchment border border-stone-subtle text-espresso text-sm font-semibold hover:bg-parchment-deep/50 transition-colors">
                Sign in with Campus SSO
              </Link>
            </div>
          </div>

          {/* Tactile Card Graphic */}
          <button type="button" onClick={() => setShowPass(true)} className="w-full md:w-80 text-left bg-parchment border border-stone-subtle p-6 rounded-2xl shadow-xs shrink-0 font-sans cursor-pointer hover:border-terracotta transition-colors" aria-label="Open CampusRide pass">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="font-serif italic font-medium text-lg text-espresso">CampusRide</div>
                <div className="text-[10px] uppercase tracking-wider text-stone-text">All-Access Student Transit</div>
              </div>
              <span className="material-symbols-outlined text-2xl text-terracotta">qr_code_2</span>
            </div>
            <div className="space-y-1 mb-6">
              <div className="text-xs text-stone-text uppercase tracking-widest text-[10px]">Student Holder</div>
              <div className="font-medium text-espresso text-sm">{userName}</div>
              <div className="text-xs text-sage font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage"></span> Verified Active Fall &rsquo;25
              </div>
            </div>
            <div className="pt-3 border-t border-stone-subtle flex justify-between items-center text-[10px] text-stone-text">
              <span>Tap to Board Any Shuttle</span>
              <span className="font-mono font-semibold">NFC ACTIVE</span>
            </div>
          </button>
        </div>
      </section>

      {showPass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-espresso/55 p-4" onClick={() => setShowPass(false)}>
          <div className="relative max-h-[92vh] max-w-[95vw]" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowPass(false)} className="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-espresso shadow-lg" aria-label="Close pass">
              <X className="h-4 w-4" />
            </button>
            <TransitSmartCard userName={userName} dynamicEta={activeBus?.etaMinutes ?? 0} />
          </div>
        </div>
      )}
    </main>
  )
}
