"use client"

// Hero section — Luxury Editorial Beige & Light Mobility Showcase
// Features:
// 1. Soft French Linen & Warm Alabaster canvas with warm diffuse lighting (no harsh math grid)
// 2. High-fashion balanced typography with clean line breaks and royal-to-bronze gradient
// 3. Tactile Stitch transit advisory bulletin & luxury dark espresso primary CTA
// 4. Seamless toggle: Campus Wayfinding Canvas <-> 3D Student Smart Pass (Sohom Giri)

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Navigation, CreditCard, SunMedium, Compass, ShieldCheck } from "lucide-react"
import TransitSmartCard from "@/components/landing/TransitSmartCard"
import WayfindingRadar from "@/components/landing/WayfindingRadar"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: "easeOut" as const },
})

export default function Hero() {
  const [heroView, setHeroView] = useState<"radar" | "card">("radar")

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-24 pb-16 bg-gradient-to-b from-[#F6F4EE] via-[#FAF8F5] to-[#F5F2EB]">
      {/* ── Soft Ambient Warm Lighting Washes (No harsh grid lines) ── */}
      <div className="absolute top-[-5%] left-[-8%] w-[600px] h-[600px] rounded-full bg-[#FEF3C7]/40 blur-3xl pointer-events-none" />
      <div className="absolute top-[10%] right-[-6%] w-[550px] h-[550px] rounded-full bg-[#FDE68A]/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[25%] w-[500px] h-[500px] rounded-full bg-[#FFEDD5]/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* ═════════ LEFT: HEADLINE, ADVISORY & CTAs (6 COLS) ═════════ */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Institutional Telemetry Badge */}
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 border border-[#DDD7CB] text-xs font-medium shadow-[0_2px_10px_rgba(0,0,0,0.03)] backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
              <span className="text-[#1C1917] font-mono tracking-wider text-[11px] font-bold">
                FLEET TELEMETRY ACTIVE
              </span>
              <span className="text-[#D6CEBF]">·</span>
              <span className="text-[#78716C] font-mono text-[11px]">STCET Khidderpore Campus</span>
            </div>
          </motion.div>

          {/* Balanced Luxury Headline */}
          <motion.h1 {...fadeUp(0.2)} className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.14] tracking-tight text-[#1C1917]">
            Next-Gen Campus Transit.{" "}
            <span className="block mt-1 bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#92400E] bg-clip-text text-transparent pb-1">
              Live Arrival &amp; Delay AI.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p {...fadeUp(0.3)} className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl font-normal">
            Engineered specifically for St. Thomas&apos; College of Engineering &amp; Technology. High-frequency GPS telemetry, designated student boarding stops, and sub-30-second arrival forecasts across South Kolkata.
          </motion.p>

          {/* Stitch Warm Transit Bulletin Card */}
          <motion.div {...fadeUp(0.4)} className="flex items-center gap-4 p-4 rounded-2xl bg-white/90 border border-[#E2DCD2] text-[#1C1917] shadow-[0_4px_20px_rgba(120,113,108,0.06)] max-w-lg backdrop-blur-sm">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center shrink-0 shadow-2xs">
              <SunMedium className="w-5 h-5 text-[#B45309]" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[#1C1917] font-bold">Campus Climate &amp; Transit Advisory</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">OPTIMAL</span>
              </div>
              <p className="text-[#57534E] text-[11px]">
                28°C Kolkata · Taratala Flyover free-flowing at 34 km/h · Morning class intake synchronized.
              </p>
            </div>
          </motion.div>

          {/* High-End CTAs */}
          <motion.div {...fadeUp(0.5)} className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 px-7 py-3.5 bg-[#1C1917] hover:bg-[#292524] text-[#FAF8F5] font-bold rounded-2xl transition-all duration-200 shadow-[0_4px_16px_rgba(28,25,23,0.18)] text-sm hover:shadow-[0_8px_26px_rgba(28,25,23,0.28)] hover:-translate-y-0.5"
            >
              <span>Open Live Tracking Map</span>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/driver"
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#292524] bg-white border border-[#DDD7CB] rounded-2xl hover:bg-[#F6F4EE] hover:border-[#CBD5E1] transition-all duration-200 shadow-2xs"
            >
              Driver Navigation Console
            </Link>
          </motion.div>

          {/* Key Metrics Row */}
          <motion.div {...fadeUp(0.6)} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E5DFD5]">
            {[
              { value: "6", label: "Designated Stops" },
              { value: "< 3s", label: "Telemetry Ping" },
              { value: "87%", label: "ML Confidence" },
              { value: "R01", label: "Khidderpore Route" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold font-mono text-[#1C1917]">{stat.value}</span>
                <span className="text-[11px] text-[#78716C] mt-0.5 font-medium">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ═════════ RIGHT: DUAL-MODE VISUAL CONTAINER (6 COLS) ═════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="lg:col-span-6 flex flex-col items-center justify-center w-full"
        >
          {/* Segmented Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#EFECE6] border border-[#DDD7CB] mb-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setHeroView("radar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                heroView === "radar"
                  ? "bg-[#1C1917] text-white shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF8F5]"
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Campus Wayfinding Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => setHeroView("card")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                heroView === "card"
                  ? "bg-gradient-to-r from-[#1E40AF] to-[#B45309] text-white shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF8F5]"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-300" />
              <span>3D Student Pass (Sohom Giri)</span>
            </button>
          </div>

          {/* Animated Viewport */}
          <div className="w-full flex justify-center items-center min-h-[440px]">
            <AnimatePresence mode="wait">
              {heroView === "radar" ? (
                <motion.div
                  key="wayfinding-radar"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <WayfindingRadar onSwitchToCard={() => setHeroView("card")} />
                </motion.div>
              ) : (
                <motion.div
                  key="transit-smart-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex justify-center"
                >
                  <TransitSmartCard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
