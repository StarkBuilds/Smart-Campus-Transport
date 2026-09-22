"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MapWrapper from "@/components/map/MapWrapper"

export default function AdminPage() {
  const router = useRouter()
  const [point, setPoint] = useState<{longitude: number; latitude: number} | null>(null)
  const [name, setName] = useState("")
  const [sequenceOrder, setSequenceOrder] = useState("2")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (localStorage.getItem("user_role") !== "ADMIN") router.replace("/login?role=admin")
  }, [router])

  async function createStop(event: React.FormEvent) {
    event.preventDefault()
    const token = localStorage.getItem("token")
    if (!point || !name.trim() || !token) return
    const response = await fetch("/api/stops", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ routeId: "R01", name, sequenceOrder: Number(sequenceOrder), ...point }),
    })
    setMessage(response.ok ? "Stop added to the active route." : "Unable to add stop.")
    if (response.ok) setName("")
  }

  return (
    <main className="relative min-h-screen bg-parchment">
      <div className="absolute inset-0"><MapWrapper busData={null} userRole="driver" onMapClick={(longitude, latitude) => setPoint({longitude, latitude})} /></div>
      <form onSubmit={createStop} className="absolute top-6 left-6 z-20 w-80 rounded-2xl border border-stone-subtle bg-parchment/95 p-5 shadow-lg backdrop-blur-md space-y-3">
        <h1 className="font-serif text-2xl text-espresso">Add route stop</h1>
        <p className="text-xs text-stone-text">Click the map to choose coordinates, then save the stop to R01.</p>
        <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Stop name" className="w-full rounded-lg border border-stone-subtle bg-white px-3 py-2 text-sm" />
        <input value={sequenceOrder} onChange={(event) => setSequenceOrder(event.target.value)} required type="number" min="1" placeholder="Sequence" className="w-full rounded-lg border border-stone-subtle bg-white px-3 py-2 text-sm" />
        <p className="text-xs text-stone-text">{point ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : "No map point selected"}</p>
        <button type="submit" className="w-full rounded-lg bg-espresso px-3 py-2 text-sm font-semibold text-white">Save stop</button>
        {message && <p className="text-xs text-stone-text">{message}</p>}
      </form>
    </main>
  )
}