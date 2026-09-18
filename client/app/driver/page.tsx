"use client"

// Driver Dashboard — different view from student
// Driver sees: the full pickup route with all student stops
// Traffic warnings, alternate route suggestion, schedule adherence
// The map shows student home pickup points, not just campus stops

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bus, Route, Clock, AlertTriangle, LogOut,
  CheckCircle2, Users, Wifi, WifiOff, TrendingDown,
  Zap, Layers,
} from "lucide-react"
import { toast } from "sonner"
import MapWrapper from "@/components/map/MapWrapper"
import TiltCard from "@/components/common/TiltCard"
import { useBusSocket } from "@/hooks/use-bus-socket"
import { BUS_STOPS } from "@/lib/constants"
import { toIST } from "@/lib/mock-data"

// Simulated pickup list — in production this comes from the backend
const PICKUP_LIST = [
  { name: "Rahul Das",       stop: "Tollygunge Metro",    time: "08:00 AM", status: "picked" },
  { name: "Priya Sharma",    stop: "Behala Chowrasta",    time: "08:10 AM", status: "picked" },
  { name: "Ananya Roy",      stop: "New Alipore Gate",    time: "08:20 AM", status: "next" },
  { name: "Sudipta Ghosh",   stop: "Majerhat Station",    time: "08:28 AM", status: "pending" },
  { name: "Rimi Chatterjee", stop: "Garden Reach Crossing",time: "08:35 AM", status: "pending" },
]

export default function DriverDashboard() {
  const router = useRouter()
  const { busData, isConnected } = useBusSocket()
  const [driverName, setDriverName] = useState("Driver")
  const [trafficWarning, setTrafficWarning] = useState(false)
  const [driverRouteVariant, setDriverRouteVariant] = useState<"standard" | "traffic_alternate">("standard")

  useEffect(() => {
    const name = localStorage.getItem("user_name")
    if (name) setDriverName(name.split(" ")[0])
  }, [])

  // Simulate a traffic warning that appears mid-route
  useEffect(() => {
    const timer = setTimeout(() => {
      setTrafficWarning(true)
      toast.warning("⚠️ Heavy traffic detected near Diamond Harbour Road. Consider alternate route via Taratala.", {
        duration: 10000,
      })
    }, 15000)  // fires 15 seconds after dashboard opens
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/")
  }

  const pickedCount = PICKUP_LIST.filter((p) => p.status === "picked").length
  const scheduleAheadBehind = busData
    ? busData.delay_minutes <= 2
      ? "On schedule"
      : busData.delay_minutes <= 0
      ? `${Math.abs(busData.delay_minutes)} min ahead`
      : `${busData.delay_minutes} min behind`
    : "--"

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/5 glass">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Bus className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">CampusRide</span>
            <span className="text-xs text-muted-foreground ml-2">Driver Console</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400" />
          }
          <span className="text-sm text-muted-foreground">Hi, {driverName}</span>
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/40 bg-cyan-500/5 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Analytics Hub</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white border border-white/5 hover:border-white/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">End Trip</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3 p-4 border-r border-white/5 overflow-y-auto">

          {/* Trip summary */}
          <TiltCard intensity={8} className="glass rounded-xl border border-amber-400/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-medium text-white">Trip Summary</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Bus</span>
                <span className="text-xs font-semibold text-white">B01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Route</span>
                <span className="text-xs text-amber-400 font-medium">Tollygunge → STCET</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Schedule</span>
                <span className={`text-xs font-semibold ${busData?.delay_minutes && busData.delay_minutes > 2 ? "text-red-400" : "text-emerald-400"}`}>
                  {scheduleAheadBehind}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Speed</span>
                <span className="text-xs font-mono text-white">{busData?.speed_kmh?.toFixed(1) ?? "--"} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Last GPS</span>
                <span className="text-xs font-mono text-muted-foreground">{busData ? toIST(busData.timestamp) : "--"}</span>
              </div>
            </div>
          </TiltCard>

          {/* Traffic warning card */}
          {trafficWarning && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-xl border border-red-400/30 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-semibold text-red-400">Traffic Alert</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Heavy congestion detected near Diamond Harbour Road.
              </p>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested alternate</p>
                <p className="text-xs text-emerald-400 font-medium">Via Taratala Road → saves ~8 min</p>
              </div>
              <button
                onClick={() =>
                  setDriverRouteVariant(
                    driverRouteVariant === "standard" ? "traffic_alternate" : "standard"
                  )
                }
                className="mt-3 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {driverRouteVariant === "traffic_alternate"
                  ? "Revert to Primary Route"
                  : "Engage AI Alternate Route"}
              </button>
            </motion.div>
          )}

          {/* Pickup progress */}
          <div className="glass rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-medium text-white">Student Pickups</p>
              </div>
              <span className="text-xs text-muted-foreground">{pickedCount}/{PICKUP_LIST.length}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(pickedCount / PICKUP_LIST.length) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              {PICKUP_LIST.map((student) => (
                <div key={student.name} className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    student.status === "picked"
                      ? "bg-emerald-400"
                      : student.status === "next"
                      ? "bg-cyan-400 pulse-live"
                      : "bg-white/10"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${student.status === "picked" ? "text-muted-foreground line-through" : "text-white"}`}>
                      {student.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{student.stop}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{student.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next stop */}
          <div className="glass rounded-xl border border-cyan-400/15 p-4">
            <p className="text-xs text-muted-foreground mb-1.5">Next Pickup Stop</p>
            {(() => {
              const next = BUS_STOPS.find((s) => s.stop_id === busData?.next_stop_id)
              return next ? (
                <>
                  <p className="text-sm font-semibold text-cyan-400">{next.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Scheduled: {next.scheduled_arrival}</p>
                  <p className="text-xs text-white mt-1 font-medium">ETA: {busData?.eta_minutes ?? "--"} min</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Calculating...</p>
              )
            })()}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 p-4">
          <MapWrapper
            busData={busData}
            userRole="driver"
            activeRouteVariant={driverRouteVariant}
            onToggleRouteVariant={setDriverRouteVariant}
          />
        </main>
      </div>
    </div>
  )
}
