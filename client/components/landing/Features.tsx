"use client"

// Features section — Architectural Fleet Intelligence Grid
// Multi-tonal luxury editorial palette (Soft Blue, Lilac, Champagne Gold, Sage, Terracotta)
// Cures "flatness" with rich, harmonious light color transitions

import React from "react"
import { motion } from "framer-motion"
import {
  MapPin, Brain, Bell, Route, Clock, ShieldCheck,
  Cpu, Radio, Compass, ArrowUpRight, Zap
} from "lucide-react"

const CAPABILITIES = [
  {
    icon: Radio,
    tag: "HARDWARE TELEMETRY",
    tagColor: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    cardBg: "bg-[#F4F8FD] border-[#D9E6F7]",
    hoverBorder: "hover:border-[#93C5FD]",
    iconBg: "bg-[#DBEAFE] text-[#1D4ED8]",
    title: "Sub-3s Telemetry Pipeline",
    description:
      "Dual-channel GPS hardware transmitting continuous NMEA coordinates via WebSocket. Sub-3-second pings ensure zero-lag vehicle interpolation on the campus map.",
    metric: "< 2.8s",
    metricLabel: "WebSocket Latency",
  },
  {
    icon: Brain,
    tag: "MACHINE LEARNING",
    tagColor: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]",
    cardBg: "bg-[#F9F5FD] border-[#EDE4F9]",
    hoverBorder: "hover:border-[#D8B4FE]",
    iconBg: "bg-[#F3E8FF] text-[#7E22CE]",
    title: "XGBoost Delay Forecasting",
    description:
      "Trained on Kolkata South arterial traffic patterns. Predicts arrival times factoring Taratala flyover jams, rain index, and morning school-rush hour curves.",
    metric: "87%",
    metricLabel: "Model Confidence",
  },
  {
    icon: Bell,
    tag: "GEO-FENCING",
    tagColor: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    cardBg: "bg-[#FCF9EE] border-[#F2ECCF]",
    hoverBorder: "hover:border-[#FCD34D]",
    iconBg: "bg-[#FEF3C7] text-[#B45309]",
    title: "500m Smart Proximity Push",
    description:
      "Automated radial geo-fencing triggers native browser push notifications when Bus B01 approaches your stop. Eliminates excessive curbside wait times.",
    metric: "500m",
    metricLabel: "Radial Trigger",
  },
  {
    icon: Route,
    tag: "DYNAMIC ROUTING",
    tagColor: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    cardBg: "bg-[#F2FAF5] border-[#D6EFE0]",
    hoverBorder: "hover:border-[#86EFAC]",
    iconBg: "bg-[#D1FAE5] text-[#047857]",
    title: "Intelligent Jam Detours",
    description:
      "When severe congestion paralyzes Diamond Harbour Road, the routing engine highlights alternate arterial corridors with recalculated arrival ETAs.",
    metric: "22 Segments",
    metricLabel: "Corridor Mesh",
  },
  {
    icon: ShieldCheck,
    tag: "STUDENT IDENTITY",
    tagColor: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
    cardBg: "bg-[#FCF5EE] border-[#F3E5D4]",
    hoverBorder: "hover:border-[#FDBA74]",
    iconBg: "bg-[#FFEDD5] text-[#C2410C]",
    title: "3D Verified Transit Pass",
    description:
      "Interactive 3D digital pass featuring holographic tilt physics, dynamic QR authentication, and STCET student credential verification for secure boarding.",
    metric: "100%",
    metricLabel: "Tamper Proof",
  },
  {
    icon: Clock,
    tag: "DISPATCH AUDIT",
    tagColor: "bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]",
    cardBg: "bg-[#F8F7F3] border-[#E3DDD2]",
    hoverBorder: "hover:border-[#94A3B8]",
    iconBg: "bg-[#E2E8F0] text-[#1E293B]",
    title: "Schedule Punctuality Engine",
    description:
      "Every leg of Route R01 is logged against institutional timetables. Admin telemetry charts historic variance to optimize college bus dispatch frequencies.",
    metric: "99.2%",
    metricLabel: "Fleet Uptime",
  },
]

export default function Features() {
  return (
    <section id="features" className="relative py-24 px-5 bg-gradient-to-b from-[#EFECE6] via-[#FAF8F5] to-[#F5F2EB] border-t border-[#DDD7CB]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E40AF]">
              Core Fleet Engineering
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight leading-tight">
            Engineered for real campus transit,{" "}
            <span className="bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#B45309] bg-clip-text text-transparent">
              not simulated slides.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-[#57534E] mt-3 leading-relaxed">
            Every feature is tailor-made to solve the concrete daily transportation hurdles faced by St. Thomas&apos; College students and drivers.
          </p>
        </div>

        {/* Feature Grid with Multi-Tonal Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`group relative flex flex-col justify-between p-7 rounded-3xl ${item.cardBg} border ${item.hoverBorder} hover:shadow-[0_16px_36px_rgba(120,113,108,0.12)] hover:-translate-y-1 transition-all duration-300`}
              >
                <div>
                  {/* Top Bar: Icon + Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg} shadow-2xs`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-bold text-[#1C1917] mb-2 group-hover:text-[#1D4ED8] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#57534E] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Metric Pill */}
                <div className="flex items-center justify-between pt-5 mt-6 border-t border-black/[0.06]">
                  <div>
                    <span className="text-lg font-mono font-extrabold text-[#1C1917]">{item.metric}</span>
                    <span className="text-xs text-[#78716C] ml-2">{item.metricLabel}</span>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-white/90 border border-[#DDD7CB] flex items-center justify-center text-[#78716C] group-hover:text-[#1D4ED8] group-hover:border-[#93C5FD] transition-all shadow-2xs">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
