"use client"

// Pricing section — 3 tiers (Free, College, Enterprise)
// This is a real SaaS product concept, which makes it look commercially viable

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Check } from "lucide-react"
import TiltCard from "@/components/common/TiltCard"
import { cn } from "@/lib/utils"

const PLANS = [
  {
    name: "Student",
    price: "Free",
    period: "",
    description: "For individual students tracking their campus bus.",
    features: [
      "Live bus location on map",
      "ETA to your stop",
      "Arrival notifications",
      "Delay status badge",
      "1 route tracking",
    ],
    cta: "Get Started Free",
    href: "/register",
    highlight: false,
  },
  {
    name: "College",
    price: "₹2,999",
    period: "/ month",
    description: "For the entire college — all buses, all students, all drivers.",
    features: [
      "Everything in Student",
      "All routes & all buses",
      "Driver portal access",
      "ML delay predictions",
      "Analytics dashboard",
      "Admin panel",
      "Traffic overlay",
      "Priority support",
    ],
    cta: "Contact College Admin",
    href: "#contact",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For universities, transport authorities, or multiple campuses.",
    features: [
      "Everything in College",
      "Multi-campus support",
      "Custom ML model training",
      "API access",
      "White-label option",
      "Dedicated infrastructure",
      "SLA guarantee",
    ],
    cta: "Talk to Us",
    href: "#contact",
    highlight: false,
  },
]

export default function Pricing() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="pricing" ref={ref} className="relative py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase mb-4"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white"
          >
            Simple,{" "}
            <span className="text-gradient-cyan">transparent pricing</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.15 }}
            >
              <TiltCard
                intensity={8}
                className={cn(
                  "h-full flex flex-col rounded-2xl border p-8 relative overflow-hidden",
                  plan.highlight
                    ? "glass-strong border-cyan-400/30 glow-cyan"
                    : "glass border-white/5"
                )}
              >
                {plan.highlight && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-cyan-400 text-[#060B18] text-xs font-bold">
                    Popular
                  </div>
                )}

                <div className="flex flex-col gap-4 mb-8">
                  <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-4xl font-bold", plan.highlight ? "text-cyan-400" : "text-white")}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  className={cn(
                    "block text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    plan.highlight
                      ? "bg-cyan-400 text-[#060B18] hover:bg-cyan-300"
                      : "border border-white/10 text-white hover:border-cyan-400/30 hover:bg-white/5"
                  )}
                >
                  {plan.cta}
                </a>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
