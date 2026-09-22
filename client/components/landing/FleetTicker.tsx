"use client"

// FleetTicker — Real-Time Operations Telemetry Marquee
// Warm Cashmere & Almond luxury aesthetic
// Displays live campus fleet events, ML forecasts, and corridor telemetry

import React from "react"
import { Radio, Sparkles, ShieldCheck, MapPin, Gauge, Cpu } from "lucide-react"

const TICKER_EVENTS = [
  {
    icon: Radio,
    badge: "LIVE TELEMETRY",
    badgeColor: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    text: "Bus B01 (WB-02-AK-9821) active on Route R01 · Speed: 34 km/h · Taratala Flyover Section",
  },
  {
    icon: Cpu,
    badge: "ML FORECAST",
    badgeColor: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    text: "XGBoost Traffic Model: Sub-3 min delay probability 94.2% · Taratala signal cleared",
  },
  {
    icon: MapPin,
    badge: "STOP PROXIMITY",
    badgeColor: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    text: "Approaching Majerhat Station Hub · 28 students boarded · ETA to STCET Gate 1: 8 min",
  },
  {
    icon: ShieldCheck,
    badge: "PASS VERIFIED",
    badgeColor: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]",
    text: "Sohom Giri (CSE · ID: 2026-CS-8902) 3D Smart Transit Credential validated via NFC",
  },
  {
    icon: Gauge,
    badge: "PUNCTUALITY",
    badgeColor: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    text: "Morning Fleet Synchronized · 99.2% on-time adherence across South Kolkata routes",
  },
  {
    icon: Sparkles,
    badge: "CLIMATE ADVISORY",
    badgeColor: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
    text: "28°C Kolkata · Diamond Harbour Road traffic index: Moderate · Alternate detour on standby",
  },
]

export default function FleetTicker() {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#ECE7DE] via-[#F2EDE4] to-[#ECE7DE] border-y border-[#DDD7CB] py-3 select-none shadow-2xs">
      {/* Left and Right Fade Gradients in warm cashmere */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#ECE7DE] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#ECE7DE] to-transparent z-10" />

      {/* Ticker Track */}
      <div className="flex w-max animate-[marquee_38s_linear_infinite] hover:[animation-play-state:paused] gap-8 items-center">
        {[...TICKER_EVENTS, ...TICKER_EVENTS].map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/95 border border-[#DDD7CB] shadow-[0_2px_6px_rgba(120,113,108,0.05)] whitespace-nowrap"
            >
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${item.badgeColor}`}>
                <Icon className="w-3 h-3" />
                {item.badge}
              </span>
              <span className="text-xs font-mono text-[#292524] font-medium">
                {item.text}
              </span>
            </div>
          )
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  )
}
