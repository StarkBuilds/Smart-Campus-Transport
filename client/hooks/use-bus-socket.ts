"use client"

// useBusSocket — hook that manages the live bus data feed
// Currently uses mock data with setInterval to simulate GPS updates
// When the backend WebSocket is ready, just swap the mock section
// with a real WebSocket connection — the rest of the code stays identical

import { useState, useEffect, useRef } from "react"
import type { LiveBusData } from "@/types/bus"
import { getInterpolatedBusEvent } from "@/lib/mock-data"

interface UseBusSocketResult {
  busData: LiveBusData | null
  isConnected: boolean
  waypointIndex: number
}

export function useBusSocket(): UseBusSocketResult {
  const [busData, setBusData] = useState<LiveBusData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [waypointIndex, setWaypointIndex] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL

    if (wsUrl) {
      // ─── REAL WEBSOCKET (when backend is ready) ───────────────────
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          console.log("WebSocket connected to", wsUrl)
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as LiveBusData
            setBusData(payload)
          } catch {
            console.warn("Failed to parse WebSocket message:", event.data)
          }
        }

        ws.onerror = () => {
          console.warn("WebSocket error — falling back to mock data")
          return startMockFeed()
        }

        ws.onclose = () => {
          setIsConnected(false)
        }

        return () => ws.close()
      } catch {
        // If WebSocket fails to connect, fall through to mock
        return startMockFeed()
      }
    } else {
      // ─── MOCK DATA (continuous smooth simulation matching Homepage) ──
      return startMockFeed()
    }

    function startMockFeed() {
      setIsConnected(true)

      const cycleDuration = 72000 // 72-second graceful cruising loop matching realistic city pace
      let animId: number
      let lastTime = 0

      // Emit initial event immediately
      const initialT = (Date.now() % cycleDuration) / cycleDuration
      setBusData(getInterpolatedBusEvent(initialT, 3))

      const loop = () => {
        const now = Date.now()
        // Update at ~30fps for silky smooth Swiggy/Zomato style continuous movement
        if (now - lastTime >= 32) {
          const t = (now % cycleDuration) / cycleDuration
          const event = getInterpolatedBusEvent(t, 3)
          setBusData(event)
          setWaypointIndex(Math.floor(t * 16))
          lastTime = now
        }
        animId = requestAnimationFrame(loop)
      }

      animId = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(animId)
    }
  }, [])

  return { busData, isConnected, waypointIndex }
}
