"use client";

import { useEffect, useState } from "react";

interface ContestProblem {
  id: string;
  title: string;
  oj: string;
  externalId: string;
}

interface SubmitViewProps {
  contestId: string;
  displayName: string;
  initialProblemId?: string | null;
  problems: ContestProblem[];
  onSuccess: () => void;
  onCancel?: () => void;
  contestStatus?: string;
}

const OJ_LABELS: Record<string, string> = {
  atcoder: "AtCoder",
  codeforces: "Codeforces",
};

const OJ_PLACEHOLDERS: Record<string, string> = {
  atcoder: "e.g. 50022786 or https://atcoder.jp/contests/<contestId>/submissions/50022786",
  codeforces: "e.g. 123456789 or https://codeforces.com/contest/1234/submission/123456789",
};

const OJ_RULES: Record<string, string[]> = {
  atcoder: [
    "Submission must be made during the contest window, even if you verify it later.",
    "The submission handle must match the AtCoder handle associated with your participant profile.",
    "The submission status must be fully judged and Accepted (AC).",
  ],
  codeforces: [
    "Submission must be made during the contest window and within the last 5 minutes from now.",
    "The submission handle must match the Codeforces handle associated with your participant profile.",
    "The submission verdict must be Accepted (OK).",
    "Gym submissions are not supported — only Codeforces contest submissions.",
  ],
};

export default function SubmitView({
  contestId,
  displayName,
  initialProblemId,
  problems,
  onSuccess,
  onCancel,
  contestStatus,
}: SubmitViewProps) {
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [submissionIdOrUrl, setSubmissionIdOrUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set initial problem
  useEffect(() => {
    if (problems.length === 0) return;
    const isValid = problems.some((p) => p.id === initialProblemId);
    setSelectedProblemId(isValid && initialProblemId ? initialProblemId : problems[0].id);
  }, [initialProblemId, problems]);

  // Reset submission input when problem changes
  const handleProblemChange = (id: string) => {
    setSelectedProblemId(id);
    setSubmissionIdOrUrl("");
    setError(null);
    setSuccessMsg(null);
  };

  const selectedProblem = problems.find((p) => p.id === selectedProblemId);
  const selectedOj = selectedProblem?.oj ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemId) { alert("Please select a problem."); return; }
    if (!submissionIdOrUrl.trim()) { alert("Please enter your submission ID or URL."); return; }
    if (!displayName) {
      alert("You must be registered as a participant to verify submissions.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint =
      selectedOj === "codeforces"
        ? `/api/contest/${contestId}/verify-codeforces`
        : `/api/contest/${contestId}/verify-atcoder`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIdOrUrl, problemId: selectedProblemId, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to verify submission.");
        return;
      }
      setSuccessMsg("Submission successfully verified and recorded!");
      setTimeout(onSuccess, 1500);
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!displayName) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-3 max-w-lg mx-auto">
        <p className="text-sm text-red-200 font-semibold">
          You are not registered as a participant in this contest.
        </p>
        <p className="text-xs text-neutral-400">
          Only joined participants can verify and sync submissions.
        </p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-center text-neutral-400 text-sm max-w-lg mx-auto">
        This contest does not contain any verifiable problems.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-400">Verify Submission</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Submit your solution details for real-time verification.
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

      {/* Rules — updates dynamically per selected OJ */}
      {selectedOj && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90 leading-relaxed space-y-1">
          <p className="font-bold text-amber-400">⚠️ Verification Rules ({OJ_LABELS[selectedOj] ?? selectedOj}):</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            {(OJ_RULES[selectedOj] ?? []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {selectedOj === "atcoder" && (
            <p className="pt-2 text-amber-100/90">
              Open the contest submissions list: {" "}
              <a
                href={`https://atcoder.jp/contests/${contestId}/submissions/?page=1`}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-amber-300/50 hover:decoration-amber-200 text-amber-200"
              >
                https://atcoder.jp/contests/{contestId}/submissions/?page=1
              </a>
              . Pages 1 to 5 are checked automatically.
            </p>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">

        {/* Problem dropdown — all problems listed serially */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-300">Select Problem</label>
          <select
            value={selectedProblemId}
            onChange={(e) => handleProblemChange(e.target.value)}
            disabled={contestStatus === "finished"}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {problems.map((p, index) => (
              <option key={p.id} value={p.id}>
                {String.fromCharCode(65 + index)}. {p.title} ({p.externalId})
              </option>
            ))}
          </select>
        </div>

        {/* Judge — muted read-only field derived from selection */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-300">Online Judge</label>
          <input
            type="text"
            value={selectedOj ? OJ_LABELS[selectedOj] ?? selectedOj : ""}
            readOnly
            className="w-full bg-neutral-800/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-neutral-500 cursor-default select-none"
          />
        </div>

        {/* Submission ID / URL */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-300">Submission ID or URL</label>
          <input
            type="text"
            placeholder={OJ_PLACEHOLDERS[selectedOj] ?? "Enter your submission ID or URL"}
            value={submissionIdOrUrl}
            onChange={(e) => setSubmissionIdOrUrl(e.target.value)}
            disabled={contestStatus === "finished"}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300 font-semibold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300 font-semibold">
            {successMsg}
          </div>
        )}

        {contestStatus === "finished" ? (
          <div className="text-center py-2.5 px-3 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl">
            Contest has ended. Verification is disabled.
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs py-3 rounded-xl shadow-lg hover:shadow-emerald-400/10 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              `Verify & Sync ${OJ_LABELS[selectedOj] ?? ""} Submission`
            )}
          </button>
        )}
      </form>
    </div>
  );
}
