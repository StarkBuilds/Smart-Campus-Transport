"use client"

// Navbar — Warm Alabaster Frosted Navigation Bar
// Luxury Editorial styling: warm linen glass, charcoal typography, gold & sapphire accents

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Bus, Navigation, Layers, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Live Map", href: "/dashboard" },
  { label: "Routes & Stops", href: "/dashboard#corridor-inspector" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Campus Context", href: "#about" },
  { label: "Dispatch Desk", href: "#dispatch-desk" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Track scroll position
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Don't show landing nav inside the dashboard, driver console, or analytics hub
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/driver") ||
    pathname?.startsWith("/analytics")
  )
    return null

  return (
    <>
      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#FAF8F5]/92 backdrop-blur-md border-b border-[#E2DCD2] py-3 shadow-[0_4px_20px_rgba(120,113,108,0.05)]"
            : "bg-[#FAF8F5]/70 backdrop-blur-xs py-4 border-b border-[#E5DFD5]/60"
        )}
      >
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#B45309] flex items-center justify-center shadow-[0_2px_10px_rgba(30,64,175,0.25)] group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-extrabold text-[#1C1917] tracking-tight">
                CampusRide
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-[#B45309] tracking-widest uppercase font-bold font-mono">
                  STCET Live Fleet
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EFECE6]/80 transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EFECE6]/80 transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-[#292524] border border-[#DDD7CB] bg-white/90 rounded-xl hover:bg-[#F6F4EE] hover:border-[#CBD5E1] transition-all shadow-2xs"
            >
              Portal Login
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-xs font-bold text-[#FAF8F5] bg-[#1C1917] hover:bg-[#292524] rounded-xl transition-all shadow-[0_2px_12px_rgba(28,25,23,0.2)] flex items-center gap-1.5 hover:-translate-y-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Radar Map
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#292524] hover:bg-[#EFECE6] border border-[#DDD7CB] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 bg-[#FAF8F5]/98 backdrop-blur-lg border-b border-[#DDD7CB] px-5 py-6 shadow-xl lg:hidden"
          >
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-sm font-semibold text-[#1C1917] hover:bg-[#EFECE6] rounded-lg"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-[#DDD7CB] flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold text-[#292524] border border-[#DDD7CB] rounded-xl bg-white"
                >
                  Portal Login
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold text-[#FAF8F5] bg-[#1C1917] rounded-xl shadow-md"
                >
                  Open Live Radar Map
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
