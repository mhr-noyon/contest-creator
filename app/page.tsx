"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto transition timeline steps for a dynamic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[40%] right-[-10%] h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <Navbar />
      <main>

      {/* 1. Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/20 bg-emerald-500/5 text-emerald-300 text-xs md:text-sm font-semibold mb-8 backdrop-blur-sm">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
            Optimized Synchronous Contest Engine
        </div>

        <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.05] max-w-5xl mx-auto">
          Create real-time
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300">
            programming duels.
          </span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
          Craft custom competitive events across Codeforces and AtCoder. Exclude solved problems, 
          configure ICPC-style scoring, and duel friends on a live-updating scoreboard.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-extrabold text-lg hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:scale-[1.02] transition-all duration-300 text-center"
          >
            Start a Duel
          </Link>
          <Link
            href="/contest/create"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-bold text-lg hover:border-emerald-400/40 hover:text-emerald-200 transition-all duration-300 text-center backdrop-blur-md"
          >
            Generate Custom Contest
          </Link>
        </div>

        {/* Realtime stats ticker */}
        <div className="mt-16 pt-8 border-t border-white/5 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-extrabold text-white">0s</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Setup overhead</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400">Live</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Scoreboard sync</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-cyan-400">Yes</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Filters solved tasks</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-300">Multi</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Judge support</div>
          </div>
        </div>
      </section>

      {/* 2. Scoreboard Preview Section */}
      <section id="preview" className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold">Interactive Duel standings</h2>
          <p className="text-neutral-400 mt-3 max-w-xl mx-auto">
            Live preview of the ICPC leaderboard engine syncing participant outcomes.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                Blitz Mode
              </span>
              <h3 className="font-bold text-lg text-white">Standings: Grand Challenge</h3>
            </div>
            <div className="text-sm text-neutral-400 font-mono">
              Elapsed: <span className="text-emerald-400 font-bold">01:12:43</span> / 02:00:00
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-neutral-300">
              <thead>
                <tr className="border-b border-white/5 text-neutral-500 font-semibold">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 px-4">User</th>
                  <th className="pb-3 px-4 text-center">Score</th>
                  <th className="pb-3 px-4 text-center">Penalty</th>
                  <th className="pb-3 px-4 text-center">Problem A</th>
                  <th className="pb-3 px-4 text-center">Problem B</th>
                  <th className="pb-3 px-4 text-center">Problem C</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                <tr>
                  <td className="py-4 pr-4 font-bold text-amber-400">🥇 1</td>
                  <td className="py-4 px-4 font-sans font-bold text-white flex items-center gap-2">
                    tourist <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">AC</span>
                  </td>
                  <td className="py-4 px-4 text-center text-white font-bold">3</td>
                  <td className="py-4 px-4 text-center text-neutral-400">142</td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">1/18</span>
                    <span className="text-[10px] text-emerald-500">+10m</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">1/35</span>
                    <span className="text-[10px] text-emerald-500">+25m</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">2/78</span>
                    <span className="text-[10px] text-emerald-500">+48m</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-bold text-neutral-400">🥈 2</td>
                  <td className="py-4 px-4 font-sans font-bold text-white">chokudai</td>
                  <td className="py-4 px-4 text-center text-white font-bold">2</td>
                  <td className="py-4 px-4 text-center text-neutral-400">98</td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">1/12</span>
                    <span className="text-[10px] text-emerald-500">+12m</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">1/56</span>
                    <span className="text-[10px] text-emerald-500">+56m</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-red-500/5 text-red-400 border border-red-500/20">
                    <span className="block font-bold">0/2</span>
                    <span className="text-[10px] text-red-500">WA</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-bold text-neutral-500">🥉 3</td>
                  <td className="py-4 px-4 font-sans font-bold text-white">noyon29</td>
                  <td className="py-4 px-4 text-center text-white font-bold">1</td>
                  <td className="py-4 px-4 text-center text-neutral-400">45</td>
                  <td className="py-4 px-4 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="block font-bold">1/45</span>
                    <span className="text-[10px] text-emerald-500">+45m</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-neutral-900 border border-white/5">
                    <span className="block font-bold text-neutral-500">-</span>
                  </td>
                  <td className="py-4 px-4 text-center bg-neutral-900 border border-white/5">
                    <span className="block font-bold text-neutral-500">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <p className="text-emerald-300 text-sm uppercase tracking-widest font-semibold">Engine Capabilities</p>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">Built for fast competitive events</h2>
          </div>
          <p className="text-neutral-400 max-w-md mt-4 md:mt-0">
            A secure virtual gaming environment built directly on top of public APIs, removing manual checking and overhead.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 hover:border-emerald-400/30 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-105 transition-transform duration-300">
              🎲
            </div>
            <h3 className="text-2xl font-bold text-white">Smart problem generation</h3>
            <p className="mt-3 text-neutral-400 leading-relaxed">
              Auto-generate contest pools filtered by Online Judge and difficulty range. The engine keeps a balanced curve suitable for training.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 hover:border-cyan-400/30 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-105 transition-transform duration-300">
              🎯
            </div>
            <h3 className="text-2xl font-bold text-white">Standard & Blitz modes</h3>
            <p className="mt-3 text-neutral-400 leading-relaxed">
              Standard mode opens all questions instantly. Blitz mode locks future questions, only revealing them once the preceding task is solved.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 hover:border-amber-400/30 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-105 transition-transform duration-300">
              ⚙️
            </div>
            <h3 className="text-2xl font-bold text-white">Reliable submission sync</h3>
            <p className="mt-3 text-neutral-400 leading-relaxed">
              Uses an asynchronous Vercel-safe synchronization queue with rolling query windows to easily handle OJ api response lag.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Timeline (How It Works) Section */}
      <section id="timeline" className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16">
          <p className="text-emerald-300 text-sm uppercase tracking-widest font-semibold">Step-by-step Flow</p>
          <h2 className="text-3xl md:text-5xl font-bold mt-2">How it works</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Timeline Controls (Left side) */}
          <div className="lg:col-span-5 space-y-6">
            {[
              {
                step: 0,
                num: "01",
                title: "Setup User profile",
                desc: "Set your name and online judge handles in the persistent profile dropdown. It auto-fills handles for joining contests."
              },
              {
                step: 1,
                num: "02",
                title: "Configure & Generate",
                desc: "Set the difficulty rating limits, select OJs, specify duration, choose Standard or Blitz mode, and invite your friends."
              },
              {
                step: 2,
                num: "03",
                title: "Solve & Sync",
                desc: "Submit your code directly on Codeforces or AtCoder. The synchronizer pulls outcomes and renders details instantly."
              }
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 flex gap-4 ${
                  activeStep === item.step
                    ? "bg-neutral-900 border-emerald-400/40 shadow-xl cursor-pointer"
                    : "border-white/5 bg-black/10 hover:border-white/10 cursor-pointer"
                }`}
              >
                <span className={`text-xl font-bold ${activeStep === item.step ? "text-emerald-400" : "text-neutral-600"}`}>
                  {item.num}
                </span>
                <div>
                  <h4 className="font-bold text-white text-lg">{item.title}</h4>
                  <p className="text-neutral-400 text-sm mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Interactive Screen Preview (Right side) */}
          <div className="lg:col-span-7 bg-neutral-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-h-[380px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
            
            {activeStep === 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className="font-bold text-emerald-300 flex items-center gap-2">👤 Profile settings</h4>
                  <span className="text-xs text-neutral-500">Auto-filled handles</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-black/50 border border-white/5 p-3.5 rounded-2xl">
                    <span className="block text-xs text-neutral-500 uppercase">DisplayName</span>
                    <span className="font-mono text-sm text-white mt-1 block">Coder_Pro</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-3.5 rounded-2xl">
                    <span className="block text-xs text-neutral-500 uppercase">Codeforces handle</span>
                    <span className="font-mono text-sm text-white mt-1 block">tourist</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-3.5 rounded-2xl">
                    <span className="block text-xs text-neutral-500 uppercase">AtCoder handle</span>
                    <span className="font-mono text-sm text-white mt-1 block">chokudai</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className="font-bold text-cyan-300 flex items-center gap-2">🛠️ Contest wizard</h4>
                  <span className="text-xs text-neutral-500">Setup rules</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                    <span className="text-neutral-500 text-xs block">Duration</span>
                    <span className="text-white font-bold font-mono">120 Minutes</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                    <span className="text-neutral-500 text-xs block">Tasks Count</span>
                    <span className="text-white font-bold font-mono">5 Problems</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                    <span className="text-neutral-500 text-xs block">Ruleset</span>
                    <span className="text-white font-bold font-mono">ICPC (Penalty)</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                    <span className="text-neutral-500 text-xs block">Rating range</span>
                    <span className="text-white font-bold font-mono">1000 - 1800</span>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-xs text-emerald-300 leading-normal text-center">
                  💡 Duplicate titles are blocked to preserve unique URLs.
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className="font-bold text-amber-300 flex items-center gap-2">🔄 Synchronization engine</h4>
                  <span className="text-xs text-emerald-400 animate-pulse">● Sync Active</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span>Checking tourist on CF...</span>
                    <span className="text-emerald-400">AC (A)</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span>Checking chokudai on AC...</span>
                    <span className="text-emerald-400">AC (B)</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span>Checking noyon29 on AC...</span>
                    <span className="text-red-400">WA (C)</span>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-500 text-center leading-normal">
                  Rolling safety fetch window checks 10 minutes in the past on every refresh to bypass judge crawler delays.
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-xs text-neutral-500">
              <span>Simulation Status</span>
              <span>Step {activeStep + 1} of 3</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Online Judges Platform Integration Section */}
      <section id="judges" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <p className="text-cyan-300 text-sm uppercase tracking-widest font-semibold">Judge Integrations</p>
          <h2 className="text-3xl md:text-5xl font-bold mt-2">Multiple platforms. One lobby.</h2>
          <p className="text-neutral-400 mt-3 max-w-xl mx-auto">
            Blitz Challenge handles fetching, filtering, and scoring problems from distinct judges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Codeforces Card */}
          <div className="rounded-3xl border border-red-500/10 bg-red-950/5 p-8 hover:border-red-500/20 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
            <span className="text-xs uppercase tracking-widest text-red-400 font-bold font-mono">Platform 01</span>
            <h3 className="text-3xl font-extrabold text-white mt-4">Codeforces</h3>
            <p className="mt-3 text-neutral-400 text-sm leading-relaxed">
              Auto-fetches problems across standard tags. Uses the official Codeforces API and user info handles to verify accounts and fetch submissions.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-red-300">
              <span>API Integrations Status: Ready</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            </div>
          </div>

          {/* AtCoder Card */}
          <div className="rounded-3xl border border-amber-500/10 bg-amber-950/5 p-8 hover:border-amber-500/20 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold font-mono">Platform 02</span>
            <h3 className="text-3xl font-extrabold text-white mt-4">AtCoder</h3>
            <p className="mt-3 text-neutral-400 text-sm leading-relaxed">
              Queries problems through AtCoder and Kenkoooo APIs. Implements caching and proper User-Agent headers to bypass WAF bot blocking.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
              <span>Scraper Engine Status: Ready</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call To Action (Bottom) Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-tr from-white/5 to-white/[0.02] p-12 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tight relative z-10">
            Ready to test your limits?
          </h2>
          <p className="text-neutral-400 mt-4 max-w-xl mx-auto text-sm md:text-base relative z-10">
            Set up your handles, define your criteria, and launch a real-time virtual room in under 60 seconds.
          </p>
          <div className="mt-8 flex justify-center relative z-10">
            <Link
              href="/contest/create"
              className="px-8 py-4 rounded-xl bg-white text-black font-extrabold hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Generate Live Contest Now
            </Link>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="relative z-20 border-t border-white/5 bg-neutral-950 py-12 text-sm text-neutral-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-400 flex items-center justify-center font-bold text-black text-xs">
              ⚡
            </div>
            <span className="font-bold text-neutral-300">BlitzChallenge</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#features" className="hover:text-neutral-300 transition-colors">Features</a>
            <a href="#preview" className="hover:text-neutral-300 transition-colors">Scoreboard</a>
            <a href="#timeline" className="hover:text-neutral-300 transition-colors">Workflow</a>
            <Link href="/contest" className="hover:text-neutral-300 transition-colors">Join Index</Link>
          </div>

          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} BlitzChallenge. All rights reserved.
          </p>
        </div>
      </footer>
      </main>
    </div>
  );
}