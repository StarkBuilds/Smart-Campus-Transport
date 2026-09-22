// Types for the Smart Campus Transport system
// These match the backend JSON payload structure closely
// Easy to update if the backend changes a field name

export type BusStatus = "IN_SERVICE" | "OUT_OF_SERVICE" | "DELAYED" | "APPROACHING" | "AT_STOP"

export type UserRole = "student" | "driver" | "admin"

// Main GPS event — this is what the backend sends via WebSocket
export interface BusEvent {
  bus_id: string
  route_id: string
  trip_id: string
  timestamp: string        // ISO string from backend, we convert to IST
  latitude: number
  longitude: number
  bearing: number          // 0–360, used to rotate the bus icon
  speed_kmh: number
  accuracy_m: number
  status: BusStatus
  next_stop_id: string
}

// Features extracted by the ML pipeline (Python backend)
export interface BusFeatures {
  is_morning_rush: boolean
  distance_from_last_ping_meters: number
  calculated_velocity_mps: number
  predicted_delay_minutes?: number   // from ML model
  ml_confidence?: number             // 0–1
}

// Combined live bus data the frontend uses
export interface LiveBusData extends BusEvent {
  features?: BusFeatures
  delay_minutes: number              // positive = late, negative = early
  eta_minutes: number                // minutes until arrival at student's stop
  current_stop?: BusStopSummary
  next_stop?: BusStopSummary
  upcoming_stops?: BusStopSummary[]
}

export interface BusStopSummary {
  stopId: string
  name: string
  latitude: number
  longitude: number
  sequenceOrder: number
  arrivalOffsetMinutes: number | null
  liveEtaMinutes?: number | null
}

// A bus stop on campus
export interface BusStop {
  stop_id: string
  name: string
  latitude: number
  longitude: number
  scheduled_arrival: string          // "08:30 AM"
}

// A full bus route with stops
export interface BusRoute {
  route_id: string
  route_name: string
  bus_id: string
  stops: BusStop[]
}

// Student profile (basic)
export interface StudentProfile {
  student_id: string
  name: string
  assigned_route_id: string
  stop_id: string                    // their boarding stop
}

// Driver profile (basic)
export interface DriverProfile {
  driver_id: string
  name: string
  bus_id: string
  route_id: string
}
