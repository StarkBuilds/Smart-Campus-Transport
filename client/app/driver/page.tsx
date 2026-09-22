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
import { toIST } from "@/lib/formatting"

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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#F6F4EE] text-[#1C1917] overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left panel */}
        <aside className="w-full md:w-72 flex-shrink-0 flex flex-col gap-3 p-4 border-b md:border-b-0 md:border-r border-[#DDD7CB] bg-[#FAF8F5] max-h-[36vh] md:max-h-none overflow-y-auto custom-scrollbar">

          {/* Trip summary */}
          <TiltCard intensity={6} className="bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-[#B45309]" />
              <p className="text-xs font-semibold text-[#1C1917]">Trip Summary</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-[#78716C]">Bus</span>
                <span className="text-xs font-bold text-[#1C1917]">B01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#78716C]">Route</span>
                <span className="text-xs text-[#B45309] font-bold">Tollygunge → STCET</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#78716C]">Schedule</span>
                <span className={`text-xs font-bold ${busData?.delay_minutes && busData.delay_minutes > 2 ? "text-red-600" : "text-emerald-700"}`}>
                  {scheduleAheadBehind}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#78716C]">Speed</span>
                <span className="text-xs font-mono font-bold text-[#1C1917]">{busData?.speed_kmh?.toFixed(1) ?? "--"} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#78716C]">Last GPS</span>
                <span className="text-xs font-mono text-[#78716C]">{busData ? toIST(busData.timestamp) : "--"}</span>
              </div>
            </div>
          </TiltCard>

          {/* Traffic warning card */}
          {trafficWarning && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#FEF2F2] rounded-xl border border-red-200 p-4 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs font-bold text-red-700">Traffic Alert</p>
              </div>
              <p className="text-xs text-[#78716C] mb-3">
                Heavy congestion detected near Diamond Harbour Road.
              </p>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-[#78716C] uppercase tracking-wider font-bold">Suggested alternate</p>
                <p className="text-xs text-emerald-800 font-bold">Via Taratala Road → saves ~8 min</p>
              </div>
              <button
                onClick={() =>
                  setDriverRouteVariant(
                    driverRouteVariant === "standard" ? "traffic_alternate" : "standard"
                  )
                }
                className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  driverRouteVariant === "traffic_alternate"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-current" />
                {driverRouteVariant === "traffic_alternate"
                  ? "✓ AI Detour Active (Revert to Primary)"
                  : "Engage AI Detour (Violet ~8 min saved)"}
              </button>
            </motion.div>
          )}

          {/* Pickup progress */}
          <div className="bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#B45309]" />
                <p className="text-xs font-semibold text-[#1C1917]">Student Pickups</p>
              </div>
              <span className="text-xs font-bold text-[#78716C]">{pickedCount}/{PICKUP_LIST.length}</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#E5DFD5] rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(pickedCount / PICKUP_LIST.length) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#D97706] to-emerald-500 rounded-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              {PICKUP_LIST.map((student) => (
                <div key={student.name} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    student.status === "picked"
                      ? "bg-emerald-500"
                      : student.status === "next"
                      ? "bg-[#F59E0B] pulse-live shadow-[0_0_6px_#F59E0B]"
                      : "bg-[#DDD7CB]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${student.status === "picked" ? "text-[#A8A29E] line-through" : "text-[#1C1917] font-medium"}`}>
                      {student.name}
                    </p>
                    <p className="text-[10px] text-[#78716C] truncate">{student.stop}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#78716C] flex-shrink-0">{student.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next stop */}
          <div className="bg-white rounded-xl border border-[#DDD7CB] p-4 shadow-xs">
            <p className="text-xs font-semibold text-[#78716C] mb-1.5">Next Pickup Stop</p>
            {(() => {
              const next = BUS_STOPS.find((s) => s.stop_id === busData?.next_stop_id)
              return next ? (
                <>
                  <p className="text-sm font-bold text-[#B45309]">{next.name}</p>
                  <p className="text-xs text-[#78716C] mt-0.5">Scheduled: {next.scheduled_arrival}</p>
                  <p className="text-xs text-[#1C1917] mt-1 font-bold">ETA: {busData?.eta_minutes ?? "--"} min</p>
                </>
              ) : (
                <p className="text-xs text-[#78716C]">Calculating...</p>
              )
            })()}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 p-4 relative bg-[#F6F4EE]">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-[#DDD7CB] relative">
            <MapWrapper
              busData={busData}
              userRole="driver"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
