import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-espresso text-stone-subtle mt-auto pt-16 pb-8">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          <div className="lg:col-span-2">
            <Link className="flex items-baseline gap-2.5 mb-4" href="/">
              <span className="font-serif italic text-3xl font-semibold tracking-tight text-parchment">CampusRide</span>
            </Link>
            <p className="text-sm text-stone-text max-w-sm leading-relaxed mb-6">
              Published by the University Office of Transportation &amp; Urban Mobility. Edited daily to bring you accurate campus transit intelligence.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-parchment bg-stone-dark/30 w-max px-3 py-1.5 rounded-full border border-stone-dark">
              <span className="w-2 h-2 rounded-full bg-sage shadow-[0_0_8px_rgba(21,128,61,0.5)]"></span>
              <span>System Operational</span>
            </div>
          </div>

          <div>
            <h4 className="text-parchment font-semibold mb-4 text-sm tracking-wide">Product</h4>
            <div className="flex flex-col space-y-3 text-sm text-stone-text">
              <Link className="hover:text-terracotta transition-colors" href="/dashboard">Live Map</Link>
              <Link className="hover:text-terracotta transition-colors" href="/routes">Routes &amp; Stops</Link>
              <Link className="hover:text-terracotta transition-colors" href="/#how-it-works">How It Works</Link>
              <Link className="hover:text-terracotta transition-colors" href="/login">Student Pass</Link>
            </div>
          </div>

          <div>
            <h4 className="text-parchment font-semibold mb-4 text-sm tracking-wide">Routes</h4>
            <div className="flex flex-col space-y-3 text-sm text-stone-text">
              <Link className="hover:text-terracotta transition-colors" href="/about">About CampusRide</Link>
              <a className="hover:text-terracotta transition-colors" href="#accessibility">Accessibility (Van Access)</a>
              <a className="hover:text-terracotta transition-colors" href="#safety">Campus Safe Walk</a>
              <a className="hover:text-terracotta transition-colors" href="#timetables">Timetables PDF</a>
            </div>
          </div>

          <div>
            <h4 className="text-parchment font-semibold mb-4 text-sm tracking-wide">Support / About</h4>
            <div className="flex flex-col space-y-3 text-sm text-stone-text">
              <a className="hover:text-terracotta transition-colors" href="#contact">Contact Dispatch</a>
              <a className="hover:text-terracotta transition-colors" href="#lost">Lost &amp; Found</a>
              <a className="hover:text-terracotta transition-colors" href="#feedback">Driver Commendation</a>
              <a className="hover:text-terracotta transition-colors" href="#privacy">Student Privacy</a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-dark flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-text">
          <p>&copy; {new Date().getFullYear()} University Office of Transportation. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by STCET Transit Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
