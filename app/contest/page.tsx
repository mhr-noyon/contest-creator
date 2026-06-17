"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Contest } from "@/lib/contest/types";
import Navbar from "@/components/Navbar";

export default function ContestsListPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContests() {
      try {
        const res = await fetch("/api/contest/list", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load contests");
        const data = await res.json();
        setContests(data.contests || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch contests list.");
      } finally {
        setLoading(false);
      }
    }
    fetchContests();
  }, []);

  const [deleteContestId, setDeleteContestId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (contestId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteContestId(contestId);
    setDeletePassword("");
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Password cannot be empty.");
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/contest/${deleteContestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete contest");
      }

      setContests((prev) => prev.filter((c) => c.id !== deleteContestId));
      setDeleteContestId(null);
      setDeletePassword("");
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred while deleting the contest.");
    } finally {
      setDeleting(false);
    }
  };

  const activeContests = contests.filter((c) => c.status !== "finished");
  const completedContests = contests.filter((c) => c.status === "finished");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white px-6 py-12 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-0 right-[-10%] h-64 w-64 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Link
              href="/"
              className="text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Back home
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-3">Virtual Contests</h1>
            <p className="text-neutral-400 mt-2 max-w-xl">
              Browse ongoing battles, join active lobbies, or review completed contests and scoreboard standings.
            </p>
          </div>
          <Link
            href="/contest/create"
            className="px-5 py-3 rounded-2xl bg-emerald-400 text-black font-bold shadow-lg hover:-translate-y-0.5 hover:bg-emerald-300 transition-all cursor-pointer text-center"
          >
            Create Contest
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-400 text-sm">Loading contests...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-950/20 p-8 text-center">
            <p className="text-red-400 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-900/40 text-red-200 border border-red-500/30 rounded-xl text-sm hover:bg-red-900/60 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active / Ongoing Contests Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Contests
              </h2>
              {activeContests.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-center text-neutral-500">
                  No active contests right now. Feel free to create one!
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeContests.map((contest) => (
                    <div key={contest.id} className="relative group/card">
                      <Link
                        href={`/contest/${contest.id}`}
                        className="block rounded-3xl border border-white/10 bg-white/5 p-6 hover:border-emerald-400/50 hover:bg-white/10 transition-all duration-300 group hover:shadow-xl"
                      >
                        <div className="flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-xl font-bold group-hover:text-emerald-300 transition-colors pr-8">
                                {contest.settings.title}
                              </h3>
                              <span
                                className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                  contest.status === "running"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                }`}
                              >
                                {contest.status}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-400 line-clamp-2">
                              {contest.settings.description || "No description provided."}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 text-xs border-t border-white/5 pt-4 text-neutral-400">
                            <div className="flex gap-3">
                              <span>{contest.settings.durationMinutes} mins</span>
                              <span>•</span>
                              <span>{contest.settings.numberOfProblems} problems</span>
                            </div>
                            {contest.settings.requirePassword && (
                              <span className="flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                🔒 Password Required
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => handleDeleteClick(contest.id, e)}
                        className="absolute top-6 right-6 z-20 p-2 rounded-xl bg-red-950/40 border border-red-500/20 hover:border-red-500 hover:bg-red-500 hover:text-white text-red-400 transition-all cursor-pointer md:opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                        title="Delete Contest"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Completed / Old Contests Section */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-2xl font-bold text-neutral-300">Completed Contests</h2>
                <span className="text-xs text-neutral-500 font-normal">(showing last 24 hours)</span>
              </div>
              {completedContests.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-center text-neutral-500">
                  No completed contests found.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedContests.map((contest) => {
                    const participantNames = contest.participants
                      .map((p) => p.displayName)
                      .join(", ");
                    return (
                      <div key={contest.id} className="relative group/card">
                        <Link
                          href={`/contest/${contest.id}`}
                          className="block rounded-3xl border border-white/10 bg-black/40 p-6 hover:border-neutral-500 hover:bg-neutral-900/40 transition-all duration-300 group"
                        >
                          <div className="flex flex-col justify-between h-full space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <h3 className="text-xl font-bold group-hover:text-neutral-200 transition-colors pr-8">
                                  {contest.settings.title}
                                </h3>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-neutral-400">
                                  Ended
                                </span>
                              </div>
                              <p className="text-sm text-neutral-400 line-clamp-2">
                                {contest.settings.description || "No description provided."}
                              </p>
                            </div>

                            {participantNames && (
                              <div className="text-xs text-neutral-400 bg-white/5 border border-white/5 rounded-xl p-3 leading-relaxed">
                                <span className="font-semibold text-neutral-300">Participants:</span> {participantNames}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-4 text-xs border-t border-white/5 pt-4 text-neutral-500">
                              <div className="flex gap-3">
                                <span>{contest.settings.durationMinutes} mins</span>
                                <span>•</span>
                                <span>{contest.settings.numberOfProblems} problems</span>
                              </div>
                              {contest.settings.requirePassword && (
                                <span className="flex items-center gap-1 text-amber-300/70 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => handleDeleteClick(contest.id, e)}
                          className="absolute top-6 right-6 z-20 p-2 rounded-xl bg-red-950/40 border border-red-500/20 hover:border-red-500 hover:bg-red-500 hover:text-white text-red-400 transition-all cursor-pointer md:opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                          title="Delete Contest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {deleteContestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Delete Contest?</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Are you sure you want to delete this contest? All settings, problems, participants, and submissions will be permanently removed.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400">Admin Delete Password</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-neutral-950 text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmDelete();
                  }
                }}
              />
              {deleteError && (
                <p className="text-xs text-red-400 font-semibold">{deleteError}</p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => {
                  setDeleteContestId(null);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
