"use client"

// Custom liquid cursor — physics-driven interactive cursor
// Refined to look crisp and luminous across both light landing page and dark consoles
// Features:
// 1. Spring physics lerp follow blob
// 2. High-precision pinpoint dot with ambient glow
// 3. Hidden on full-screen dashboard map interactions

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
      const lerpFactor = 0.14

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
      {/* Sleek ambient follower blob — warm amber/gold */}
      <div
        ref={blobRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-8 h-8 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(217,119,6,0.22) 0%, rgba(245,158,11,0.08) 60%, transparent 100%)",
          filter: "blur(4px)",
          willChange: "transform",
        }}
      />
      {/* Sharp pinpoint dot — royal amber */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-2 h-2 rounded-full bg-[#D97706]"
        style={{
          boxShadow: "0 0 8px rgba(217,119,6,0.6)",
          willChange: "transform",
        }}
      />
    </>
  )
}
