import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono, Newsreader } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import CustomCursor from "@/components/layout/CustomCursor"
import { Toaster } from "sonner"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})


const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "CampusRide — Live Bus Tracking · STCET",
  description:
    "Real-time GPS tracking and ML-powered delay predictions for St. Thomas' College of Engineering and Technology campus buses. Know when your bus arrives — before it does.",
  keywords: ["campus bus tracking", "STCET", "Khidderpore", "Kolkata", "real-time GPS", "delay prediction"],
  icons: {
    icon: "/assets/logo.png",
    shortcut: "/assets/logo.png",
    apple: "/assets/logo.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        plusJakartaSans.variable,
        jetbrainsMono.variable,
        newsreader.variable,
        "font-sans"
      )}
    >
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Custom liquid cursor — shows on all pages */}
        <CustomCursor />

        <Navbar />

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

        <Footer />
      </body>
    </html>
  )
}
