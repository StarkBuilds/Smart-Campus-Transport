"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Bus, Navigation, Clock, SunMedium, ArrowUpRight, Radio, Compass, Plus, Minus, ShieldCheck, MapPin } from "lucide-react"

interface WayfindingRadarProps {
  onSwitchToCard?: () => void
}

// Key corridor landmarks matching Diamond Harbour Rd / Taratala -> STCET Khidderpore
const CORRIDOR_STOPS = [
  { x: 50, y: 310, name: "Behala Chowrasta", sub: "Terminal 01" },
  { x: 130, y: 245, name: "Taratala Crossing", sub: "Flyover Entry" },
  { x: 220, y: 195, name: "Majerhat Station", sub: "Rail Interchange" },
  { x: 310, y: 145, name: "New Alipore Gate", sub: "South Enclave" },
  { x: 440, y: 75, name: "STCET Campus Hub", sub: "Destination Gate" },
]

export default function WayfindingRadar({ onSwitchToCard }: WayfindingRadarProps) {
  const [progress, setProgress] = useState(0.38)
  const [busPos, setBusPos] = useState({ x: 180, y: 215, angle: -30 })
  const [etaSeconds, setEtaSeconds] = useState(360)
  const [speed, setSpeed] = useState(32)
  const [zoomLevel, setZoomLevel] = useState(1)
  const pathRef = useRef<SVGPathElement>(null)

  // Smooth Zomato/Swiggy vehicle interpolation & bearing rotation
  useEffect(() => {
    let animId: number
    let startTime = performance.now()
    const cycleDuration = 16000 // 16-second loop

    const updateLoop = (now: number) => {
      const elapsed = now - startTime
      const t = (elapsed % cycleDuration) / cycleDuration
      setProgress(t)

      if (pathRef.current) {
        const pathLen = pathRef.current.getTotalLength()
        const currentDistance = t * pathLen
        const point = pathRef.current.getPointAtLength(currentDistance)

        // Tangent vector calculation for bearing rotation (Swiggy bike / Zomato courier heading)
        const nextDist = Math.min(currentDistance + 3, pathLen)
        const nextPoint = pathRef.current.getPointAtLength(nextDist)
        const dx = nextPoint.x - point.x
        const dy = nextPoint.y - point.y
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)

        setBusPos({ x: point.x, y: point.y, angle })

        // Realistic urban speed calculation
        const simulatedSpeed = 28 + Math.sin(t * Math.PI * 3) * 7
        setSpeed(Math.round(simulatedSpeed))

        // Dynamic countdown: starts at 6 min (360s) down to arrival
        const remainingFraction = 1 - t
        const remainingSeconds = Math.max(35, Math.round(remainingFraction * 360))
        setEtaSeconds(remainingSeconds)
      }

      animId = requestAnimationFrame(updateLoop)
    }

    animId = requestAnimationFrame(updateLoop)
    return () => cancelAnimationFrame(animId)
  }, [])

  const etaMinutes = Math.ceil(etaSeconds / 60)

  // Realistic curved road path through Taratala corridor
  const roadPathD = "M 50 310 C 90 290, 105 260, 130 245 C 165 225, 185 210, 220 195 C 265 175, 275 160, 310 145 C 360 120, 395 100, 440 75"

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-3 select-none">
      {/* ── Top Editorial Control Header (Google Stitch Warm Light styling) ── */}
      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-[#FAF9F5] border border-[#E5E2D9] text-[#1A1A1A] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono text-[11px] font-bold text-[#1E293B] tracking-wider uppercase">
            Campus Wayfinding Canvas
          </span>
          <span className="text-[#94A3B8]">·</span>
          <span className="text-[#64748B] font-mono text-[11px]">Scale 1:4000</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F1EFEA] px-2 py-0.5 rounded-lg border border-[#E2DFD6] text-[10px] font-mono font-medium text-[#475569]">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>Live Sync</span>
          </div>
          {/* Zoom controls matching Google Stitch */}
          <div className="flex items-center rounded-lg bg-[#F1EFEA] border border-[#E2DFD6] p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 1.2))}
              className="p-1 hover:bg-white rounded text-[#475569] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.9))}
              className="p-1 hover:bg-white rounded text-[#475569] transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Realistic Map Canvas (Warm Ivory / Google Stitch & Zomato Map Style) ── */}
      <div className="relative rounded-3xl overflow-hidden bg-[#FBF9F4] border border-[#E5E2D9] shadow-[0_16px_45px_rgba(0,0,0,0.2)]">
        {/* Subtle Architectural Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(215, 210, 198, 0.45) 1px, transparent 1px),
              linear-gradient(90deg, rgba(215, 210, 198, 0.45) 1px, transparent 1px)
            `,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Compass Rose */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E2DFD6] shadow-xs text-[10px] font-mono text-[#64748B]">
          <Compass className="w-3.5 h-3.5 text-blue-600 animate-[spin_16s_linear_infinite]" />
          <span>22.5388° N, 88.3286° E</span>
        </div>

        {/* ── Realistic Vector Map Canvas ── */}
        <div className="relative h-[255px] sm:h-[275px] w-full px-2 pt-2 overflow-hidden">
          <svg
            viewBox="0 0 500 350"
            className="w-full h-full overflow-visible transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              {/* Soft Drop Shadow for Buildings & Cards */}
              <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.07" />
              </filter>
              {/* Route Neon/Glow Filter */}
              <filter id="routeShine" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Beacon Ripple Gradient */}
              <radialGradient id="swiggyBeacon" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── Realistic Urban Geography: Green Parks & Waterway ── */}
            {/* Soft Green Park Grounds */}
            <path
              d="M 10 10 C 60 15, 110 30, 135 70 C 120 110, 60 120, 15 100 Z"
              fill="#EBF3E8"
              stroke="#D7E6D3"
              strokeWidth="1.2"
            />
            <text x="65" y="65" fill="#5F8D58" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              Brace Bridge Green Enclave
            </text>

            <path
              d="M 330 200 C 370 210, 420 220, 480 230 C 470 300, 390 320, 340 280 Z"
              fill="#EBF3E8"
              stroke="#D7E6D3"
              strokeWidth="1.2"
            />
            <text x="410" y="265" fill="#5F8D58" fontSize="8" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">
              New Alipore Sports Ground
            </text>

            {/* Canal / Waterbody Feature in Soft Sky Blue */}
            <path
              d="M -10 220 Q 80 200, 140 210 T 260 270 T 360 340"
              fill="none"
              stroke="#DBEAFE"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M -10 220 Q 80 200, 140 210 T 260 270 T 360 340"
              fill="none"
              stroke="#BFDBFE"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <text x="75" y="222" fill="#3B82F6" fontSize="7" fontWeight="500" fontFamily="sans-serif" opacity="0.8">
              Adi Ganga Transit Canal
            </text>

            {/* ── Realistic Building Footprints with Labels (Google Stitch style) ── */}
            {/* North Campus Enclave */}
            <rect x="30" y="125" width="85" height="46" rx="8" fill="#F0EDE4" stroke="#DFDBD0" strokeWidth="1.2" filter="url(#mapShadow)" />
            <text x="72" y="146" fill="#334155" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">North Dorms</text>
            <text x="72" y="158" fill="#64748B" fontSize="6.5" textAnchor="middle" fontFamily="sans-serif">Residences A &amp; B</text>

            {/* Central Transit Hub / Majerhat */}
            <rect x="175" y="95" width="95" height="50" rx="8" fill="#F0EDE4" stroke="#DFDBD0" strokeWidth="1.2" filter="url(#mapShadow)" />
            <text x="222" y="117" fill="#334155" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Majerhat Hub</text>
            <text x="222" y="129" fill="#0284C7" fontSize="6.5" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">Metro &amp; Rail Interchange</text>

            {/* STCET Engineering Hub (Destination) */}
            <rect x="390" y="25" width="95" height="48" rx="8" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1.5" filter="url(#mapShadow)" />
            <text x="437" y="47" fill="#92400E" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">STCET CAMPUS</text>
            <text x="437" y="59" fill="#B45309" fontSize="6.5" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">Main Khidderpore Gate</text>

            {/* ── Realistic Road Network (Road Casings + Centerlines) ── */}
            {/* Secondary cross-streets */}
            <path d="M 130 50 L 130 330" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
            <path d="M 130 50 L 130 330" fill="none" stroke="#E2DFD6" strokeWidth="1" strokeLinecap="round" />

            <path d="M 280 20 L 350 330" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
            <path d="M 280 20 L 350 330" fill="none" stroke="#E2DFD6" strokeWidth="1" strokeLinecap="round" />

            <path d="M 20 250 L 480 250" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
            <path d="M 20 250 L 480 250" fill="none" stroke="#E2DFD6" strokeWidth="1" strokeLinecap="round" />

            {/* Primary Bus Corridor Roadbed (White asphalt casing) */}
            <path
              d={roadPathD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#mapShadow)"
            />
            <path
              d={roadPathD}
              fill="none"
              stroke="#D5D1C6"
              strokeWidth="15"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Inner Road Bed */}
            <path
              d={roadPathD}
              fill="none"
              stroke="#F8F7F2"
              strokeWidth="11"
              strokeLinecap="round"
            />

            {/* Active Zomato/Swiggy Live Route Line (Electric Cobalt Blue with Glow) */}
            <path
              ref={pathRef}
              d={roadPathD}
              fill="none"
              stroke="#2563EB"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#routeShine)"
            />

            {/* Road Directional Chevrons along route */}
            <path
              d={roadPathD}
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.5"
              strokeDasharray="4 16"
              strokeLinecap="round"
            />

            {/* Corridor Milestone Stop Pins */}
            {CORRIDOR_STOPS.map((st, idx) => {
              const isTarget = idx === CORRIDOR_STOPS.length - 1
              return (
                <g key={st.name}>
                  {/* Pin Circle */}
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r={isTarget ? 7 : 5}
                    fill={isTarget ? "#EA580C" : "#FFFFFF"}
                    stroke={isTarget ? "#C2410C" : "#2563EB"}
                    strokeWidth={isTarget ? 2.5 : 2}
                    filter="url(#mapShadow)"
                  />
                  {isTarget && (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="12"
                      fill="none"
                      stroke="#EA580C"
                      strokeWidth="1.5"
                      opacity="0.6"
                      className="animate-ping"
                      style={{ transformOrigin: `${st.x}px ${st.y}px` }}
                    />
                  )}

                  {/* Clean Milestone Label */}
                  <rect
                    x={st.x - 38}
                    y={idx % 2 === 0 ? st.y - 23 : st.y + 9}
                    width="76"
                    height="16"
                    rx="5"
                    fill="#FFFFFF"
                    stroke="#E2DFD6"
                    strokeWidth="1"
                    filter="url(#mapShadow)"
                  />
                  <text
                    x={st.x}
                    y={idx % 2 === 0 ? st.y - 12 : st.y + 20}
                    fill={isTarget ? "#9A3412" : "#1E293B"}
                    fontSize="7"
                    fontWeight={isTarget ? "800" : "600"}
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    {st.name}
                  </text>
                </g>
              )
            })}

            {/* ══════ ZOMATO / SWIGGY VEHICLE MARKER ══════ */}
            <g transform={`translate(${busPos.x}, ${busPos.y})`}>
              {/* Swiggy-style radar pulse concentric ring */}
              <circle
                r="18"
                fill="url(#swiggyBeacon)"
                className="animate-ping"
                style={{ animationDuration: "1.6s" }}
              />

              {/* Dynamic Heading Rotation along Road Bearing */}
              <g transform={`rotate(${busPos.angle})`}>
                {/* Vehicle Ground Shadow */}
                <ellipse cx="0" cy="1" rx="14" ry="7" fill="#0F172A" opacity="0.3" />

                {/* Main Vehicle Chassis (Vibrant Transit Blue with Crisp Border) */}
                <rect
                  x="-12"
                  y="-6.5"
                  width="24"
                  height="13"
                  rx="4"
                  fill="#1D4ED8"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Aerodynamic Front Windshield */}
                <rect x="5.5" y="-5" width="4" height="10" rx="1.5" fill="#0C1B33" />

                {/* Passenger Windows */}
                <rect x="-8.5" y="-5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />
                <rect x="-3.5" y="-5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />
                <rect x="1" y="-5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />
                <rect x="-8.5" y="2.5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />
                <rect x="-3.5" y="2.5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />
                <rect x="1" y="2.5" width="3" height="2.5" rx="0.5" fill="#93C5FD" />

                {/* Headlight beam cones */}
                <polygon points="12,-4 26,-8 26,8 12,4" fill="#FDE047" opacity="0.45" />
              </g>

              {/* Realistic Floating Tag (Always oriented horizontally) */}
              <g transform="translate(0, -18)">
                <rect
                  x="-30"
                  y="-11"
                  width="60"
                  height="15"
                  rx="5"
                  fill="#1E293B"
                  stroke="#3B82F6"
                  strokeWidth="1"
                  filter="url(#mapShadow)"
                />
                <text
                  x="0"
                  y="0"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  BUS B01 · {speed} km/h
                </text>
              </g>
            </g>
          </svg>
        </div>

        {/* ── Floating Swiggy/Zomato-Style Live Arrival Card (Refined Light Theme) ── */}
        <div className="p-4 sm:p-5 bg-[#FFFFFF] border-t border-[#E5E2D9] space-y-3 shadow-inner">
          {/* Top Line & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold tracking-wider">
                BUS B01
              </span>
              <span className="text-[#1E293B] text-xs sm:text-sm font-bold tracking-tight">
                Green Line Campus Shuttle
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold font-mono">
              <span>⚠️ 2 min late</span>
              <span className="text-amber-500 font-normal">· Updated 4s ago</span>
            </div>
          </div>

          {/* Large Countdown & Next Stop */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1.5 border-b border-[#F1EFEA]">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight flex items-baseline gap-2">
                Arriving in {etaMinutes} min
                <span className="text-xs font-medium text-[#64748B] font-mono">
                  ({etaSeconds}s remaining)
                </span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-bold">
                Your Next Stop
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#1E293B]">
                New Alipore Gate ➔ STCET
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar (Google Stitch / Swiggy style) */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
            <span className="text-emerald-600 font-bold">✓ Behala</span>
            <span className="text-[#CBD5E1]">────</span>
            <span className="text-blue-600 font-bold">● Live Transit</span>
            <span className="text-[#CBD5E1]">────</span>
            <span className="text-[#64748B]">New Alipore</span>
            <span className="text-[#CBD5E1]">────</span>
            <span className="text-orange-600 font-bold">🏁 STCET Gate</span>
          </div>

          {/* Smart ETA & Climate Advisory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-[#F8F7F2] border border-[#E5E2D9]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[#334155]">
                Smart ETA: <strong className="text-[#0F172A] font-mono">08:14 AM</strong> (91% High)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SunMedium className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[#334155]">
                Weather: <strong className="text-[#0F172A]">28°C</strong> · Clear Roadways
              </span>
            </div>
          </div>

          {/* ════ Verified Commuter: SOHOM GIRI (Clean & Natural) ════ */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-amber-50 border border-blue-100 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                SG
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono text-blue-700 font-bold tracking-wider">
                  Verified Commuter Pass
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                  SOHOM GIRI
                </p>
                <p className="text-[9px] text-[#64748B] font-mono">
                  STCET CSE · Pass #2026-CS-8902
                </p>
              </div>
            </div>

            {onSwitchToCard && (
              <button
                type="button"
                onClick={onSwitchToCard}
                className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold transition-all shadow-xs"
              >
                <span>Inspect 3D Pass</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
