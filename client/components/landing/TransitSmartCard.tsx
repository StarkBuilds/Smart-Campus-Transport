"use client"

// TransitSmartCard — Ultra-Luxury Royal Champagne Gold & Pearlescent Light Pass
// Features:
// 1. Float animation (smooth continuous hovering)
// 2. Mouse tracking 3D tilt with dynamic warm champagne glare highlight
// 3. Interactive click-to-flip (180° 3D card rotation with preserve-3d)
// 4. Gold foil holographic shine sweep + laser scan-line + pulsing corner brackets
// 5. Front: STCET Verified Student Transit Pass for Sohom Giri with live telemetry & ETA
// 6. Back: Digital security barcode, QR pass scanner, driver contact & gate verification

import React, { useRef, useCallback, useState, useEffect } from "react"
import { Bus, QrCode, ShieldCheck, Wifi, MapPin, Clock, Zap, AlertTriangle, TrendingDown, Activity } from "lucide-react"

export default function TransitSmartCard({
  userName = "STUDENT",
  dynamicEta = 8,
  speed = 0,
  predictedDelay = 0,
}: {
  userName?: string,
  dynamicEta?: number,
  speed?: number,
  predictedDelay?: number
}) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [prevEta, setPrevEta] = useState(dynamicEta)
  const [etaStatus, setEtaStatus] = useState<"stable" | "delayed" | "early">("stable")

  // 3D Tilt calculation
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const tiltNode = tiltRef.current
    const glareNode = glareRef.current
    if (!tiltNode) return

    const rect = tiltNode.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10

    tiltNode.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`

    if (glareNode) {
      const glareX = (x / rect.width) * 100
      const glareY = (y / rect.height) * 100
      glareNode.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.7) 0%, rgba(245,230,190,0.3) 35%, transparent 70%)`
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
      {/* Embedded keyframe styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; text-shadow: 0 0 14px rgba(212, 175, 55, 0.6); }
        }
        @keyframes scanLine {
          0% { top: 4%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { top: 94%; opacity: 0; }
        }
        @keyframes goldBorderShift {
          0%, 100% {
            border-color: rgba(212, 175, 55, 0.85);
            box-shadow: 0 18px 45px rgba(120, 113, 108, 0.14), 0 0 30px rgba(212, 175, 55, 0.25);
          }
          50% {
            border-color: rgba(30, 64, 175, 0.7);
            box-shadow: 0 18px 45px rgba(120, 113, 108, 0.14), 0 0 30px rgba(30, 64, 175, 0.2);
          }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.7; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.4); }
        }
        @keyframes holoShine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes clickHint {
          0%, 100% { opacity: 0.5; transform: translateY(2px); }
          50% { opacity: 1; transform: translateY(0); }
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
          border-radius: 24px;
          overflow: hidden;
          animation: goldBorderShift 7s ease-in-out infinite;
        }
      `}} />

      {/* Warm champagne & gold aura behind card */}
      <div
        className="absolute w-[360px] h-[500px] sm:w-[420px] sm:h-[560px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(254,243,199,0.5) 0%, rgba(253,230,138,0.3) 35%, rgba(219,234,254,0.2) 65%, transparent 75%)",
          filter: "blur(50px)",
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
            {/* ════════════════ FRONT FACE (ROYAL CHAMPAGNE LIGHT) ════════════════ */}
            <div
              className="transit-face"
              style={{
                background: "linear-gradient(155deg, #FAF8F5 0%, #F5EFE6 45%, #EFE7D8 100%)",
                border: "2px solid rgba(212, 175, 55, 0.85)",
                transform: "rotateY(0deg)",
              }}
            >
              {/* Internal Pearlescent Color Washes */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 15% 15%, rgba(254,243,199,0.7) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(219,234,254,0.5) 0%, transparent 50%)",
                }}
              />

              {/* Holographic Gold Foil Sweep */}
              <div
                className="absolute top-0 h-full w-[80%] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 45%, rgba(253,230,138,0.45) 50%, rgba(255,255,255,0.3) 55%, transparent 80%)",
                  animation: "holoShine 4.5s ease-in-out infinite",
                }}
              />

              {/* Glare Layer */}
              <div
                ref={glareRef}
                className="absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-300"
                style={{ opacity: 0 }}
              />

              {/* Corner Accents in Champagne Gold & Royal Navy */}
              <div
                className="absolute top-0 left-0 w-14 h-14 pointer-events-none"
                style={{
                  borderTop: "3px solid #D4AF37",
                  borderLeft: "3px solid #D4AF37",
                  borderRadius: "22px 0 0 0",
                  animation: "cornerPulse 2s ease-in-out infinite",
                  color: "#D4AF37",
                }}
              />
              <div
                className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
                style={{
                  borderTop: "3px solid #1E40AF",
                  borderRight: "3px solid #1E40AF",
                  borderRadius: "0 22px 0 0",
                  animation: "cornerPulse 2s ease-in-out infinite 0.5s",
                  color: "#1E40AF",
                }}
              />
              <div
                className="absolute bottom-0 left-0 w-14 h-14 pointer-events-none"
                style={{
                  borderBottom: "3px solid #1E40AF",
                  borderLeft: "3px solid #1E40AF",
                  borderRadius: "0 0 0 22px",
                  animation: "cornerPulse 2s ease-in-out infinite 1s",
                  color: "#1E40AF",
                }}
              />
              <div
                className="absolute bottom-0 right-0 w-14 h-14 pointer-events-none"
                style={{
                  borderBottom: "3px solid #D4AF37",
                  borderRight: "3px solid #D4AF37",
                  borderRadius: "0 0 22px 0",
                  animation: "cornerPulse 2s ease-in-out infinite 1.5s",
                  color: "#D4AF37",
                }}
              />

              {/* Laser Scan Line */}
              <div
                className="absolute left-4 right-4 h-[2px] z-20 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, #D4AF37, #1E40AF, transparent)",
                  boxShadow: "0 0 10px rgba(212, 175, 55, 0.8)",
                  animation: "scanLine 3.5s ease-in-out infinite",
                }}
              />

              {/* FRONT: HEADER */}
              <div
                className="relative px-6 pt-5 pb-3.5"
                style={{ borderBottom: "1px solid rgba(212, 175, 55, 0.3)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className="font-heading text-base sm:text-lg tracking-[0.22em] font-extrabold"
                      style={{
                        background: "linear-gradient(135deg, #1E3A8A 0%, #B45309 60%, #D4AF37 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      STCET SMARTPASS
                    </h3>
                    <p className="text-[10px] text-[#78716C] tracking-[0.15em] mt-0.5 font-mono font-semibold">
                      CAMPUS TRANSIT PASS 2026
                    </p>
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs"
                    style={{
                      background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                      border: "1.5px solid #FCD34D",
                    }}
                  >
                    <Bus className="w-5 h-5 text-[#B45309]" />
                  </div>
                </div>
              </div>

              {/* FRONT: BODY */}
              <div className="relative px-6 pt-4 space-y-3.5">
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase mb-0.5 text-[#B45309] font-bold">
                    Candidate / Student
                  </p>
                  <p className="text-[#1C1917] font-heading text-lg sm:text-xl tracking-wide font-extrabold">
                    SOHOM GIRI
                  </p>
                  <p className="text-[10px] text-[#78716C] font-mono font-medium">STCET · CSE · ID: 2026-CS-8902</p>
                </div>

                {/* Assigned Bus & Route Boxes */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white/90 border border-[#E2DCD2] shadow-2xs">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-[#B45309] font-bold mb-0.5">
                      Assigned Bus
                    </p>
                    <p className="text-[#1C1917] text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                      Bus B01 <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">LIVE</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/90 border border-[#E2DCD2] shadow-2xs">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-[#B45309] font-bold mb-0.5">
                      Route
                    </p>
                    <p className="text-[#1C1917] text-xs sm:text-sm font-extrabold">
                      Route R01
                    </p>
                  </div>
                </div>

                {/* Designated Stop */}
                <div className="p-3 rounded-xl bg-white/90 border border-[#E2DCD2] shadow-2xs">
                  <p className="text-[9px] tracking-[0.15em] uppercase text-[#B45309] font-bold mb-0.5">
                    Your Stop · Behala Chowrasta
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#57534E] font-medium">Scheduled: 08:10 AM</span>
                    <span className="text-xs font-bold text-[#065F46] font-mono">ETA: 8 min</span>
                  </div>
                </div>

                {/* Punctuality Reliability */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-[#B45309] font-bold">
                      Punctuality Reliability
                    </p>
                    <p className="text-xs font-extrabold text-[#1E40AF] font-mono">87% On-Time</p>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden bg-black/[0.06] border border-black/[0.04]"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "87%",
                        background: "linear-gradient(90deg, #1E40AF, #3B82F6, #D4AF37)",
                        boxShadow: "0 0 10px rgba(212, 175, 55, 0.5)",
                      }}
                    />
                  </div>
                </div>

                {/* Badges / Tech tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { name: "RFID ACTIVE", bg: "bg-[#EFF6FF]", text: "text-[#1E40AF]", border: "border-[#BFDBFE]" },
                    { name: "ML PREDICT", bg: "bg-[#FAF5FF]", text: "text-[#6B21A8]", border: "border-[#E9D5FF]" },
                    { name: "4G GPS", bg: "bg-[#ECFDF5]", text: "text-[#065F46]", border: "border-[#A7F3D0]" },
                    { name: "AUTOPILOT", bg: "bg-[#FFFBEB]", text: "text-[#92400E]", border: "border-[#FDE68A]" },
                  ].map((t) => (
                    <span
                      key={t.name}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider border ${t.bg} ${t.text} ${t.border}`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* FRONT: FOOTER */}
              <div
                className="absolute bottom-0 left-0 right-0 px-6 py-3.5 bg-white/70 backdrop-blur-xs"
                style={{
                  borderTop: "1px solid rgba(212, 175, 55, 0.25)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
                    <span className="text-xs font-bold text-[#065F46] tracking-wider font-mono">
                      VERIFIED PASS
                    </span>
                  </div>
                  <p
                    className="text-[10px] text-[#B45309] font-mono tracking-wider font-bold"
                    style={{ animation: "clickHint 2s ease-in-out infinite" }}
                  >
                    TAP TO FLIP PASS ↻
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════════ BACK FACE (ROYAL CHAMPAGNE LIGHT) ════════════════ */}
            <div
              className="transit-face"
              style={{
                background: "linear-gradient(160deg, #FAF8F5 0%, #F5EFE6 45%, #ECE4D3 100%)",
                border: "2px solid rgba(212, 175, 55, 0.85)",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Internal Pearlescent Washes */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 20%, rgba(254,243,199,0.7) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(219,234,254,0.5) 0%, transparent 50%)",
                }}
              />

              <div className="relative h-full flex flex-col items-center justify-between p-7 text-center">
                {/* Back Header */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                      border: "1.5px solid #FCD34D",
                    }}
                  >
                    <QrCode className="w-8 h-8 text-[#B45309]" />
                  </div>
                  <h3
                    className="font-heading text-lg tracking-[0.2em] font-extrabold text-[#1C1917]"
                  >
                    GATE SECURITY PASS
                  </h3>
                  <p className="text-[9px] text-[#78716C] tracking-wider font-mono mt-0.5 font-semibold">
                    STCET CAMPUS TRANSIT AUTHORITY
                  </p>
                </div>

                {/* Digital Barcode Container */}
                <div className="w-full max-w-[280px] p-3 rounded-2xl bg-white border border-[#DDD7CB] shadow-xs flex flex-col items-center gap-1.5">
                  <svg className="w-full h-11" viewBox="0 0 240 40">
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
                        fill="#1C1917"
                      />
                    ))}
                  </svg>
                  <span className="font-mono text-[9px] text-[#B45309] tracking-[0.25em] font-bold">
                    STCET-8940-1289-9012-X
                  </span>
                </div>

                {/* Bus & Driver Info */}
                <div className="w-full max-w-[280px] space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white border border-[#E2DCD2] shadow-2xs">
                    <span className="text-[#78716C] font-medium">Bus Reg.</span>
                    <span className="font-mono font-bold text-[#1C1917]">WB 02 AB 1234</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white border border-[#E2DCD2] shadow-2xs">
                    <span className="text-[#78716C] font-medium">Driver</span>
                    <span className="font-bold text-[#1C1917]">Rajesh Kumar</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white border border-[#E2DCD2] shadow-2xs">
                    <span className="text-[#78716C] font-medium">Transport Desk</span>
                    <span className="font-mono font-bold text-[#1E40AF]">+91 98300 00000</span>
                  </div>
                </div>

                {/* Back Footer */}
                <p
                  className="text-[10px] text-[#B45309] font-mono tracking-wider font-bold"
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
