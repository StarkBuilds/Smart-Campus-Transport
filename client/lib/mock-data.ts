// Mock data for development — simulates live bus movement along the campus route
// When the backend WebSocket is ready, we just stop using this file
// The bus moves through the stops in sequence, updating every 30 seconds

import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, ROUTES } from "./constants"

// A sequence of GPS waypoints between stops — the bus follows this path
// Each point is [longitude, latitude]
export const routeWaypoints: [number, number][] = [
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

// Precompute cumulative segment distances along routeWaypoints for fluid interpolation
const segmentLengths: number[] = []
let totalRouteDistance = 0
for (let i = 0; i < routeWaypoints.length - 1; i++) {
  const d = Math.hypot(
    routeWaypoints[i + 1][0] - routeWaypoints[i][0],
    routeWaypoints[i + 1][1] - routeWaypoints[i][1]
  )
  segmentLengths.push(d)
  totalRouteDistance += d
}

// Continuous smooth bus position interpolation (matching Homepage Wayfinding Radar)
export function getInterpolatedBusEvent(progress: number, delayMinutes = 3): LiveBusData {
  const t = Math.max(0, Math.min(1, progress))
  const targetDist = t * totalRouteDistance

  let accumulated = 0
  let segIndex = 0
  let segFraction = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    const len = segmentLengths[i]
    if (accumulated + len >= targetDist || i === segmentLengths.length - 1) {
      segIndex = i
      segFraction = len > 0 ? (targetDist - accumulated) / len : 0
      break
    }
    accumulated += len
  }

  const p1 = routeWaypoints[segIndex]
  const p2 = routeWaypoints[segIndex + 1] || p1

  const currentLng = p1[0] + segFraction * (p2[0] - p1[0])
  const currentLat = p1[1] + segFraction * (p2[1] - p1[1])
  const bearing = getBearing(p1, p2)

  // Realistic urban speed calculation matching Homepage (24-34 km/h)
  const speed = 26 + Math.sin(t * Math.PI * 4) * 6
  const nextStopId = getNextStop(segIndex)
  const etaMinutes = Math.max(1, Math.ceil((1 - t) * 16))

  return {
    bus_id: "B01",
    route_id: "R01",
    trip_id: `TRIP-STCET-${new Date().toISOString().slice(0, 10)}-0830`,
    timestamp: new Date().toISOString(),
    latitude: currentLat,
    longitude: currentLng,
    bearing,
    speed_kmh: parseFloat(speed.toFixed(1)),
    accuracy_m: 2.8,
    status: t > 0.85 ? "APPROACHING" : "IN_SERVICE",
    next_stop_id: nextStopId,
    delay_minutes: delayMinutes,
    eta_minutes: etaMinutes,
    features: {
      is_morning_rush: true,
      distance_from_last_ping_meters: speed * (1000 / 3600) * 1.5,
      calculated_velocity_mps: parseFloat((speed / 3.6).toFixed(2)),
      predicted_delay_minutes: delayMinutes,
      ml_confidence: 0.88 + Math.sin(t * Math.PI * 2) * 0.05,
    },
  }
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

// Returns two GeoJSON LineStrings:
// 1) traveledPath: highlighted bright cyan path already completed by the bus
// 2) remainingPath: translucent dashed line for the remaining path to campus
export function getRouteProgress(busLng?: number, busLat?: number) {
  if (!busLng || !busLat) {
    return {
      traveledGeoJSON: {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: [] },
        properties: {},
      },
      remainingGeoJSON: {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: routeWaypoints },
        properties: {},
      },
    }
  }

  // Find the exact active segment [bestSegment, bestSegment+1] the bus is on
  let bestSegment = 0
  let bestDist = Infinity

  for (let i = 0; i < routeWaypoints.length - 1; i++) {
    const p1 = routeWaypoints[i]
    const p2 = routeWaypoints[i + 1]
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const l2 = dx * dx + dy * dy
    let segT = l2 === 0 ? 0 : ((busLng - p1[0]) * dx + (busLat - p1[1]) * dy) / l2
    segT = Math.max(0, Math.min(1, segT))
    const projX = p1[0] + segT * dx
    const projY = p1[1] + segT * dy
    const d = Math.hypot(busLng - projX, busLat - projY)
    if (d < bestDist) {
      bestDist = d
      bestSegment = i
    }
  }

  const traveledCoords: [number, number][] = [
    ...routeWaypoints.slice(0, bestSegment + 1),
    [busLng, busLat],
  ]
  const remainingCoords: [number, number][] = [
    [busLng, busLat],
    ...routeWaypoints.slice(bestSegment + 1),
  ]

  return {
    traveledGeoJSON: {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: traveledCoords },
      properties: {},
    },
    remainingGeoJSON: {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: remainingCoords.length > 1 ? remainingCoords : [routeWaypoints[routeWaypoints.length - 1]],
      },
      properties: {},
    },
  }
}

// The full route GeoJSON — default fallback
export const routeGeoJSON = {
  type: "Feature" as const,
  geometry: {
    type: "LineString" as const,
    coordinates: routeWaypoints,
  },
  properties: {},
}
