"use client"

// Footer — Rich Warm Charcoal & Espresso Anchor
// Grounds the luxury light beige website with an authoritative, high-end tech finish
// Displays STCET campus credentials & Lead Architect recognition

import Link from "next/link"
import { Bus, CheckCircle2, ShieldCheck, Phone, Mail, MapPin, Radio } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

const FOOTER_LINKS = {
  Platform: [
    { label: "Student Dashboard", href: "/dashboard" },
    { label: "Fleet Intelligence", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Live Radar Map", href: "/dashboard" },
    { label: "Driver Console", href: "/driver" },
    { label: "Analytics Hub", href: "/analytics" },
  ],
  Campus: [
    { label: "STCET Context", href: "#about" },
    { label: "Khidderpore Route R01", href: "/dashboard" },
    { label: "Corridor Inspector", href: "/dashboard#corridor-inspector" },
    { label: "Dispatch Desk", href: "#dispatch-desk" },
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
        {/* ═════════ INTEGRATED DISPATCH DESK & OPERATIONS SUPPORT ═════════ */}
        <div id="dispatch-desk" className="mb-14 p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-2.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                CENTRAL DISPATCH DESK &middot; GATE 1 OPERATIONS
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Campus Transit Helpline &amp; Emergency Dispatch
              </h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-2xl">
                Direct coordinator hotline for student boarding verifications, lost-and-found items, and route variance alerts across the South Kolkata corridor.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold w-fit shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Dispatcher Radio Active</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-6">
            <a
              href="tel:+913324481081"
              className="group p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-amber-500/40 transition-all flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">Gate 1 Helpline</p>
                <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mt-0.5">
                  +91 (033) 2448-1081 / 82
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">Direct Driver Dispatch Line</p>
              </div>
            </a>

            <a
              href="mailto:transport@stcet.ac.in"
              className="group p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/40 transition-all flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">Official Email</p>
                <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5 truncate">
                  transport@stcet.ac.in
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">Institutional Inquiries &amp; Passes</p>
              </div>
            </a>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">Campus Terminal</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  STCET Main Gate 1
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">4, D.H. Road, Khidderpore, Kolkata</p>
              </div>
            </div>
          </div>
        </div>
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
