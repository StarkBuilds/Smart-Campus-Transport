"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Wifi, WifiOff, LogOut, CreditCard } from "lucide-react"
import { useBusSocket } from "@/hooks/use-bus-socket"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isConnected } = useBusSocket()

  const isLiveMap = pathname === "/dashboard"

  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Only check auth status on mount/client-side
    const token = localStorage.getItem("token")
    if (token) {
      setUserName(localStorage.getItem("user_name") || "Student")
      setUserRole(localStorage.getItem("user_role") || "STUDENT")
    } else {
      setUserName(null)
      setUserRole(null)
    }
  }, [pathname]) // Re-check if navigation happens

  const handleLogout = () => {
    localStorage.clear()
    setUserName(null)
    router.push("/")
  }

  return (
    <header className="border-b border-stone-subtle bg-parchment/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Monogram & Edition tag */}
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2 group" href="/">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10">
              <Image
                src="/assets/logo.png"
                alt="CampusRide Logo"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <span className="font-serif italic text-2xl sm:text-3xl font-semibold tracking-tight text-espresso group-hover:text-terracotta transition-colors">CampusRide</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-stone-text pl-3 border-l border-stone-subtle hidden sm:inline-block">Student Live Map</span>
          </Link>
        </div>

        {/* Human-Scale Navigation */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-stone-dark">
          <Link className="hover:text-espresso transition-colors" href="/#how-it-works">How It Works</Link>
          <Link className="hover:text-espresso transition-colors" href="/dashboard">Live Map</Link>
          <Link className="hover:text-espresso transition-colors" href="/routes">Routes &amp; Stops</Link>
          <Link className="hover:text-espresso transition-colors" href="/about">About</Link>
          {userRole === "ADMIN" && (
            <Link className="hover:text-espresso transition-colors text-terracotta border-b border-transparent hover:border-terracotta" href="/admin">Admin Console</Link>
          )}
          {userRole === "DRIVER" && (
            <Link className="hover:text-espresso transition-colors text-terracotta border-b border-transparent hover:border-terracotta" href="/driver">Driver Console</Link>
          )}
        </nav>

        {/* Quick Action / Student Status with live status indicator */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`hidden xl:flex items-center gap-2 text-xs text-stone-text px-3 py-1.5 rounded-full border border-stone-subtle ${isConnected ? 'bg-parchment-warm' : 'bg-red-50'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-sage animate-pulse' : 'bg-red-500'}`}></span>
            <span>{isConnected ? "Fleet Active • Live GPS" : "Fleet Offline"}</span>
          </div>

          {userName ? (
            <>
              {/* Authenticated State */}
              <button
                type="button"
                className="hidden sm:flex flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-parchment-warm border border-stone-subtle transition-all shadow-2xs group text-left cursor-pointer active:scale-95"
                title="Inspect 3D Student Smart Pass"
                onClick={() => {
                   if (!isLiveMap) router.push("/dashboard")
                }}
              >
                <div className="w-6 h-6 rounded-lg bg-terracotta text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <CreditCard className="w-3 h-3" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-espresso tracking-tight">
                    {userName}
                  </span>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs text-stone-text hover:text-espresso border border-stone-subtle hover:bg-parchment-warm transition-all flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Unauthenticated State */}
              <Link className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-espresso text-parchment text-xs font-semibold tracking-wide hover:bg-stone-dark transition-colors shadow-sm" href="/login">
                <span>Login</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <Link className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-subtle text-espresso text-xs font-semibold tracking-wide hover:bg-parchment-warm transition-colors shadow-sm" href="/register">
                <span>Register</span>
              </Link>
            </>
          )}

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
        <div className="lg:hidden absolute top-16 sm:top-20 left-0 w-full bg-parchment border-b border-stone-subtle shadow-sm flex flex-col py-4 px-6 md:px-10 space-y-4">
          <Link className="text-espresso font-medium text-lg" href="/#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How It Works</Link>
          <Link className="text-espresso font-medium text-lg" href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Live Map</Link>
          <Link className="text-espresso font-medium text-lg" href="/routes" onClick={() => setIsMobileMenuOpen(false)}>Routes &amp; Stops</Link>
          <Link className="text-espresso font-medium text-lg" href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
          {userRole === "ADMIN" && (
            <Link className="text-terracotta font-medium text-lg" href="/admin" onClick={() => setIsMobileMenuOpen(false)}>Admin Console</Link>
          )}
          {userRole === "DRIVER" && (
            <Link className="text-terracotta font-medium text-lg" href="/driver" onClick={() => setIsMobileMenuOpen(false)}>Driver Console</Link>
          )}

          <div className="pt-4 border-t border-stone-subtle space-y-3">
            {userName ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-terracotta text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-espresso">{userName}</span>
                </div>
                <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-stone-subtle text-sm font-semibold tracking-wide">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-espresso text-parchment text-sm font-semibold tracking-wide" href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <span>Login / My Pass</span>
                </Link>
                <Link className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-xl border border-stone-subtle text-espresso text-sm font-semibold tracking-wide" href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
