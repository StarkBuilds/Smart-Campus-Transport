"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/services/api"
import { Bus, MapPin, User, ShieldCheck, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const CAMPUSES = [
  "St. Thomas' College of Engineering and Technology",
  "Alipore Campus",
  "Main Campus"
]

const ROUTES = [
  { id: "R01", name: "R01 Express" },
  { id: "R02", name: "R02 Local" }
]

const BUSES = [
  { id: "B01", name: "Bus B01 (WB-11-2023)" },
  { id: "B02", name: "Bus B02 (WB-12-2024)" }
]

export default function RegisterPage() {
  const router = useRouter()
  
  const [role, setRole] = useState<"STUDENT" | "DRIVER">("STUDENT")
  
  // Shared fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [campus, setCampus] = useState(CAMPUSES[0])
  
  // Student fields
  const [pickupLatitude, setPickupLatitude] = useState<number | "">("")
  const [pickupLongitude, setPickupLongitude] = useState<number | "">("")
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  
  // Driver fields
  const [driverId, setDriverId] = useState("")
  const [assignedRouteId, setAssignedRouteId] = useState(ROUTES[0].id)
  const [assignedBusId, setAssignedBusId] = useState(BUSES[0].id)
  
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Success states
  const [success, setSuccess] = useState(false)
  const [assignedRouteName, setAssignedRouteName] = useState("")
  const [assignedStopName, setAssignedStopName] = useState("")
  
  const handleGetLocation = () => {
    setGettingLocation(true)
    setLocationError(null)
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupLatitude(position.coords.latitude)
          setPickupLongitude(position.coords.longitude)
          setGettingLocation(false)
        },
        (err) => {
          console.error(err)
          setLocationError("Unable to retrieve location. Please allow access or try again.")
          setGettingLocation(false)
        }
      )
    } else {
      setLocationError("Geolocation is not supported by your browser.")
      setGettingLocation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Manual validation
    if (role === "STUDENT") {
      if (pickupLatitude === "" || pickupLongitude === "") {
        setError("Please provide your home/pickup location for automatic route assignment.")
        return
      }
    } else {
      if (!driverId) {
        setError("Driver ID is required.")
        return
      }
    }
    
    setLoading(true)

    try {
      const data = await api.register(
        role,
        name,
        email,
        password,
        campus,
        role === "STUDENT" ? Number(pickupLatitude) : undefined,
        role === "STUDENT" ? Number(pickupLongitude) : undefined,
        role === "DRIVER" ? driverId : undefined,
        role === "DRIVER" ? assignedBusId : undefined,
        role === "DRIVER" ? assignedRouteId : undefined
      )
      
      localStorage.setItem("token", data.token)
      localStorage.setItem("user_name", data.name)
      localStorage.setItem("user_role", data.role)
      
      if (role === "STUDENT") {
        setAssignedRouteName(data.assignedRouteName || ROUTES.find(r => r.id === data.assignedRouteId)?.name || data.assignedRouteId || "Assigned Route")
        setAssignedStopName(data.assignedStopName || data.assignedStopId || "Nearest Stop")
      }
      
      setSuccess(true)
      
      setTimeout(() => {
        router.push(role === "STUDENT" ? "/dashboard" : "/driver")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Registration failed. Email may already be in use.")
      setSuccess(false)
    } finally {
      if (!success) { // if failed
         setLoading(false)
      }
    }
  }

  if (success) {
     return (
       <main className="min-h-screen flex items-center justify-center bg-background px-6">
         <div className="w-full max-w-[460px] bg-parchment-warm border border-stone-subtle rounded-3xl p-8 sm:p-10 shadow-xs flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
            <h2 className="text-2xl font-serif font-semibold text-espresso mb-2">Registration Complete</h2>
            
            {role === "STUDENT" ? (
              <div className="bg-white p-5 rounded-2xl border border-stone-subtle w-full text-center mt-4">
                 <p className="text-sm font-semibold text-stone-dark mb-1">Route assigned:</p>
                 <p className="text-lg font-bold text-terracotta mb-4">{assignedRouteName}</p>
                 
                 <p className="text-sm font-semibold text-stone-dark mb-1">Pickup stop:</p>
                 <p className="text-lg font-bold text-terracotta pb-2">{assignedStopName}</p>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-stone-subtle w-full text-center mt-4">
                 <p className="text-sm font-semibold text-stone-dark mb-1">Driver Profile Ready</p>
                 <p className="text-sm font-medium text-stone-main">Welcome aboard, Captain.</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-8 text-sm text-stone-text font-medium animate-pulse">
               Redirecting to your dashboard...
            </div>
         </div>
       </main>
     )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-[460px] bg-parchment-warm border border-stone-subtle rounded-3xl p-8 sm:p-10 shadow-xs">
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-espresso hover:text-terracotta transition-colors mb-2">
            <span className="font-serif italic text-3xl font-semibold tracking-tight">CampusRide</span>
          </Link>
          <span className="text-xs uppercase tracking-widest font-semibold text-stone-text block">
            Account Registration
          </span>
        </div>

        {/* Role Toggle */}
        <div className="flex p-1 bg-parchment border border-stone-subtle rounded-xl mb-8">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              role === "STUDENT"
                ? "bg-white text-espresso shadow-sm"
                : "text-stone-text hover:text-stone-dark"
            }`}
            onClick={() => setRole("STUDENT")}
          >
            <User className="w-4 h-4" />
            Student
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              role === "DRIVER"
                ? "bg-white text-espresso shadow-sm"
                : "text-stone-text hover:text-stone-dark"
            }`}
            onClick={() => setRole("DRIVER")}
          >
            <ShieldCheck className="w-4 h-4" />
            Driver
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-terracotta-soft text-terracotta-dark text-sm rounded-xl font-medium text-center border border-terracotta/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Shared Fields */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-espresso">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base placeholder:text-stone-medium focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-espresso">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "STUDENT" ? "student@stcet.ac.in" : "driver@campusride.com"}
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
              minLength={6}
              className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base placeholder:text-stone-medium focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-espresso">Campus</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-sm"
            >
              {CAMPUSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Role-Specific Fields */}
          <AnimatePresence mode="wait">
            {role === "STUDENT" && (
              <motion.div
                key="student-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-4 pt-2 border-t border-stone-subtle"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-espresso flex justify-between">
                    <span>Home/Pickup Location</span>
                    <button 
                      type="button" 
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="text-xs text-terracotta hover:text-terracotta-dark disabled:opacity-50"
                    >
                      {gettingLocation ? "Locating..." : "Use Current Location"}
                    </button>
                  </label>
                  
                  {locationError && (
                    <p className="text-xs text-terracotta">{locationError}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      value={pickupLatitude}
                      onChange={(e) => setPickupLatitude(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Latitude"
                      className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-sm placeholder:text-stone-medium focus:outline-none focus:border-terracotta transition-all shadow-sm"
                    />
                    <input
                      type="number"
                      step="any"
                      value={pickupLongitude}
                      onChange={(e) => setPickupLongitude(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Longitude"
                      className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-sm placeholder:text-stone-medium focus:outline-none focus:border-terracotta transition-all shadow-sm"
                    />
                  </div>
                  <p className="text-[11px] text-stone-text mt-1">
                    Your location is used to automatically assign you to the nearest route step.
                  </p>
                </div>
              </motion.div>
            )}

            {role === "DRIVER" && (
              <motion.div
                key="driver-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-4 pt-2 border-t border-stone-subtle"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-espresso">Driver / Employee ID</label>
                  <input
                    type="text"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    placeholder="EMP-12345"
                    required
                    className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base placeholder:text-stone-medium focus:outline-none focus:border-terracotta transition-all shadow-sm"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-espresso">Assigned Route</label>
                  <select
                    value={assignedRouteId}
                    onChange={(e) => setAssignedRouteId(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base focus:outline-none focus:border-terracotta transition-all shadow-sm"
                  >
                    {ROUTES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-espresso">Assigned Bus</label>
                  <select
                    value={assignedBusId}
                    onChange={(e) => setAssignedBusId(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-parchment border border-stone-subtle text-espresso text-base focus:outline-none focus:border-terracotta transition-all shadow-sm"
                  >
                    {BUSES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 w-full py-4 rounded-xl text-parchment text-sm font-semibold tracking-wide transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 ${
               loading ? 'bg-stone-dark' : 'bg-espresso hover:bg-stone-dark'
            }`}
          >
            {loading ? (
              <>
                 <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                 <span>
                    {role === "STUDENT" 
                      ? "Finding your nearest CampusRide stop..." 
                      : "Registering driver profile..."}
                 </span>
              </>
            ) : (
              <>
                 <span className="material-symbols-outlined text-sm">person_add</span>
                 <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-subtle text-center flex flex-col gap-2">
          <p className="text-sm text-stone-text">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-terracotta hover:text-terracotta-dark">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
