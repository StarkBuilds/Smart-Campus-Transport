"use client"

// Features section — 6 cards with icons, descriptions, and hover tilt
// Uses Intersection Observer to trigger entrance animations when scrolled into view

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  MapPin, Brain, Bell, Route, Clock, ShieldCheck,
} from "lucide-react"
import TiltCard from "@/components/common/TiltCard"

const FEATURES = [
  {
    icon: MapPin,
    color: "cyan",
    title: "Real-Time GPS Tracking",
    description:
      "See exactly where your bus is right now on a live map. Updates every 30 seconds from the bus's GPS unit. No guessing, no waiting in the dark.",
  },
  {
    icon: Brain,
    color: "violet",
    title: "ML-Powered Delay Prediction",
    description:
      "Our machine learning model analyzes traffic patterns, time of day, and historical data to predict delays before they happen — up to 87% accuracy.",
  },
  {
    icon: Bell,
    color: "amber",
    title: "Smart Arrival Alerts",
    description:
      "Get a browser notification the moment your bus enters a 500m radius of your stop. Never miss your bus by standing outside too early or too late.",
  },
  {
    icon: Route,
    color: "emerald",
    title: "Driver Route Intelligence",
    description:
      "Drivers see live traffic overlays and alternate route suggestions. When there's a jam on Diamond Harbour Road, the app knows a better way.",
  },
  {
    icon: Clock,
    color: "pink",
    title: "Schedule Adherence Tracking",
    description:
      "Every trip is logged against the schedule. Students and admins can see how punctual each route was over time through simple analytics charts.",
  },
  {
    icon: ShieldCheck,
    color: "blue",
    title: "Role-Based Access",
    description:
      "Students see their bus's ETA. Drivers see their pickup route. Admins see everything. One platform, tailored to each user's needs.",
  },
]

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  cyan:   { bg: "bg-cyan-400/10",   icon: "text-cyan-400",   border: "border-cyan-400/20" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-400", border: "border-violet-500/20" },
  amber:  { bg: "bg-amber-400/10",  icon: "text-amber-400",  border: "border-amber-400/20" },
  emerald:{ bg: "bg-emerald-400/10",icon: "text-emerald-400",border: "border-emerald-400/20" },
  pink:   { bg: "bg-pink-400/10",   icon: "text-pink-400",   border: "border-pink-400/20" },
  blue:   { bg: "bg-blue-400/10",   icon: "text-blue-400",   border: "border-blue-400/20" },
}

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section id="features" ref={sectionRef} className="relative py-28 px-5">
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase mb-4"
          >
            Why CampusRide
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5"
          >
            Everything you need,{" "}
            <span className="text-gradient-cyan">nothing you don&apos;t</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            Built specifically for college campus transport — not a generic solution
            bolted onto a transit system that doesn&apos;t fit your needs.
          </motion.p>
        </div>

        {/* Feature cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => {
            const colors = colorMap[feat.color]
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              >
                <TiltCard
                  intensity={10}
                  className={`h-full glass rounded-2xl border ${colors.border} p-6 flex flex-col gap-4`}
                >
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                    <feat.icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="font-semibold text-white text-lg">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
                </TiltCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
