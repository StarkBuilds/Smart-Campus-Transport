"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Briefcase, Code, MapPin as LocationPin, Sparkles } from "lucide-react"

const ROLES = [
  {
    title: "Frontend Engineer",
    type: "Full-Time · Remote",
    icon: Code,
    description: "Build the next generation of real-time transport UIs using React, Next.js, and MapLibre GL.",
  },
  {
    title: "ML Engineer",
    type: "Full-Time · Hybrid",
    icon: Sparkles,
    description: "Train and improve our delay prediction models using real Kolkata traffic telemetry data.",
  },
  {
    title: "Operations Partner",
    type: "Contract · On-Site",
    icon: LocationPin,
    description: "Help us onboard college transport departments and ensure smooth GPS hardware installation.",
  },
]

export default function Careers() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="careers" ref={ref} className="relative py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase mb-4"
          >
            Careers
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Join the{" "}
            <span className="text-gradient-cyan">team</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-md mx-auto"
          >
            We&apos;re a small team solving a real problem for tens of thousands of students across Kolkata.
          </motion.p>
        </div>

        <div className="flex flex-col gap-4">
          {ROLES.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.15 }}
              className="glass border border-white/5 rounded-2xl p-6 flex items-center gap-5 group hover:border-cyan-400/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
                <role.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white">{role.title}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                    {role.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
              <a
                href="#contact"
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-400/30 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-cyan-400/10 transition-all duration-200"
              >
                Apply →
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
