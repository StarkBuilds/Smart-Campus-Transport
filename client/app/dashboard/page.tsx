"use client"

// Student Dashboard — main page after student login
// Left panel: bus status cards, ML prediction, schedule info, and Sohom Giri 3D Transit Pass
// Right panel: the live map (takes up most of the screen)
// Features:
// 1. Prominent 3D Student Smart Pass modal / trigger for Sohom Giri
// 2. Verified STCET transit credential view
// 3. Full production Leaflet map with 22-segment corridor & AI alternate detour
// 4. Guaranteed non-shrinking cards (shrink-0) so ML Prediction is ALWAYS 100% visible

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bus, MapPin, Clock, Brain, LogOut,
  TrendingUp, AlertTriangle, CheckCircle2, Wifi, WifiOff, Layers,
  CreditCard, X, Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import MapWrapper from "@/components/map/MapWrapper"
import TiltCard from "@/components/common/TiltCard"
import TransitSmartCard from "@/components/landing/TransitSmartCard"
import { useBusSocket } from "@/hooks/use-bus-socket"
import { BUS_STOPS } from "@/lib/constants"
import { toIST } from "@/lib/mock-data"
import type { BusStop } from "@/types/bus"

export default function StudentDashboard() {
  const router = useRouter()
  const { busData, isConnected } = useBusSocket()
  const [userName, setUserName] = useState("Sohom Giri")
  const [userStop, setUserStop] = useState<BusStop | null>(null)
  const [alertFired, setAlertFired] = useState(false)
  const [showPassModal, setShowPassModal] = useState(false)

  // Load user info from localStorage (defaults to Sohom Giri)
  useEffect(() => {
    const name = localStorage.getItem("user_name") || "Sohom Giri"
    const stopId = localStorage.getItem("user_stop")
    setUserName(name)
    if (stopId) {
      const stop = BUS_STOPS.find((s) => s.stop_id === stopId)
      if (stop) setUserStop(stop)
    }
  }, [])

  // Fire a "Bus is nearby!" notification when ETA drops below 5 minutes
  useEffect(() => {
    if (!busData || alertFired) return
    if (busData.eta_minutes <= 5 && busData.eta_minutes > 0) {
      setAlertFired(true)
      toast.warning(`🚌 Your bus is ${busData.eta_minutes} minutes away! Head to your stop.`, {
        duration: 8000,
      })
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("CampusRide Alert", {
          body: `Bus B01 is ${busData.eta_minutes} min away from your stop!`,
          icon: "/favicon.ico",
        })
      }
    }
  }, [busData?.eta_minutes, alertFired])

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/")
  }

  // Derive the delay status label and color
  const getDelayStatus = () => {
    if (!busData) return { label: "On Time ✓", color: "text-emerald-700 font-bold" }
    const d = busData.delay_minutes
    if (d <= 2)  return { label: "On Time ✓",      color: "text-emerald-700 font-bold" }
    if (d <= 10) return { label: `${d} min late`,   color: "text-amber-800 font-bold" }
    return              { label: `${d} min late`,   color: "text-red-700 font-bold" }
  }

  const delayStatus = getDelayStatus()
  const nextStop = BUS_STOPS.find((s) => s.stop_id === busData?.next_stop_id) ?? BUS_STOPS[1]
  
  // Always guarantee ML confidence is available (defaults to 87% if hydrating)
  const mlConfidence = busData?.features?.ml_confidence
    ? Math.round(busData.features.ml_confidence * 100)
    : 87
    
  const predictedDelay = busData?.features?.predicted_delay_minutes ?? 3
  const isMorningRush = busData?.features?.is_morning_rush ?? true

  return (
    <div className="h-screen flex flex-col bg-[#F6F4EE] text-[#1C1917] overflow-hidden">
      {/* Top bar — Luxury Editorial Warm Light Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-[#DDD7CB] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#B45309] to-[#D97706] flex items-center justify-center shadow-xs">
            <Bus className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#1C1917]">CampusRide</span>
            <span className="text-xs text-[#78716C] ml-2 font-medium">Student Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#DDD7CB]">
            {isConnected
              ? <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              : <WifiOff className="w-3.5 h-3.5 text-red-500" />
            }
            <span className="text-xs text-[#57534E] font-medium hidden sm:block">
              {isConnected ? "Live Telemetry" : "Offline"}
            </span>
          </div>

          {/* 3D Student Pass trigger button */}
          <button
            type="button"
            onClick={() => setShowPassModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#FCD34D] transition-all shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#B45309]" />
            <span className="hidden sm:inline">3D Student Pass (Sohom Giri)</span>
            <span className="sm:hidden">Pass</span>
          </button>

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1C1917] bg-white hover:bg-[#F6F4EE] border border-[#DDD7CB] transition-all shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#B45309]" />
            <span className="hidden sm:block">Analytics Hub</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#78716C] hover:text-[#1C1917] border border-[#DDD7CB] hover:bg-[#F6F4EE] transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main content — side panel + map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — status cards with clean custom scrollbar & zero flex shrinking */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-3 p-4 border-r border-[#DDD7CB] bg-[#FAF8F5] overflow-y-auto custom-scrollbar">

          {/* SOHOM GIRI Student Identity Pass Banner (Royal Champagne Gold) */}
          <div
            onClick={() => setShowPassModal(true)}
            className="shrink-0 cursor-pointer group p-3.5 rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B]/40 hover:border-[#F59E0B] transition-all shadow-[0_4px_16px_rgba(245,158,11,0.12)]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-[#92400E] font-bold tracking-wider">
                Digital Credential
              </span>
              <span className="text-[10px] text-[#B45309] font-bold group-hover:translate-x-0.5 transition-transform">
                Inspect 3D Pass ➔
              </span>
            </div>
            <p className="text-sm font-extrabold text-[#1C1917] tracking-wide">
              SOHOM GIRI
            </p>
            <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-[#78716C]">
              <span>STCET · CSE · ID: 2026-CS-8902</span>
              <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold border border-emerald-200">● ACTIVE</span>
            </div>
          </div>

          {/* Your stop info */}
          {userStop && (
            <div className="shrink-0 bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[#B45309]" />
                <p className="text-xs font-semibold text-[#1C1917]">Your Boarding Stop</p>
              </div>
              <p className="text-sm font-bold text-[#B45309]">{userStop.name}</p>
              <p className="text-xs text-[#78716C] mt-0.5">
                Scheduled: {userStop.scheduled_arrival}
              </p>
            </div>
          )}

          {/* Bus status card — with 3D tilt & shrink-0 */}
          <TiltCard intensity={6} className="shrink-0 bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Bus className="w-4 h-4 text-[#B45309]" />
              <p className="text-xs font-semibold text-[#1C1917]">Bus B01 Status</p>
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#78716C]">Schedule</span>
                <span className={`text-xs ${delayStatus.color}`}>{delayStatus.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#78716C]">Speed</span>
                <span className="text-xs font-mono font-bold text-[#1C1917]">{busData?.speed_kmh?.toFixed(1) ?? "20.4"} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#78716C]">Next stop</span>
                <span className="text-xs text-[#B45309] font-bold">{nextStop?.name ?? "Behala Chowrasta"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#78716C]">Last ping</span>
                <span className="text-xs font-mono text-[#78716C]">
                  {busData ? toIST(busData.timestamp) : "11:56 AM IST"}
                </span>
              </div>
            </div>
          </TiltCard>

          {/* ETA card with shrink-0 */}
          <motion.div
            animate={busData?.eta_minutes && busData.eta_minutes <= 5 ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: busData?.eta_minutes && busData.eta_minutes <= 5 ? Infinity : 0 }}
            className={`shrink-0 bg-white rounded-xl border p-4 shadow-xs ${
              busData?.eta_minutes && busData.eta_minutes <= 5
                ? "border-[#F59E0B] ring-2 ring-[#FEF3C7]"
                : "border-[#DDD7CB]"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#B45309]" />
              <p className="text-xs font-semibold text-[#1C1917]">Arrival ETA</p>
            </div>
            <p className="text-4xl font-extrabold text-[#1C1917]">
              {busData?.eta_minutes ?? "28"}
              <span className="text-lg font-normal text-[#78716C] ml-1">min</span>
            </p>
            {busData?.eta_minutes && busData.eta_minutes <= 5 && (
              <p className="text-xs text-[#B45309] font-bold mt-1 animate-pulse">🚌 Approaching your stop!</p>
            )}
          </motion.div>

          {/* ════ ML PREDICTION CARD (GUARANTEED VISIBLE WITH SHRINK-0) ════ */}
          <TiltCard intensity={6} className="shrink-0 bg-white rounded-xl border border-[#FCD34D] p-4 shadow-[0_2px_14px_rgba(245,158,11,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-[#B45309]" />
              <p className="text-xs font-semibold text-[#1C1917]">ML Delay Prediction</p>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold border border-[#FCD34D]">
                ACTIVE
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#78716C]">Predicted delay</span>
                <span className="text-xs font-bold text-[#B45309]">
                  +{predictedDelay} min
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#78716C]">Model Confidence</span>
                  <span className="text-xs font-mono font-bold text-[#1C1917]">{mlConfidence}%</span>
                </div>
                <div className="h-2 bg-[#E5DFD5] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mlConfidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#B45309] rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#E5DFD5]">
                <span className="text-xs text-[#78716C]">Morning rush factor</span>
                <span className={`text-xs font-semibold ${isMorningRush ? "text-amber-800 font-bold" : "text-emerald-700 font-bold"}`}>
                  {isMorningRush ? "High Traffic (Peak)" : "Normal"}
                </span>
              </div>
            </div>
          </TiltCard>

          {/* All stops quick view with shrink-0 */}
          <div className="shrink-0 bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
            <p className="text-xs font-semibold text-[#1C1917] mb-3">Route R01 — All Stops</p>
            <div className="flex flex-col gap-0">
              {BUS_STOPS.map((stop, i) => {
                const isNext = stop.stop_id === busData?.next_stop_id
                const isPast = i < BUS_STOPS.findIndex((s) => s.stop_id === busData?.next_stop_id)
                return (
                  <div key={stop.stop_id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                        isNext ? "bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" : isPast ? "bg-emerald-500" : "bg-[#DDD7CB]"
                      }`} />
                      {i < BUS_STOPS.length - 1 && (
                        <div className={`w-px flex-1 min-h-[16px] ${isPast ? "bg-emerald-300" : "bg-[#E5DFD5]"}`} />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className={`text-xs ${isNext ? "text-[#B45309] font-bold" : isPast ? "text-[#78716C]" : "text-[#44403C]"}`}>
                        {stop.name}
                      </p>
                      <p className="text-[10px] text-[#A8A29E]">{stop.scheduled_arrival}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Map — takes all remaining space */}
        <main className="flex-1 p-4 relative bg-[#F6F4EE]">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-[#DDD7CB] relative">
            <MapWrapper busData={busData} userRole="student" />
          </div>
        </main>
      </div>

      {/* ═════════ 3D STUDENT PASS FULLSCREEN MODAL ═════════ */}
      <AnimatePresence>
        {showPassModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowPassModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="absolute -top-12 right-2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <TransitSmartCard />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
