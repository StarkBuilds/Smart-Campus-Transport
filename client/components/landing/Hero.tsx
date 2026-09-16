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
          {/* Live badge */}
          <motion.div {...fadeUp(0.1)} className="flex">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyan-400/20 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live" />
              <span className="text-emerald-400">LIVE TRACKING ACTIVE</span>
              <span className="text-muted-foreground">· STCET Campus</span>
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.h1 {...fadeUp(0.2)} className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            Know When Your{" "}
            <span className="text-gradient-cyan">Bus Arrives.</span>
            {" "}Before It Does.
          </motion.h1>

          {/* Subheading */}
          <motion.p {...fadeUp(0.35)} className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            Real-time GPS tracking for STCET campus buses. ML-powered delay predictions.
            Students know their ETA. Drivers know their route. Everyone stays on time.
          </motion.p>

          {/* CTA buttons */}
          <motion.div {...fadeUp(0.5)} className="flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-7 py-3.5 bg-cyan-400 text-[#060B18] font-semibold rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan text-sm"
            >
              Track Your Bus Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-white border border-white/10 rounded-xl hover:border-cyan-400/40 hover:bg-white/5 transition-all duration-200"
            >
              Driver Portal
            </Link>
          </motion.div>

          {/* Trust stats */}
          <motion.div {...fadeUp(0.65)} className="flex items-center gap-8 pt-2">
            {[
              { value: "6", label: "Bus Stops" },
              { value: "< 30s", label: "Update Rate" },
              { value: "87%", label: "ML Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-2xl font-bold text-cyan-400">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
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
