"use client"

// useBusSocket — hook that manages the live bus data feed
// Currently uses mock data with setInterval to simulate GPS updates
// When the backend WebSocket is ready, just swap the mock section
// with a real WebSocket connection — the rest of the code stays identical

import { useState, useEffect, useRef } from "react"
import type { LiveBusData } from "@/types/bus"
import { getMockBusEvent } from "@/lib/mock-data"

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
          startMockFeed()
        }

        ws.onclose = () => {
          setIsConnected(false)
        }

        return () => ws.close()
      } catch {
        // If WebSocket fails to connect, fall through to mock
        startMockFeed()
      }
    } else {
      // ─── MOCK DATA (no backend yet) ───────────────────────────────
      startMockFeed()
    }

    function startMockFeed() {
      setIsConnected(true)  // mock counts as "connected" for UI purposes

      // Send the first event immediately so the map isn't blank
      setBusData(getMockBusEvent(0, 3))

      // Update every 3 seconds — close to the real 30s interval but faster for demo
      let idx = 1
      const interval = setInterval(() => {
        setBusData(getMockBusEvent(idx, 3))
        setWaypointIndex(idx)
        idx = (idx + 1) % 16  // loop the route
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [])

  return { busData, isConnected, waypointIndex }
}
