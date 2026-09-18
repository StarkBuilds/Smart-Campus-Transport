"use client"

// Custom liquid cursor — same physics as the PrepPass cursor
// A blob that lazily follows the mouse, plus a small sharp dot that snaps exactly to cursor position
// The blob uses spring physics via a lerp (linear interpolation) for the trailing effect

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export default function CustomCursor() {
  const blobRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Current mouse position
  const mouse = useRef({ x: -100, y: -100 })
  // The blob's current rendered position (lags behind mouse)
  const blob = useRef({ x: -100, y: -100 })

  // Don't show the cursor on the map page during full-screen map interactions
  const hideCursor = pathname?.startsWith("/dashboard")

  useEffect(() => {
    if (hideCursor) return

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener("mousemove", onMove)

    let animFrame: number

    const animate = () => {
      // Lerp factor — lower = slower/lazier follow, higher = snappier
      const lerpFactor = 0.12

      blob.current.x += (mouse.current.x - blob.current.x) * lerpFactor
      blob.current.y += (mouse.current.y - blob.current.y) * lerpFactor

      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${blob.current.x - 16}px, ${blob.current.y - 16}px)`
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`
      }

      animFrame = requestAnimationFrame(animate)
    }

    animFrame = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(animFrame)
    }
  }, [hideCursor])

  if (hideCursor) return null

  return (
    <>
      {/* The big glowing blob that trails behind */}
      <div
        ref={blobRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-8 h-8 rounded-full mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(0,200,255,0.6) 0%, rgba(124,58,237,0.3) 60%, transparent 100%)",
          filter: "blur(6px)",
          willChange: "transform",
        }}
      />
      {/* The sharp dot that snaps precisely to mouse */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-2 h-2 rounded-full bg-cyan-400"
        style={{
          boxShadow: "0 0 8px rgba(0,200,255,0.9)",
          willChange: "transform",
        }}
      />
    </>
  )
}
