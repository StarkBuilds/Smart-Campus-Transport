"use client"

// useBusSocket — live bus feed from backend + smooth interpolation.
// ETA / delay come from the road-distance + delay pipeline (never synthetic).

import { useState, useEffect, useRef } from "react"
import type { LiveBusData } from "@/types/bus"

interface UseBusSocketResult {
  busData: LiveBusData | null
  isConnected: boolean
  waypointIndex: number
}

export function useBusSocket(): UseBusSocketResult {
  const [busData, setBusData] = useState<LiveBusData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [waypointIndex, setWaypointIndex] = useState(0)
  
  const targetDataRef = useRef<LiveBusData | null>(null)
  const currentDataRef = useRef<LiveBusData | null>(null)

  useEffect(() => {
    let isDisposed = false
    let animId: number

    const pollBackend = async () => {
      try {
        const targetStopId = typeof window !== "undefined"
          ? localStorage.getItem("user_stop")
          : null
        const busUrl = targetStopId
          ? `/api/buses/B01?targetStopId=${encodeURIComponent(targetStopId)}`
          : "/api/buses/B01"

        const [busRes, predRes] = await Promise.allSettled([
          fetch(busUrl),
          fetch("/api/buses/B01/prediction")
        ])

        if (busRes.status === "fulfilled" && busRes.value.ok) {
          const data = await busRes.value.json()
          setIsConnected(true)

          let mlConfidence: number | undefined = undefined
          let predictedDelay: number | undefined = undefined

          if (predRes.status === "fulfilled" && predRes.value.ok) {
            const predData = await predRes.value.json()
            if (predData.confidence !== undefined && predData.confidence !== null) {
               mlConfidence = predData.confidence
            }
            if (predData.predictedDelayMinutes !== undefined && predData.predictedDelayMinutes !== null) {
               predictedDelay = predData.predictedDelayMinutes
            }
          }

          // Prefer backend delayMinutes (journey) — already merged with ML once server-side.
          const delayMinutes = data.delayMinutes ?? predictedDelay ?? 0
          const nextStopDelayMinutes = data.nextStopDelayMinutes ?? 0

          const newTarget: LiveBusData = {
            bus_id: data.busId || "B01",
            route_id: data.routeId || "R01",
            trip_id: data.currentTripId || "",
            timestamp: data.latestTimestamp || new Date().toISOString(),
            latitude: data.latestLatitude || 22.4988,
            longitude: data.latestLongitude || 88.3245,
            bearing: data.bearing || 0,
            speed_kmh: data.latestSpeedKmh ?? 0,
            accuracy_m: 5,
            status: data.status || "IN_SERVICE",
            next_stop_id: data.nextStop?.stopId || "",
            delay_minutes: delayMinutes,
            next_stop_delay_minutes: nextStopDelayMinutes,
            eta_minutes: data.etaMinutes ?? 0,
            current_stop: data.currentStop,
            next_stop: data.nextStop,
            upcoming_stops: data.upcomingStops ?? [],
            features: {
               predicted_delay_minutes: predictedDelay ?? delayMinutes,
               ml_confidence: mlConfidence,
               is_morning_rush: false,
               distance_from_last_ping_meters: 0,
               calculated_velocity_mps: data.latestSpeedKmh ? data.latestSpeedKmh / 3.6 : 0
            }
          }

          if (!currentDataRef.current) {
            currentDataRef.current = { ...newTarget }
          }
          targetDataRef.current = newTarget
          setWaypointIndex((w) => w + 1)
        }
      } catch (err) {
        setIsConnected(false)
        console.warn("Polling error:", err)
      }
    }

    pollBackend()
    const pollInterval = setInterval(pollBackend, 2000)

    const loop = () => {
      if (isDisposed) return
      
      const target = targetDataRef.current
      let current = currentDataRef.current
      
      if (target && current) {
        const ease = 0.12
        current.latitude += (target.latitude - current.latitude) * ease
        current.longitude += (target.longitude - current.longitude) * ease
        current.speed_kmh += (target.speed_kmh - current.speed_kmh) * ease
        
        let diff = target.bearing - current.bearing
        while (diff < -180) diff += 360
        while (diff > 180) diff -= 360
        current.bearing += diff * ease
        
        current.bus_id = target.bus_id
        current.next_stop_id = target.next_stop_id
        current.status = target.status
        current.eta_minutes = target.eta_minutes
        current.delay_minutes = target.delay_minutes
        current.next_stop_delay_minutes = target.next_stop_delay_minutes
        current.current_stop = target.current_stop
        current.next_stop = target.next_stop
        current.upcoming_stops = target.upcoming_stops
        current.features = target.features
        current.timestamp = target.timestamp
        
        setBusData({ ...current })
      }
      
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)

    return () => {
      isDisposed = true
      clearInterval(pollInterval)
      cancelAnimationFrame(animId)
    }
  }, [])

  return { busData, isConnected, waypointIndex }
}
