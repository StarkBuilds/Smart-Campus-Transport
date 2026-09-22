"use client"

import React, { useState } from "react"
import { Bus, QrCode, TrendingDown, Activity, Navigation } from "lucide-react"

export default function TransitSmartCard({
  userName = "STUDENT",
  dynamicEta = 8,
  speed = 0,
  predictedDelay = 0,
  routeName = "Route R01",
  sourceName = "Source",
  destName = "Destination",
  statusLabel = "ON TIME · 0 min",
}: {
  userName?: string
  dynamicEta?: number
  speed?: number
  predictedDelay?: number
  routeName?: string
  sourceName?: string
  destName?: string
  statusLabel?: string
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const delayed = predictedDelay > 0
  const statusColor = delayed
    ? "text-amber-800 bg-amber-50 border-amber-200"
    : "text-emerald-700 bg-emerald-50 border-emerald-200"

  return (
    <div className="relative w-full flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-[720px] h-[240px] cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="w-full h-full relative"
          style={{
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front — compact horizontal glass pass */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl flex flex-row items-stretch"
            style={{
              background: "rgba(255, 255, 255, 0.78)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.55)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="w-2 h-full bg-terracotta shrink-0" />

            <div className="flex-1 flex flex-col justify-between p-5 relative overflow-hidden">
              <Bus className="absolute -right-6 -bottom-6 w-44 h-44 text-stone-300 opacity-20 pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif italic font-semibold text-2xl text-espresso">CampusRide</h3>
                  <p className="text-[11px] text-stone-medium font-bold uppercase tracking-widest mt-0.5">
                    Student Transit Pass · {routeName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {statusLabel}
                  </span>
                  <p className="text-sm text-espresso font-extrabold uppercase truncate max-w-[140px]">
                    {userName}
                  </p>
                </div>
              </div>

              <div className="z-10 w-full px-1">
                <div className="flex items-center justify-between text-xs font-bold text-espresso mb-2 gap-2">
                  <span className="truncate">{sourceName}</span>
                  <span className="text-stone-medium shrink-0">→</span>
                  <span className="truncate text-right">{destName}</span>
                </div>
                <div className="relative h-2 bg-stone-200/80 rounded-full w-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-terracotta transition-all duration-1000 rounded-full"
                    style={{ width: speed > 0 ? `${Math.min(92, 18 + speed * 1.6)}%` : "8%" }}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between mt-2 z-10 gap-3">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-2 bg-white/60 rounded-xl border border-white/40 shadow-sm backdrop-blur-sm">
                    <p className="text-[9px] uppercase text-stone-medium font-bold tracking-wider">Transport Status</p>
                    <p className={`text-xs font-bold ${delayed ? "text-amber-800" : "text-emerald-700"}`}>
                      {statusLabel}
                    </p>
                  </div>
                  <div className="px-2.5 py-2 bg-white/60 rounded-xl border border-white/40 shadow-sm backdrop-blur-sm">
                    <p className="text-[9px] uppercase text-stone-medium font-bold tracking-wider">Speed</p>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-espresso">
                      <Activity className="w-3 h-3 text-terracotta" />
                      {Math.round(speed || 0)} km/h
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {delayed && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full border border-red-200 mb-1">
                      <TrendingDown className="w-3 h-3" />
                      +{Math.round(predictedDelay)}m Delay
                    </span>
                  )}
                  <div className="bg-espresso text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-terracotta" />
                    <span className="text-lg font-bold font-mono">ETA: {dynamicEta || "--"} min</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-3 right-3 opacity-30 pointer-events-none">
              <QrCode className="w-6 h-6 text-espresso" />
            </div>
          </div>

          {/* Back — QR / gate face */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl flex flex-row items-stretch"
            style={{
              background: "rgba(255, 255, 255, 0.78)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.55)",
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="w-2 h-full bg-stone-dark shrink-0" />
            <div className="flex-1 flex flex-row items-center p-6 gap-6">
              <div className="w-32 h-32 rounded-2xl bg-white flex items-center justify-center p-3 shadow-sm border border-stone-subtle shrink-0">
                <QrCode className="w-full h-full text-terracotta" />
              </div>
              <div className="flex-1 flex flex-col justify-between h-full py-2">
                <div>
                  <h4 className="font-bold text-xl text-espresso tracking-widest uppercase mb-1">Gate Security</h4>
                  <p className="text-xs text-stone-medium font-medium">
                    Scan at campus gates or by the driver for verification. Do not share this digital pass.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm border-b border-stone-subtle pb-1">
                    <span className="text-stone-medium font-bold uppercase tracking-wider text-xs">Route</span>
                    <span className="font-bold text-espresso font-mono">{routeName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-medium font-bold uppercase tracking-wider text-xs">Corridor</span>
                    <span className="font-bold text-terracotta text-xs truncate max-w-[200px]">
                      {sourceName} → {destName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
