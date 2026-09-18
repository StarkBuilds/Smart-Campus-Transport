"use client"

import Link from "next/link"
import { Bus } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

const FOOTER_LINKS = {
  Platform: [
    { label: "Fleet Intelligence", href: "#features" },
    { label: "Route Pipeline", href: "#how-it-works" },
    { label: "Live Radar Map", href: "/dashboard" },
    { label: "Driver Console", href: "/driver" },
  ],
  Campus: [
    { label: "STCET Context", href: "#about" },
    { label: "Khidderpore Route R01", href: "/dashboard" },
    { label: "Designated Stops", href: "#features" },
    { label: "Dispatch Desk", href: "#contact" },
  ],
  Architecture: [
    { label: "MapLibre GIS Engine", href: "#features" },
    { label: "WebSocket Pipeline", href: "#how-it-works" },
    { label: "ML Delay Estimator", href: "#about" },
    { label: "Digital Pass Verification", href: "/" },
  ],
}

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 pt-16 pb-8 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand column */}
          <div className="flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center">
                <Bus className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold text-white">CampusRide</span>
                <span className="text-[10px] text-cyan-400 tracking-widest uppercase">STCET Live</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time campus bus tracking for{" "}
              <span className="text-white">{CAMPUS.short}</span>, Khidderpore, Kolkata.
            </p>
            <p className="text-xs text-muted-foreground">
              Built for Cognizant NPN AIA Hackathon 2026.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{category}</p>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 CampusRide · {CAMPUS.address}
          </p>
          <p className="text-xs text-muted-foreground">
            Made with ❤️ in Kolkata · Cognizant Hackathon 2026
          </p>
        </div>
      </div>
    </footer>
  )
}
