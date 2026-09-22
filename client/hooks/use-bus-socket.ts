"use client"

// useBusSocket — hook that manages the live bus data feed
// Connects to the real backend API as the single source of truth
// and provides smooth transition interpolation for the frontend.

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

    // Poll the real backend state
    const pollBackend = async () => {
      try {
        const [busRes, predRes] = await Promise.allSettled([
          fetch("/api/buses/B01"),
          fetch("/api/buses/B01/prediction")
        ])

        if (busRes.status === "fulfilled" && busRes.value.ok) {
          const data = await busRes.value.json()
          setIsConnected(true)

          let mlConfidence: number | undefined = undefined;
          let predictedDelay: number | undefined = undefined;

          if (predRes.status === "fulfilled" && predRes.value.ok) {
            const predData = await predRes.value.json()
            if (predData.confidence !== undefined && predData.confidence !== null) {
               mlConfidence = predData.confidence;
            }
            if (predData.predictedDelayMinutes !== undefined && predData.predictedDelayMinutes !== null) {
               predictedDelay = predData.predictedDelayMinutes;
            }
          }

          const newTarget: LiveBusData = {
            bus_id: data.busId || "B01",
            route_id: data.routeId || "R01",
            trip_id: data.currentTripId || "",
            timestamp: data.latestTimestamp || new Date().toISOString(),
            latitude: data.latestLatitude || 22.4988,
            longitude: data.latestLongitude || 88.3245,
            bearing: data.bearing || 0,
            speed_kmh: data.latestSpeedKmh || 0,
            accuracy_m: 5,
            status: data.status || "IN_SERVICE",
            next_stop_id: data.nextStop?.stopId || "",
            delay_minutes: data.delayMinutes ?? 0,
            eta_minutes: data.etaMinutes ?? 0,
            current_stop: data.currentStop,
            next_stop: data.nextStop,
            upcoming_stops: data.upcomingStops ?? [],
            features: {
               predicted_delay_minutes: predictedDelay ?? 0,
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
        }
      } catch (err) {
        setIsConnected(false)
        console.warn("Polling error:", err)
      }
    }

    // Attempt to connect/poll every 2 seconds
    pollBackend()
    const pollInterval = setInterval(pollBackend, 2000)

    // Interpolation loop
    const loop = () => {
      if (isDisposed) return
      
      const target = targetDataRef.current
      let current = currentDataRef.current
      
      if (target && current) {
        // Linearly ease lat/lng and speed so marker moves smoothly
        const ease = 0.1
        current.latitude += (target.latitude - current.latitude) * ease
        current.longitude += (target.longitude - current.longitude) * ease
        current.speed_kmh += (target.speed_kmh - current.speed_kmh) * ease
        
        // Ensure shortest path for bearing rotation
        let diff = target.bearing - current.bearing
        while (diff < -180) diff += 360
        while (diff > 180) diff -= 360
        current.bearing += diff * ease
        
        // Copy other state discretely
        current.bus_id = target.bus_id
        current.next_stop_id = target.next_stop_id
        current.status = target.status
        current.eta_minutes = target.eta_minutes
        current.delay_minutes = target.delay_minutes
        current.current_stop = target.current_stop
        current.next_stop = target.next_stop
        current.upcoming_stops = target.upcoming_stops
        
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
