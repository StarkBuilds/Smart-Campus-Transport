"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Bus, Eye, EyeOff, GraduationCap, Truck } from "lucide-react"
import { toast } from "sonner"
import { BUS_STOPS } from "@/lib/constants"

type Role = "student" | "driver"

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [stopId, setStopId] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate registration API call
    await new Promise((r) => setTimeout(r, 1500))

    localStorage.setItem("user_role", role)
    localStorage.setItem("user_email", email)
    localStorage.setItem("user_name", name)
    if (stopId) localStorage.setItem("user_stop", stopId)

    toast.success("Account created! Taking you to your dashboard...")

    if (role === "driver") {
      router.push("/driver")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="orb w-[500px] h-[500px] -top-40 -right-40 bg-violet-600/8 animate-[orb-drift-2_12s_ease-in-out_infinite]" />
      <div className="orb w-[400px] h-[400px] -bottom-20 -left-20 bg-cyan-500/8 animate-[orb-drift-1_15s_ease-in-out_infinite]" />
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
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-7">Join CampusRide — it&apos;s free for students</p>

          {/* Role selector */}
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

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

            {/* Students pick their boarding stop */}
            {role === "student" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Your Boarding Stop</label>
                <select
                  value={stopId}
                  onChange={(e) => setStopId(e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
                >
                  <option value="" className="bg-[#0D1421]">Select your stop</option>
                  {BUS_STOPS.map((stop) => (
                    <option key={stop.stop_id} value={stop.stop_id} className="bg-[#0D1421]">
                      {stop.name} · {stop.scheduled_arrival}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
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

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 bg-cyan-400 text-[#060B18] font-semibold rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
