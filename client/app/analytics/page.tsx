"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { gsap } from "gsap"
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts"
import {
  Bus,
  Activity,
  Cpu,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowLeft,
  Share2,
  Download,
  Layers,
  Sparkles,
  Zap,
  Gauge,
  Compass,
} from "lucide-react"
import {
  HOURLY_TELEMETRY_DATA,
  STOP_ARRIVAL_VARIANCES,
  FLEET_ROUTES_DATA,
  PIPELINE_DIAGNOSTICS,
  SPEED_CONFIDENCE_SCATTER,
} from "@/lib/analytics-data"

export default function AnalyticsPage() {
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL")
  const [activeTab, setActiveTab] = useState<"confidence" | "variance" | "rush" | "physics">("confidence")
  const [timeFilter, setTimeFilter] = useState<"ALL" | "MORNING" | "EVENING">("ALL")

  // GSAP Counter Refs
  const countPingsRef = useRef<HTMLSpanElement>(null)
  const countPassRateRef = useRef<HTMLSpanElement>(null)
  const countConfRef = useRef<HTMLSpanElement>(null)
  const countSpeedRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // GSAP Entry and Number Counter Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Numbers ticker
      const pingsObj = { val: 0 }
      gsap.to(pingsObj, {
        val: PIPELINE_DIAGNOSTICS.valid_pings_processed,
        duration: 1.8,
        ease: "power2.out",
        onUpdate: () => {
          if (countPingsRef.current) {
            countPingsRef.current.innerText = Math.floor(pingsObj.val).toLocaleString()
          }
        },
      })

      const passRateObj = { val: 0 }
      gsap.to(passRateObj, {
        val: PIPELINE_DIAGNOSTICS.pipeline_pass_rate_pct,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
          if (countPassRateRef.current) {
            countPassRateRef.current.innerText = passRateObj.val.toFixed(1) + "%"
          }
        },
      })

      const confObj = { val: 0 }
      gsap.to(confObj, {
        val: 72.4,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          if (countConfRef.current) {
            countConfRef.current.innerText = confObj.val.toFixed(1) + "%"
          }
        },
      })

      const speedObj = { val: 0 }
      gsap.to(speedObj, {
        val: 31.4,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          if (countSpeedRef.current) {
            countSpeedRef.current.innerText = speedObj.val.toFixed(1) + " km/h"
          }
        },
      })

      // Staggered cards entrance
      gsap.from(".analytics-card", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  // Filtered Hourly Data based on Time filter
  const filteredHourlyData = HOURLY_TELEMETRY_DATA.filter((point) => {
    if (timeFilter === "MORNING") return point.hour >= 7 && point.hour <= 11
    if (timeFilter === "EVENING") return point.hour >= 16 && point.hour <= 20
    return true
  })

  // Selected Route Details
  const currentRouteInfo =
    selectedRoute === "ALL"
      ? {
          name: "All Kolkata Transit Fleets",
          avg_speed: "31.2 km/h",
          reliability: "86.4%",
          active_count: 10,
        }
      : {
          name: FLEET_ROUTES_DATA.find((r) => r.route_id === selectedRoute)?.route_name || selectedRoute,
          avg_speed: `${FLEET_ROUTES_DATA.find((r) => r.route_id === selectedRoute)?.avg_speed_kmh} km/h`,
          reliability: `${FLEET_ROUTES_DATA.find((r) => r.route_id === selectedRoute)?.on_time_reliability_pct}%`,
          active_count: FLEET_ROUTES_DATA.find((r) => r.route_id === selectedRoute)?.bus_count || 1,
        }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050814] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Glow Ambient Bacgkrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 h-16 border-b border-white/5 glass px-5 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all bg-white/[0.02]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Live Radar</span>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center glow-cyan">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">Transit Intelligence Hub</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  ML v2.4 (C++ FFI)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                STCET Kolkata Route 1 & Arterial Transit Analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Polars Physics Engine: 24,375 Events Synced
          </div>

          <Link
            href="/driver"
            className="text-xs px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 transition-all font-medium"
          >
            Driver Console
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        {/* KPI Metric Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="analytics-card glass rounded-2xl border border-white/5 p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Valid Telemetry Rows</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span ref={countPingsRef} className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                0
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              625 jump anomalies filtered
            </p>
          </div>

          <div className="analytics-card glass rounded-2xl border border-white/5 p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Pipeline Pass Rate</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span ref={countPassRateRef} className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                0%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
              Polars lazy scan &bull; 1.4ms latency
            </p>
          </div>

          <div className="analytics-card glass rounded-2xl border border-white/5 p-4 sm:p-5 relative overflow-hidden group hover:border-violet-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">ML Model Confidence</span>
              <Gauge className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span ref={countConfRef} className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                0%
              </span>
            </div>
            <p className="text-[11px] text-violet-300 mt-1.5 font-mono">
              Sigmoid FFI &bull; speed vs hour weight
            </p>
          </div>

          <div className="analytics-card glass rounded-2xl border border-white/5 p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Fleet Ground Velocity</span>
              <Compass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span ref={countSpeedRef} className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                0 km/h
              </span>
            </div>
            <p className="text-[11px] text-amber-300 mt-1.5 font-mono">
              Haversine calculated &bull; 6 lines
            </p>
          </div>
        </section>

        {/* Filters & Route Pill Selection Bar */}
        <section className="analytics-card glass rounded-2xl border border-white/5 p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Route selector buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs text-muted-foreground uppercase font-mono mr-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Route:
            </span>
            <button
              onClick={() => setSelectedRoute("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedRoute === "ALL"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan"
                  : "bg-white/5 text-muted-foreground hover:text-white border border-transparent"
              }`}
            >
              All Routes
            </button>
            {FLEET_ROUTES_DATA.map((route) => (
              <button
                key={route.route_id}
                onClick={() => setSelectedRoute(route.route_id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  selectedRoute === route.route_id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-white/5 text-muted-foreground hover:text-white border border-transparent"
                }`}
              >
                {route.route_id}
              </button>
            ))}
          </div>

          {/* Time Filter Scope */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
            <span className="text-xs text-muted-foreground uppercase font-mono mr-1">Scope:</span>
            {(["ALL", "MORNING", "EVENING"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  timeFilter === filter
                    ? "bg-white/15 text-white font-semibold border border-white/20"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {filter === "ALL" ? "24h Cycle" : filter === "MORNING" ? "Peak 07-11 AM" : "Peak 04-08 PM"}
              </button>
            ))}
          </div>
        </section>

        {/* Analytics Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: "confidence", label: "ML Confidence vs Velocity Curve", icon: Activity },
            { id: "variance", label: "Stop-by-Stop Delay Variance", icon: Clock },
            { id: "rush", label: "Rush Hour Delay Heatmap", icon: AlertTriangle },
            { id: "physics", label: "Kinematics & Physics Engine Log", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white/10 text-white border border-white/15 glow-card"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-muted-foreground"}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab 1: ML Confidence vs Velocity Regression Curve */}
        {activeTab === "confidence" && (
          <div className="flex flex-col gap-6">
            <div className="analytics-card glass rounded-2xl border border-white/5 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    ML Forecast Confidence vs. Average Fleet Velocity
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Demonstrates the inverse relationship: When road speeds drop in Kolkata congestion, model confidence boundaries widen.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Velocity (km/h)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Confidence (%)
                  </span>
                </div>
              </div>

              <div className="h-[360px] min-h-[360px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360}>
                  <ComposedChart data={filteredHourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C8FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00C8FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#00C8FF" fontSize={11} tickLine={false} domain={[0, 50]} unit="km/h" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={11} tickLine={false} domain={[30, 100]} unit="%" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass p-3 rounded-xl border border-white/10 text-xs shadow-2xl">
                              <p className="font-bold text-white mb-1.5">{label}</p>
                              <p className="text-cyan-400 font-mono">Velocity: {payload[0]?.value} km/h</p>
                              <p className="text-emerald-400 font-mono">ML Confidence: {payload[1]?.value}%</p>
                              <p className="text-muted-foreground text-[10px] mt-1">
                                Bounds: {payload[1]?.payload?.confidence_lower_bound}% – {payload[1]?.payload?.confidence_upper_bound}%
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="ml_confidence_pct"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#confGradient)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="avg_speed_kmh"
                      stroke="#00C8FF"
                      strokeWidth={2.5}
                      dot={{ fill: "#00C8FF", r: 3 }}
                      activeDot={{ r: 5, stroke: "#fff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scatter Correlation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground text-xs uppercase font-mono">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Free-Flow Condition
                </div>
                <div className="text-sm font-semibold text-white">Speeds &gt; 35 km/h</div>
                <p className="text-xs text-muted-foreground mt-1">
                  At 41.8 km/h, ML confidence peaks at <strong className="text-emerald-400 font-mono">78.4%</strong> with delay variance under 45 seconds.
                </p>
              </div>

              <div className="glass rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground text-xs uppercase font-mono">
                  <TrendingDown className="w-4 h-4 text-amber-400" /> Moderate Choke Point
                </div>
                <div className="text-sm font-semibold text-white">Speeds 22–30 km/h</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average stop delay stabilizes around <strong className="text-amber-400 font-mono">4.2 min</strong> with 64.0% model confidence.
                </p>
              </div>

              <div className="glass rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground text-xs uppercase font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Gridlock Congestion
                </div>
                <div className="text-sm font-semibold text-white">Speeds &lt; 18 km/h</div>
                <p className="text-xs text-muted-foreground mt-1">
                  During 09:00 AM Majerhat rush, speed plummets to 18.2 km/h and delay extends to <strong className="text-red-400 font-mono">+9.8 min</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stop-by-Stop Delay Variance */}
        {activeTab === "variance" && (
          <div className="flex flex-col gap-6">
            <div className="analytics-card glass rounded-2xl border border-white/5 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Scheduled Timetable vs. Actual GPS Arrival Delay (Kolkata Transit Corridor)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Variance measured in minutes across STCET Line 1 stops from Tollygunge Metro to Khidderpore Gate.
                  </p>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Peak Bottleneck: <span className="text-red-400 font-bold">Majerhat & Garden Reach</span>
                </div>
              </div>

              <div className="h-[360px] min-h-[360px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360}>
                  <BarChart data={STOP_ARRIVAL_VARIANCES} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="stop_name"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" min" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as (typeof STOP_ARRIVAL_VARIANCES)[0]
                          return (
                            <div className="glass p-3 rounded-xl border border-white/10 text-xs shadow-2xl">
                              <p className="font-bold text-white mb-1">{data.stop_name}</p>
                              <div className="flex flex-col gap-1 font-mono">
                                <span className="text-muted-foreground">Scheduled: {data.scheduled_time}</span>
                                <span className="text-cyan-400">Actual GPS: {data.actual_time}</span>
                                <span className="text-red-400 font-bold">Delay: +{data.delay_minutes} min</span>
                                <span className="text-emerald-400">Waiting Passengers: {data.boarding_passengers}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="delay_minutes" radius={[6, 6, 0, 0]}>
                      {STOP_ARRIVAL_VARIANCES.map((entry, index) => {
                        const color =
                          entry.delay_minutes > 7 ? "#EF4444" : entry.delay_minutes > 4 ? "#F59E0B" : "#10B981"
                        return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stop breakdown table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/5 text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="p-3.5">Stop Name</th>
                    <th className="p-3.5">Scheduled</th>
                    <th className="p-3.5">Actual GPS</th>
                    <th className="p-3.5">Delay Variance</th>
                    <th className="p-3.5">Congestion Level</th>
                    <th className="p-3.5 text-right">Student Queue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {STOP_ARRIVAL_VARIANCES.map((stop) => (
                    <tr key={stop.stop_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-sans font-medium text-white">{stop.stop_name}</td>
                      <td className="p-3.5 text-muted-foreground">{stop.scheduled_time}</td>
                      <td className="p-3.5 text-cyan-400">{stop.actual_time}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            stop.delay_minutes > 7
                              ? "bg-red-500/15 text-red-400"
                              : stop.delay_minutes > 4
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          +{stop.delay_minutes} min
                        </span>
                      </td>
                      <td className="p-3.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                        {stop.traffic_level}
                      </td>
                      <td className="p-3.5 text-right text-white font-bold">{stop.boarding_passengers} students</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Rush Hour Delay Heatmap */}
        {activeTab === "rush" && (
          <div className="flex flex-col gap-6">
            <div className="analytics-card glass rounded-2xl border border-white/5 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Hourly Delay Surge & Congestion Intensity (24h Fleet Timeline)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Highlights the dual Kolkata transit surges: Morning College Rush (08:00 - 10:00 AM) and Evening Return Fleet (05:00 - 07:00 PM).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Peak Congestion (&gt;6 min)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Normal Flow
                  </span>
                </div>
              </div>

              <div className="h-[360px] min-h-[360px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360}>
                  <AreaChart data={HOURLY_TELEMETRY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="delaySurgeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" min" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0]?.value as number
                          return (
                            <div className="glass p-3 rounded-xl border border-white/10 text-xs shadow-2xl">
                              <p className="font-bold text-white mb-1">{label}</p>
                              <p className={`font-mono font-bold ${val > 6 ? "text-red-400" : "text-emerald-400"}`}>
                                Delay: +{val} minutes
                              </p>
                              <p className="text-muted-foreground text-[10px] mt-0.5">
                                Active Fleet Buses: {payload[0]?.payload?.active_buses}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="delay_minutes"
                      stroke="#EF4444"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#delaySurgeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Route Comparative Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {FLEET_ROUTES_DATA.map((route) => (
                <div
                  key={route.route_id}
                  className="glass rounded-xl border border-white/5 p-3.5 flex flex-col justify-between hover:border-white/15 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono text-cyan-400">{route.route_id}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{route.bus_count} buses</span>
                    </div>
                    <p className="text-xs text-white font-medium truncate">{route.route_name}</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Reliability:</span>
                    <span className="text-emerald-400 font-bold">{route.on_time_reliability_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Kinematics & Physics Engine Log */}
        {activeTab === "physics" && (
          <div className="flex flex-col gap-6">
            <div className="analytics-card glass rounded-2xl border border-white/5 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-base font-semibold text-white">
                    Polars Lazy Physics Engine &amp; C++ FFI Architecture
                  </h3>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  libinference.so &bull; Sigmoid Perceptron
                </span>
              </div>

              {/* Terminal code snippet view */}
              <div className="bg-[#030611] rounded-xl border border-white/10 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <div className="text-muted-foreground mb-2">// Active Mathematical Formulas Executed per Telemetry Ping:</div>
                <p className="text-cyan-300">
                  1. Haversine Metric: d = 2R &middot; arcsin(&radic;(sin&sup2;(&Delta;lat/2) + cos(lat1)&middot;cos(lat2)&middot;sin&sup2;(&Delta;lon/2)))
                </p>
                <p className="text-emerald-300 mt-1">
                  2. Ground Velocity: v = distance_from_last_ping_meters / time_delta_seconds
                </p>
                <p className="text-amber-300 mt-1">
                  3. Anomaly Filter: velocity &lt; 35.0 m/s (filters GPS drift &amp; vehicle teleportation)
                </p>
                <p className="text-violet-300 mt-1">
                  4. C++ Sigmoid Confidence: z = (speed &times; 0.05) + (hour &times; -0.15) + 2.5 &rarr; 1 / (1 + e^-z)
                </p>
              </div>

              {/* Diagnostics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">Total Ingested</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">{PIPELINE_DIAGNOSTICS.raw_pings_ingested.toLocaleString()}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">Polars Cleaned</p>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {PIPELINE_DIAGNOSTICS.valid_pings_processed.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">Anomalies Rejected</p>
                  <p className="text-xl font-bold font-mono text-red-400 mt-1">
                    {PIPELINE_DIAGNOSTICS.anomalies_filtered_count}
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">OSM Road Intersections</p>
                  <p className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {PIPELINE_DIAGNOSTICS.spatial_graph_intersections.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
