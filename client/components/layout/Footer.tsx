"use client"

// Footer — Rich Warm Charcoal & Espresso Anchor
// Grounds the luxury light beige website with an authoritative, high-end tech finish
// Displays STCET campus credentials & Lead Architect recognition

import Link from "next/link"
import { Bus, CheckCircle2, ShieldCheck } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

const FOOTER_LINKS = {
  Platform: [
    { label: "Corridor Inspector", href: "#corridor-inspector" },
    { label: "Fleet Intelligence", href: "#features" },
    { label: "Transit Pipeline", href: "#how-it-works" },
    { label: "Live Radar Map", href: "/dashboard" },
    { label: "Driver Console", href: "/driver" },
    { label: "Analytics Hub", href: "/analytics" },
  ],
  Campus: [
    { label: "STCET Context", href: "#about" },
    { label: "Khidderpore Route R01", href: "/dashboard" },
    { label: "Designated Stops", href: "#corridor-inspector" },
    { label: "Dispatch Desk", href: "#contact" },
  ],
  Architecture: [
    { label: "Live Wayfinding Canvas", href: "#" },
    { label: "WebSocket Telemetry", href: "#features" },
    { label: "XGBoost Delay Forecasting", href: "#features" },
    { label: "3D Student Smart Pass", href: "/dashboard" },
  ],
}

export default function Footer() {
  return (
    <footer className="relative bg-[#18181B] text-[#E4E4E7] border-t border-[#27272A] pt-16 pb-10 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#B45309] flex items-center justify-center shadow-md">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold text-white tracking-tight">CampusRide</span>
                <span className="text-[10px] text-amber-400 tracking-widest uppercase font-bold mt-0.5">STCET Live Fleet</span>
              </div>
            </Link>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Real-time campus transit intelligence &amp; ML delay forecasting for <span className="font-semibold text-white">{CAMPUS.short}</span>, Khidderpore, Kolkata.
            </p>
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3.5">
              <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">{category}</p>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-[#A1A1AA] hover:text-white font-medium transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <p>
            © 2026 CampusRide · {CAMPUS.address}
          </p>
          <div className="flex items-center gap-3">
            <span>STCET Kolkata</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
