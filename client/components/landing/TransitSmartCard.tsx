"use client"

// TransitSmartCard — Exact PrepPass 3D Admit Card physics and aesthetics
// Features:
// 1. Float animation (smooth continuous hovering)
// 2. Mouse tracking 3D tilt with dynamic glare highlight
// 3. Interactive click-to-flip (180° 3D card rotation with preserve-3d)
// 4. Holographic foil shine sweep + laser scan-line + pulsing corner brackets
// 5. Front: STCET Student Transit Pass with live telemetry & ETA
// 6. Back: Digital security barcode, QR pass scanner, driver contact & gate verification

import React, { useRef, useCallback, useState } from "react"
import { Bus, QrCode, ShieldCheck, Wifi, MapPin, Clock, Zap } from "lucide-react"

export default function TransitSmartCard() {
  const tiltRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  // 3D Tilt calculation matching PrepPass
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const tiltNode = tiltRef.current
    const glareNode = glareRef.current
    if (!tiltNode) return

    const rect = tiltNode.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -12
    const rotateY = ((x - centerX) / centerX) * 12

    tiltNode.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`

    if (glareNode) {
      const glareX = (x / rect.width) * 100
      const glareY = (y / rect.height) * 100
      glareNode.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.35) 0%, rgba(0,200,255,0.15) 35%, transparent 70%)`
      glareNode.style.opacity = "1"
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    const tiltNode = tiltRef.current
    const glareNode = glareRef.current
    if (tiltNode) {
      tiltNode.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
      tiltNode.style.transition = "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)"
      setTimeout(() => {
        if (tiltNode) tiltNode.style.transition = "transform 0.1s ease-out"
      }, 600)
    }
    if (glareNode) glareNode.style.opacity = "0"
  }, [])

  const handleMouseEnter = useCallback(() => {
    const tiltNode = tiltRef.current
    if (tiltNode) tiltNode.style.transition = "transform 0.1s ease-out"
  }, [])

  const handleClick = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible select-none py-6">
      {/* Embedded keyframe styles matching PrepPass */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; text-shadow: 0 0 14px rgba(0, 200, 255, 0.7); }
        }
        @keyframes scanLine {
          0% { top: 4%; opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { top: 94%; opacity: 0; }
        }
        @keyframes borderShift {
          0%, 100% {
            border-color: rgba(0, 200, 255, 0.85);
            box-shadow: 0 0 35px rgba(0, 200, 255, 0.4), 0 0 90px rgba(0, 200, 255, 0.15), 0 25px 60px rgba(0,0,0,0.8);
          }
          33% {
            border-color: rgba(124, 58, 237, 0.85);
            box-shadow: 0 0 35px rgba(124, 58, 237, 0.4), 0 0 90px rgba(124, 58, 237, 0.15), 0 25px 60px rgba(0,0,0,0.8);
          }
          66% {
            border-color: rgba(16, 185, 129, 0.85);
            box-shadow: 0 0 35px rgba(16, 185, 129, 0.4), 0 0 90px rgba(16, 185, 129, 0.15), 0 25px 60px rgba(0,0,0,0.8);
          }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.6; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.6); box-shadow: 0 0 15px currentColor; }
        }
        @keyframes holoShine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes clickHint {
          0%, 100% { opacity: 0.4; transform: translateY(2px); }
          50% { opacity: 0.9; transform: translateY(0); }
        }
        .transit-float {
          animation: cardFloat 5.5s ease-in-out infinite;
        }
        .transit-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 20px;
          overflow: hidden;
          animation: borderShift 7s ease-in-out infinite;
        }
      `}} />

      {/* Glowing atmospheric aura behind card */}
      <div
        className="absolute w-[380px] h-[520px] sm:w-[440px] sm:h-[580px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,200,255,0.22) 0%, rgba(124,58,237,0.14) 40%, transparent 70%)",
          filter: "blur(60px)",
          animation: "statusPulse 4s ease-in-out infinite",
        }}
      />

      {/* 1. Float Container */}
      <div
        className="transit-float pointer-events-auto cursor-pointer relative w-[330px] h-[480px] sm:w-[390px] sm:h-[530px]"
        onClick={handleClick}
      >
        {/* 2. Tilt Container (tracks mouse) */}
        <div
          ref={tiltRef}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          style={{ transition: "transform 0.1s ease-out", transformStyle: "preserve-3d" }}
        >
          {/* 3. Flip Container (180deg flip) */}
          <div
            className="w-full h-full relative"
            style={{
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* ════════════════ FRONT FACE ════════════════ */}
            <div
              className="transit-face"
              style={{
                background: "linear-gradient(155deg, #0d152a 0%, #060b18 45%, #0b1126 100%)",
                border: "2.5px solid rgba(0, 200, 255, 0.8)",
                transform: "rotateY(0deg)",
              }}
            >
              {/* Internal Color Washes */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 10% 10%, rgba(0,200,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(124,58,237,0.18) 0%, transparent 50%)",
                }}
              />

              {/* Holographic Shine */}
              <div
                className="absolute top-0 h-full w-[80%] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.08) 45%, rgba(0,200,255,0.15) 50%, rgba(255,255,255,0.06) 55%, transparent 80%)",
                  animation: "holoShine 4s ease-in-out infinite",
                }}
              />

              {/* Glare Layer */}
              <div
                ref={glareRef}
                className="absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-300"
                style={{ opacity: 0 }}
              />

              {/* Glowing Corner Accents */}
              <div
                className="absolute top-0 left-0 w-14 h-14"
                style={{
                  borderTop: "3px solid #00C8FF",
                  borderLeft: "3px solid #00C8FF",
                  borderRadius: "18px 0 0 0",
                  animation: "cornerPulse 2s ease-in-out infinite",
                  color: "#00C8FF",
                }}
              />
              <div
                className="absolute top-0 right-0 w-14 h-14"
                style={{
                  borderTop: "3px solid #10B981",
                  borderRight: "3px solid #10B981",
                  borderRadius: "0 18px 0 0",
                  animation: "cornerPulse 2s ease-in-out infinite 0.5s",
                  color: "#10B981",
                }}
              />
              <div
                className="absolute bottom-0 left-0 w-14 h-14"
                style={{
                  borderBottom: "3px solid #7C3AED",
                  borderLeft: "3px solid #7C3AED",
                  borderRadius: "0 0 0 18px",
                  animation: "cornerPulse 2s ease-in-out infinite 1s",
                  color: "#7C3AED",
                }}
              />
              <div
                className="absolute bottom-0 right-0 w-14 h-14"
                style={{
                  borderBottom: "3px solid #00C8FF",
                  borderRight: "3px solid #00C8FF",
                  borderRadius: "0 0 18px 0",
                  animation: "cornerPulse 2s ease-in-out infinite 1.5s",
                  color: "#00C8FF",
                }}
              />

              {/* Laser scan line */}
              <div
                className="absolute left-4 right-4 h-[2px] z-20 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, #00C8FF, #10B981, transparent)",
                  boxShadow: "0 0 12px #00C8FF",
                  animation: "scanLine 3.5s ease-in-out infinite",
                }}
              />

              {/* FRONT: HEADER */}
              <div
                className="relative px-6 pt-5 pb-3.5"
                style={{ borderBottom: "1px solid rgba(0,200,255,0.2)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className="font-heading text-base sm:text-lg tracking-[0.25em] font-bold"
                      style={{
                        background: "linear-gradient(135deg, #FFF 0%, #00C8FF 50%, #7C3AED 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 10px rgba(0,200,255,0.6))",
                      }}
                    >
                      STCET SMARTPASS
                    </h3>
                    <p className="text-[10px] text-white/50 tracking-[0.15em] mt-0.5 font-mono">
                      CAMPUS TRANSIT PASS 2026
                    </p>
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center glow-cyan"
                    style={{
                      background: "rgba(0,200,255,0.15)",
                      border: "1px solid rgba(0,200,255,0.4)",
                    }}
                  >
                    <Bus className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* FRONT: BODY */}
              <div className="relative px-6 pt-4 space-y-4">
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase mb-0.5 text-cyan-400 font-semibold">
                    Candidate / Student
                  </p>
                  <p className="text-white font-heading text-lg sm:text-xl tracking-wide font-bold">
                    SOHOM GIRI
                  </p>
                  <p className="text-[10px] text-white/40 font-mono">STCET · CSE · ID: 2026-CS-8902</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-cyan-400 font-semibold mb-0.5">
                      Assigned Bus
                    </p>
                    <p className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5">
                      Bus B01 <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-cyan-400 font-semibold mb-0.5">
                      Route
                    </p>
                    <p className="text-white text-xs sm:text-sm font-bold">
                      Route R01
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                  <p className="text-[9px] tracking-[0.15em] uppercase text-cyan-400 font-semibold mb-0.5">
                    Your Stop · Behala Chowrasta
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80 font-medium">Scheduled: 08:10 AM</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">ETA: 8 min</span>
                  </div>
                </div>

                {/* ML Delay Readiness */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-cyan-400 font-bold">
                      Punctuality Reliability
                    </p>
                    <p className="text-sm font-bold text-cyan-300 font-mono">87% On-Time</p>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "87%",
                        background: "linear-gradient(90deg, #00C8FF, #7C3AED, #10B981)",
                        boxShadow: "0 0 14px rgba(0,200,255,0.7)",
                      }}
                    />
                  </div>
                </div>

                {/* Badges / Tech tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { name: "RFID ACTIVE", color: "0, 200, 255" },
                    { name: "ML PREDICT", color: "124, 58, 237" },
                    { name: "4G GPS", color: "16, 185, 129" },
                    { name: "AUTOPILOT", color: "245, 158, 11" },
                  ].map((t) => (
                    <span
                      key={t.name}
                      className="px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider"
                      style={{
                        background: `rgba(${t.color}, 0.12)`,
                        border: `1px solid rgba(${t.color}, 0.45)`,
                        color: `rgb(${t.color})`,
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* FRONT: FOOTER */}
              <div
                className="absolute bottom-0 left-0 right-0 px-6 py-3.5"
                style={{
                  borderTop: "1px solid rgba(0,200,255,0.2)",
                  background: "rgba(0,200,255,0.04)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                    <span className="text-xs font-bold text-emerald-400 tracking-wider font-mono">
                      VERIFIED PASS
                    </span>
                  </div>
                  <p
                    className="text-[10px] text-cyan-300 font-mono tracking-wider font-semibold"
                    style={{ animation: "clickHint 2s ease-in-out infinite" }}
                  >
                    TAP TO FLIP PASS ↻
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════════ BACK FACE ════════════════ */}
            <div
              className="transit-face"
              style={{
                background: "linear-gradient(160deg, #130f30 0%, #080d20 40%, #060b18 100%)",
                border: "2.5px solid rgba(0, 200, 255, 0.8)",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Internal Color Washes */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 20%, rgba(124,58,237,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,200,255,0.15) 0%, transparent 50%)",
                }}
              />

              <div className="relative h-full flex flex-col items-center justify-between p-7 text-center">
                {/* Back Header */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(124,58,237,0.2))",
                      border: "1.5px solid rgba(0,200,255,0.5)",
                      boxShadow: "0 0 30px rgba(0,200,255,0.3)",
                    }}
                  >
                    <QrCode className="w-8 h-8 text-cyan-300" />
                  </div>
                  <h3
                    className="font-heading text-lg tracking-[0.2em] font-bold text-white"
                    style={{ textShadow: "0 0 12px rgba(0,200,255,0.5)" }}
                  >
                    GATE SECURITY PASS
                  </h3>
                  <p className="text-[9px] text-white/50 tracking-wider font-mono mt-0.5">
                    STCET CAMPUS TRANSIT AUTHORITY
                  </p>
                </div>

                {/* Digital Barcode SVG */}
                <div className="w-full max-w-[280px] p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center gap-1.5">
                  <svg className="w-full h-11" viewBox="0 0 240 40">
                    {/* Simulated barcode stripes */}
                    {[
                      3, 7, 10, 15, 18, 24, 27, 34, 38, 45, 48, 52, 58, 62, 69, 74, 78,
                      84, 88, 95, 99, 105, 110, 116, 122, 126, 133, 137, 144, 149, 155,
                      160, 166, 172, 178, 184, 190, 196, 202, 208, 214, 220, 226, 232
                    ].map((x, i) => (
                      <rect
                        key={i}
                        x={x}
                        y="0"
                        width={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1}
                        height="40"
                        fill="#00C8FF"
                      />
                    ))}
                  </svg>
                  <span className="font-mono text-[9px] text-cyan-400 tracking-[0.25em]">
                    STCET-8940-1289-9012-X
                  </span>
                </div>

                {/* Bus & Driver Info */}
                <div className="w-full max-w-[280px] space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">Bus Reg.</span>
                    <span className="font-mono font-bold text-white">WB 02 AB 1234</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">Driver</span>
                    <span className="font-semibold text-white">Rajesh Kumar</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">Transport Desk</span>
                    <span className="font-mono font-bold text-cyan-400">+91 98300 00000</span>
                  </div>
                </div>

                {/* Back Footer */}
                <p
                  className="text-[10px] text-cyan-300 font-mono tracking-wider font-semibold"
                  style={{ animation: "clickHint 2s ease-in-out infinite" }}
                >
                  TAP TO FLIP BACK ↺
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
