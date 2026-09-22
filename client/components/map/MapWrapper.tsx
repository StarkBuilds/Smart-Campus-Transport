"use client"

// MapWrapper — dynamically imports LiveMap with SSR disabled
// MapLibre GL accesses window/document which don't exist on the server
// Next.js App Router renders components server-side first, so without this
// the map initializes in a headless environment and never fires onLoad

import dynamic from "next/dynamic"
import type { LiveBusData } from "@/types/bus"

// This tells Next.js: don't try to render LiveMap on the server at all
// Only render it in the browser after the page has loaded
const LiveMap = dynamic(() => import("@/components/map/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-parchment flex flex-col items-center justify-center z-30">
      <div className="w-10 h-10 rounded-full border-2 border-terracotta/20 border-t-terracotta animate-spin mb-3" />
      <p className="text-xs text-stone-text">Loading...</p>
    </div>
  ),
})

interface MapWrapperProps {
  busData: LiveBusData | null
  userRole: "student" | "driver"
  onMapClick?: (longitude: number, latitude: number) => void
}

export default function MapWrapper({
  busData,
  userRole,
  onMapClick,
}: MapWrapperProps) {
  return (
    <LiveMap
      busData={busData}
      userRole={userRole}
      onMapClick={onMapClick}
    />
  )
}
