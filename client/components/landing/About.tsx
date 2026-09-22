"use client"

// About section — Institutional Context & Architecture Spotlight
// Warm French Linen & Champagne Stone Canvas (#FAF8F5 to #F5F2EB)
// Highlights Frontend Lead & UI/UX Architect Sohom Giri

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { GraduationCap, Users, Award, ShieldCheck, Sparkles, MapPin } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

interface StatConfig {
  target: number
  label: string
  prefix?: string
  suffix?: string
  decimals?: number
  cardBg: string
  borderColor: string
  textColor: string
}

const STATS_CONFIG: StatConfig[] = [
  {
    target: 2400,
    suffix: "+",
    label: "STCET Students Served",
    decimals: 0,
    cardBg: "bg-[#FFFBEB]",
    borderColor: "border-[#FDE68A]",
    textColor: "text-[#92400E]",
  },
  {
    target: 8,
    label: "Active Bus Routes",
    decimals: 0,
    cardBg: "bg-[#EFF6FF]",
    borderColor: "border-[#BFDBFE]",
    textColor: "text-[#1E40AF]",
  },
  {
    target: 99.2,
    suffix: "%",
    label: "Fleet On-Time Index",
    decimals: 1,
    cardBg: "bg-[#ECFDF5]",
    borderColor: "border-[#A7F3D0]",
    textColor: "text-[#065F46]",
  },
  {
    target: 2.8,
    prefix: "< ",
    suffix: "s",
    label: "Live Telemetry Interval",
    decimals: 1,
    cardBg: "bg-[#FFF7ED]",
    borderColor: "border-[#FED7AA]",
    textColor: "text-[#9A3412]",
  },
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
    const duration = 1800
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
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
    <section id="about" ref={ref} className="relative py-24 px-5 bg-gradient-to-b from-[#EAE5DC] via-[#FAF8F5] to-[#F5F2EB] border-t border-[#DDD7CB]">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Col — Institutional Story & Leadership (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B45309]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#92400E]">
              Institutional Roots &amp; Context
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight leading-tight">
            Built for{" "}
            <span className="bg-gradient-to-r from-[#1E40AF] via-[#7C3AED] to-[#B45309] bg-clip-text text-transparent">
              {CAMPUS.short} Kolkata
            </span>
            , by engineers who commute.
          </h2>

          <p className="text-base text-[#57534E] leading-relaxed">
            St. Thomas&apos; College of Engineering and Technology sits at the bustling junction of Khidderpore and Diamond Harbour Road. Daily commuters endure intense bottlenecks along Taratala, Majerhat, and New Alipore. CampusRide replaces uncertainty with mathematical precision.
          </p>

          {/* Key Pillars */}
          <div className="flex flex-col gap-3.5 pt-2">
            {[
              {
                icon: GraduationCap,
                title: "Designed specifically for STCET campus mobility",
                desc: "Integrated with college class schedules, morning gate openings, and designated student boarding zones.",
              },
              {
                icon: Users,
                title: "Dual perspective: Students & Drivers",
                desc: "Students receive transparent arrival ETAs; drivers get turn-by-turn route intelligence avoiding bottlenecks.",
              },
              {
                icon: ShieldCheck,
                title: "Frontend Lead & UI/UX Architecture",
                desc: "Engineered by Sohom Giri (STCET CSE) — featuring responsive 3D transit pass verification and sub-second WebSocket telemetry rendering.",
              },
            ].map((pillar) => {
              const Icon = pillar.icon
              return (
                <div key={pillar.title} className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-[#DDD7CB] shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center shrink-0 text-[#B45309]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1C1917]">{pillar.title}</h4>
                    <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Col — Verified Stats Grid with Distinct Color Personality (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {STATS_CONFIG.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className={`p-6 rounded-3xl ${stat.cardBg} border ${stat.borderColor} flex flex-col justify-between shadow-[0_4px_16px_rgba(120,113,108,0.06)] hover:shadow-md transition-all`}
            >
              <span className={`text-3xl sm:text-4xl font-extrabold font-mono ${stat.textColor}`}>
                <DynamicStatCounter
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  isInView={isInView}
                />
              </span>
              <p className="text-xs font-semibold text-[#57534E] mt-3">{stat.label}</p>
            </motion.div>
          ))}

          {/* Campus Location Card in Warm Slate */}
          <div className="col-span-2 p-5 rounded-3xl bg-white border border-[#DDD7CB] flex items-center gap-4 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-[#1C1917] text-[#FAF8F5] flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-[#1C1917]">4, Diamond Harbour Road, Kidderpore</p>
              <p className="text-[#78716C] mt-0.5">Kolkata, West Bengal 700023</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
