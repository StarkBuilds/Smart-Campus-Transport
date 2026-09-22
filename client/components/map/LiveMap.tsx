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
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/constants"
import "maplibre-gl/dist/maplibre-gl.css"

import Image from "next/image"

const CYCLOSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    cyclosm: {
      type: "raster",
      tiles: ["https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CyclOSM",
    },
  },
  layers: [
    {
      id: "cyclosm-basemap",
      type: "raster",
      source: "cyclosm",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

const routeHaloLayer: LayerProps = {
  id: "route-halo",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#60A5FA",
    "line-width": 12,
    "line-opacity": 0.4,
  },
}

const routeCasingLayer: LayerProps = {
  id: "route-casing",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#FFFFFF",
    "line-width": 7,
    "line-opacity": 1.0,
  },
}

const routeCoreLayer: LayerProps = {
  id: "route-core",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#2563EB",
    "line-width": 4.5,
    "line-opacity": 1.0,
  },
}

interface StopInfo {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
  arrivalOffsetMinutes: number;
}

interface RouteResponse {
  routeId: string;
  name: string;
  description: string;
  color: string;
  stops: StopInfo[];
}

interface LiveMapProps {
  busData: LiveBusData | null
  userRole?: "student" | "driver"
  onStopClick?: (stopId: string) => void
  onMapClick?: (longitude: number, latitude: number) => void
}

export default function LiveMap({
  busData,
  userRole = "student",
  onStopClick,
  onMapClick,
}: LiveMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null)
  const [stops, setStops] = useState<StopInfo[]>([])
  const [sourceAndDest, setSourceAndDest] = useState<{source: StopInfo | null, dest: StopInfo | null}>({source: null, dest: null})
  
  const [isLoading, setIsLoading] = useState(true)
  const [mapZoom, setMapZoom] = useState(MAP_DEFAULT_ZOOM)

  // Needs map click handling to report longitude/latitude
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    // Phase 3A: Output coordinates to console for future stop creation features (Phase 3B)
    console.log("Map clicked at [longitude, latitude]:", [e.lngLat.lng, e.lngLat.lat])
    onMapClick?.(e.lngLat.lng, e.lngLat.lat)
  }, [onMapClick])

  // Fetch true geometry from backend OSRM cache (same path B01 follows)
  useEffect(() => {
    async function fetchRouteData() {
      try {
        const [routeRes, geomRes] = await Promise.all([
          fetch("/api/routes/R01"),
          fetch("/api/routes/R01/geometry"),
        ])

        if (routeRes.ok) {
          const routeData: RouteResponse = await routeRes.json()
          if (routeData.stops && routeData.stops.length > 0) {
            const sortedStops = [...routeData.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            setStops(sortedStops)
            setSourceAndDest({
              source: sortedStops[0],
              dest: sortedStops[sortedStops.length - 1],
            })
          }
        }

        if (geomRes.ok) {
          const geomPayload = await geomRes.json()
          const geometry = geomPayload.geometry
          if (geometry?.type === "LineString" && geometry.coordinates?.length > 1) {
            setRouteGeoJSON({
              type: "Feature",
              properties: {},
              geometry,
            })
          }
        }
      } catch (err) {
        console.error("Failed to load map route data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRouteData()
  }, [])

  // One-time focus on bus
  const centerOnBus = useCallback(() => {
    if (!busData || !mapRef.current) return
    mapRef.current.easeTo({
      center: [busData.longitude, busData.latitude],
      duration: 1500,
      zoom: 15,
    })
  }, [busData?.latitude, busData?.longitude])

  const handleStopClick = (stopId: string) => {
    setSelectedStop(stopId === selectedStop ? null : stopId)
    onStopClick?.(stopId)
  }

  // Responsive overhead bus size — small/realistic, scales with zoom, keeps aspect ratio.
  const busWidth = Math.max(22, Math.min(52, 14 + (mapZoom - 12) * 5))
  const busHeight = busWidth * (96 / 44)

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
        minZoom={0}
        maxZoom={22}
        style={{ width: "100%", height: "100%" }}
        mapStyle={CYCLOSM_STYLE}
        attributionControl={{ compact: false }}
        onClick={handleMapClick}
        onLoad={() => setMapLoaded(true)}
        onMove={(evt) => setMapZoom(evt.viewState.zoom)}
        onZoom={(evt) => setMapZoom(evt.viewState.zoom)}
        onError={(e) => {
          console.warn("Map warn:", e)
          setMapLoaded(true)
        }}
      >
          {routeGeoJSON && (
            <Source id="route-source" type="geojson" data={routeGeoJSON}>
              <Layer {...routeHaloLayer} />
              <Layer {...routeCasingLayer} />
              <Layer {...routeCoreLayer} />
            </Source>
          )}

          {/* Source and Destination Marker overrides based on Phase 3A requirements */}
          {sourceAndDest.source && (
            <Marker longitude={sourceAndDest.source.longitude} latitude={sourceAndDest.source.latitude}>
               <div className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-md border-2 border-white ring-2 ring-emerald-500/30">
                 S
               </div>
            </Marker>
          )}
          
          {sourceAndDest.dest && (
             <Marker longitude={sourceAndDest.dest.longitude} latitude={sourceAndDest.dest.latitude}>
                <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-md border-2 border-white ring-2 ring-indigo-600/30">
                  D
                </div>
             </Marker>
          )}

          {/* Bus stop markers */}
          {stops.map((stop) => {
            const isSelected = selectedStop === stop.stopId
            const isNextStop = busData?.next_stop_id === stop.stopId
            const isCampus = stop.name.toLowerCase().includes("campus")
            // Hide the default visual for source/dest to not clash
            if (stop.stopId === sourceAndDest.source?.stopId || stop.stopId === sourceAndDest.dest?.stopId) {
               return null;
            }

            return (
              <Marker
                key={stop.stopId}
                longitude={stop.longitude}
                latitude={stop.latitude}
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  handleStopClick(stop.stopId)
                }}
              >
                <div className="relative cursor-pointer group">
                  {isNextStop && (
                    <span
                      className="absolute rounded-full animate-ping"
                      style={{
                        width: 28, height: 28,
                        top: -4, left: -4,
                        background: "rgba(234,88,12,0.3)",
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

          {/* Live bus marker — transparent overhead asset, front = UP, no circle behind */}
          {busData && (
            <Marker longitude={busData.longitude} latitude={busData.latitude} anchor="center">
              <div className="relative flex flex-col items-center justify-center cursor-pointer pointer-events-none">
                <div className="absolute -top-8 whitespace-nowrap rounded-full px-2 py-0.5 border border-stone-subtle shadow-md flex items-center gap-1.5 z-20 bg-white/95">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-espresso tracking-wide">Bus B01</span>
                  <span className="text-[10px] font-mono text-terracotta font-bold">{Math.round(busData.speed_kmh)} km/h</span>
                </div>

                <div
                  className="relative z-10 transition-transform duration-200 ease-out"
                  style={{
                    width: busWidth,
                    height: busHeight,
                    transform: `rotate(${busData.bearing}deg)`,
                    transformOrigin: "center center",
                    background: "transparent",
                  }}
                >
                  <Image
                    src="/assets/bus-topview.png"
                    alt="Bus B01"
                    width={Math.round(busWidth)}
                    height={Math.round(busHeight)}
                    priority
                    unoptimized
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      background: "transparent",
                    }}
                    className="drop-shadow-md"
                  />
                </div>
              </div>
            </Marker>
          )}
      </Map>

      {/* Recenter ABOVE zoom so it is immediately accessible */}
      <div className="absolute bottom-6 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
        {busData && (
          <button
            type="button"
            onClick={centerOnBus}
            title="Center on bus"
            className="w-10 h-10 rounded-xl border border-stone-subtle flex items-center justify-center hover:bg-parchment-warm transition-all shadow-md bg-white/90 backdrop-blur-md text-espresso cursor-pointer"
          >
            <Navigation className="w-5 h-5 text-terracotta" />
          </button>
        )}

        <div className="flex flex-col rounded-xl overflow-hidden border border-stone-subtle shadow-md bg-white/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-10 flex items-center justify-center text-espresso hover:bg-parchment-warm border-b border-stone-subtle font-bold text-xl transition-colors cursor-pointer"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-10 flex items-center justify-center text-espresso hover:bg-parchment-warm font-bold text-xl transition-colors cursor-pointer"
            title="Zoom out"
          >
            &minus;
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-md border border-stone-subtle flex items-center gap-2 z-20 pointer-events-none"
          >
            <div className="w-4 h-4 rounded-full border-2 border-terracotta/20 border-t-terracotta animate-spin" />
            <span className="text-xs font-semibold text-stone-text">Loading Routes...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
