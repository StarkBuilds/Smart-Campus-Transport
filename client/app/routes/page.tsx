"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, Route } from "@/services/api"

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRoutes() {
      try {
        const data = await api.getRoutes()
        setRoutes(data)
      } catch (err) {
        setError("Unable to load active campus routes.")
      } finally {
        setIsLoading(false)
      }
    }
    loadRoutes()
  }, [])

  return (
    <main className="flex-grow max-w-[1000px] mx-auto px-6 sm:px-10 py-16 w-full">
      <div className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-espresso mb-4">
          Campus Routes &amp; Stops
        </h1>
        <p className="text-lg text-stone-text font-light max-w-2xl leading-relaxed">
          Explore all active transit lines and their scheduled stops. Live updates reflect detours and current availability.
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
          <span className="material-symbols-outlined text-3xl mb-2">directions_bus</span>
          <p className="font-medium text-espresso bg-parchment">No Routes Active</p>
          <p className="text-sm">There are currently no active routes operating on campus.</p>
        </div>
      )}

      {!isLoading && !error && routes.length > 0 && (
        <div className="grid gap-6">
          {routes.map(route => (
            <div key={route.routeId} className="p-6 bg-parchment border border-stone-subtle rounded-2xl shadow-xs hover:border-stone-medium transition-colors">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-transitblue-soft text-transitblue flex items-center justify-center font-bold text-sm">
                    {route.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl text-espresso">{route.name}</h3>
                  </div>
                </div>
                <span className="bg-sage-soft text-sage-dark text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">Active</span>
              </div>
              <p className="text-stone-text text-sm leading-relaxed mb-6">
                {route.description || "Campus inter-quad transport route connecting primary academic buildings."}
              </p>
              <Link href={`/dashboard`} className="inline-flex items-center gap-1.5 text-terracotta text-sm font-semibold hover:text-terracotta-dark transition-colors">
                <span>View on Live Map</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
