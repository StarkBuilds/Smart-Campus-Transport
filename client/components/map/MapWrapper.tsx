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
    <div className="w-full h-full rounded-2xl bg-[#FAF8F5] flex items-center justify-center border border-[#DDD7CB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-600 animate-spin" />
        <p className="text-sm text-[#78716C]">Initializing campus map...</p>
      </div>
    </div>
  ),
})

interface MapWrapperProps {
  busData: LiveBusData | null
  userRole: "student" | "driver"
  activeRouteVariant?: "standard" | "traffic_alternate"
  onToggleRouteVariant?: (variant: "standard" | "traffic_alternate") => void
}

export default function MapWrapper({
  busData,
  userRole,
  activeRouteVariant,
  onToggleRouteVariant,
}: MapWrapperProps) {
  return (
    <LiveMap
      busData={busData}
      userRole={userRole}
      activeRouteVariant={activeRouteVariant}
      onToggleRouteVariant={onToggleRouteVariant}
    />
  )
}
