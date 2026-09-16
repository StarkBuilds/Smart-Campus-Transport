"use client"

// Hero section — the very first thing a judge sees
// Full-screen dark background with animated orbs, floating bus card, and a bold headline
// The map preview in the hero gives an immediate visual hint of what the product does

import { useEffect, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, MapPin, Clock, AlertTriangle, CheckCircle2, Wifi } from "lucide-react"
import TiltCard from "@/components/common/TiltCard"

// Stagger animation helper — each child fades and slides up in sequence
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
})

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
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

        {/* Right — floating 3D dashboard card preview */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
          className="hidden lg:flex justify-center"
        >
          <TiltCard
            intensity={12}
            className="w-full max-w-md rounded-2xl glass-strong border border-cyan-400/20 p-6 glow-cyan"
          >
            {/* Mini dashboard preview card */}
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Bus B01 · Route R01</p>
                  <p className="font-semibold text-white mt-0.5">Tollygunge → Campus</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">3 min late</span>
                </div>
              </div>

              {/* Fake mini map */}
              <div className="relative h-44 rounded-xl overflow-hidden bg-[#0a1628] border border-white/5">
                {/* Grid lines to simulate map */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(rgba(0,200,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "30px 30px",
                  }}
                />
                {/* Simulated route line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 176">
                  <path
                    d="M 40 140 Q 100 120 160 100 Q 220 80 280 60 Q 330 45 370 30"
                    fill="none"
                    stroke="rgba(0,200,255,0.6)"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  {/* Stop dots */}
                  {[
                    { cx: 40, cy: 140 }, { cx: 120, cy: 110 }, { cx: 200, cy: 82 },
                    { cx: 280, cy: 58 }, { cx: 370, cy: 30 },
                  ].map((dot, i) => (
                    <circle key={i} cx={dot.cx} cy={dot.cy} r="5" fill="rgba(0,200,255,0.4)" stroke="rgba(0,200,255,0.8)" strokeWidth="1.5" />
                  ))}
                  {/* Bus position */}
                  <circle cx="200" cy="82" r="8" fill="#00C8FF" className="animate-[bus-bounce_2s_ease-in-out_infinite]" />
                  <circle cx="200" cy="82" r="16" fill="rgba(0,200,255,0.15)" />
                </svg>
                {/* Live badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-live" />
                  <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Clock, label: "ETA", value: "12 min", color: "text-cyan-400" },
                  { icon: MapPin, label: "Next Stop", value: "Majerhat", color: "text-violet-400" },
                  { icon: Wifi, label: "Signal", value: "Strong", color: "text-emerald-400" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className={`text-xs font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Animated border glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: "1px solid transparent",
                background: "linear-gradient(#0D1421, #0D1421) padding-box, linear-gradient(135deg, rgba(0,200,255,0.4), rgba(124,58,237,0.2), rgba(0,200,255,0.1)) border-box",
              }}
            />
          </TiltCard>
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
