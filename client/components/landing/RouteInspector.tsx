"use client"

// RouteInspector — Interactive 6-stop Corridor Explorer
// Luxury Warm Oatmeal & Stone Palette (#F5F2EB to #EFECE6)
// Grounded in STCET / South Kolkata transit geography

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, Clock, Users, Navigation, AlertCircle, CheckCircle2,
  TrendingUp, Compass, Footprints, ShieldAlert, ArrowRight,
} from "lucide-react"

interface CorridorStop {
  id: string
  name: string
  zone: string
  coords: string
  scheduled: string
  predicted: string
  delayMin: number
  boarded: number
  walkTime: string
  traffic: "optimal" | "moderate" | "heavy"
  trafficSpeed: string
  description: string
  landmark: string
  delayDistribution: number[] // 7am, 8am, 9am, 10am, 11am
}

const STOPS: CorridorStop[] = [
  {
    id: "stop-1",
    name: "Behala Chowrasta",
    zone: "Terminal 01 · South Hub",
    coords: "22.4955° N, 88.3142° E",
    scheduled: "08:15 AM",
    predicted: "08:15 AM",
    delayMin: 0,
    boarded: 42,
    walkTime: "3 min from Chowrasta Crossing",
    traffic: "optimal",
    trafficSpeed: "32 km/h",
    description: "Primary origin terminal. Students gather at designated bay next to the Diamond Harbour Rd transit depot.",
    landmark: "Chowrasta Metro Pillar #104",
    delayDistribution: [1, 2, 0, 1, 0],
  },
  {
    id: "stop-2",
    name: "Taratala Crossing",
    zone: "Section 02 · Flyover Entry",
    coords: "22.5167° N, 88.3200° E",
    scheduled: "08:24 AM",
    predicted: "08:26 AM",
    delayMin: 2,
    boarded: 35,
    walkTime: "4 min from Taratala bus stand",
    traffic: "moderate",
    trafficSpeed: "26 km/h",
    description: "Major junction connecting Diamond Harbour Rd and Taratala flyover. Real-time ML reroutes around peak morning lane squeeze.",
    landmark: "Taratala Police Kiosk & Flyover Ramp",
    delayDistribution: [2, 5, 4, 3, 2],
  },
  {
    id: "stop-3",
    name: "Majerhat Station",
    zone: "Section 03 · Rail Interchange",
    coords: "22.5230° N, 88.3250° E",
    scheduled: "08:33 AM",
    predicted: "08:34 AM",
    delayMin: 1,
    boarded: 58,
    walkTime: "2 min from Majerhat Metro Gate 2",
    traffic: "optimal",
    trafficSpeed: "35 km/h",
    description: "Multi-modal transfer hub. High-volume student intake from suburban EMU trains and Joka-Esplanade purple line.",
    landmark: "Majerhat Cable-Stayed Bridge Base",
    delayDistribution: [1, 3, 2, 2, 1],
  },
  {
    id: "stop-4",
    name: "New Alipore Enclave",
    zone: "Section 04 · Residential Gate",
    coords: "22.5290° N, 88.3280° E",
    scheduled: "08:41 AM",
    predicted: "08:42 AM",
    delayMin: 1,
    boarded: 19,
    walkTime: "5 min from Block C Enclave",
    traffic: "optimal",
    trafficSpeed: "38 km/h",
    description: "South Kolkata residential pickup. Quiet boarding stop with digital QR scanning and fast entry.",
    landmark: "Chetla Canal Crossing Bridge",
    delayDistribution: [0, 1, 1, 0, 0],
  },
  {
    id: "stop-5",
    name: "Mint Colony",
    zone: "Section 05 · Historic Corridor",
    coords: "22.5330° N, 88.3285° E",
    scheduled: "08:48 AM",
    predicted: "08:50 AM",
    delayMin: 2,
    boarded: 24,
    walkTime: "3 min from India Govt Mint Gate",
    traffic: "moderate",
    trafficSpeed: "28 km/h",
    description: "Alipore Mint approach. The final corridor bottleneck before entering Khidderpore institutional boundary.",
    landmark: "India Government Mint Historical Arch",
    delayDistribution: [1, 4, 3, 2, 1],
  },
  {
    id: "stop-6",
    name: "STCET Campus Hub",
    zone: "Destination · Khidderpore Gate 1",
    coords: "22.5388° N, 88.3286° E",
    scheduled: "08:55 AM",
    predicted: "08:56 AM",
    delayMin: 1,
    boarded: 0,
    walkTime: "Direct drop inside College Gate",
    traffic: "optimal",
    trafficSpeed: "20 km/h (Campus Zone)",
    description: "St. Thomas' College of Engineering & Technology. All students disembark before 9:00 AM morning lecture intake.",
    landmark: "STCET Main Administrative Block & Auditorium",
    delayDistribution: [0, 1, 1, 0, 0],
  },
]

interface RouteInspectorProps {
  isEmbedded?: boolean
}

export default function RouteInspector({ isEmbedded = false }: RouteInspectorProps) {
  const [selectedStopId, setSelectedStopId] = useState<string>("stop-2")
  const currentStop = STOPS.find((s) => s.id === selectedStopId) || STOPS[1]

  return (
    <section
      id="corridor-inspector"
      className={
        isEmbedded
          ? "relative rounded-3xl p-6 sm:p-8 bg-[#FAF8F5] border border-[#DDD7CB] shadow-sm"
          : "relative py-24 px-5 bg-gradient-to-b from-[#F5F2EB] to-[#EFECE6] border-t border-[#DDD7CB]"
      }
    >
      <div className={isEmbedded ? "w-full" : "max-w-7xl mx-auto"}>
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#C2410C]" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#9A3412]">
                Interactive Corridor Architecture
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
              Route R01 Corridor &amp; Stop Inspector
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] mt-2 max-w-2xl">
              Inspect designated boarding stops across Kolkata. Live ML delay curves, walking transfers, and student queue volumes update dynamically.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#DDD7CB] shadow-xs text-xs font-mono text-[#292524] self-start md:self-auto">
            <Compass className="w-4 h-4 text-[#C2410C]" />
            <span>Diamond Harbour Rd Corridor</span>
          </div>
        </div>

        {/* ── Interactive 6-Stop Stepper Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-8">
          {STOPS.map((stop, i) => {
            const isSelected = stop.id === selectedStopId
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => setSelectedStopId(stop.id)}
                className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#1C1917] text-white border-[#1C1917] shadow-md -translate-y-0.5"
                    : "bg-white/95 text-[#292524] border-[#DDD7CB] hover:bg-white hover:border-[#B8AF9F] shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-amber-300" : "text-[#B45309]"}`}>
                    STOP 0{i + 1}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : stop.delayMin > 0 ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]" : "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                  }`}>
                    {stop.delayMin > 0 ? `+${stop.delayMin}m` : "ON TIME"}
                  </span>
                </div>
                <p className="text-xs font-bold truncate">{stop.name}</p>
                <span className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-stone-300" : "text-[#78716C]"}`}>
                  {stop.scheduled}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Active Stop Deep Inspection Card ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStop.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-[#DDD7CB] p-6 sm:p-8 shadow-[0_14px_40px_rgba(120,113,108,0.08)]"
          >
            {/* Left Col: Core Specs & Timing */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-xs font-mono font-bold">
                    {currentStop.zone}
                  </span>
                  <span className="text-xs font-mono text-[#78716C]">{currentStop.coords}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
                  {currentStop.name}
                </h3>
                <p className="text-sm text-[#57534E] mt-2 leading-relaxed">
                  {currentStop.description}
                </p>
              </div>

              {/* Metrics Grid in Warm Almond */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-4 border-t border-[#F2EDE4]">
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5]">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>Scheduled ETA</span>
                  </div>
                  <p className="text-base font-bold font-mono text-[#1C1917]">{currentStop.scheduled}</p>
                  <p className="text-[10px] text-[#065F46] font-semibold mt-0.5">Pred: {currentStop.predicted}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5]">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C] mb-1">
                    <Users className="w-3.5 h-3.5 text-[#6B21A8]" />
                    <span>Boarding Intake</span>
                  </div>
                  <p className="text-base font-bold font-mono text-[#1C1917]">{currentStop.boarded} students</p>
                  <p className="text-[10px] text-[#78716C] mt-0.5">NFC Verified</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5] col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C] mb-1">
                    <Footprints className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Transit Access</span>
                  </div>
                  <p className="text-xs font-bold text-[#1C1917] truncate">{currentStop.walkTime}</p>
                  <p className="text-[10px] text-[#78716C] truncate mt-0.5">{currentStop.landmark}</p>
                </div>
              </div>
            </div>

            {/* Right Col: Traffic Flow & Historical Delay Curve */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-[#F7F4EE] to-[#EFEAE1] rounded-2xl border border-[#DDD7CB] p-5 sm:p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#1C1917] uppercase tracking-wider">
                    Corridor Flow &amp; Speed
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#065F46] text-[10px] font-mono font-bold border border-[#A7F3D0]">
                    <CheckCircle2 className="w-3 h-3" />
                    {currentStop.trafficSpeed}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#DDD7CB] shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4 text-[#1E40AF]" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-[#1C1917]">Diamond Harbour Rd Arterial</p>
                    <p className="text-[11px] text-[#78716C]">Continuous GPS ping interval: 2.8 seconds</p>
                  </div>
                </div>
              </div>

              {/* Historical Delay Histogram */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#57534E] font-medium">
                    Historical Delay Curve (07:00 – 11:00)
                  </span>
                  <span className="text-[10px] font-mono text-[#6B21A8] font-bold">XGBoost Confidence 87%</span>
                </div>
                <div className="flex items-end justify-between gap-2 h-20 pt-2 border-b border-[#DDD7CB] px-1">
                  {currentStop.delayDistribution.map((delay, idx) => {
                    const hours = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM"]
                    const heightPercent = Math.max(16, (delay / 5) * 100)
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            delay > 2 ? "bg-[#B45309]" : "bg-[#1E40AF]"
                          }`}
                        />
                        <span className="text-[9px] font-mono text-[#78716C]">{hours[idx]}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-[#78716C]">
                  <span>Peak: 08:15 AM (Morning Classes)</span>
                  <span className="text-[#1E40AF] font-semibold">Max Variance: +{Math.max(...currentStop.delayDistribution)}m</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
