"use client"

// ParticleCanvas — Interactive ambient background particle field
// Lightweight HTML5 Canvas with drifting neon cyan & violet particles
// Gentle mouse proximity repulsion for a reactive, living atmosphere

import { useEffect, useRef } from "react"

const PARTICLE_COUNT = 70

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<
    Array<{
      x: number
      y: number
      vx: number
      vy: number
      r: number
      color: string
      sway: number
      swaySpeed: number
    }>
  >([])
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const w = () => window.innerWidth
    const h = () => window.innerHeight

    const colors = [
      "rgba(0, 200, 255, 0.75)",
      "rgba(0, 200, 255, 0.45)",
      "rgba(124, 58, 237, 0.55)",
      "rgba(16, 185, 129, 0.45)",
      "rgba(255, 255, 255, 0.3)",
    ]

    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, w()),
      y: rand(0, h()),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.3, 0.3),
      r: rand(1.2, 2.5),
      color: colors[Math.floor(rand(0, colors.length))],
      sway: rand(0, Math.PI * 2),
      swaySpeed: rand(0.01, 0.03),
    }))

    const draw = () => {
      const cw = w()
      const ch = h()
      ctx.clearRect(0, 0, cw, ch)

      const pts = particles.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const rect = canvas.getBoundingClientRect()

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]

        // Mouse repulsion
        const localMx = mx - rect.left
        const localMy = my - rect.top
        const dmx = p.x - localMx
        const dmy = p.y - localMy
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy)
        if (distMouse < 110 && distMouse > 0) {
          const force = (110 - distMouse) / 110
          p.vx += (dmx / distMouse) * force * 0.3
          p.vy += (dmy / distMouse) * force * 0.3
        }

        // Apply velocities with damping
        p.vx *= 0.98
        p.vy *= 0.98

        p.sway += p.swaySpeed
        p.x += p.vx + Math.sin(p.sway) * 0.25
        p.y += p.vy + Math.cos(p.sway) * 0.25

        // Wrap around bounds
        if (p.x < 0) p.x = cw
        if (p.x > cw) p.x = 0
        if (p.y < 0) p.y = ch
        if (p.y > ch) p.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
        ctx.fill()
      }

      // Draw faint proximity connecting lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 85) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 * (1 - dist / 85)})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
    />
  )
}
