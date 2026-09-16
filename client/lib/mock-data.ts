// Mock data for development — simulates live bus movement along the campus route
// When the backend WebSocket is ready, we just stop using this file
// The bus moves through the stops in sequence, updating every 30 seconds

import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, ROUTES } from "./constants"

// A sequence of GPS waypoints between stops — the bus follows this path
// Each point is [longitude, latitude]
const routeWaypoints: [number, number][] = [
  [88.3480, 22.4958],  // Tollygunge Metro
  [88.3450, 22.4980],
  [88.3420, 22.5010],
  [88.3390, 22.5050],
  [88.3097, 22.4917],  // Behala Chowrasta
  [88.3150, 22.4970],
  [88.3250, 22.5020],
  [88.3390, 22.5120],  // New Alipore Gate
  [88.3340, 22.5180],
  [88.3300, 22.5137],  // Majerhat Station
  [88.3180, 22.5190],
  [88.3100, 22.5220],
  [88.3050, 22.5258],  // Garden Reach Crossing
  [88.3100, 22.5300],
  [88.3180, 22.5340],
  [88.3266, 22.5388],  // STCET Campus Gate
]

// Calculate the compass bearing between two points
// This is used to rotate the bus icon on the map
function getBearing(from: [number, number], to: [number, number]): number {
  const dLng = (to[0] - from[0]) * (Math.PI / 180)
  const lat1 = from[1] * (Math.PI / 180)
  const lat2 = to[1] * (Math.PI / 180)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

// Given a waypoint index, figure out which stop is next
function getNextStop(waypointIndex: number): string {
  if (waypointIndex < 4) return "STOP-BEHALA"
  if (waypointIndex < 7) return "STOP-NEW-ALIPORE"
  if (waypointIndex < 9) return "STOP-MAJERHAT"
  if (waypointIndex < 12) return "STOP-GARDEN-REACH"
  return "STOP-CAMPUS"
}

// Generates a realistic GPS event for a given position in the route
export function getMockBusEvent(waypointIndex: number, delayMinutes = 3): LiveBusData {
  const idx = waypointIndex % routeWaypoints.length
  const current = routeWaypoints[idx]
  const next = routeWaypoints[(idx + 1) % routeWaypoints.length]

  const bearing = getBearing(current, next)
  const speed = 20 + Math.random() * 15  // realistic city speed

  // Rough ETA: stops remaining × ~5 minutes per stop
  const stopsLeft = Math.floor((routeWaypoints.length - idx) / 3)
  const etaMinutes = Math.max(1, stopsLeft * 5 + delayMinutes)

  return {
    bus_id: "B01",
    route_id: "R01",
    trip_id: `TRIP-STCET-${new Date().toISOString().slice(0, 10)}-0830`,
    timestamp: new Date().toISOString(),
    latitude: current[1],
    longitude: current[0],
    bearing,
    speed_kmh: parseFloat(speed.toFixed(1)),
    accuracy_m: 3.5,
    status: idx > 12 ? "APPROACHING" : "IN_SERVICE",
    next_stop_id: getNextStop(idx),
    delay_minutes: delayMinutes,
    eta_minutes: etaMinutes,
    features: {
      is_morning_rush: new Date().getHours() >= 8 && new Date().getHours() <= 10,
      distance_from_last_ping_meters: speed * 0.5 * (1000 / 3600) * 30,  // speed × 30s
      calculated_velocity_mps: parseFloat((speed / 3.6).toFixed(2)),
      predicted_delay_minutes: delayMinutes + Math.floor(Math.random() * 3),
      ml_confidence: 0.75 + Math.random() * 0.2,
    },
  }
}

// Converts a UTC ISO timestamp to a readable IST string
// e.g. "2026-09-16T06:43:12Z" → "12:13 PM IST"
export function toIST(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  })
}

// Delay color helper — used by badge components
export function getDelayColor(delayMinutes: number) {
  if (Math.abs(delayMinutes) <= 2) return "emerald"    // on time
  if (delayMinutes <= 10) return "amber"               // minor delay
  return "red"                                          // major delay
}

// The full route GeoJSON — used by MapLibre to draw the route line on the map
export const routeGeoJSON = {
  type: "Feature" as const,
  geometry: {
    type: "LineString" as const,
    coordinates: routeWaypoints,
  },
  properties: {},
}
