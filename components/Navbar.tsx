"use client";

import Link from "next/link";
import { useState } from "react";
import ProfileWidget from "./ProfileWidget";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-white/5 bg-black/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black text-lg group-hover:scale-105 transition-transform duration-300">
              ⚡
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
              ContestHub
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-400 font-medium">
            <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/#preview" className="hover:text-white transition-colors">Scoreboard</Link>
            <Link href="/#timeline" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="/#judges" className="hover:text-white transition-colors">Integrations</Link>
          </nav>
        </div>

        {/* Right Actions: CTAs + Profile Widget + Hamburger */}
        <div className="flex items-center gap-4">
          <Link
            href="/contest"
            className="hidden sm:inline-flex text-sm font-semibold text-neutral-300 hover:text-white transition-colors px-4 py-2"
          >
            Join Contest
          </Link>
          <Link
            href="/contest/create"
            className="hidden md:inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold shadow-md hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Generate Contest
          </Link>

          {/* Integrated Profile Widget */}
          <ProfileWidget />

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-6 h-6 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-neutral-950/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col p-6 space-y-4">
            <Link
              href="/#features"
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-300 hover:text-white font-medium text-sm transition-colors py-2 border-b border-white/5"
            >
              Features
            </Link>
            <Link
              href="/#preview"
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-300 hover:text-white font-medium text-sm transition-colors py-2 border-b border-white/5"
            >
              Scoreboard
            </Link>
            <Link
              href="/#timeline"
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-300 hover:text-white font-medium text-sm transition-colors py-2 border-b border-white/5"
            >
              How it Works
            </Link>
            <Link
              href="/#judges"
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-300 hover:text-white font-medium text-sm transition-colors py-2 border-b border-white/5"
            >
              Integrations
            </Link>
            <Link
              href="/contest"
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-300 hover:text-white font-medium text-sm transition-colors py-2 border-b border-white/5"
            >
              Join Contest
            </Link>
            <Link
              href="/contest/create"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-white text-black font-bold text-sm shadow-md hover:bg-neutral-100 transition-colors"
            >
              Generate Contest
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
