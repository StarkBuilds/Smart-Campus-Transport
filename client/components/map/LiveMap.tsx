"use client"

// LiveMap — the heart of the entire project
// Uses a fully inline map style so no external JSON fetch is needed
// CARTO dark raster PNG tiles — works even on restricted networks
// Bus icon rotates to face direction of travel via bearing
// Pulsing sonar rings show live GPS updates in real time

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import * as maplibregl from "maplibre-gl"
import Map, {
  Marker, Source, Layer,
  type MapRef, type LayerProps, type StyleSpecification
} from "react-map-gl/maplibre"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation, Clock, Zap, AlertTriangle, Bus, Route as RouteIcon, ShieldAlert, Layers } from "lucide-react"
import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/constants"
import { routeGeoJSON, routeWaypoints, getRouteProgress, toIST } from "@/lib/mock-data"
import { ALTERNATE_TRAFFIC_ROUTE, TRAFFIC_THEME } from "@/lib/traffic-route-data"
import "maplibre-gl/dist/maplibre-gl.css"

// Crystal-clear dark map style — uses Esri World Dark Gray Canvas with native embedded Route Polyline
// 100% free, no API key needed, zero watermark, route is guaranteed to render
const DARK_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
    },
    // Full route line embedded directly in the style source
    "campus-route-source": {
      type: "geojson",
      data: routeGeoJSON,
    },
    "esri-dark-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    // Base dark map layer (roads, land, water)
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#060B18" },
    },
    {
      id: "esri-base-layer",
      type: "raster",
      source: "esri-dark-base",
    },
    // Reference labels layer on top (street names, districts like Khidderpore, Majerhat)
    {
      id: "esri-labels-layer",
      type: "raster",
      source: "esri-dark-labels",
    },
  ],
}

// 1. Traveled path glow — bright Electric Cyan neon bloom
const traveledGlowLayer: LayerProps = {
  id: "traveled-glow",
  type: "line",
  paint: {
    "line-color": "#00C8FF",
    "line-width": 16,
    "line-opacity": 0.35,
    "line-blur": 8,
  },
}

// 2. Traveled path line — solid, intense Electric Cyan
const traveledLineLayer: LayerProps = {
  id: "traveled-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#00C8FF",
    "line-width": 4.5,
    "line-opacity": 0.95,
  },
}

// 3. Remaining path ahead — dashed, subtle preview leading to campus
const remainingLineLayer: LayerProps = {
  id: "remaining-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#818CF8",
    "line-width": 2.5,
    "line-opacity": 0.45,
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

  // Fallback: force-show map after 8 seconds even if tiles are slow
  // This way the bus markers and route line still render even without tiles
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

  // Dynamic route highlighting: compute traveled vs remaining path
  const { traveledGeoJSON, remainingGeoJSON } = getRouteProgress(busData?.longitude, busData?.latitude)

  // Screen-projected SVG route lines — converts GPS coordinates directly to container pixels
  const [svgPath, setSvgPath] = useState("")
  const [altSvgPath, setAltSvgPath] = useState("")
  const [projectedSegments, setProjectedSegments] = useState<ProjectedSegment[]>([])

  const updateSvgPath = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    try {
      // 1. Project Primary Route
      const pts = routeWaypoints.map(([lng, lat]) => {
        const p = map.project([lng, lat])
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
      })
      if (pts.length > 1) {
        setSvgPath(`M ${pts.join(" L ")}`)
      }

      // 2. Project 22 Alternate Traffic Route Segments & Continuous Detour Spine
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
      // Map projection not ready yet
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

  // Camera framing and immediate re-projection on variant toggle
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
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: MAP_DEFAULT_CENTER[0],
          latitude: MAP_DEFAULT_CENTER[1],
          zoom: MAP_DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={DARK_MAP_STYLE}
        onLoad={() => {
          setMapLoaded(true)
          updateSvgPath()
        }}
        onError={(e) => {
          // Even on error, show the map container so markers render
          console.warn("Map tile error:", e)
          setMapLoaded(true)
        }}
        attributionControl={false}
      >
        {/* Guaranteed High-Definition Screen-Projected Neon Route Lines */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
          <svg className="w-full h-full" style={{ overflow: "visible" }}>
            {/* Standard Primary Route Line (Electric Cyan) */}
            {currentVariant === "standard" && svgPath && (
              <>
                {/* Outer Cyan Neon Bloom */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#00C8FF"
                  strokeWidth="16"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "blur(6px)" }}
                />
                {/* Core Solid Electric Cyan Laser Line */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#00C8FF"
                  strokeWidth="4.5"
                  strokeOpacity="0.95"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 5"
                />
              </>
            )}

            {/* When Alternate Route is active: Show primary route as faint, muted dashed gray reference line */}
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

            {/* AI Alternate Route: Continuous Glowing Electric Violet Foundation (Distinct from Cyan) */}
            {currentVariant === "traffic_alternate" && altSvgPath && (
              <>
                {/* Wide Violet Detour Aura */}
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
                {/* Electric Violet Detour Guideway */}
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

            {/* AI Alternate Route: 22 Traffic-Graded Segments on top */}
            {currentVariant === "traffic_alternate" &&
              projectedSegments.map((seg) => (
                <g key={`traffic-seg-${seg.id}`}>
                  {/* Outer Traffic Status Glow Bloom */}
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
                  {/* Core High-Definition Traffic Segment */}
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

        {/* Traveled and Remaining Paths: only shown in standard mode so cyan never clashes with alternate route */}
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

        {/* Alternate Detour Mode: MapLibre GPU WebGL Layers (Guarantees 100% visible vibrant colors) */}
        {currentVariant === "traffic_alternate" && (
          <>
            {/* Primary Route shown as faint, muted dashed reference in MapLibre */}
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

            {/* AI Alternate Detour with vibrant traffic status colors */}
            <Source id="alternate-traffic-route-webgl" type="geojson" data={ALTERNATE_TRAFFIC_ROUTE as any}>
              {/* Outer Traffic Status Glow Bloom */}
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
              {/* High-Definition Core Traffic Segment */}
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
                {/* Pulsing ring on next stop */}
                {(isNextStop || isCampus) && (
                  <span
                    className="absolute rounded-full animate-ping"
                    style={{
                      width: 28, height: 28,
                      top: -4, left: -4,
                      background: isNextStop
                        ? "rgba(0,200,255,0.25)"
                        : "rgba(124,58,237,0.25)",
                    }}
                  />
                )}

                {/* Stop dot */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform duration-200 group-hover:scale-125 ${
                    isCampus
                      ? "bg-violet-500 border-violet-300"
                      : isNextStop
                      ? "bg-cyan-400 border-white"
                      : "bg-[#0D1421] border-cyan-400/60"
                  }`}
                />

                {/* Stop tooltip */}
                <AnimatePresence>
                  {(isSelected || isNextStop) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 min-w-max rounded-xl border border-cyan-400/20 px-3 py-2"
                      style={{ background: "rgba(13,20,33,0.95)" }}
                    >
                      <p className="text-xs font-semibold text-white">{stop.name}</p>
                      <p className="text-[10px] text-cyan-400/70">{stop.scheduled_arrival}</p>
                      {isNextStop && (
                        <p className="text-[10px] text-cyan-400 font-medium">← Next Stop</p>
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
              {/* Floating identification badge */}
              <div
                className="absolute -top-9 whitespace-nowrap rounded-full px-2.5 py-1 border border-cyan-400/40 shadow-xl flex items-center gap-1.5 z-20"
                style={{
                  background: "rgba(6,11,24,0.95)",
                  boxShadow: "0 4px 20px rgba(0,200,255,0.4)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-white tracking-wide">Bus B01</span>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">{busData.speed_kmh.toFixed(0)} km/h</span>
              </div>

              {/* Sonar pulse ring 1 */}
              <span
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  width: 56, height: 56,
                  background: "rgba(0,200,255,0.25)",
                  animationDuration: "1.8s",
                }}
              />
              {/* Sonar pulse ring 2 */}
              <span
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  width: 40, height: 40,
                  background: "rgba(0,200,255,0.35)",
                  animationDuration: "1.8s",
                  animationDelay: "0.5s",
                }}
              />

              {/* Directional heading ring */}
              <div
                className="absolute w-12 h-12 rounded-full pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                  transform: `rotate(${busData.bearing}deg)`,
                }}
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full mx-auto -mt-1 shadow-[0_0_8px_#00C8FF]" />
              </div>

              {/* Bus icon circle */}
              <div
                className="relative w-11 h-11 rounded-full border-2 border-white flex items-center justify-center z-10 transition-transform group-hover:scale-110"
                style={{
                  background: "linear-gradient(135deg, #00C8FF 0%, #0077FF 100%)",
                  boxShadow: "0 0 25px rgba(0,200,255,0.9), 0 0 50px rgba(0,119,255,0.4)",
                }}
              >
                <Bus className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Top-left: live status badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10"
          style={{ background: "rgba(13,20,33,0.9)" }}
        >
          <span className={`w-2 h-2 rounded-full ${busData ? "bg-emerald-400 pulse-live" : "bg-red-400"}`} />
          <span className="text-xs font-medium text-white">{busData ? "LIVE" : "Connecting..."}</span>
        </div>
        {busData && (
          <div
            className="rounded-xl px-3 py-2 border border-white/10"
            style={{ background: "rgba(13,20,33,0.9)" }}
          >
            <p className="text-[10px] text-white/50">Last update</p>
            <p className="text-xs text-white font-mono">{toIST(busData.timestamp)}</p>
          </div>
        )}
      </div>

      {/* Center-Top: Floating Route Switcher & Live Traffic Legend */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <div
          className="flex items-center gap-1.5 p-1 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md"
          style={{ background: "rgba(11,19,43,0.85)" }}
        >
          <button
            onClick={() => setVariant("standard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              currentVariant === "standard"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan shadow-sm"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Primary Route</span>
            <span className="sm:hidden">Primary</span>
          </button>

          <button
            onClick={() => setVariant("traffic_alternate")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              currentVariant === "traffic_alternate"
                ? "bg-purple-500/25 text-purple-300 border border-purple-400/50 shadow-lg shadow-purple-500/10"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Alternate Detour</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 text-purple-200 rounded font-mono font-bold">
              Violet &bull; 22 Segments
            </span>
          </button>
        </div>

        {/* Dynamic Traffic Legend for Alternate Route */}
        {currentVariant === "traffic_alternate" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-3.5 py-1 rounded-full border border-purple-500/30 text-[10px] font-mono shadow-xl backdrop-blur-md"
            style={{ background: "rgba(10,8,25,0.92)" }}
          >
            <div className="flex items-center gap-1.5 text-purple-300 font-bold border-r border-white/10 pr-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> Detour Path
            </div>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt;30 km/h
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> 15-30 km/h
            </span>
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" /> &lt;15 km/h (Choke)
            </span>
          </motion.div>
        )}
      </div>

      {/* Top-right: Controls (Center on bus & Link to Analytics) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Link
          href="/analytics"
          title="Open ML Analytics"
          className="h-10 px-3 rounded-xl border border-white/10 flex items-center gap-1.5 hover:border-cyan-400/40 transition-all text-xs font-mono text-cyan-400"
          style={{ background: "rgba(13,20,33,0.9)" }}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Analytics Hub</span>
        </Link>

        {busData && (
          <button
            onClick={centerOnBus}
            title="Center on bus"
            className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center hover:border-cyan-400/40 transition-all"
            style={{ background: "rgba(13,20,33,0.9)" }}
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Bottom: ETA info bar */}
      {busData && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-4 left-4 right-4 z-10"
        >
          <div
            className="rounded-2xl border border-white/10 px-5 py-3 flex items-center justify-between gap-4"
            style={{ background: "rgba(13,20,33,0.92)" }}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/50">ETA to next stop</p>
                <p className="text-sm font-bold text-cyan-400">{busData.eta_minutes} min</p>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/50">Speed</p>
                <p className="text-sm font-bold text-white">{busData.speed_kmh.toFixed(1)} km/h</p>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2.5">
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 ${
                  busData.delay_minutes > 5
                    ? "text-red-400"
                    : busData.delay_minutes > 2
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              />
              <div>
                <p className="text-[10px] text-white/50">Schedule</p>
                <p className={`text-sm font-bold ${
                  busData.delay_minutes > 5 ? "text-red-400" : busData.delay_minutes > 2 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {busData.delay_minutes <= 2 ? "On Time ✓" : `${busData.delay_minutes} min late`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading overlay — disappears once map fires onLoad or 8s timeout */}
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 bg-[#060B18] flex flex-col items-center justify-center z-20 rounded-2xl"
          >
            <div className="w-12 h-12 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin mb-4" />
            <p className="text-sm text-white/40">Loading Kolkata map...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
