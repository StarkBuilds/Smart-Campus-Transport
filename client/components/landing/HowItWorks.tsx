"use client"

// HowItWorks — 3-Step Guided Transit Workflow
// Warm Sand & Cashmere Stone Palette (#F5F2EB to #EAE5DC)
// Cures flatness with distinct step card personalities & warm stone canvas

import React from "react"
import { motion } from "framer-motion"
import { UserCheck, Radio, BellRing, ArrowRight, CheckCircle2, QrCode } from "lucide-react"

const STEPS = [
  {
    step: "01",
    icon: UserCheck,
    title: "Credential Pairing & Stop Setup",
    subtitle: "Under 1 minute setup",
    description:
      "Log into your student account and select your designated boarding point along Route R01 (e.g. Behala Chowrasta or Taratala). Your verified STCET 3D digital pass is generated automatically.",
    badge: "Student Onboarding",
    badgeColor: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    iconBg: "bg-[#FEF3C7] text-[#B45309]",
  },
  {
    step: "02",
    icon: Radio,
    title: "Live Telemetry & AI Forecasting",
    subtitle: "Sub-30s update rate",
    description:
      "Open your student dashboard to track Bus B01 in real time. Our XGBoost engine analyzes live Kolkata corridor congestion to compute your exact arrival ETA and delay delta.",
    badge: "Real-Time Tracking",
    badgeColor: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    iconBg: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
  {
    step: "03",
    icon: BellRing,
    title: "500m Proximity Alert & Boarding",
    subtitle: "Zero curbside waiting",
    description:
      "When the bus breaches a 500-meter radius of your stop, a browser push notification alerts you to head out. Scan your 3D digital pass QR code at the bus door and take your seat.",
    badge: "Automated Arrival",
    badgeColor: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    iconBg: "bg-[#D1FAE5] text-[#047857]",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-5 bg-gradient-to-b from-[#F5F2EB] to-[#EAE5DC] border-t border-[#DDD7CB]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#DDD7CB] text-xs font-mono font-bold text-[#1E40AF] shadow-2xs mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-pulse" />
            HOW IT WORKS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight">
            How CampusRide works in{" "}
            <span className="bg-gradient-to-r from-[#1E40AF] via-[#7C3AED] to-[#B45309] bg-clip-text text-transparent">
              3 simple steps
            </span>
          </h2>
          <p className="text-base text-[#57534E] mt-3">
            Designed for frictionless daily commutes without requiring any app store downloads.
          </p>
        </div>

        {/* 3 Step Connected Cards */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {STEPS.map((item, idx) => {
            const Icon = item.icon

            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative flex flex-col justify-between p-8 rounded-3xl bg-white/95 border border-[#DDD7CB] shadow-[0_10px_35px_rgba(120,113,108,0.08)] hover:shadow-[0_18px_45px_rgba(120,113,108,0.14)] hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  {/* Top: Step Number & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-extrabold font-mono text-[#1C1917]/20">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg} shadow-2xs`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${item.badgeColor}`}>
                    {item.badge}
                  </span>

                  <h3 className="text-xl font-bold text-[#1C1917] mt-4 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#1E40AF] font-semibold mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-sm text-[#57534E] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F2EDE4] flex items-center gap-2 text-xs font-semibold text-[#065F46]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Fully Automated &amp; Verified</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
