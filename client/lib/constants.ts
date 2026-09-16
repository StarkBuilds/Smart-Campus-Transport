// Constants for the Smart Campus Transport app
// Keeping all the real campus data here makes it easy to update

import type { BusRoute, BusStop } from "@/types/bus"

// St. Thomas' College of Engineering & Technology, Khidderpore, Kolkata
export const CAMPUS = {
  name: "St. Thomas' College of Engineering & Technology",
  short: "STCET",
  latitude: 22.5388,
  longitude: 88.3266,
  address: "4, D.H. Road, Khidderpore, Kolkata – 700 023",
}

// The map starts centered here when you open the dashboard
export const MAP_DEFAULT_CENTER: [number, number] = [88.3266, 22.5388] // [lng, lat] — MapLibre format
export const MAP_DEFAULT_ZOOM = 13

// Real bus stops around the Khidderpore / South Kolkata area
// These are the student pickup points along the route
export const BUS_STOPS: BusStop[] = [
  {
    stop_id: "STOP-TOLLYGUNGE",
    name: "Tollygunge Metro",
    latitude: 22.4958,
    longitude: 88.3480,
    scheduled_arrival: "08:00 AM",
  },
  {
    stop_id: "STOP-BEHALA",
    name: "Behala Chowrasta",
    latitude: 22.4917,
    longitude: 88.3097,
    scheduled_arrival: "08:10 AM",
  },
  {
    stop_id: "STOP-NEW-ALIPORE",
    name: "New Alipore Gate",
    latitude: 22.5120,
    longitude: 88.3390,
    scheduled_arrival: "08:20 AM",
  },
  {
    stop_id: "STOP-MAJERHAT",
    name: "Majerhat Station",
    latitude: 22.5137,
    longitude: 88.3300,
    scheduled_arrival: "08:28 AM",
  },
  {
    stop_id: "STOP-GARDEN-REACH",
    name: "Garden Reach Crossing",
    latitude: 22.5258,
    longitude: 88.3050,
    scheduled_arrival: "08:35 AM",
  },
  {
    stop_id: "STOP-CAMPUS",
    name: "STCET Campus Gate",
    latitude: 22.5388,
    longitude: 88.3266,
    scheduled_arrival: "08:45 AM",
  },
]

// Route definitions — add more when backend provides them
export const ROUTES: BusRoute[] = [
  {
    route_id: "R01",
    route_name: "Tollygunge – Campus Express",
    bus_id: "B01",
    stops: BUS_STOPS,
  },
]

// WebSocket URL — update this when backend team gives us the real one
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/gps"

// How often we poll when WebSocket is not available (fallback)
export const POLL_INTERVAL_MS = 5000

// Delay thresholds — used to decide the color of status badges
export const DELAY_THRESHOLDS = {
  ON_TIME: 2,       // within 2 mins = on time (green)
  MINOR: 10,        // 2–10 mins = minor delay (amber)
  // above 10 mins = major delay (red)
}

// IST timezone string — used to convert UTC timestamps
export const IST_TIMEZONE = "Asia/Kolkata"
