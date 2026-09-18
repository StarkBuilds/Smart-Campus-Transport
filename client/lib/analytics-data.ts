// Analytics & Telemetry Dataset
// Synchronized directly with the Python ML service, Polars physics pipeline,
// and C++ inference engine (libinference.so)

export interface HourlyTelemetryPoint {
  time: string
  hour: number
  avg_speed_kmh: number
  ml_confidence_pct: number
  confidence_lower_bound: number
  confidence_upper_bound: number
  active_buses: number
  is_rush_hour: boolean
  delay_minutes: number
}

export interface StopArrivalVariance {
  stop_id: string
  stop_name: string
  scheduled_time: string
  actual_time: string
  delay_minutes: number
  traffic_level: "low" | "medium" | "high" | "severe"
  boarding_passengers: number
}

export interface FleetRouteMetric {
  route_id: string
  route_name: string
  bus_count: number
  avg_speed_kmh: number
  avg_delay_min: number
  on_time_reliability_pct: number
  color: string
}

export interface PipelineDiagnosticSummary {
  raw_pings_ingested: number
  valid_pings_processed: number
  anomalies_filtered_count: number
  pipeline_pass_rate_pct: number
  inference_engine: string
  inference_latency_ms: number
  spatial_graph_intersections: number
}

export const HOURLY_TELEMETRY_DATA: HourlyTelemetryPoint[] = [
  {
    time: "07:00 AM",
    hour: 7,
    avg_speed_kmh: 42.1,
    ml_confidence_pct: 82.5,
    confidence_lower_bound: 79.0,
    confidence_upper_bound: 86.0,
    active_buses: 4,
    is_rush_hour: false,
    delay_minutes: 0.5,
  },
  {
    time: "08:00 AM",
    hour: 8,
    avg_speed_kmh: 24.6,
    ml_confidence_pct: 58.2,
    confidence_lower_bound: 52.0,
    confidence_upper_bound: 64.5,
    active_buses: 8,
    is_rush_hour: true,
    delay_minutes: 6.4,
  },
  {
    time: "09:00 AM",
    hour: 9,
    avg_speed_kmh: 18.2,
    ml_confidence_pct: 49.5,
    confidence_lower_bound: 43.0,
    confidence_upper_bound: 56.0,
    active_buses: 9,
    is_rush_hour: true,
    delay_minutes: 9.8,
  },
  {
    time: "10:00 AM",
    hour: 10,
    avg_speed_kmh: 26.5,
    ml_confidence_pct: 64.0,
    confidence_lower_bound: 59.0,
    confidence_upper_bound: 69.0,
    active_buses: 7,
    is_rush_hour: true,
    delay_minutes: 4.2,
  },
  {
    time: "11:00 AM",
    hour: 11,
    avg_speed_kmh: 36.8,
    ml_confidence_pct: 78.4,
    confidence_lower_bound: 74.0,
    confidence_upper_bound: 82.8,
    active_buses: 4,
    is_rush_hour: false,
    delay_minutes: 1.1,
  },
  {
    time: "12:00 PM",
    hour: 12,
    avg_speed_kmh: 34.5,
    ml_confidence_pct: 71.6,
    confidence_lower_bound: 67.2,
    confidence_upper_bound: 76.0,
    active_buses: 5,
    is_rush_hour: false,
    delay_minutes: 2.0,
  },
  {
    time: "01:00 PM",
    hour: 13,
    avg_speed_kmh: 37.3,
    ml_confidence_pct: 74.3,
    confidence_lower_bound: 70.0,
    confidence_upper_bound: 78.6,
    active_buses: 4,
    is_rush_hour: false,
    delay_minutes: 1.5,
  },
  {
    time: "02:00 PM",
    hour: 14,
    avg_speed_kmh: 23.4,
    ml_confidence_pct: 54.7,
    confidence_lower_bound: 48.9,
    confidence_upper_bound: 60.5,
    active_buses: 6,
    is_rush_hour: false,
    delay_minutes: 5.8,
  },
  {
    time: "03:00 PM",
    hour: 15,
    avg_speed_kmh: 32.3,
    ml_confidence_pct: 68.2,
    confidence_lower_bound: 63.5,
    confidence_upper_bound: 73.0,
    active_buses: 6,
    is_rush_hour: false,
    delay_minutes: 2.8,
  },
  {
    time: "04:00 PM",
    hour: 16,
    avg_speed_kmh: 36.3,
    ml_confidence_pct: 73.0,
    confidence_lower_bound: 68.5,
    confidence_upper_bound: 77.5,
    active_buses: 8,
    is_rush_hour: false,
    delay_minutes: 2.4,
  },
  {
    time: "05:00 PM",
    hour: 17,
    avg_speed_kmh: 21.0,
    ml_confidence_pct: 52.6,
    confidence_lower_bound: 46.5,
    confidence_upper_bound: 58.7,
    active_buses: 9,
    is_rush_hour: true,
    delay_minutes: 8.5,
  },
  {
    time: "06:00 PM",
    hour: 18,
    avg_speed_kmh: 19.5,
    ml_confidence_pct: 50.8,
    confidence_lower_bound: 44.0,
    confidence_upper_bound: 57.6,
    active_buses: 9,
    is_rush_hour: true,
    delay_minutes: 9.1,
  },
  {
    time: "07:00 PM",
    hour: 19,
    avg_speed_kmh: 28.6,
    ml_confidence_pct: 66.5,
    confidence_lower_bound: 61.2,
    confidence_upper_bound: 71.8,
    active_buses: 7,
    is_rush_hour: true,
    delay_minutes: 4.8,
  },
  {
    time: "08:00 PM",
    hour: 20,
    avg_speed_kmh: 35.8,
    ml_confidence_pct: 73.5,
    confidence_lower_bound: 69.0,
    confidence_upper_bound: 78.0,
    active_buses: 5,
    is_rush_hour: false,
    delay_minutes: 2.1,
  },
  {
    time: "09:00 PM",
    hour: 21,
    avg_speed_kmh: 39.4,
    ml_confidence_pct: 76.8,
    confidence_lower_bound: 72.5,
    confidence_upper_bound: 81.1,
    active_buses: 3,
    is_rush_hour: false,
    delay_minutes: 0.8,
  },
  {
    time: "10:00 PM",
    hour: 22,
    avg_speed_kmh: 44.0,
    ml_confidence_pct: 84.2,
    confidence_lower_bound: 80.5,
    confidence_upper_bound: 88.0,
    active_buses: 2,
    is_rush_hour: false,
    delay_minutes: 0.2,
  },
]

export const STOP_ARRIVAL_VARIANCES: StopArrivalVariance[] = [
  {
    stop_id: "STOP-TOLLYGUNGE",
    stop_name: "Tollygunge Metro",
    scheduled_time: "08:00 AM",
    actual_time: "08:01 AM",
    delay_minutes: 1.0,
    traffic_level: "low",
    boarding_passengers: 18,
  },
  {
    stop_id: "STOP-BEHALA",
    stop_name: "Behala Chowrasta",
    scheduled_time: "08:10 AM",
    actual_time: "08:13 AM",
    delay_minutes: 3.2,
    traffic_level: "medium",
    boarding_passengers: 24,
  },
  {
    stop_id: "STOP-NEW-ALIPORE",
    stop_name: "New Alipore Gate",
    scheduled_time: "08:20 AM",
    actual_time: "08:25 AM",
    delay_minutes: 5.1,
    traffic_level: "medium",
    boarding_passengers: 15,
  },
  {
    stop_id: "STOP-MAJERHAT",
    stop_name: "Majerhat Station (Flyover Choke)",
    scheduled_time: "08:28 AM",
    actual_time: "08:36 AM",
    delay_minutes: 8.4,
    traffic_level: "severe",
    boarding_passengers: 32,
  },
  {
    stop_id: "STOP-GARDEN-REACH",
    stop_name: "Garden Reach Crossing",
    scheduled_time: "08:35 AM",
    actual_time: "08:44 AM",
    delay_minutes: 9.1,
    traffic_level: "high",
    boarding_passengers: 12,
  },
  {
    stop_id: "STOP-CAMPUS",
    stop_name: "STCET Khidderpore Gate",
    scheduled_time: "08:45 AM",
    actual_time: "08:52 AM",
    delay_minutes: 7.2,
    traffic_level: "medium",
    boarding_passengers: 0,
  },
]

export const FLEET_ROUTES_DATA: FleetRouteMetric[] = [
  {
    route_id: "CAMPUS-EXPRESS",
    route_name: "Tollygunge – STCET Direct",
    bus_count: 3,
    avg_speed_kmh: 31.4,
    avg_delay_min: 4.2,
    on_time_reliability_pct: 88.5,
    color: "#00C8FF",
  },
  {
    route_id: "ROUTE-1",
    route_name: "South Kolkata Ring (Behala)",
    bus_count: 2,
    avg_speed_kmh: 26.8,
    avg_delay_min: 6.8,
    on_time_reliability_pct: 81.0,
    color: "#818CF8",
  },
  {
    route_id: "ROUTE-2",
    route_name: "Alipore – Taratala Bypass",
    bus_count: 2,
    avg_speed_kmh: 33.5,
    avg_delay_min: 3.5,
    on_time_reliability_pct: 92.4,
    color: "#34D399",
  },
  {
    route_id: "ROUTE-3",
    route_name: "Garden Reach Express",
    bus_count: 2,
    avg_speed_kmh: 28.9,
    avg_delay_min: 5.6,
    on_time_reliability_pct: 84.2,
    color: "#FBBF24",
  },
  {
    route_id: "ROUTE-NORTH",
    route_name: "Esplanade – Khidderpore Feeder",
    bus_count: 1,
    avg_speed_kmh: 24.1,
    avg_delay_min: 7.9,
    on_time_reliability_pct: 77.0,
    color: "#F43F5E",
  },
]

export const PIPELINE_DIAGNOSTICS: PipelineDiagnosticSummary = {
  raw_pings_ingested: 25000,
  valid_pings_processed: 24375,
  anomalies_filtered_count: 625,
  pipeline_pass_rate_pct: 97.5,
  inference_engine: "C++ Native FFI (libinference.so / Sigmoid)",
  inference_latency_ms: 1.4,
  spatial_graph_intersections: 14820,
}

// Regression Scatter Points: Speed (km/h) vs ML Confidence (%)
export const SPEED_CONFIDENCE_SCATTER = [
  { speed: 8.5, confidence: 45.2, delay: 14.2 },
  { speed: 11.2, confidence: 48.0, delay: 12.0 },
  { speed: 17.5, confidence: 51.8, delay: 9.5 },
  { speed: 19.8, confidence: 53.4, delay: 8.8 },
  { speed: 22.2, confidence: 57.7, delay: 7.2 },
  { speed: 25.7, confidence: 61.9, delay: 5.4 },
  { speed: 28.6, confidence: 66.5, delay: 4.8 },
  { speed: 29.5, confidence: 66.2, delay: 4.2 },
  { speed: 31.3, confidence: 68.2, delay: 3.5 },
  { speed: 34.5, confidence: 71.6, delay: 2.1 },
  { speed: 36.9, confidence: 73.9, delay: 1.8 },
  { speed: 39.6, confidence: 76.5, delay: 1.2 },
  { speed: 41.8, confidence: 78.4, delay: 0.8 },
  { speed: 44.0, confidence: 81.0, delay: 0.5 },
]
