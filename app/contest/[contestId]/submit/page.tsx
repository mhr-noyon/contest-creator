"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import SubmitView from "@/components/contest/SubmitView";
import { Contest } from "@/lib/contest/types";

export default function SubmitPage() {
  const params = useParams();
  const contestId = params?.contestId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const problemId = searchParams.get("problemId");

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");

  useEffect(() => {
    if (!contestId) return;
    async function loadContest() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/contest/${contestId}`, { cache: "no-store" });
        if (!res.ok) {
          try {
            const data = await res.json();
            setError(data.error || `Failed to load contest info (Status ${res.status})`);
          } catch {
            setError(`Failed to load contest info (Status ${res.status})`);
          }
          return;
        }
        const data = await res.json();
        setContest(data.contest);
      } catch (err) {
        setError("Error fetching contest data");
      } finally {
        setLoading(false);
      }
    }
    loadContest();
  }, [contestId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem(`contest-join-${contestId}`);
      if (storedName) {
        setJoinName(storedName);
      }
    }
  }, [contestId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400">Loading submission view...</p>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="py-12 text-center space-y-4 max-w-md px-4">
          <p className="text-red-400 text-lg font-bold">⚠️ Error Loading Contest</p>
          <p className="text-neutral-400">{error || "The contest details could not be loaded."}</p>
          <Link
            href="/contest"
            className="inline-block px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-white/5 pb-4">
          <Link
            href={`/contest/${contestId}`}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Back to Contest
          </Link>
          <h1 className="text-3xl font-extrabold mt-1">Submit Solution</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Contest: <span className="text-emerald-400 font-semibold">{contest.settings.title}</span>
          </p>
        </div>

        <div className="bg-neutral-900/50 rounded-3xl border border-white/5 p-6">
          <SubmitView
            contestId={contestId}
            displayName={joinName}
            initialProblemId={problemId}
            problems={contest.problems}
            onSuccess={() => {
              router.push(`/contest/${contestId}?tab=leaderboard`);
            }}
            onCancel={() => {
              router.push(`/contest/${contestId}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
