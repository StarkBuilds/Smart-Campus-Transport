"use client"

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { CAMPUS } from "@/lib/constants"

export default function Contact() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production this would call a backend endpoint
    // For now we just show a success state
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <section id="contact" ref={ref} className="relative py-28 px-5">
      {/* Background orb */}
      <div className="orb w-[400px] h-[400px] bottom-0 right-0 bg-cyan-500/5" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 relative z-10">
        {/* Left — contact info */}
        <div className="flex flex-col gap-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-medium text-cyan-400 tracking-widest uppercase"
          >
            Get In Touch
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white"
          >
            Let&apos;s talk about{" "}
            <span className="text-gradient-cyan">your campus</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground leading-relaxed"
          >
            Whether you&apos;re a student with feedback, a college transport admin
            interested in deploying CampusRide, or just curious — we&apos;d love to hear from you.
          </motion.p>

          {/* Contact details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            {[
              { icon: Mail,    text: "contact@campusride.in" },
              { icon: Phone,   text: "+91 98300 00000" },
              { icon: MapPin,  text: CAMPUS.address },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-muted-foreground pt-2">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — contact form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 40 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="glass-strong rounded-2xl border border-white/5 p-8 flex flex-col gap-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
              <input
                type="text"
                placeholder="Your name"
                required
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                required
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Subject</label>
            <select className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none">
              <option value="" className="bg-[#0D1421]">Select a topic</option>
              <option value="student" className="bg-[#0D1421]">Student Inquiry</option>
              <option value="college" className="bg-[#0D1421]">College Onboarding</option>
              <option value="feedback" className="bg-[#0D1421]">Product Feedback</option>
              <option value="other" className="bg-[#0D1421]">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Message</label>
            <textarea
              placeholder="Tell us what's on your mind..."
              rows={5}
              required
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 py-3.5 bg-cyan-400 text-[#060B18] font-semibold rounded-xl hover:bg-cyan-300 transition-all duration-200 glow-cyan"
          >
            {sent ? (
              <>✓ Message Sent!</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </motion.form>
      </div>
    </section>
  )
}
