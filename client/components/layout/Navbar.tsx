"use client"

// Navbar — fixed at top, transparent on hero, becomes dark glass on scroll
// Collapses to hamburger menu on mobile

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Bus, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "Careers", href: "#careers" },
  { label: "Contact", href: "#contact" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Become opaque after scrolling past hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Don't show landing nav inside the dashboard
  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/driver")) return null

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "glass border-b border-white/5 py-3" : "py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center glow-cyan">
              <Bus className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold text-white tracking-tight">CampusRide</span>
              <span className="text-[10px] text-cyan-400 tracking-widest uppercase font-medium">STCET Live</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-400/30 rounded-xl hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-semibold text-[#060B18] bg-cyan-400 rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-10 h-10 rounded-xl glass flex items-center justify-center text-white"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 glass-strong border-b border-white/5 md:hidden"
          >
            <div className="px-5 py-6 flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-sm text-muted-foreground hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-center text-sm font-medium text-cyan-400 border border-cyan-400/30 rounded-xl">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-center text-sm font-semibold bg-cyan-400 text-[#060B18] rounded-xl">
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
