"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { GraduationCap, Users, Award } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

const STATS = [
  { value: "2,400+", label: "Students Served" },
  { value: "8", label: "Bus Routes" },
  { value: "99.2%", label: "Uptime" },
  { value: "< 30s", label: "GPS Update Rate" },
]

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
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="glass-strong rounded-2xl border border-cyan-400/15 p-8 flex flex-col gap-2"
            >
              <span className="text-4xl font-bold text-gradient-cyan">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
