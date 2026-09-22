"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bus, MapPin, Clock, Brain, LogOut,
  TrendingUp, AlertTriangle, CheckCircle2, Wifi, WifiOff, Layers,
  CreditCard, X, Sparkles, CloudSun, Bell, Navigation, ChevronRight,
  ShieldCheck, Route as RouteIcon, Info, Compass, Calendar
} from "lucide-react"
import { toast } from "sonner"
import MapWrapper from "@/components/map/MapWrapper"
import RouteInspector from "@/components/landing/RouteInspector"
import TransitSmartCard from "@/components/landing/TransitSmartCard"
import { useBusSocket } from "@/hooks/use-bus-socket"
import { toIST } from "@/lib/formatting"
import { api } from "@/services/api"
import type { BusStop } from "@/types/bus"

type AppAlert = { id: number; busId: string; type: string; status: string; message: string; timestamp: string }

export default function StudentDashboard() {
  const router = useRouter()
  const { busData, isConnected } = useBusSocket()
  const [userName, setUserName] = useState("Student")
  const [alertFired, setAlertFired] = useState(false)
  const [showPassModal, setShowPassModal] = useState(false)
  const [showRoutesModal, setShowRoutesModal] = useState(false)
  const [showAlertsModal, setShowAlertsModal] = useState(false)
  const [mobileTab, setMobileTab] = useState<"map" | "routes" | "alerts" | "pass">("map")
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [route, setRoute] = useState<{name: string; description: string; stops: BusStop[]}>({name: "Route", description: "", stops: []})
  const [persistentAlerts, setPersistentAlerts] = useState<AppAlert[]>([])
  const [simulateReverse, setSimulateReverse] = useState(false)
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    fetch("/api/routes/R01").then(r => r.json()).then((data) => {
      setRoute(data)
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    const name = localStorage.getItem("user_name") || "Student"
    setUserName(name)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadAlerts() {
      const alerts = await api.getAlerts()
      if (!cancelled) setPersistentAlerts(alerts.filter(a => a.status === "ACTIVE"))
    }
    loadAlerts()
    const id = setInterval(loadAlerts, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [busData?.delay_minutes])

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

  const notifiedDelayRef = useRef<number | null>(null)
  useEffect(() => {
    if (!busData) return
    const delay = Math.round(busData.features?.predicted_delay_minutes ?? busData.delay_minutes ?? 0)
    if (Math.abs(delay) < 1 || notifiedDelayRef.current === delay) return
    notifiedDelayRef.current = delay
    const message = delay > 0
      ? `Bus B01 is running ${delay} minute${delay === 1 ? "" : "s"} late.`
      : `Bus B01 is approximately ${Math.abs(delay)} minute${Math.abs(delay) === 1 ? "" : "s"} early.`
    toast.warning(message, { duration: 7000 })
  }, [busData?.delay_minutes, busData?.features?.predicted_delay_minutes])

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

  // Derive delay status from calculated delay (never hard-coded)
  const getDelayStatus = () => {
    if (!busData) return { label: "ON TIME · 0 min", color: "text-emerald-700 bg-emerald-50 border-emerald-200", tone: "good" as const }
    const d = Math.round(busData.features?.predicted_delay_minutes ?? busData.delay_minutes ?? 0)
    if (Math.abs(d) < 1) return { label: "ON TIME · 0 min", color: "text-emerald-700 bg-emerald-50 border-emerald-200", tone: "good" as const }
    if (d > 0) return { label: `DELAYED · +${d} min`, color: "text-red-700 bg-red-50 border-red-200", tone: "bad" as const }
    return { label: `EARLY · ${Math.abs(d)} min early`, color: "text-emerald-700 bg-emerald-50 border-emerald-200", tone: "good" as const }
  }

  const delayStatus = getDelayStatus()
  const nextStop = busData?.next_stop ?? { name: "Loading route stop" }
  const currentStopName = busData?.current_stop?.name
  const dynamicEta = busData?.eta_minutes ?? 0
  const predictedDelay = Math.round(busData?.features?.predicted_delay_minutes ?? busData?.delay_minutes ?? 0)

  const routeStops = (route as any)?.stops as Array<{ name: string; stopId?: string }> | undefined
  const routeSource = routeStops?.[0]?.name || "Source"
  const routeDestination = routeStops?.[routeStops.length - 1]?.name || "Destination"

  const handleSimulate = async () => {
    try {
      setSimulating(true)
      const result = await api.simulateB01(simulateReverse)
      toast.success(result.message || "B01 simulation started")
      setSimulateReverse(!simulateReverse)
      const alerts = await api.getAlerts()
      setPersistentAlerts(alerts.filter(a => a.status === "ACTIVE"))
    } catch (e: any) {
      toast.error(e?.message || "Simulation failed")
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="h-[100svh] w-full flex flex-col bg-parchment text-espresso overflow-hidden font-sans select-none">
      {/* Top bar — Minimalist Warm Header */}
      

      {/* Main Full-Screen Map Container */}
      <main className="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Full-bleed Map */}
        <div className="absolute inset-0 w-full h-full z-0">
          <MapWrapper busData={busData} userRole="student" />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            DESKTOP FLOATING PANELS ARCHITECTURE
            Left: ETA + Status Card (Primary)
            Right: Weather + Alerts + Quick Stops
        ════════════════════════════════════════════════════════════════════ */}
        
        {/* Desktop Left: compact horizontal glass transport card */}
        <div className="hidden lg:flex flex-col gap-3 absolute bottom-8 left-8 z-20 w-[min(640px,calc(100vw-22rem))] max-h-[calc(100vh-7rem)] pointer-events-auto">
          {/* Persistent in-app alerts (not toast-only) */}
          {persistentAlerts.length > 0 && (
            <div className="flex flex-col gap-2">
              {persistentAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white/95 backdrop-blur-md rounded-xl border border-red-200 shadow-md px-3 py-2.5 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-espresso truncate">🚌 {alert.message}</p>
                    <p className="text-[10px] text-stone-text mt-0.5">{alert.type} · {toIST(alert.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg overflow-hidden"
            style={{ backdropFilter: "blur(16px)" }}
          >
            <div className="flex flex-row items-stretch min-h-[168px]">
              <div className="w-1.5 bg-terracotta shrink-0" />

              <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-terracotta text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      B01
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-espresso truncate">{route.name || "Route R01"}</h2>
                      <p className="text-[11px] text-stone-text truncate">{routeSource} → {routeDestination}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${delayStatus.color}`}>
                    {delayStatus.label}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-text">Estimated Arrival</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-4xl font-extrabold text-espresso font-serif">{dynamicEta || "--"}</span>
                      <span className="text-sm font-semibold text-stone-text">min away</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-text">
                      {currentStopName && (
                        <span>Current: <strong className="text-espresso">{currentStopName}</strong></span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-terracotta" />
                        Next: <strong className="text-espresso">{nextStop.name}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 shrink-0 w-[220px]">
                    <div className="bg-white/70 p-2 rounded-xl border border-stone-subtle">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-stone-text">Speed</span>
                      <p className="text-sm font-bold text-espresso font-mono mt-0.5">
                        {busData?.speed_kmh?.toFixed(1) ?? "--"} <span className="text-[10px] font-normal text-stone-text">km/h</span>
                      </p>
                    </div>
                    <div className="bg-white/70 p-2 rounded-xl border border-stone-subtle">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-stone-text">Transport Status</span>
                      <p className={`text-[11px] font-bold mt-0.5 ${delayStatus.tone === "bad" ? "text-red-700" : "text-emerald-700"}`}>
                        {delayStatus.label}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-subtle/70">
                  <div className="flex items-center gap-3 text-[11px] text-stone-text min-w-0">
                    <span className="flex items-center gap-1 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                      Live GPS
                    </span>
                    <span className="font-mono text-[10px] truncate">{busData ? toIST(busData.timestamp) : "--"}</span>
                    <span className="truncate hidden xl:inline">
                      Upcoming: {(busData?.upcoming_stops ?? []).slice(0, 3).map(s => s.name).join(" · ") || "—"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-espresso text-white hover:bg-stone-dark disabled:opacity-60 transition-colors"
                  >
                    {simulating ? "Starting…" : simulateReverse ? "SIMULATE B01 ←" : "SIMULATE B01 →"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Route Corridor Trigger Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            onClick={() => setShowRoutesModal(true)}
            className="bg-parchment/95 backdrop-blur-md rounded-xl border border-stone-subtle p-3 shadow-md flex items-center justify-between hover:bg-parchment-warm transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-transitblue-soft text-transitblue">
                <RouteIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-espresso">Inspect Corridor Stops & Schedule</p>
                <p className="text-[10px] text-stone-text">Live ETAs from the same road-distance pipeline</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-text group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </div>

        {/* Desktop Right: Secondary Floating Overlays (Weather + Active Alerts) */}
        <div className="hidden lg:flex flex-col gap-3 absolute top-6 right-6 z-20 w-72 pointer-events-auto">
          {/* Weather Widget */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-parchment/95 backdrop-blur-md rounded-2xl border border-stone-subtle p-4 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                <CloudSun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-espresso">Kolkata Campus</p>
                <p className="text-[11px] text-stone-text">31°C · Clear Sky</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-white px-2 py-1 rounded-md border border-stone-subtle text-stone-dark">
              UV 4 Mod
            </span>
          </motion.div>

          {/* Campus Transit Alerts Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-parchment/95 backdrop-blur-md rounded-2xl border border-stone-subtle p-4 shadow-lg flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-espresso flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-terracotta" />
                Transit Advisory
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${delayStatus.color}`}>
                {delayStatus.label}
              </span>
            </div>
            <p className="text-xs text-stone-dark leading-relaxed">
              {persistentAlerts[0]?.message
                || (predictedDelay > 0
                  ? `Calculated delay of +${predictedDelay} min is reflected in ETA and status.`
                  : "Corridor flowing normally. Live ETA tracks remaining OSRM road distance.")}
            </p>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            MOBILE FLOATING BOTTOM CAROUSEL & NAVIGATION
            Swipeable Card Carousel: [ ETA ] • ○ ○ → ○ [ Weather ] ○ → ○ ○ [ Events ]
        ════════════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden absolute bottom-16 left-0 right-0 z-20 px-4 pointer-events-auto">
          <div className="max-w-md mx-auto flex flex-col gap-2">
            {/* Carousel Container */}
            <div className="relative overflow-hidden rounded-2xl bg-parchment/95 backdrop-blur-md border border-stone-subtle shadow-xl p-4 min-h-[160px]">
              {carouselIndex === 0 && (
                <motion.div
                  key="eta"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-terracotta text-white rounded font-bold text-[11px]">B01</span>
                      <span className="text-xs font-bold text-espresso">Route R01 Express</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${delayStatus.color}`}>
                      {delayStatus.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-text">Arriving In</span>
                      <p className="text-3xl font-extrabold text-espresso font-serif">
                        {dynamicEta} <span className="text-xs font-normal text-stone-text font-sans">min</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-text">Next Stop</span>
                      <p className="text-xs font-bold text-terracotta">{nextStop.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-subtle text-stone-text">
                    <span>Speed: <strong>{busData?.speed_kmh?.toFixed(0) ?? "24"} km/h</strong></span>
                    <span>Status: <strong>{delayStatus.label}</strong></span>
                  </div>
                </motion.div>
              )}

              {carouselIndex === 1 && (
                <motion.div
                  key="weather"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CloudSun className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-espresso">Campus Micro-Climate</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      Moderate UV
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div>
                      <p className="text-3xl font-extrabold text-espresso font-serif">31°C</p>
                      <p className="text-xs text-stone-text">Clear sky · Light breeze</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5 text-stone-dark">
                      <p>Humidity: <strong>68%</strong></p>
                      <p>Visibility: <strong>8.5 km</strong></p>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-text pt-2 border-t border-stone-subtle">
                    Pleasant transit conditions across Behala corridor.
                  </p>
                </motion.div>
              )}

              {carouselIndex === 2 && (
                <motion.div
                  key="alerts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-terracotta" />
                      <span className="text-xs font-bold text-espresso">Campus Event / Transit Notice</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Normal Ops
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-espresso">Morning Gate Schedule</p>
                    <p className="text-xs text-stone-dark">
                      Buses running on primary corridor. Special TechFest shuttle begins at 2:00 PM.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-stone-subtle text-stone-text">
                    <span>Advisory ID: CR-2026-09</span>
                    <span>Valid until 6:00 PM</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Carousel Pagination Dots */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    carouselIndex === idx ? "w-6 bg-terracotta" : "w-2 bg-stone-medium hover:bg-stone-dark"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-parchment/95 backdrop-blur-md border-t border-stone-subtle flex items-center justify-around z-30 px-2">
          <button
            onClick={() => {
              setMobileTab("map")
              setCarouselIndex(0)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "map" ? "text-terracotta font-bold" : "text-stone-text"
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Live Map</span>
          </button>

          <button
            onClick={() => {
              setMobileTab("routes")
              setShowRoutesModal(true)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "routes" ? "text-terracotta font-bold" : "text-stone-text"
            }`}
          >
            <RouteIcon className="w-4 h-4" />
            <span>Routes</span>
          </button>

          <button
            onClick={() => {
              setMobileTab("alerts")
              setShowAlertsModal(true)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "alerts" ? "text-terracotta font-bold" : "text-stone-text"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
          </button>

          <button
            onClick={() => {
              setMobileTab("pass")
              setShowPassModal(true)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "pass" ? "text-terracotta font-bold" : "text-stone-text"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>My Pass</span>
          </button>
        </nav>
      </main>

      {/* ═════════ 3D STUDENT PASS FULLSCREEN MODAL ═════════ */}
      <AnimatePresence>
        {showPassModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-md"
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
                className="absolute -top-12 right-2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-all shadow-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <TransitSmartCard
                userName={userName}
                dynamicEta={dynamicEta}
                speed={busData?.speed_kmh || 0}
                predictedDelay={predictedDelay}
                routeName={route.name || "Route R01"}
                sourceName={routeSource}
                destName={routeDestination}
                statusLabel={delayStatus.label}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════ ROUTES & STOPS MODAL ═════════ */}
      <AnimatePresence>
        {showRoutesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-md"
            onClick={() => setShowRoutesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-parchment rounded-2xl border border-stone-subtle shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-subtle mb-4">
                <div>
                  <h3 className="text-lg font-bold text-espresso font-serif">Route R01 Corridor Stops</h3>
                  <p className="text-xs text-stone-text">5 Main Stops & Scheduled Timepoints</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoutesModal(false)}
                  className="w-8 h-8 rounded-lg bg-stone-subtle hover:bg-stone-medium flex items-center justify-center text-espresso transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <RouteInspector isEmbedded={true} mlConfidenceStr={delayStatus.label} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════ ALERTS & ADVISORY MODAL ═════════ */}
      <AnimatePresence>
        {showAlertsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-md"
            onClick={() => setShowAlertsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-parchment rounded-2xl border border-stone-subtle shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-subtle mb-4">
                <div>
                  <h3 className="text-lg font-bold text-espresso font-serif">Transit Advisories</h3>
                  <p className="text-xs text-stone-text">Live updates from Campus Dispatch</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlertsModal(false)}
                  className="w-8 h-8 rounded-lg bg-stone-subtle hover:bg-stone-medium flex items-center justify-center text-espresso transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {persistentAlerts.length === 0 && (
                  <div className="p-3 bg-white rounded-xl border border-stone-subtle">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${delayStatus.color}`}>
                      {delayStatus.label}
                    </span>
                    <p className="text-xs font-bold text-espresso mt-2">No active delay alerts</p>
                    <p className="text-xs text-stone-dark mt-1">
                      Calculated transport status mirrors the live ETA pipeline.
                    </p>
                  </div>
                )}
                {persistentAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-white rounded-xl border border-red-200">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-800 rounded border border-red-200">
                      {alert.type}
                    </span>
                    <p className="text-xs font-bold text-espresso mt-2">{alert.message}</p>
                    <p className="text-[10px] text-stone-text mt-1">{toIST(alert.timestamp)}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
