"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import MapWrapper from "@/components/map/MapWrapper"
import { api } from "@/services/api"
import { Brain, AlertTriangle, Play, Activity } from "lucide-react"

type AdminAlert = { id: number; busId: string; type: string; status: string; message: string; timestamp: string }

export default function AdminPage() {
  const router = useRouter()
  const [point, setPoint] = useState<{longitude: number; latitude: number} | null>(null)
  const [name, setName] = useState("")
  const [sequenceOrder, setSequenceOrder] = useState("2")
  const [message, setMessage] = useState("")
  const [mlMeta, setMlMeta] = useState<Record<string, unknown> | null>(null)
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null)
  const [validating, setValidating] = useState(false)
  const [diagAlerts, setDiagAlerts] = useState<AdminAlert[]>([])
  const [mlError, setMlError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem("user_role") !== "ADMIN") router.replace("/login?role=admin")
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meta = await api.getMlMetadata()
        if (!cancelled) setMlMeta(meta)
      } catch (e: any) {
        if (!cancelled) setMlError(e?.message || "ML metadata unavailable")
      }
      try {
        const alerts = await api.getAdminAlerts()
        if (!cancelled) {
          setDiagAlerts(alerts.filter(a => a.status === "ACTIVE" && a.type === "DATA_QUALITY"))
        }
      } catch {
        // ignore
      }
    }
    load()
    const id = setInterval(load, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

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

  async function runValidation() {
    setValidating(true)
    setMlError(null)
    try {
      const result = await api.runMlValidation()
      setValidation(result)
    } catch (e: any) {
      setMlError(e?.message || "Validation failed")
    } finally {
      setValidating(false)
    }
  }

  const metrics = useMemo(() => {
    const fromValidation = validation
    const fromMeta = (mlMeta?.metrics as Record<string, number> | undefined) || undefined
    return {
      mae: Number(fromValidation?.mae ?? fromMeta?.mae ?? NaN),
      rmse: Number(fromValidation?.rmse ?? fromMeta?.rmse ?? NaN),
      r2: Number(fromValidation?.r2 ?? fromMeta?.r2 ?? NaN),
      samples: Number(fromValidation?.sample_count ?? mlMeta?.validation_size ?? 0),
    }
  }, [validation, mlMeta])

  const chartPoints = useMemo(() => {
    const actual = (validation?.actual as number[] | undefined) || []
    const predicted = (validation?.predicted as number[] | undefined) || []
    const n = Math.min(actual.length, predicted.length, 60)
    if (n === 0) return []
    const max = Math.max(...actual.slice(0, n), ...predicted.slice(0, n), 1)
    return Array.from({ length: n }, (_, i) => ({
      a: actual[i],
      p: predicted[i],
      ay: 100 - (actual[i] / max) * 90,
      py: 100 - (predicted[i] / max) * 90,
      x: (i / Math.max(n - 1, 1)) * 100,
    }))
  }, [validation])

  const features = (mlMeta?.features_used as string[] | undefined) || []
  const predictedDelay = mlMeta?.currentPredictedDelayMinutes as number | undefined

  return (
    <main className="relative min-h-screen bg-parchment">
      <div className="absolute inset-0">
        <MapWrapper busData={null} userRole="driver" onMapClick={(longitude, latitude) => setPoint({longitude, latitude})} />
      </div>

      <form onSubmit={createStop} className="absolute top-6 left-6 z-20 w-80 rounded-2xl border border-stone-subtle bg-parchment/95 p-5 shadow-lg backdrop-blur-md space-y-3">
        <h1 className="font-serif text-2xl text-espresso">Add route stop</h1>
        <p className="text-xs text-stone-text">Click the map to choose coordinates, then save the stop to R01.</p>
        <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Stop name" className="w-full rounded-lg border border-stone-subtle bg-white px-3 py-2 text-sm" />
        <input value={sequenceOrder} onChange={(event) => setSequenceOrder(event.target.value)} required type="number" min="1" placeholder="Sequence" className="w-full rounded-lg border border-stone-subtle bg-white px-3 py-2 text-sm" />
        <p className="text-xs text-stone-text">{point ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : "No map point selected"}</p>
        <button type="submit" className="w-full rounded-lg bg-espresso px-3 py-2 text-sm font-semibold text-white">Save stop</button>
        {message && <p className="text-xs text-stone-text">{message}</p>}
      </form>

      {/* ML / transport analytics — admin only */}
      <div className="absolute top-6 right-6 z-20 w-[380px] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-stone-subtle bg-parchment/95 p-5 shadow-lg backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-xl text-espresso flex items-center gap-2">
            <Brain className="w-5 h-5 text-terracotta" />
            ML Analytics
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-text">Admin</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-stone-subtle bg-white/80 p-2.5">
            <p className="text-[10px] uppercase font-bold text-stone-text">Model</p>
            <p className="font-semibold text-espresso mt-0.5">{String(mlMeta?.model_type || "XGBoost Regressor")}</p>
          </div>
          <div className="rounded-xl border border-stone-subtle bg-white/80 p-2.5">
            <p className="text-[10px] uppercase font-bold text-stone-text">Target</p>
            <p className="font-semibold text-espresso mt-0.5">{String(mlMeta?.prediction_target || "delay_next_stop_minutes")}</p>
          </div>
          <div className="rounded-xl border border-stone-subtle bg-white/80 p-2.5">
            <p className="text-[10px] uppercase font-bold text-stone-text">Predicted delay</p>
            <p className="font-semibold text-espresso mt-0.5 font-mono">
              {predictedDelay != null ? `${predictedDelay} min` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-stone-subtle bg-white/80 p-2.5">
            <p className="text-[10px] uppercase font-bold text-stone-text">Version</p>
            <p className="font-semibold text-espresso mt-0.5">{String(mlMeta?.model_version || "—")}</p>
          </div>
        </div>

        {features.length > 0 && (
          <div>
            <p className="text-[10px] uppercase font-bold text-stone-text mb-1.5">Prediction inputs</p>
            <div className="flex flex-wrap gap-1">
              {features.slice(0, 12).map((f) => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-stone-subtle text-stone-dark font-mono">
                  {f}
                </span>
              ))}
              {features.length > 12 && (
                <span className="text-[10px] text-stone-text">+{features.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-stone-subtle bg-white/80 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-espresso flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Validation metrics
            </p>
            <button
              type="button"
              onClick={runValidation}
              disabled={validating}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-espresso text-white disabled:opacity-60"
            >
              <Play className="w-3 h-3" />
              {validating ? "Running…" : "Run Model Validation"}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div>
              <p className="text-[9px] uppercase font-bold text-stone-text">MAE</p>
              <p className="text-sm font-mono font-bold text-espresso">{Number.isFinite(metrics.mae) ? metrics.mae.toFixed(2) : "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-stone-text">RMSE</p>
              <p className="text-sm font-mono font-bold text-espresso">{Number.isFinite(metrics.rmse) ? metrics.rmse.toFixed(2) : "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-stone-text">R²</p>
              <p className="text-sm font-mono font-bold text-espresso">{Number.isFinite(metrics.r2) ? metrics.r2.toFixed(3) : "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-stone-text">n</p>
              <p className="text-sm font-mono font-bold text-espresso">{metrics.samples || "—"}</p>
            </div>
          </div>

          {chartPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-stone-text mb-1">Actual vs Predicted</p>
              <svg viewBox="0 0 100 100" className="w-full h-28 rounded-lg bg-parchment border border-stone-subtle">
                <polyline
                  fill="none"
                  stroke="#78716C"
                  strokeWidth="0.8"
                  points={chartPoints.map(p => `${p.x},${p.ay}`).join(" ")}
                />
                <polyline
                  fill="none"
                  stroke="#C2410C"
                  strokeWidth="0.8"
                  points={chartPoints.map(p => `${p.x},${p.py}`).join(" ")}
                />
              </svg>
              <div className="flex gap-3 text-[9px] text-stone-text mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-stone-text inline-block" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-terracotta inline-block" /> Predicted</span>
              </div>
            </div>
          )}
        </div>

        {mlError && <p className="text-xs text-red-700">{mlError}</p>}
        {validation?.error && <p className="text-xs text-amber-800">{String(validation.error)}</p>}

        <div className="rounded-xl border border-stone-subtle bg-white/80 p-3 space-y-2">
          <p className="text-xs font-bold text-espresso flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Diagnostic alerts
          </p>
          {diagAlerts.length === 0 && (
            <p className="text-[11px] text-stone-text">No active DATA_QUALITY diagnostics.</p>
          )}
          {diagAlerts.slice(0, 4).map((a) => (
            <div key={a.id} className="text-[11px] text-stone-dark border-t border-stone-subtle pt-1.5">
              <p className="font-medium leading-snug">{a.message}</p>
              <p className="text-[10px] text-stone-text mt-0.5">{a.type}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
