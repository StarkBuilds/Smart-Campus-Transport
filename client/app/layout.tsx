import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import CustomCursor from "@/components/layout/CustomCursor"
import { Toaster } from "sonner"

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CampusRide — Live Bus Tracking · STCET",
  description:
    "Real-time GPS tracking and ML-powered delay predictions for St. Thomas' College of Engineering and Technology campus buses. Know when your bus arrives — before it does.",
  keywords: ["campus bus tracking", "STCET", "Khidderpore", "Kolkata", "real-time GPS", "delay prediction"],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        instrumentSans.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Custom liquid cursor — shows on all pages */}
        <CustomCursor />

        {/* Toast notifications — used for delay alerts and arrival warnings */}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.11 0.018 240)",
              border: "1px solid oklch(0.25 0.02 240 / 60%)",
              color: "oklch(0.94 0.01 240)",
            },
          }}
        />

        {children}
      </body>
    </html>
  )
}
