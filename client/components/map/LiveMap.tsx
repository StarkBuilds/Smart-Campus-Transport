"use client"

// LiveMap — the heart of the entire project
// Uses a fully inline map style so no external JSON fetch is needed
// CARTO dark raster PNG tiles — works even on restricted networks
// Bus icon rotates to face direction of travel via bearing
// Pulsing sonar rings show live GPS updates in real time

import { useEffect, useRef, useState, useCallback } from "react"
import Map, {
  Marker, Source, Layer,
  type MapRef, type LayerProps, type StyleSpecification
} from "react-map-gl/maplibre"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation, Clock, Zap, AlertTriangle, Bus } from "lucide-react"
import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/constants"
import { routeGeoJSON, toIST } from "@/lib/mock-data"
import "maplibre-gl/dist/maplibre-gl.css"

// Crystal-clear dark map style — uses Esri World Dark Gray Canvas
// 100% free, no API key needed, zero watermark, extremely high quality
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
    // Reference labels layer (street names, districts like Khidderpore, Majerhat)
    {
      id: "esri-labels-layer",
      type: "raster",
      source: "esri-dark-labels",
    },
  ],
}

// MapLibre layer for the route line glow (wide, blurry)
const routeGlowLayer: LayerProps = {
  id: "route-glow",
  type: "line",
  paint: {
    "line-color": "#00C8FF",
    "line-width": 14,
    "line-opacity": 0.08,
    "line-blur": 8,
  },
}

// MapLibre layer for the actual visible route line (dashed)
const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#00C8FF",
    "line-width": 3,
    "line-opacity": 0.75,
    "line-dasharray": [5, 3],
  },
}

interface LiveMapProps {
  busData: LiveBusData | null
  userRole: "student" | "driver"
  onStopClick?: (stopId: string) => void
}

export default function LiveMap({ busData, userRole, onStopClick }: LiveMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

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

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_DEFAULT_CENTER[0],
          latitude: MAP_DEFAULT_CENTER[1],
          zoom: MAP_DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={DARK_MAP_STYLE}
        onLoad={() => setMapLoaded(true)}
        onError={(e) => {
          // Even on error, show the map container so markers render
          console.warn("Map tile error:", e)
          setMapLoaded(true)
        }}
        attributionControl={false}
      >
        {/* Bus route GeoJSON source + layers */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer {...routeGlowLayer} />
          <Layer {...routeLineLayer} />
        </Source>

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

      {/* Top-right: center on bus button */}
      {busData && (
        <button
          onClick={centerOnBus}
          title="Center on bus"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center hover:border-cyan-400/40 transition-all"
          style={{ background: "rgba(13,20,33,0.9)" }}
        >
          <Navigation className="w-4 h-4 text-cyan-400" />
        </button>
      )}

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
