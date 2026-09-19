import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import CustomCursor from "@/components/layout/CustomCursor"
import { Toaster } from "sonner"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
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
        plusJakartaSans.variable,
        jetbrainsMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Custom liquid cursor — shows on all pages */}
        <CustomCursor />

        {/* Toast notifications — styled for luxury light theme */}
        <Toaster
          position="top-right"
          theme="light"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #DDD7CB",
              color: "#1C1917",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            },
          }}
        />

        {children}
      </body>
    </html>
  )
}
