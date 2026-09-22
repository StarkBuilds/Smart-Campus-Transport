"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, Route, StopInfo } from "@/services/api"
import { Clock, Route as RouteIcon, Map, MapPin } from "lucide-react"

type LiveStopEta = Record<string, number>

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveEtas, setLiveEtas] = useState<LiveStopEta>({})
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [currentStopId, setCurrentStopId] = useState<string | null>(null)
  const [nextStopId, setNextStopId] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState("Source")
  const [destName, setDestName] = useState("Destination")

  useEffect(() => {
    async function loadRoutes() {
      try {
        const data = await api.getRoutes()
        setRoutes(data)
        if (data[0]?.stops?.length) {
          const stops = [...data[0].stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          setSourceName(stops[0].name)
          setDestName(stops[stops.length - 1].name)
        }
      } catch {
        setError("Unable to load active campus routes.")
      } finally {
        setIsLoading(false)
      }
    }
    loadRoutes()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function pollLive() {
      try {
        const res = await fetch("/api/buses/B01")
        if (!res.ok) return
        const bus = await res.json()
        if (cancelled) return
        setDelayMinutes(bus.delayMinutes ?? 0)
        setCurrentStopId(bus.currentStop?.stopId ?? null)
        setNextStopId(bus.nextStop?.stopId ?? null)
        const map: LiveStopEta = {}
        if (bus.nextStop?.stopId && bus.etaMinutes != null) {
          map[bus.nextStop.stopId] = bus.etaMinutes
        }
        for (const stop of bus.upcomingStops ?? []) {
          if (stop.stopId && stop.liveEtaMinutes != null) {
            map[stop.stopId] = stop.liveEtaMinutes
          }
        }
        setLiveEtas(map)
      } catch {
        // ignore transient poll errors
      }
    }
    pollLive()
    const id = setInterval(pollLive, 3000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const statusLabel = () => {
    const d = Math.round(delayMinutes)
    if (Math.abs(d) < 1) return { label: "ON TIME · 0 min", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    if (d > 0) return { label: `DELAYED · +${d} min`, color: "text-amber-800 bg-amber-50 border-amber-200" }
    return { label: `EARLY · ${Math.abs(d)} min early`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
  }

  const status = statusLabel()

  const stopEtaLabel = (stop: StopInfo) => {
    if (stop.stopId === currentStopId) return "Current"
    if (liveEtas[stop.stopId] != null) return `${liveEtas[stop.stopId]} min`
    if (stop.stopId === nextStopId && liveEtas[stop.stopId] == null) return "Next"
    return "—"
  }

  return (
    <main className="flex-grow max-w-[1000px] mx-auto px-6 sm:px-10 py-16 w-full">
      <div className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-espresso mb-4">
          Campus Routes &amp; Stops
        </h1>
        <p className="text-lg text-stone-text font-light max-w-2xl leading-relaxed">
          Live corridor stops with road-distance ETAs from Bus B01 — not synthetic offsets.
        </p>
      </div>

      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center text-stone-medium">
          <span className="material-symbols-outlined text-4xl animate-spin mb-4">sync</span>
          <p className="text-sm font-medium">Synchronizing with dispatch...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 bg-parchment-warm border border-stone-subtle rounded-2xl text-center">
          <span className="material-symbols-outlined text-terracotta text-3xl mb-2">error</span>
          <h3 className="font-semibold text-espresso">Connection Interrupted</h3>
          <p className="text-stone-text text-sm mt-1">{error}</p>
        </div>
      )}

      {!isLoading && !error && routes.length === 0 && (
        <div className="p-10 border border-dashed border-stone-medium rounded-2xl text-center text-stone-text">
          <RouteIcon className="w-10 h-10 mx-auto mb-3 text-stone-medium" />
          <p className="font-medium text-espresso bg-parchment">No Routes Active</p>
          <p className="text-sm">There are currently no active routes operating on campus.</p>
        </div>
      )}

      {!isLoading && !error && routes.length > 0 && (
        <div className="grid gap-6">
          {routes.map(route => {
            const stops = [...(route.stops || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            const src = stops[0]?.name || sourceName
            const dst = stops[stops.length - 1]?.name || destName
            return (
              <div key={route.routeId} className="bg-parchment border border-stone-subtle rounded-2xl shadow-xs overflow-hidden hover:border-stone-medium transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-transitblue-soft text-transitblue flex items-center justify-center font-bold text-lg shadow-sm border border-transitblue/20">
                        {route.routeId}
                      </div>
                      <div>
                        <h3 className="font-serif text-2xl text-espresso">{route.name}</h3>
                        <p className="text-stone-text text-sm mt-1 flex items-center gap-2">
                          <Map className="w-4 h-4" />
                          {src} → {dst}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-8 border-t border-stone-subtle pt-6">
                    <h4 className="text-sm font-semibold tracking-wide uppercase text-stone-dark mb-4">Live Corridor Stops</h4>

                    <div className="flex flex-col gap-3 relative before:absolute before:inset-y-3 before:left-3.5 before:w-px before:bg-stone-subtle">
                      {stops.map((stop) => {
                        const isCurrent = stop.stopId === currentStopId
                        const isNext = stop.stopId === nextStopId
                        return (
                          <div key={stop.stopId} className="flex gap-4 relative">
                            <div className={`w-7 h-7 rounded-full bg-white border-[2px] flex items-center justify-center z-10 shrink-0 text-xs font-bold shadow-sm ${
                              isNext ? "border-terracotta text-terracotta" : "border-stone-medium text-stone-dark"
                            }`}>
                              {stop.sequenceOrder}
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-xl border border-stone-subtle flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-espresso text-sm flex items-center gap-1.5">
                                  {stop.name}
                                  {isCurrent && <span className="text-[10px] text-emerald-700 font-bold">CURRENT</span>}
                                  {isNext && !isCurrent && <span className="text-[10px] text-terracotta font-bold">NEXT</span>}
                                </p>
                                <p className="text-xs font-mono text-stone-medium mt-0.5">
                                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-medium text-stone-dark bg-parchment-warm px-2.5 py-1 rounded-md border border-stone-subtle shrink-0">
                                <Clock className="w-3.5 h-3.5 text-stone-medium" />
                                {stopEtaLabel(stop)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {stops.length === 0 && (
                        <p className="text-sm text-stone-text italic pl-8">No assigned stops for this route yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-subtle flex items-center justify-between gap-3">
                    <p className="text-xs text-stone-text flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Live ETA from B01 road-distance pipeline
                    </p>
                    <Link href={`/dashboard`} className="inline-flex items-center gap-2 text-terracotta text-sm font-semibold hover:text-terracotta-dark transition-colors bg-white px-4 py-2 rounded-lg border border-stone-subtle shadow-sm hover:shadow-md">
                      <span>View on Live Map</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
