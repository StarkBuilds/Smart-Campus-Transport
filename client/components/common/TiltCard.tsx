"use client"

// TiltCard — 3D perspective tilt on mouse hover
// Same physics as the PrepPass admit card but as a reusable component
// Children sit inside a preserve-3d container that rotates based on cursor position

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  intensity?: number   // how strong the tilt is — default 15 degrees
  glare?: boolean      // show a moving glare highlight
}

export default function TiltCard({
  children,
  className,
  intensity = 15,
  glare = true,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    // Normalize cursor position to -1 → +1 range
    const xNorm = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const yNorm = ((e.clientY - rect.top) / rect.height - 0.5) * 2

    setTilt({
      x: -yNorm * intensity,  // inverted: moving up tilts top toward you
      y: xNorm * intensity,
    })

    // Glare follows cursor as a percentage position
    setGlarePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setGlarePos({ x: 50, y: 50 })
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        scale: isHovered ? 1.03 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      className={cn("relative overflow-hidden", className)}
    >
      {children}

      {/* Glare layer — a radial highlight that tracks the cursor */}
      {glare && isHovered && (
        <div
          className="absolute inset-0 pointer-events-none rounded-inherit transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
          }}
        />
      )}
    </motion.div>
  )
}
