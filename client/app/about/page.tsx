import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="flex-grow max-w-[800px] mx-auto px-6 sm:px-10 py-16 sm:py-24 w-full">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-terracotta mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta"></span>
          <span>Platform Overview</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-tight tracking-tight text-espresso mb-8">
          A calm, focused approach to campus transportation.
        </h1>
        <p className="text-lg text-stone-text leading-relaxed font-light mb-6">
          CampusRide is fundamentally designed around student transit routines. It provides a simple, reliable way to track shuttles, understand intricate campus routes, anticipate arrivals between classes, and ride smoothly utilizing a digital student pass.
        </p>
        <p className="text-lg text-stone-text leading-relaxed font-light mb-12">
          Currently deployed at St. Thomas' College of Engineering and Technology (STCET), our architecture is explicitly generalized. It integrates cleanly with standard GPS telemetry and transit scheduling structures, making it highly adaptable for expanding smart campus intelligence to other academic institutions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-12 border-t border-stone-subtle">
        <div>
          <h3 className="font-serif text-2xl text-espresso font-normal mb-3">Live Tracking</h3>
          <p className="text-stone-text text-sm leading-relaxed">
            Real-time geospatial visualization allows students to instantly locate approaching vehicles and optimize their transfer between academic buildings.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-2xl text-espresso font-normal mb-3">Predictive ETAs</h3>
          <p className="text-stone-text text-sm leading-relaxed">
            Leveraging historical wait times and traffic patterns around the quad, CampusRide delivers intelligent delay forecasting that accounts for class dismissal rushes.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-2xl text-espresso font-normal mb-3">Student Pass</h3>
          <p className="text-stone-text text-sm leading-relaxed">
            A native mobile wallet integration allows instantaneous boarding through SSO, removing the friction of physical identification cards.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-2xl text-espresso font-normal mb-3">Generalized Scale</h3>
          <p className="text-stone-text text-sm leading-relaxed">
            The underlying data model separates routes, telemetry clusters, and predictive models from any specific geographic campus limitation.
          </p>
        </div>
      </div>

      <div className="mt-20 pt-12 border-t border-stone-subtle flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-espresso hover:text-terracotta transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Return to Home
        </Link>
      </div>
    </main>
  )
}
