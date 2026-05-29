import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="absolute bottom-0 right-[-10%] h-64 w-64 rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute top-24 left-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-sm font-semibold">
              Vercel-ready live contests
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              Duels + custom virtual contests
            </div>
            <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight">
              BlitzChallenge
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300">
                Build any contest.
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-neutral-300 leading-relaxed">
              Create real-time duels or craft multi-judge virtual contests with smart problem generation,
              live tracking, and ICPC-style rankings. Built for speed, hosted on Vercel.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                href="/create"
                className="px-6 py-4 rounded-2xl bg-white text-black font-bold text-lg shadow-[0_12px_40px_-20px_rgba(255,255,255,0.7)] hover:-translate-y-0.5 transition-transform text-center"
              >
                Start a Duel
              </Link>
              <Link
                href="/contest"
                className="px-6 py-4 rounded-2xl border border-emerald-400 bg-emerald-500/10 text-emerald-200 font-bold text-lg hover:-translate-y-0.5 hover:bg-emerald-500/20 transition-all text-center"
              >
                Join Virtual Contest
              </Link>
              <Link
                href="/contest/create"
                className="px-6 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-bold text-lg hover:border-emerald-300/60 hover:text-emerald-200 transition-colors text-center"
              >
                Generate Contest
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Multi-OJ pools
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Smart difficulty bands
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Live scoreboards
              </div>
            </div>
          </div>

          <div className="w-full lg:max-w-md">
            <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <span className="uppercase tracking-widest">Contest Preview</span>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">Live</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase text-neutral-400 tracking-widest">Problems</p>
                  <p className="text-2xl font-bold text-white">'N' curated tasks</p>
                  <p className="text-sm text-neutral-400">CF • AtCoder • CodeChef</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase text-neutral-400 tracking-widest">Mode</p>
                  <p className="text-2xl font-bold text-white">Blitz progression or Standard</p>
                  <p className="text-sm text-neutral-400">Auto-unlock on first solve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Custom problem sets",
              body: "Generate balanced difficulty curves, exclude solved tasks, and mix OJs on the fly.",
              accent: "bg-emerald-500/20 text-emerald-200",
            },
            {
              title: "Smart contest rules",
              body: "ICPC, penalty, or score-based rules with frozen standings and first blood bonuses.",
              accent: "bg-cyan-500/20 text-cyan-200",
            },
            {
              title: "Live tracking",
              body: "Submission polling + cron refreshes keep scoreboards fresh without websockets.",
              accent: "bg-amber-500/20 text-amber-200",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${card.accent}`}>
                <span className="text-lg font-bold">★</span>
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white">{card.title}</h3>
              <p className="mt-3 text-neutral-400 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}