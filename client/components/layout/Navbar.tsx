"use client"

import Link from "next/link"
import { useState } from "react"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="border-b border-stone-subtle bg-parchment/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        {/* Brand / Monogram & Edition tag */}
        <div className="flex items-center gap-6">
          <Link className="flex items-baseline gap-2.5 group" href="/">
            <span className="font-serif italic text-3xl font-semibold tracking-tight text-espresso group-hover:text-terracotta transition-colors">CampusRide</span>
            <span className="text-xs uppercase tracking-widest font-semibold text-stone-text pl-2 border-l border-stone-subtle hidden sm:inline-block">Wayfinding &bull; Fall &rsquo;25</span>
          </Link>
        </div>

        {/* Human-Scale Navigation: strictly Home, Live Map, Routes & Stops, How It Works, About */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-stone-dark">
          <Link className="text-terracotta font-semibold hover:text-terracotta-dark transition-colors" href="/">Home</Link>
          <Link className="hover:text-espresso transition-colors" href="/dashboard">Live Map</Link>
          <Link className="hover:text-espresso transition-colors" href="/routes">Routes &amp; Stops</Link>
          <Link className="hover:text-espresso transition-colors" href="/#how-it-works">How It Works</Link>
          <Link className="hover:text-espresso transition-colors" href="/about">About</Link>
        </nav>

        {/* Quick Action / Student Status with live status indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-2 text-xs text-stone-text bg-parchment-warm px-3 py-1.5 rounded-full border border-stone-subtle">
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse"></span>
            <span>Fleet Active &bull; Live GPS</span>
          </div>
          <Link className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-espresso text-parchment text-xs font-semibold tracking-wide hover:bg-stone-dark transition-colors shadow-sm" href="/login">
            <span>Login / My Pass</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden flex items-center justify-center p-2 text-espresso"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full bg-parchment border-b border-stone-subtle shadow-sm flex flex-col py-4 px-6 md:px-10 space-y-4">
          <Link className="text-terracotta font-semibold text-lg" href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link className="text-espresso font-medium text-lg" href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Live Map</Link>
          <Link className="text-espresso font-medium text-lg" href="/routes" onClick={() => setIsMobileMenuOpen(false)}>Routes &amp; Stops</Link>
          <Link className="text-espresso font-medium text-lg" href="/#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How It Works</Link>
          <Link className="text-espresso font-medium text-lg" href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
          <div className="pt-4 border-t border-stone-subtle">
            <Link className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-espresso text-parchment text-sm font-semibold tracking-wide" href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <span>Login / My Pass</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
