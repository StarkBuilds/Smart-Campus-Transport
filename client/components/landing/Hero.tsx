"use client"

// Hero section — the very first thing a judge sees
// Full-screen dark background with animated orbs, floating bus card, and a bold headline
// The map preview in the hero gives an immediate visual hint of what the product does

import { useEffect, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import TransitSmartCard from "@/components/landing/TransitSmartCard"
import ParticleCanvas from "@/components/landing/ParticleCanvas"

// Stagger animation helper — each child fades and slides up in sequence
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
})

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Interactive ambient particle canvas field */}
      <ParticleCanvas />

      {/* Animated background orbs — give the page atmosphere */}
      <div className="orb w-[600px] h-[600px] -top-40 -left-40 bg-cyan-500/10 animate-[orb-drift-1_12s_ease-in-out_infinite]" />
      <div className="orb w-[500px] h-[500px] -bottom-40 -right-20 bg-violet-600/10 animate-[orb-drift-2_15s_ease-in-out_infinite]" />
      <div className="orb w-[300px] h-[300px] top-1/2 left-1/3 bg-emerald-500/5 animate-[orb-drift-1_20s_ease-in-out_infinite_reverse]" />

      {/* Grid overlay for that techy look */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — headline and CTAs */}
        <div className="flex flex-col gap-8">
          {/* Institutional telemetry badge */}
          <motion.div {...fadeUp(0.1)} className="flex">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full glass border border-cyan-400/25 text-xs font-medium shadow-[0_0_20px_rgba(0,200,255,0.1)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live shadow-[0_0_8px_#10B981]" />
              <span className="text-cyan-400 font-mono tracking-wider text-[11px] font-semibold">FLEET TELEMETRY ACTIVE</span>
              <span className="text-white/40">·</span>
              <span className="text-white/80 font-mono text-[11px]">STCET Khidderpore</span>
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.h1 {...fadeUp(0.2)} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-tight text-white">
            Real-Time Campus Transit Intelligence &{" "}
            <span className="text-gradient-cyan">ML Delay Forecasting.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p {...fadeUp(0.35)} className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-normal">
            Engineered specifically for St. Thomas&apos; College of Engineering &amp; Technology. High-frequency GPS telemetry, designated student boarding stops, and sub-30-second arrival predictions across Kolkata.
          </motion.p>

          {/* CTA buttons */}
          <motion.div {...fadeUp(0.5)} className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 px-7 py-3.5 bg-cyan-400 text-[#060B18] font-bold rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan text-sm shadow-[0_0_25px_rgba(0,200,255,0.4)]"
            >
              Open Live Tracking Map
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/driver"
              className="flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white/90 border border-white/15 rounded-xl hover:border-cyan-400/50 hover:bg-white/5 transition-all duration-200"
            >
              Driver Navigation Console
            </Link>
          </motion.div>

          {/* Trust stats */}
          <motion.div {...fadeUp(0.65)} className="grid grid-cols-3 sm:grid-cols-4 gap-6 pt-3 border-t border-white/10">
            {[
              { value: "6", label: "Designated Stops" },
              { value: "< 3s", label: "Telemetry Ping" },
              { value: "87%", label: "ML Confidence" },
              { value: "R01", label: "Khidderpore Route" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">{stat.value}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — 3D Transit Smart Card with PrepPass tilt & click-to-flip */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
          className="flex justify-center items-center"
        >
          <TransitSmartCard />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent" />
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Scroll</span>
      </motion.div>
    </section>
  )
}
