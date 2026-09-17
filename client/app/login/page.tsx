"use client"

// Login page — two tabs: Student and Driver
// Stores role in localStorage so the dashboard knows which view to show
// When backend auth is ready, swap localStorage with a real JWT call

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Bus, Eye, EyeOff, GraduationCap, Truck } from "lucide-react"
import { toast } from "sonner"

type Role = "student" | "driver"

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate an API call — replace with real auth when backend is ready
    await new Promise((r) => setTimeout(r, 1200))

    // Store the role so the dashboard knows what to show
    localStorage.setItem("user_role", role)
    localStorage.setItem("user_email", email)

    toast.success(`Welcome back! Logging you in as ${role}...`)

    // Drivers go to driver dashboard, students to regular dashboard
    if (role === "driver") {
      router.push("/driver")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] -top-40 -left-40 bg-cyan-500/8 animate-[orb-drift-1_12s_ease-in-out_infinite]" />
      <div className="orb w-[400px] h-[400px] -bottom-20 -right-20 bg-violet-600/8 animate-[orb-drift-2_15s_ease-in-out_infinite]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,200,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center glow-cyan">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CampusRide</span>
          </Link>
        </div>

        <div className="glass-strong rounded-2xl border border-white/5 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-7">Sign in to track your bus</p>

          {/* Role selector tabs */}
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 mb-7">
            {(["student", "driver"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === r
                    ? "bg-cyan-400 text-[#060B18]"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {r === "student" ? <GraduationCap className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {role === "student" ? "College Email" : "Driver ID / Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "student" ? "you@stcet.ac.in" : "driver@stcet.ac.in"}
                required
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 bg-cyan-400 text-[#060B18] font-semibold rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center text-sm text-muted-foreground mt-5">
          <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
