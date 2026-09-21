"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as maplibregl from "maplibre-gl"
import Map, {
  Marker, Source, Layer,
  type MapRef, type LayerProps, type StyleSpecification
} from "react-map-gl/maplibre"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation, Zap, Bus, Route as RouteIcon } from "lucide-react"
import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/constants"
import { routeGeoJSON, routeWaypoints, getRouteProgress } from "@/lib/mock-data"
import { ALTERNATE_TRAFFIC_ROUTE, TRAFFIC_THEME } from "@/lib/traffic-route-data"
import "maplibre-gl/dist/maplibre-gl.css"

// Natural Daylight OpenStreetMap & Esri Street Style
const DAYLIGHT_OSM_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "daylight-osm-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri, OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "daylight-osm-layer",
      type: "raster",
      source: "daylight-osm-base",
    },
  ],
}

// 1. Traveled path glow
const traveledGlowLayer: LayerProps = {
  id: "traveled-glow",
  type: "line",
  paint: {
    "line-color": "#3B82F6",
    "line-width": 14,
    "line-opacity": 0.28,
    "line-blur": 6,
  },
}

// 2. Traveled path line — Royal Transit Blue (#1D4ED8)
const traveledLineLayer: LayerProps = {
  id: "traveled-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#1D4ED8",
    "line-width": 5,
    "line-opacity": 0.95,
  },
}

// 3. Remaining path ahead — dashed muted path
const remainingLineLayer: LayerProps = {
  id: "remaining-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#64748B",
    "line-width": 2.5,
    "line-opacity": 0.65,
    "line-dasharray": [4, 3],
  },
}

interface LiveMapProps {
  busData: LiveBusData | null
  userRole: "student" | "driver"
  onStopClick?: (stopId: string) => void
  activeRouteVariant?: "standard" | "traffic_alternate"
  onToggleRouteVariant?: (variant: "standard" | "traffic_alternate") => void
}

interface ProjectedSegment {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  glow: string
  status: "green" | "amber" | "red"
  name?: string
  speed?: number
}

export default function LiveMap({
  busData,
  userRole,
  onStopClick,
  activeRouteVariant,
  onToggleRouteVariant,
}: LiveMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [internalVariant, setInternalVariant] = useState<"standard" | "traffic_alternate">("standard")
  const currentVariant = activeRouteVariant ?? internalVariant

  const setVariant = (v: "standard" | "traffic_alternate") => {
    setInternalVariant(v)
    onToggleRouteVariant?.(v)
  }

  // Fallback: force-show map after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  // Smooth pan to follow the bus when it moves
  const centerOnBus = useCallback(() => {
    if (!busData || !mapRef.current) return
    mapRef.current.easeTo({
      center: [busData.longitude, busData.latitude],
      duration: 1500,
      zoom: 14,
    })
  }, [busData?.latitude, busData?.longitude])

  useEffect(() => {
    if (busData && mapLoaded && busData.speed_kmh > 1) {
      centerOnBus()
    }
  }, [busData?.latitude, busData?.longitude])

  const handleStopClick = (stopId: string) => {
    setSelectedStop(stopId === selectedStop ? null : stopId)
    onStopClick?.(stopId)
  }

  // Dynamic route progress
  const { traveledGeoJSON, remainingGeoJSON } = getRouteProgress(busData?.longitude, busData?.latitude)

  // Screen-projected SVG route lines
  const [svgPath, setSvgPath] = useState("")
  const [altSvgPath, setAltSvgPath] = useState("")
  const [projectedSegments, setProjectedSegments] = useState<ProjectedSegment[]>([])

  const updateSvgPath = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    try {
      // 1. Primary Route
      const pts = routeWaypoints.map(([lng, lat]) => {
        const p = map.project([lng, lat])
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
      })
      if (pts.length > 1) {
        setSvgPath(`M ${pts.join(" L ")}`)
      }

      // 2. Alternate Traffic Route
      const segs: ProjectedSegment[] = []
      const altPts: string[] = []

      ALTERNATE_TRAFFIC_ROUTE.features.forEach((feat, i) => {
        const [c1, c2] = feat.geometry.coordinates
        if (c1 && c2) {
          const p1 = map.project(c1)
          const p2 = map.project(c2)

          if (i === 0) {
            altPts.push(`${p1.x.toFixed(1)},${p1.y.toFixed(1)}`)
          }
          altPts.push(`${p2.x.toFixed(1)},${p2.y.toFixed(1)}`)

          const status = feat.properties.traffic_status
          segs.push({
            id: i,
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            color: TRAFFIC_THEME[status].stroke,
            glow: TRAFFIC_THEME[status].glow,
            status,
            name: feat.properties.segment_name,
            speed: feat.properties.speed_estimate_kmh,
          })
        }
      })

      if (altPts.length > 1) {
        setAltSvgPath(`M ${altPts.join(" L ")}`)
      }
      setProjectedSegments(segs)
    } catch {
      // Ignore initial unprojectable states
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    updateSvgPath()
    map.on("render", updateSvgPath)
    map.on("move", updateSvgPath)
    map.on("zoom", updateSvgPath)

    return () => {
      map.off("render", updateSvgPath)
      map.off("move", updateSvgPath)
      map.off("zoom", updateSvgPath)
    }
  }, [mapLoaded, updateSvgPath])

  useEffect(() => {
    if (currentVariant === "traffic_alternate" && mapRef.current) {
      const map = mapRef.current.getMap()
      if (map) {
        map.easeTo({
          center: [88.3245, 22.5255],
          zoom: 13.5,
          duration: 1200,
        })
      }
    }
    const timer = setTimeout(() => updateSvgPath(), 60)
    return () => clearTimeout(timer)
  }, [currentVariant, updateSvgPath])

  return (
    <div className="relative w-full h-full bg-parchment overflow-hidden">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: MAP_DEFAULT_CENTER[0],
          latitude: MAP_DEFAULT_CENTER[1],
          zoom: MAP_DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={DAYLIGHT_OSM_MAP_STYLE}
        onLoad={() => {
          setMapLoaded(true)
          updateSvgPath()
        }}
        onError={(e) => {
          console.warn("Map tile warning:", e)
          setMapLoaded(true)
        }}
        attributionControl={false}
      >
        {/* SVG Route Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
          <svg className="w-full h-full" style={{ overflow: "visible" }}>
            {/* Primary Route Line */}
            {currentVariant === "standard" && svgPath && (
              <>
                {/* White casing */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="8.5"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Outer Azure Glow */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="14"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "blur(5px)" }}
                />
                {/* Core Royal Transit Blue (#1D4ED8) */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="4.5"
                  strokeOpacity="0.95"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Muted line for primary route during detour */}
            {currentVariant === "traffic_alternate" && svgPath && (
              <path
                d={svgPath}
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeOpacity="0.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 6"
              />
            )}

            {/* AI Alternate Route Foundation */}
            {currentVariant === "traffic_alternate" && altSvgPath && (
              <>
                <path
                  d={altSvgPath}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="16"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "blur(8px)" }}
                />
                <path
                  d={altSvgPath}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="5.5"
                  strokeOpacity="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* 22 Traffic Segments */}
            {currentVariant === "traffic_alternate" &&
              projectedSegments.map((seg) => (
                <g key={`traffic-seg-${seg.id}`}>
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke={seg.color}
                    strokeWidth="10"
                    strokeOpacity="0.6"
                    strokeLinecap="round"
                    style={{ filter: "blur(4px)" }}
                  />
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke={seg.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </g>
              ))}
          </svg>
        </div>

        {/* Traveled and Remaining Paths */}
        {currentVariant === "standard" && (
          <>
            <Source id="traveled-route" type="geojson" data={traveledGeoJSON}>
              <Layer {...traveledGlowLayer} />
              <Layer {...traveledLineLayer} />
            </Source>
            <Source id="remaining-route" type="geojson" data={remainingGeoJSON}>
              <Layer {...remainingLineLayer} />
            </Source>
          </>
        )}

        {/* Alternate Detour WebGL Layers */}
        {currentVariant === "traffic_alternate" && (
          <>
            <Source id="congested-primary-path" type="geojson" data={routeGeoJSON}>
              <Layer
                id="congested-ref-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#64748B",
                  "line-width": 2.5,
                  "line-opacity": 0.4,
                  "line-dasharray": [3, 2],
                }}
              />
            </Source>

            <Source id="alternate-traffic-route-webgl" type="geojson" data={ALTERNATE_TRAFFIC_ROUTE as any}>
              <Layer
                id="alt-traffic-glow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": [
                    "match",
                    ["get", "traffic_status"],
                    "green",
                    "#10B981",
                    "amber",
                    "#F59E0B",
                    "red",
                    "#EF4444",
                    "#8B5CF6",
                  ],
                  "line-width": 14,
                  "line-opacity": 0.6,
                  "line-blur": 6,
                }}
              />
              <Layer
                id="alt-traffic-core"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": [
                    "match",
                    ["get", "traffic_status"],
                    "green",
                    "#10B981",
                    "amber",
                    "#F59E0B",
                    "red",
                    "#EF4444",
                    "#8B5CF6",
                  ],
                  "line-width": 4.5,
                  "line-opacity": 0.95,
                }}
              />
            </Source>
          </>
        )}

        {/* Bus stop markers */}
        {BUS_STOPS.map((stop) => {
          const isSelected = selectedStop === stop.stop_id
          const isNextStop = busData?.next_stop_id === stop.stop_id
          const isCampus = stop.stop_id === "STOP-CAMPUS"

          return (
            <Marker
              key={stop.stop_id}
              longitude={stop.longitude}
              latitude={stop.latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleStopClick(stop.stop_id)
              }}
            >
              <div className="relative cursor-pointer group">
                {(isNextStop || isCampus) && (
                  <span
                    className="absolute rounded-full animate-ping"
                    style={{
                      width: 28, height: 28,
                      top: -4, left: -4,
                      background: isNextStop
                        ? "rgba(234,88,12,0.3)"
                        : "rgba(124,58,237,0.25)",
                    }}
                  />
                )}

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform duration-200 group-hover:scale-125 shadow-xs ${
                    isCampus
                      ? "bg-purple-600 border-purple-200"
                      : isNextStop
                      ? "bg-terracotta border-white ring-2 ring-terracotta/30"
                      : "bg-white border-stone-text"
                  }`}
                />

                <AnimatePresence>
                  {(isSelected || isNextStop) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 min-w-max rounded-xl border border-stone-subtle px-3 py-2 shadow-xl bg-white/95 backdrop-blur-md"
                    >
                      <p className="text-xs font-semibold text-espresso">{stop.name}</p>
                      <p className="text-[10px] text-stone-text">{stop.scheduled_arrival}</p>
                      {isNextStop && (
                        <p className="text-[10px] text-terracotta font-bold">← Next Stop</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Marker>
          )
        })}

        {/* Live bus marker */}
        {busData && (
          <Marker longitude={busData.longitude} latitude={busData.latitude}>
            <div className="relative flex flex-col items-center justify-center cursor-pointer group">
              {/* Badge */}
              <div
                className="absolute -top-8 whitespace-nowrap rounded-full px-2.5 py-0.5 border border-stone-subtle shadow-md flex items-center gap-1.5 z-20 bg-white/95"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-espresso tracking-wide">Bus B01</span>
                <span className="text-[10px] font-mono text-terracotta font-bold">{busData.speed_kmh.toFixed(0)} km/h</span>
              </div>

              {/* Ping Ring */}
              <span
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  width: 48, height: 48,
                  background: "rgba(234,88,12,0.25)",
                  animationDuration: "1.8s",
                }}
              />

              {/* Bearing ring */}
              <div
                className="absolute w-10 h-10 rounded-full pointer-events-none transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${busData.bearing}deg)` }}
              >
                <div className="w-2 h-2 bg-terracotta rounded-full mx-auto -mt-1 shadow-xs" />
              </div>

              {/* Bus circle */}
              <div
                className="relative w-10 h-10 rounded-full border-2 border-white flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-md bg-terracotta text-white"
              >
                <Bus className="w-5 h-5 drop-shadow-xs" />
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Floating Center-Top: Primary vs Alternate Route Switcher */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 p-1 rounded-2xl border border-stone-subtle shadow-md bg-white/90 backdrop-blur-md">
          <button
            onClick={() => setVariant("standard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentVariant === "standard"
                ? "bg-terracotta text-white shadow-xs"
                : "text-stone-text hover:text-espresso"
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>Primary Route</span>
          </button>

          <button
            onClick={() => setVariant("traffic_alternate")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentVariant === "traffic_alternate"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-stone-text hover:text-espresso"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>AI Detour</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              currentVariant === "traffic_alternate" ? "bg-purple-800 text-white" : "bg-purple-100 text-purple-800"
            }`}>
              22 Segments
            </span>
          </button>
        </div>
      </div>

      {/* Top Controls: Zoom + Re-center */}
      <div className="absolute bottom-20 sm:bottom-6 right-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col rounded-xl overflow-hidden border border-stone-subtle shadow-md bg-white/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-8 h-8 flex items-center justify-center text-espresso hover:bg-parchment-warm border-b border-stone-subtle font-bold text-base transition-colors cursor-pointer"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-8 h-8 flex items-center justify-center text-espresso hover:bg-parchment-warm font-bold text-base transition-colors cursor-pointer"
            title="Zoom out"
          >
            &minus;
          </button>
        </div>

        {busData && (
          <button
            type="button"
            onClick={centerOnBus}
            title="Center on bus"
            className="w-8 h-8 rounded-xl border border-stone-subtle flex items-center justify-center hover:bg-parchment-warm transition-all shadow-md bg-white/90 backdrop-blur-md text-espresso cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-terracotta" />
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 bg-parchment flex flex-col items-center justify-center z-30"
          >
            <div className="w-10 h-10 rounded-full border-2 border-terracotta/20 border-t-terracotta animate-spin mb-3" />
            <p className="text-xs text-stone-text">Loading Kolkata Map...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
