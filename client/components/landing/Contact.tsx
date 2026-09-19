"use client"

// Contact section — Campus Transport Dispatch Desk
// Warm Almond Sand & Oatmeal Palette (#F5F2EB to #EAE5DC)
// High-contrast inputs, interactive form state, and STCET transport contacts

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

export default function Contact() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [sent, setSent] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", role: "student", message: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setFormData({ name: "", email: "", role: "student", message: "" })
    }, 4000)
  }

  return (
    <section id="contact" ref={ref} className="relative py-24 px-5 bg-gradient-to-b from-[#F5F2EB] to-[#EAE5DC] border-t border-[#DDD7CB]">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-start">
        {/* Left — Contact & Dispatch Desk Info (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E40AF]">
              Campus Dispatch Desk
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Connect with the{" "}
            <span className="bg-gradient-to-r from-[#1E40AF] via-[#7C3AED] to-[#B45309] bg-clip-text text-transparent">
              transport team.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            Have route suggestions, bus delay inquiries, or transport pass issues? Reach out to the STCET campus mobility desk directly.
          </p>

          <div className="flex flex-col gap-3.5 pt-2">
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/95 border border-[#DDD7CB] shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF] shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#1C1917]">Transport Coordination Office</p>
                <p className="text-[#78716C]">{CAMPUS.name}, Khidderpore</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/95 border border-[#DDD7CB] shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#1C1917]">Official Email</p>
                <p className="text-[#78716C]">transport@stcet.ac.in</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/95 border border-[#DDD7CB] shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#065F46] shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#1C1917]">Helpline &amp; Gate 1 Dispatch</p>
                <p className="text-[#78716C]">+91 (033) 2448-1081 / 1082</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Interactive Form Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#DDD7CB] p-7 sm:p-9 shadow-[0_14px_40px_rgba(120,113,108,0.08)]">
          <h3 className="text-xl font-bold text-[#1C1917] mb-1">
            Send a Dispatch Inquiry
          </h3>
          <p className="text-xs text-[#78716C] mb-6">
            Inquiries are relayed directly to the active campus route supervisor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#292524] mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sohom Giri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:bg-white focus:border-[#1E40AF] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292524] mb-1.5">
                  College Email ID
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@stcet.ac.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:bg-white focus:border-[#1E40AF] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292524] mb-1.5">
                Designated Route / Stop
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-medium text-[#1C1917] focus:bg-white focus:border-[#1E40AF] focus:outline-none transition-all cursor-pointer"
              >
                <option value="student">Route R01 — Behala Chowrasta ➔ STCET</option>
                <option value="taratala">Route R01 — Taratala Crossing ➔ STCET</option>
                <option value="majerhat">Route R01 — Majerhat Station ➔ STCET</option>
                <option value="general">General Transit Inquiry / Pass Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292524] mb-1.5">
                Message / Feedback
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe your query or feedback regarding bus schedules, delay tracking, or boarding pass..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:bg-white focus:border-[#1E40AF] focus:outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sent}
              className="w-full py-3.5 px-5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-[#FAF8F5] text-xs font-bold transition-all shadow-[0_4px_14px_rgba(28,25,23,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:bg-emerald-700"
            >
              {sent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Inquiry Transmitted to Dispatch Authority ✓</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Transmit to Campus Dispatch</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
