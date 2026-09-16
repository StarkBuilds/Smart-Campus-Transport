"use client"

// LiveMap — the heart of the entire project
// Shows the bus moving in real time on a dark MapLibre map
// Uses free OpenStreetMap tiles styled dark — no API key needed
// Bus icon rotates based on bearing, moves smoothly using CSS transitions
// Route line is drawn as animated dashes, stops pulse on hover

import { useEffect, useRef, useState, useCallback } from "react"
import Map, { Marker, Source, Layer, type MapRef, type LayerProps } from "react-map-gl/maplibre"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Navigation, Clock, Zap, AlertTriangle } from "lucide-react"
import type { LiveBusData } from "@/types/bus"
import { BUS_STOPS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/constants"
import { routeGeoJSON, toIST } from "@/lib/mock-data"
import "maplibre-gl/dist/maplibre-gl.css"

// MapLibre layer style for the route line
const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#00C8FF",
    "line-width": 3,
    "line-opacity": 0.7,
    "line-dasharray": [4, 2],
  },
}

// Glow behind the route line for depth
const routeGlowLayer: LayerProps = {
  id: "route-glow",
  type: "line",
  paint: {
    "line-color": "#00C8FF",
    "line-width": 12,
    "line-opacity": 0.08,
    "line-blur": 6,
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

  // When bus position updates, smoothly pan the map to follow it
  const centerOnBus = useCallback(() => {
    if (!busData || !mapRef.current) return
    mapRef.current.easeTo({
      center: [busData.longitude, busData.latitude],
      duration: 1500,
      zoom: 14,
    })
  }, [busData?.latitude, busData?.longitude])

  // Follow the bus automatically when new data arrives
  useEffect(() => {
    if (busData && mapLoaded) {
      // Only auto-pan if the bus is moving (speed > 0)
      if (busData.speed_kmh > 1) {
        centerOnBus()
      }
    }
  }, [busData?.latitude, busData?.longitude, mapLoaded])

  const handleStopClick = (stopId: string) => {
    setSelectedStop(stopId === selectedStop ? null : stopId)
    onStopClick?.(stopId)
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_DEFAULT_CENTER[0],
          latitude: MAP_DEFAULT_CENTER[1],
          zoom: MAP_DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        // Free dark map tiles from CartoDB — no API key needed
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onLoad={() => setMapLoaded(true)}
        cursor="crosshair"
        attributionControl={false}
      >
        {/* Route GeoJSON source */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          {/* Glow layer first (under) then the actual line on top */}
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
                {/* Pulsing ring on next stop or campus */}
                {(isNextStop || isCampus) && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: isNextStop ? "rgba(0,200,255,0.3)" : "rgba(124,58,237,0.3)",
                      width: "28px",
                      height: "28px",
                      top: "-4px",
                      left: "-4px",
                    }}
                  />
                )}

                {/* The stop dot */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-125 ${
                    isCampus
                      ? "bg-violet-500 border-violet-300"
                      : isNextStop
                      ? "bg-cyan-400 border-cyan-200"
                      : "bg-[#0D1421] border-cyan-400/60"
                  }`}
                >
                  {isCampus && <MapPin className="w-2.5 h-2.5 text-white" />}
                </div>

                {/* Tooltip on hover/select */}
                <AnimatePresence>
                  {(isSelected || isNextStop) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-7 left-1/2 -translate-x-1/2 min-w-max glass-strong rounded-xl border border-cyan-400/20 px-3 py-2 z-50"
                    >
                      <p className="text-xs font-semibold text-white">{stop.name}</p>
                      <p className="text-[10px] text-muted-foreground">{stop.scheduled_arrival}</p>
                      {isNextStop && (
                        <p className="text-[10px] text-cyan-400 font-medium mt-0.5">← Next Stop</p>
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
          <Marker
            longitude={busData.longitude}
            latitude={busData.latitude}
          >
            <div className="relative">
              {/* Sonar pulse rings — shows it's live */}
              <div className="absolute inset-0 rounded-full animate-ping" style={{ width: "48px", height: "48px", top: "-12px", left: "-12px", background: "rgba(0,200,255,0.15)" }} />
              <div className="absolute inset-0 rounded-full animate-ping animation-delay-300" style={{ width: "36px", height: "36px", top: "-6px", left: "-6px", background: "rgba(0,200,255,0.2)", animationDuration: "1.5s", animationDelay: "0.3s" }} />

              {/* Bus icon — rotated to face the direction of travel */}
              <div
                className="w-10 h-10 rounded-full bg-cyan-400 border-2 border-white flex items-center justify-center shadow-lg"
                style={{
                  transform: `rotate(${busData.bearing}deg)`,
                  transition: "transform 1s ease-out",
                  boxShadow: "0 0 20px rgba(0,200,255,0.6)",
                }}
              >
                {/* Simple bus arrow SVG */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#060B18] fill-current">
                  <path d="M17 12V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7H4l8 8 8-8h-3z" />
                </svg>
              </div>

              {/* Speed label below the bus */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[9px] font-mono text-cyan-400 bg-[#060B18]/80 px-1.5 py-0.5 rounded-full border border-cyan-400/20">
                  {busData.speed_kmh.toFixed(0)} km/h
                </span>
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Map overlay — top left: live badge */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="flex items-center gap-2 px-3 py-2 glass-strong rounded-xl border border-white/10">
          <span className={`w-2 h-2 rounded-full ${busData ? "bg-emerald-400 pulse-live" : "bg-red-400"}`} />
          <span className="text-xs font-medium text-white">
            {busData ? "LIVE" : "Connecting..."}
          </span>
        </div>

        {busData && (
          <div className="glass-strong rounded-xl border border-white/10 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Last update</p>
            <p className="text-xs text-white font-mono">{toIST(busData.timestamp)}</p>
          </div>
        )}
      </div>

      {/* Map overlay — top right: center on bus button */}
      {busData && (
        <button
          onClick={centerOnBus}
          className="absolute top-4 right-4 z-10 w-10 h-10 glass-strong rounded-xl border border-white/10 flex items-center justify-center hover:border-cyan-400/40 transition-all"
          title="Center on bus"
        >
          <Navigation className="w-4 h-4 text-cyan-400" />
        </button>
      )}

      {/* Map overlay — bottom: ETA bar */}
      {busData && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 left-4 right-4 z-10"
        >
          <div className="glass-strong rounded-2xl border border-white/10 px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">ETA to next stop</p>
                <p className="text-sm font-bold text-cyan-400">{busData.eta_minutes} min</p>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Speed</p>
                <p className="text-sm font-bold text-white">{busData.speed_kmh.toFixed(1)} km/h</p>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2.5">
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 ${busData.delay_minutes > 5 ? "text-red-400" : busData.delay_minutes > 2 ? "text-amber-400" : "text-emerald-400"}`}
              />
              <div>
                <p className="text-[10px] text-muted-foreground">Schedule</p>
                <p className={`text-sm font-bold ${busData.delay_minutes > 5 ? "text-red-400" : busData.delay_minutes > 2 ? "text-amber-400" : "text-emerald-400"}`}>
                  {busData.delay_minutes <= 2
                    ? "On Time"
                    : `${busData.delay_minutes} min late`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading overlay while map initializes */}
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#060B18] flex items-center justify-center z-20 rounded-2xl"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
