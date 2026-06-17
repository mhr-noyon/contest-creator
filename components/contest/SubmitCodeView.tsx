"use client";

import { useEffect, useState } from "react";

interface ContestProblem {
  id: string;
  title: string;
  oj: string;
  externalId: string;
}

interface SubmitCodeViewProps {
  contestId: string;
  displayName: string;
  initialProblemId?: string | null;
  problems: ContestProblem[];
  onSuccess: () => void;
  onCancel?: () => void;
  contestStatus?: string;
}

const ATCODER_LANGUAGES = [
  { label: "C++ 23 (GCC 15.2.0)", value: "6017" },
  { label: "Python (CPython 3.13.7)", value: "6082" },
  { label: "PyPy3 (PyPy 3.11-v7.3.20)", value: "6083" },
  { label: "Java (OpenJDK 24.0.2)", value: "6056" },
  { label: "Rust (rustc 1.89.0)", value: "6088" },
  { label: "Go (go 1.25.1)", value: "6051" },
  { label: "C# (13.0 .NET 9.0.8)", value: "6015" },
];

export default function SubmitCodeView({
  contestId,
  displayName,
  initialProblemId,
  problems,
  onSuccess,
  onCancel,
  contestStatus,
}: SubmitCodeViewProps) {
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [languageId, setLanguageId] = useState("6017"); // default C++
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verdictData, setVerdictData] = useState<{
    verdict: string;
    time?: string;
    memory?: string;
  } | null>(null);

  const [hasSessionId, setHasSessionId] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Load AtCoder Session ID from profile
  useEffect(() => {
    const saved = localStorage.getItem("user-profile");
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        if (profile.atcoderSessionId) {
          setHasSessionId(true);
          setSessionId(profile.atcoderSessionId);
        }
      } catch (e) {
        console.error("Failed to parse user profile:", e);
      }
    }
  }, []);

  // Set initial problem
  useEffect(() => {
    if (problems.length === 0) return;
    const atcoderProblems = problems.filter((p) => p.oj === "atcoder");
    if (atcoderProblems.length === 0) return;

    const isValid = atcoderProblems.some((p) => p.id === initialProblemId);
    setSelectedProblemId(isValid && initialProblemId ? initialProblemId : atcoderProblems[0].id);
  }, [initialProblemId, problems]);

  const selectedProblem = problems.find((p) => p.id === selectedProblemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemId) {
      alert("Please select an AtCoder problem.");
      return;
    }
    if (!sourceCode.trim()) {
      alert("Please write/paste your solution code.");
      return;
    }
    if (!sessionId) {
      alert("AtCoder Session ID is missing. Please set it in your profile first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setVerdictData(null);
    setStatusText("Submitting code to AtCoder...");

    try {
      const res = await fetch(`/api/contest/${contestId}/submit-atcoder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: selectedProblemId,
          displayName,
          sourceCode,
          languageId,
          atcoderSessionId: sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit code.");
        setSubmitting(false);
        return;
      }

      setStatusText("Code submitted. Waiting for judging verdict...");
      
      setVerdictData({
        verdict: data.verdict,
        time: data.time,
        memory: data.memory,
      });

      if (data.verdict === "AC") {
        setTimeout(onSuccess, 2500);
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncLatest = async () => {
    if (!selectedProblemId) {
      alert("Please select an AtCoder problem.");
      return;
    }
    if (!sessionId) {
      alert("AtCoder Session ID is missing. Please set it in your profile first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setVerdictData(null);
    setStatusText("Fetching your latest AtCoder submission...");

    try {
      const res = await fetch(`/api/contest/${contestId}/sync-atcoder-latest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: selectedProblemId,
          displayName,
          atcoderSessionId: sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sync submission.");
        setSubmitting(false);
        return;
      }

      setStatusText("Submission synced successfully!");
      setVerdictData({
        verdict: data.verdict,
        time: data.time,
        memory: data.memory,
      });

      if (data.verdict === "AC") {
        setTimeout(onSuccess, 2500);
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const atcoderProblems = problems.filter((p) => p.oj === "atcoder");

  if (!displayName) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-3 max-w-lg mx-auto">
        <p className="text-sm text-red-200 font-semibold">
          You are not registered as a participant in this contest.
        </p>
        <p className="text-xs text-neutral-400">
          Only joined participants can submit solutions.
        </p>
      </div>
    );
  }

  if (atcoderProblems.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-center text-neutral-400 text-sm max-w-lg mx-auto">
        This contest does not contain any AtCoder problems.
      </div>
    );
  }

  if (!hasSessionId) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4 max-w-xl mx-auto shadow-xl">
        <h3 className="text-lg font-bold text-amber-400">AtCoder Session ID Required</h3>
        <p className="text-sm text-neutral-300 leading-relaxed">
          To submit code directly from this page, you need to save your AtCoder Session ID (`REVEL_SESSION` cookie) in your profile first.
        </p>
        <div className="text-xs text-neutral-400 space-y-1.5 leading-relaxed bg-black/30 p-4 rounded-2xl border border-white/5">
          <p className="font-semibold text-neutral-300">How to get it:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open <a href="https://atcoder.jp" target="_blank" rel="noreferrer" className="underline text-emerald-400">AtCoder.jp</a> and log in.</li>
            <li>Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded">F12</kbd> (or right click &rarr; Inspect) to open DevTools.</li>
            <li>Go to the <span className="font-semibold">Application</span> (Chrome/Edge) or <span className="font-semibold">Storage</span> (Firefox) tab.</li>
            <li>Under <span className="font-semibold">Cookies</span>, click on <span className="font-semibold">https://atcoder.jp</span>.</li>
            <li>Find the cookie named <span className="font-semibold text-amber-300">REVEL_SESSION</span> and copy its value.</li>
            <li>Click the floating profile widget in the top right of this app to paste and save it.</li>
          </ol>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">⚡ Submit Solution to AtCoder</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Submit your solution code directly. The agent will post and poll the status automatically.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Problem selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-300">Select Problem</label>
            <select
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              disabled={contestStatus === "finished"}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {atcoderProblems.map((p, index) => (
                <option key={p.id} value={p.id}>
                  {String.fromCharCode(65 + index)}. {p.title} ({p.externalId})
                </option>
              ))}
            </select>
          </div>

          {/* Language selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-300">Language</label>
            <select
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              disabled={contestStatus === "finished"}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ATCODER_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source Code Textarea */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-300">Source Code</label>
          <textarea
            placeholder="Paste your code here..."
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            disabled={contestStatus === "finished"}
            className="w-full h-80 bg-neutral-950 border border-white/10 rounded-2xl p-4 text-sm font-mono text-neutral-200 placeholder:text-neutral-700 focus:border-emerald-400 focus:outline-none transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Status display */}
        {submitting && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 font-semibold animate-pulse">
            <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            {statusText}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300 font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Verdict display */}
        {verdictData && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400">Verdict:</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
                  verdictData.verdict === "AC"
                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                    : verdictData.verdict === "WJ"
                    ? "bg-neutral-800 text-neutral-400 border border-neutral-700"
                    : "bg-red-400/10 text-red-300 border border-red-400/20"
                }`}
              >
                {verdictData.verdict === "AC" ? "Accepted (AC)" : verdictData.verdict}
              </span>
            </div>
            {verdictData.verdict !== "WJ" && (
              <div className="grid grid-cols-2 gap-4 text-xs text-neutral-400">
                <div>Time: <span className="text-neutral-200 font-mono">{verdictData.time}</span></div>
                <div>Memory: <span className="text-neutral-200 font-mono">{verdictData.memory}</span></div>
              </div>
            )}
            {verdictData.verdict === "AC" && (
              <p className="text-[10px] text-emerald-400 font-medium animate-pulse">
                Awesome! Leaderboard is updating. Redirecting back...
              </p>
            )}
          </div>
        )}

        <div className="text-[11px] text-neutral-400 leading-relaxed bg-black/30 p-4 rounded-2xl border border-white/5 space-y-1">
          <p className="font-semibold text-neutral-300">💡 Turnstile Bypassing Option:</p>
          <p>
            If Cloudflare Turnstile blocks direct submission: click the problem link, submit your solution directly on the AtCoder website, and then click the <span className="font-semibold text-emerald-400">Sync Latest AtCoder Submit</span> button. We will automatically fetch and verify your latest submit!
          </p>
        </div>

        {contestStatus === "finished" ? (
          <div className="text-center py-2.5 px-3 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl">
            Contest has ended. Solution submission is disabled.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={submitting || verdictData?.verdict === "AC"}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs py-3.5 rounded-xl shadow-lg hover:shadow-emerald-400/10 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Submit Code Directly
            </button>
            <button
              type="button"
              onClick={handleSyncLatest}
              disabled={submitting || verdictData?.verdict === "AC"}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-xs py-3.5 rounded-xl border border-white/10 shadow-lg disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              🔄 Sync Latest AtCoder Submit
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
