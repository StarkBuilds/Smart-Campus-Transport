"use client"

// How It Works — 3 step process with animated connector line between steps
// Clean, minimal, explains the flow without overwhelming the reader

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { UserCircle, MapPinned, BellRing } from "lucide-react"

const STEPS = [
  {
    step: "01",
    icon: UserCircle,
    title: "Create Your Account",
    description:
      "Sign up as a student or driver. Students select their pickup stop. Drivers are assigned their bus and route by the admin.",
  },
  {
    step: "02",
    icon: MapPinned,
    title: "Watch the Map",
    description:
      "Your dashboard shows the live map with your bus moving in real time. See traffic overlays, next stop ETA, and how many minutes ahead or behind the schedule the bus is.",
  },
  {
    step: "03",
    icon: BellRing,
    title: "Never Miss Your Bus",
    description:
      "When your bus is 500m away, you get an instant notification. No app installation needed — it works right in your browser.",
  },
]

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="how-it-works" ref={ref} className="relative py-28 px-5 overflow-hidden">
      {/* Background accent */}
      <div className="orb w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-violet-600/5" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Heading */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase mb-4"
          >
            Simple Process
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-white"
          >
            Up and running in{" "}
            <span className="text-gradient-cyan">3 steps</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="relative flex flex-col md:flex-row gap-10 md:gap-4 items-start">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%-1px)] right-[calc(16.67%+1px)] h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="origin-left h-full bg-gradient-to-r from-cyan-400/50 via-violet-400/50 to-cyan-400/50"
            />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.2, duration: 0.6 }}
              className="flex-1 flex flex-col items-center text-center gap-5"
            >
              {/* Icon circle */}
              <div className="relative w-16 h-16 rounded-2xl glass border border-cyan-400/20 flex items-center justify-center flex-shrink-0 glow-cyan">
                <step.icon className="w-7 h-7 text-cyan-400" />
                {/* Step number */}
                <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-cyan-400 text-[#060B18] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground font-mono">Step {step.step}</p>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
