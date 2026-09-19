"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { GraduationCap, Users, Award } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

interface StatConfig {
  target: number
  label: string
  prefix?: string
  suffix?: string
  decimals?: number
}

const STATS_CONFIG: StatConfig[] = [
  { target: 2400, suffix: "+", label: "Students Served", decimals: 0 },
  { target: 8, label: "Bus Routes", decimals: 0 },
  { target: 99.2, suffix: "%", label: "Uptime", decimals: 1 },
  { target: 30, prefix: "< ", suffix: "s", label: "GPS Update Rate", decimals: 0 },
]

function DynamicStatCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  isInView,
}: {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  isInView: boolean
}) {
  const [displayValue, setDisplayValue] = useState<string>(
    decimals > 0 ? (0).toFixed(decimals) : "0"
  )

  useEffect(() => {
    if (!isInView) return

    let startTime: number | null = null
    const duration = 1800 // 1.8 seconds smooth roll-up
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic: fast start, soft deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentVal = easeProgress * target

      const formatted =
        decimals > 0
          ? currentVal.toFixed(decimals)
          : Math.floor(currentVal).toLocaleString()

      setDisplayValue(formatted)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        const finalFormatted =
          decimals > 0 ? target.toFixed(decimals) : target.toLocaleString()
        setDisplayValue(finalFormatted)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isInView, target, decimals])

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

export default function About() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="about" ref={ref} className="relative py-28 px-5">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div className="flex flex-col gap-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase"
          >
            About the Project
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-white leading-tight"
          >
            Built for{" "}
            <span className="text-gradient-cyan">{CAMPUS.short}</span>,
            <br />by students who missed buses
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-muted-foreground leading-relaxed"
          >
            CampusRide started as a frustration. Students at{" "}
            <span className="text-white font-medium">{CAMPUS.name}</span> had no idea
            when their college bus would arrive — or if it was stuck in Khidderpore
            traffic. This platform changes that.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-muted-foreground leading-relaxed"
          >
            We pair GPS telemetry from the bus with a machine learning model trained
            on Kolkata traffic patterns to give you predictions that actually make sense
            — not just raw numbers from a GPS chip.
          </motion.p>

          {/* Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            {[
              { icon: GraduationCap, text: "Designed for college campus bus routes" },
              { icon: Users,         text: "Works for students AND drivers, separately" },
              { icon: Award,         text: "Cognizant NPN AIA Hackathon 2026 Project" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {STATS_CONFIG.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="glass-strong rounded-2xl border border-cyan-400/15 p-8 flex flex-col gap-2 relative overflow-hidden group hover:border-cyan-400/30 transition-all"
            >
              <div className="text-4xl font-bold text-gradient-cyan">
                <DynamicStatCounter
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  isInView={isInView}
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
