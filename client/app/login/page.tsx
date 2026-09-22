"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/services/api"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetRole = searchParams?.get("role") || "student"
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = await api.login(email, password)
      
      // Store token securely (localStorage for MVP)
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user_email", data.email)
        localStorage.setItem("user_name", data.email.split('@')[0])
        localStorage.setItem("user_role", data.role)
      }

      // Route strictly to the appropriate dashboard
      if (data.role === "ADMIN" || data.role === "DISPATCH") {
        router.push("/dashboard") // or /analytics
      } else if (data.role === "DRIVER") {
        router.push("/dashboard") // or /driver
      } else {
        router.push("/dashboard") // student map
      }
    } catch (err) {
      setError("Authentication failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleSSOClick = () => {
    setError("Campus SSO Integration is not configured for this environment.")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md bg-parchment-warm border border-stone-subtle rounded-3xl p-8 sm:p-10 shadow-xs">
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-espresso hover:text-terracotta transition-colors mb-2">
            <span className="font-serif italic text-3xl font-semibold tracking-tight">CampusRide</span>
          </Link>
          <span className="text-xs uppercase tracking-widest font-semibold text-stone-text block">
            {targetRole === 'driver' ? 'Driver Authorization' : 'Student Digital Transit Pass'}
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-terracotta-soft text-terracotta-dark text-sm rounded-xl font-medium text-center border border-terracotta/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-espresso">Campus Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@stcet.ac.in"
              required
              className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base placeholder:text-stone-medium focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-espresso">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base placeholder:text-stone-medium focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 text-sm text-stone-text cursor-pointer">
              <input type="checkbox" className="rounded-sm border-stone-subtle text-terracotta focus:ring-terracotta" />
              Keep me signed in
            </label>
            <a href="#reset" className="text-sm font-semibold text-terracotta hover:text-terracotta-dark">
              Reset Password
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3.5 rounded-xl bg-espresso hover:bg-stone-dark text-parchment text-sm font-semibold tracking-wide transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">vpn_key</span>
            )}
            <span>{loading ? "Sign In" : "Sign In"}</span>
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-subtle"></div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSSOClick}
            className="w-full py-3.5 rounded-xl bg-white border border-stone-subtle hover:bg-parchment text-espresso text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>Sign in with Campus SSO (Not Configured)</span>
          </button>
        </div>


        <div className="mt-8 pt-6 border-t border-stone-subtle text-center flex flex-col gap-2">
          <p className="text-sm text-stone-text">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-terracotta hover:text-terracotta-dark">
              Register here
            </Link>
          </p>
          <p className="text-xs text-stone-text mt-2">
            For access issues, contact the <a href="#" className="font-semibold text-terracotta hover:text-terracotta-dark">IT Transport Desk</a>.
          </p>
        </div>
      </div>
    </main>
  )
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background px-6"><span className="material-symbols-outlined animate-spin text-4xl text-stone-medium">sync</span></div>}>
      <LoginForm />
    </Suspense>
  )
}
