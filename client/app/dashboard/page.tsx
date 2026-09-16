"use client"

// Student Dashboard — main page after student login
// Left panel: bus status cards, ML prediction, schedule info
// Right panel: the live map (takes up most of the screen)
// Notifications fire when bus is approaching

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bus, MapPin, Clock, Brain, LogOut,
  TrendingUp, AlertTriangle, CheckCircle2, Wifi, WifiOff,
} from "lucide-react"
import { toast } from "sonner"
import LiveMap from "@/components/map/LiveMap"
import TiltCard from "@/components/common/TiltCard"
import { useBusSocket } from "@/hooks/use-bus-socket"
import { BUS_STOPS } from "@/lib/constants"
import { toIST } from "@/lib/mock-data"
import type { BusStop } from "@/types/bus"

export default function StudentDashboard() {
  const router = useRouter()
  const { busData, isConnected } = useBusSocket()
  const [userName, setUserName] = useState("Student")
  const [userStop, setUserStop] = useState<BusStop | null>(null)
  const [alertFired, setAlertFired] = useState(false)

  // Load user info from localStorage (set during login/register)
  useEffect(() => {
    const name = localStorage.getItem("user_name")
    const stopId = localStorage.getItem("user_stop")
    if (name) setUserName(name.split(" ")[0])
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
      // Browser notification (if user granted permission)
      if (Notification.permission === "granted") {
        new Notification("CampusRide Alert", {
          body: `Bus B01 is ${busData.eta_minutes} min away from your stop!`,
          icon: "/favicon.ico",
        })
      }
    }
  }, [busData?.eta_minutes, alertFired])

  // Request browser notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/")
  }

  // Derive the delay status label and color
  const getDelayStatus = () => {
    if (!busData) return { label: "Loading...", color: "text-muted-foreground" }
    const d = busData.delay_minutes
    if (d <= 2)  return { label: "On Time ✓",      color: "text-emerald-400" }
    if (d <= 10) return { label: `${d} min late`,   color: "text-amber-400" }
    return              { label: `${d} min late`,   color: "text-red-400" }
  }

  const delayStatus = getDelayStatus()
  const nextStop = BUS_STOPS.find((s) => s.stop_id === busData?.next_stop_id)
  const mlConfidence = busData?.features?.ml_confidence
    ? Math.round(busData.features.ml_confidence * 100)
    : null

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/5 glass">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center">
            <Bus className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">CampusRide</span>
            <span className="text-xs text-muted-foreground ml-2">Student Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {isConnected
              ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              : <WifiOff className="w-3.5 h-3.5 text-red-400" />
            }
            <span className="text-xs text-muted-foreground hidden sm:block">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          <span className="text-sm text-muted-foreground">Hi, {userName}</span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white border border-white/5 hover:border-white/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main content — side panel + map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — status cards */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3 p-4 border-r border-white/5 overflow-y-auto">

          {/* Your stop info */}
          {userStop && (
            <div className="glass rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-violet-400" />
                <p className="text-xs font-medium text-white">Your Boarding Stop</p>
              </div>
              <p className="text-sm font-semibold text-violet-400">{userStop.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled: {userStop.scheduled_arrival}
              </p>
            </div>
          )}

          {/* Bus status card — with 3D tilt */}
          <TiltCard intensity={8} className="glass rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bus className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-medium text-white">Bus B01 Status</p>
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 pulse-live" />
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Schedule</span>
                <span className={`text-xs font-semibold ${delayStatus.color}`}>{delayStatus.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Speed</span>
                <span className="text-xs font-mono text-white">{busData?.speed_kmh?.toFixed(1) ?? "--"} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Next stop</span>
                <span className="text-xs text-cyan-400 font-medium">{nextStop?.name ?? "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last ping</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {busData ? toIST(busData.timestamp) : "--"}
                </span>
              </div>
            </div>
          </TiltCard>

          {/* ETA card */}
          <motion.div
            animate={busData?.eta_minutes && busData.eta_minutes <= 5 ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: busData?.eta_minutes && busData.eta_minutes <= 5 ? Infinity : 0 }}
            className={`glass rounded-xl border p-4 ${
              busData?.eta_minutes && busData.eta_minutes <= 5
                ? "border-amber-400/30"
                : "border-white/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-medium text-white">Arrival ETA</p>
            </div>
            <p className="text-4xl font-bold text-white">
              {busData?.eta_minutes ?? "--"}
              <span className="text-lg font-normal text-muted-foreground ml-1">min</span>
            </p>
            {busData?.eta_minutes && busData.eta_minutes <= 5 && (
              <p className="text-xs text-amber-400 mt-1 animate-pulse">🚌 Approaching your stop!</p>
            )}
          </motion.div>

          {/* ML prediction card */}
          {mlConfidence !== null && (
            <TiltCard intensity={6} className="glass rounded-xl border border-violet-500/15 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-violet-400" />
                <p className="text-xs font-medium text-white">ML Prediction</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Predicted delay</span>
                  <span className="text-xs font-semibold text-violet-400">
                    {busData?.features?.predicted_delay_minutes ?? 0} min
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <span className="text-xs font-mono text-white">{mlConfidence}%</span>
                  </div>
                  {/* Confidence bar */}
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mlConfidence}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Morning rush</span>
                  <span className={`text-xs font-medium ${busData?.features?.is_morning_rush ? "text-amber-400" : "text-emerald-400"}`}>
                    {busData?.features?.is_morning_rush ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </TiltCard>
          )}

          {/* All stops quick view */}
          <div className="glass rounded-xl border border-white/5 p-4">
            <p className="text-xs font-medium text-white mb-3">Route R01 — All Stops</p>
            <div className="flex flex-col gap-0">
              {BUS_STOPS.map((stop, i) => {
                const isNext = stop.stop_id === busData?.next_stop_id
                const isPast = i < BUS_STOPS.findIndex((s) => s.stop_id === busData?.next_stop_id)
                return (
                  <div key={stop.stop_id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                        isNext ? "bg-cyan-400" : isPast ? "bg-emerald-400/50" : "bg-white/10"
                      }`} />
                      {i < BUS_STOPS.length - 1 && (
                        <div className={`w-px flex-1 min-h-[16px] ${isPast ? "bg-emerald-400/30" : "bg-white/5"}`} />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className={`text-xs ${isNext ? "text-cyan-400 font-semibold" : isPast ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        {stop.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50">{stop.scheduled_arrival}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Map — takes all remaining space */}
        <main className="flex-1 p-4">
          <LiveMap busData={busData} userRole="student" />
        </main>
      </div>
    </div>
  )
}
