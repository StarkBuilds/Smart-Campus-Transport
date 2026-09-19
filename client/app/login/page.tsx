"use client"

// Login page — two tabs: Student and Driver
// Luxury Royal Beige & Warm Stone Aesthetic
// Stores role in localStorage so the dashboard knows which view to show

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Bus, Eye, EyeOff, GraduationCap, Truck, ArrowLeft } from "lucide-react"
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

    // Simulate an API call
    await new Promise((r) => setTimeout(r, 1000))

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
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden bg-gradient-to-b from-[#F6F4EE] via-[#FAF8F5] to-[#F5F2EB] text-[#1C1917]">
      {/* Warm Ambient Washes */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#FEF3C7]/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full bg-[#DBEAFE]/40 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md my-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1E40AF] to-[#B45309] flex items-center justify-center shadow-[0_2px_12px_rgba(30,64,175,0.25)] group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-extrabold text-[#1C1917] tracking-tight">CampusRide</span>
              <span className="text-[10px] text-[#B45309] tracking-widest uppercase font-bold font-mono mt-0.5">STCET Live Fleet</span>
            </div>
          </Link>
        </div>

        {/* Elevated Royal Card */}
        <div className="bg-white rounded-3xl border border-[#DDD7CB] p-8 shadow-[0_16px_45px_rgba(120,113,108,0.08)]">
          <h1 className="text-2xl font-extrabold text-[#1C1917] mb-1">Welcome back</h1>
          <p className="text-xs text-[#57534E] mb-6">Sign in to track your college transit and boarding passes</p>

          {/* Role selector tabs */}
          <div className="flex gap-1.5 p-1 rounded-2xl bg-[#EFECE6] border border-[#DDD7CB] mb-6">
            {(["student", "driver"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  role === r
                    ? "bg-[#1C1917] text-white shadow-xs"
                    : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                {r === "student" ? <GraduationCap className="w-4 h-4 text-amber-400" /> : <Truck className="w-4 h-4 text-blue-400" />}
                {r === "student" ? "Student Portal" : "Driver Terminal"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#292524] uppercase tracking-wider">
                {role === "student" ? "College Email" : "Driver ID / Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "student" ? "you@stcet.ac.in" : "driver@stcet.ac.in"}
                required
                className="px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#D6CEBF] text-[#1C1917] text-xs font-medium placeholder:text-[#A8A29E] focus:outline-none focus:bg-white focus:border-[#1E40AF] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#292524] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[#FAF8F5] border border-[#D6CEBF] text-[#1C1917] text-xs font-medium placeholder:text-[#A8A29E] focus:outline-none focus:bg-white focus:border-[#1E40AF] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-[#57534E] cursor-pointer">
                <input type="checkbox" className="rounded border-[#D6CEBF] text-[#1E40AF]" />
                Remember me
              </label>
              <a href="#" className="font-semibold text-[#1E40AF] hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 px-5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-[#FAF8F5] text-xs font-bold transition-all shadow-[0_4px_14px_rgba(28,25,23,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>Authenticating with STCET Central...</span>
              ) : (
                <span>Sign In to {role === "student" ? "Student Dashboard" : "Driver Console"}</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#F2EDE4] text-center text-xs text-[#57534E]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#1E40AF] font-bold hover:underline">
              Create student account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
