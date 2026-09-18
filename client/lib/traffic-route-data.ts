// Alternate Route GeoJSON with Segment-by-Segment Dynamic Traffic Status
// Real campus detour corridor: Bypasses Majerhat Flyover choke via Taratala Road & Hide Road to STCET Campus

export interface TrafficSegmentFeature {
  type: "Feature"
  properties: {
    route_type: "alternate"
    traffic_status: "green" | "amber" | "red"
    speed_estimate_kmh?: number
    segment_name?: string
  }
  geometry: {
    type: "LineString"
    coordinates: [number, number][] // [lng, lat]
  }
}

export interface TrafficRouteCollection {
  type: "FeatureCollection"
  features: TrafficSegmentFeature[]
}

export const ALTERNATE_TRAFFIC_ROUTE: TrafficRouteCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 24.5,
        segment_name: "New Alipore Detour Divergence",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3390, 22.5120],
          [88.3355, 22.5135],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 26.0,
        segment_name: "Diamond Harbour Bypass Slipway",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3355, 22.5135],
          [88.3320, 22.5145],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 36.2,
        segment_name: "Taratala Road Entry Chute",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3320, 22.5145],
          [88.3290, 22.5152],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 38.0,
        segment_name: "Goragacha Road Crossing",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3290, 22.5152],
          [88.3265, 22.5160],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 41.5,
        segment_name: "Taratala Industrial Link",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3265, 22.5160],
          [88.3240, 22.5170],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 42.0,
        segment_name: "CPT Colony Transitway",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3240, 22.5170],
          [88.3215, 22.5185],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 40.5,
        segment_name: "Brace Bridge North Approach",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3215, 22.5185],
          [88.3190, 22.5200],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 37.8,
        segment_name: "Sonadingi Avenue Connector",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3190, 22.5200],
          [88.3168, 22.5218],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 39.0,
        segment_name: "Upendranath Corridor West",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3168, 22.5218],
          [88.3150, 22.5235],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 35.5,
        segment_name: "Transport Depot Feeder A",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3150, 22.5235],
          [88.3138, 22.5250],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 28.0,
        segment_name: "Transport Depot Central Link",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3138, 22.5250],
          [88.3125, 22.5268],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "red",
        speed_estimate_kmh: 13.5,
        segment_name: "Railway Yard Bottleneck Crossing",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3125, 22.5268],
          [88.3115, 22.5285],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 22.0,
        segment_name: "Dock Junction Clearance",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3115, 22.5285],
          [88.3122, 22.5300],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 38.5,
        segment_name: "Hide Road Expressway Entry",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3122, 22.5300],
          [88.3140, 22.5315],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 44.0,
        segment_name: "Hide Road North Corridor",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3140, 22.5315],
          [88.3165, 22.5328],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 42.5,
        segment_name: "Port Trust Logistics Bypass",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3165, 22.5328],
          [88.3190, 22.5342],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 37.0,
        segment_name: "Remount Road Interchange",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3190, 22.5342],
          [88.3210, 22.5355],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 27.5,
        segment_name: "Khidderpore Tram Depot Link",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3210, 22.5355],
          [88.3228, 22.5365],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 25.0,
        segment_name: "Hospital Road Crossing",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3228, 22.5365],
          [88.3242, 22.5372],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "amber",
        speed_estimate_kmh: 23.0,
        segment_name: "Diamond Harbour Road Merge",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3242, 22.5372],
          [88.3252, 22.5378],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 32.0,
        segment_name: "STCET Gate Approach Link",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3252, 22.5378],
          [88.3260, 22.5384],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        route_type: "alternate",
        traffic_status: "green",
        speed_estimate_kmh: 30.0,
        segment_name: "STCET Khidderpore Campus Gate",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.3260, 22.5384],
          [88.3266, 22.5388],
        ],
      },
    },
  ],
}

export const TRAFFIC_THEME = {
  green: {
    stroke: "#10B981", // Emerald neon
    glow: "#059669",
    label: "Free Flow (>30 km/h)",
    description: "Optimal bus velocity, zero congestion",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  amber: {
    stroke: "#F59E0B", // Vivid Amber warning
    glow: "#D97706",
    label: "Moderate Crawl (15-30 km/h)",
    description: "Peak-hour queue build-up",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  red: {
    stroke: "#EF4444", // Crimson gridlock
    glow: "#DC2626",
    label: "Bottleneck Delay (<15 km/h)",
    description: "Severe intersection bottleneck",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
  },
} as const
