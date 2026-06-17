"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";

interface ProblemData {
  problemId: string;
  title: string;
  oj: string;
  externalId: string;
  rating: number | null;
  points: number;
  url: string;
  html: string;
}

export default function ProblemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contestId = params?.contestId as string;
  const problemId = params?.problemId as string;
  const clear = searchParams.get("clear") === "true";
  
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contest, setContest] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!contestId) return;
    const storedName = localStorage.getItem(`contest-join-${contestId}`);
    if (storedName) {
      setDisplayName(storedName);
    } else {
      const storedOwner = localStorage.getItem(`blitz-contest-${contestId}`);
      if (storedOwner) {
        try {
          const parsed = JSON.parse(storedOwner);
          if (parsed?.ownerName) {
            setDisplayName(String(parsed.ownerName));
          }
        } catch {}
      }
    }
  }, [contestId]);

  useEffect(() => {
    if (!contestId) return;
    async function fetchContest() {
      try {
        const res = await fetch(`/api/contest/${contestId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setContest(data.contest);
        }
      } catch (err) {
        console.error("Failed to load contest", err);
      }
    }
    fetchContest();
  }, [contestId]);

  const isOwner = useMemo(() => {
    if (!contest || !displayName) return false;
    return contest.ownerName?.trim().toLowerCase() === displayName.trim().toLowerCase();
  }, [contest, displayName]);

  const selfParticipant = useMemo(() => {
    if (!contest || !displayName) return null;
    return contest.participants?.find(
      (p: any) => p.displayName?.trim().toLowerCase() === displayName.trim().toLowerCase()
    ) || null;
  }, [contest, displayName]);

  const selfHandles = useMemo(() => {
    if (!contest) return [];
    if (isOwner) return contest.handles || [];
    if (selfParticipant) return selfParticipant.handles || [];
    return [];
  }, [contest, isOwner, selfParticipant]);

  const problemStatus = useMemo(() => {
    if (!contest || selfHandles.length === 0 || !problem) return null;
    
    const handleSet = new Set(selfHandles.map((h: any) => `${h.oj}:${h.handle.toLowerCase()}`));
    
    let solved = false;
    let incorrect = false;
    let attempts = 0;
    let lastVerdict = "";

    const sortedSubs = [...(contest.submissions || [])]
      .filter((sub: any) => sub.problemId === problem.problemId)
      .sort((a, b) => a.submittedAt - b.submittedAt);

    sortedSubs.forEach((sub: any) => {
      const key = `${sub.oj}:${sub.handle.toLowerCase()}`;
      if (!handleSet.has(key)) return;
      attempts += 1;
      lastVerdict = sub.verdict;
      if (sub.verdict === "OK") {
        solved = true;
        incorrect = false;
      } else if (!solved) {
        incorrect = true;
      }
    });

    return { solved, incorrect, attempts, lastVerdict };
  }, [contest, selfHandles, problem]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim() || !problem) return;
    if (!displayName) {
      setVerifyError("You must join the contest as a participant to verify submissions.");
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    const endpoint =
      problem.oj === "codeforces"
        ? `/api/contest/${contestId}/verify-codeforces`
        : `/api/contest/${contestId}/verify-atcoder`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionIdOrUrl: verifyInput.trim(),
          problemId: problem.problemId,
          displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Failed to verify submission.");
        return;
      }

      setVerifySuccess("Submission successfully verified and recorded!");
      setVerifyInput("");
      
      // Re-fetch contest to update verdict immediately
      const contestRes = await fetch(`/api/contest/${contestId}`, { cache: "no-store" });
      if (contestRes.ok) {
        const contestData = await contestRes.json();
        setContest(contestData.contest);
      }
    } catch (err) {
      setVerifyError("An unexpected error occurred while communicating with the server.");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!contestId || !problemId) return;

    let decodedId = problemId;
    try {
      while (decodedId && decodedId.includes("%")) {
        decodedId = decodeURIComponent(decodedId);
      }
    } catch (e) {
      console.warn("Failed to decode problemId:", e);
    }

    async function loadProblem() {
      try {
        setLoading(true);
        setError(null);
        const fetchUrl = `/api/contest/${contestId}/problem/${encodeURIComponent(decodedId)}${clear ? "?clear=true" : ""}`;
        const res = await fetch(fetchUrl, { cache: "no-store" });
        if (!res.ok) {
          try {
            const data = await res.json();
            setError(data.error || `Failed to load problem statement (Status ${res.status})`);
          } catch {
            setError(`Failed to load problem statement (Status ${res.status})`);
          }
          return;
        }
        const data = await res.json();
        setProblem(data);
      } catch (err) {
        setError("Error fetching problem data");
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [contestId, problemId, clear]);

  // Queue typesetting for MathJax whenever HTML is loaded/updated
  useEffect(() => {
    if (!problem?.html) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== "undefined" && (window as any).MathJax && (window as any).MathJax.Hub) {
        clearInterval(interval);
        const MathJax = (window as any).MathJax;
        try {
          MathJax.Hub.Config({
            tex2jax: {
              inlineMath: [['$', '$'], ['\\(', '\\)']],
              displayMath: [['$$', '$$'], ['\\[', '\\]']],
              processEscapes: true,
              processClass: "tex2jax_process",
              skipTags: ["script", "noscript", "style", "textarea"]
            }
          });
          // Typeset each .math-expr element individually to bypass skipTags inside pre/code blocks
          const mathElements = document.querySelectorAll("#problem-html .math-expr");
          if (mathElements.length > 0) {
            mathElements.forEach((el) => {
              MathJax.Hub.Queue(["Typeset", MathJax.Hub, el]);
            });
          } else {
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "problem-html"]);
          }
        } catch (e) {
          console.error("Error running MathJax queue:", e);
        }
      } else if (attempts > 50) {
        // Stop polling after 5 seconds
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [problem?.html]);

  // Append interactive Copy buttons to pre blocks
  useEffect(() => {
    if (!problem?.html) return;
    
    const timer = setTimeout(() => {
      const pres = document.querySelectorAll("#problem-html pre");
      pres.forEach((pre) => {
        if (pre.parentElement?.querySelector(".copy-btn")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "relative group w-full my-3";
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const btn = document.createElement("button");
        btn.innerText = "Copy";
        btn.className = "copy-btn absolute top-2 right-2 px-2.5 py-1 text-xs bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-md backdrop-blur-sm";
        btn.onclick = (e) => {
          e.preventDefault();
          navigator.clipboard.writeText((pre as HTMLElement).innerText);
          btn.innerText = "Copied!";
          btn.className = "copy-btn absolute top-2 right-2 px-2.5 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition-all duration-200 cursor-pointer shadow-md";
          setTimeout(() => {
            btn.innerText = "Copy";
            btn.className = "copy-btn absolute top-2 right-2 px-2.5 py-1 text-xs bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-md backdrop-blur-sm";
          }, 2000);
        };
        wrapper.appendChild(btn);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [problem?.html]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400">Loading problem statement...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="py-12 text-center space-y-4 max-w-md px-4">
          <p className="text-red-400 text-lg font-bold">⚠️ Error Loading Problem</p>
          <p className="text-neutral-400">{error || "The problem statement could not be scraped."}</p>
          <Link
            href={`/contest/${contestId}`}
            className="inline-block px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            Back to Contest
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 relative overflow-x-hidden">
      {/* Backdrop for mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Problem Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <Link
              href={`/contest/${contestId}`}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Contest
            </Link>
            <h1 className="text-3xl font-extrabold mt-1 flex flex-wrap items-center gap-3">
              <span>{problem.title}</span>
              {problemStatus?.lastVerdict && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  problemStatus.solved
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : problemStatus.incorrect
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}>
                  Verdict: {problemStatus.lastVerdict === "OK" ? "Accepted" : problemStatus.lastVerdict}
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Judge: <span className="uppercase text-emerald-400 font-semibold">{problem.oj}</span>
              {/* {problem.rating && ` · Rating: ${problem.rating}`}
              {problem.points && ` · Points: ${problem.points}`} */}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-neutral-900 border border-white/10 hover:border-white/30 text-neutral-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm text-center"
            >
              🌐 Open on {problem.oj === "atcoder" ? "AtCoder" : "Codeforces"}
            </a>
          </div>
        </div>

        {/* 2-Column layout: Left is problem statement, Right is sidebar control panel */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 items-start">
          {/* Main Column */}
          <div className="space-y-6 min-w-0">
            {/* Styled Problem HTML Wrapper */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-xl">
              <div
                id="problem-html"
                dangerouslySetInnerHTML={{
                  __html: problem.html
                    .replace(/<var\b[^>]*>([\s\S]*?)<\/var>/gi, (_, g1) => `\\(${g1}\\)`)
                    .replace(/\\\(([\s\S]*?)\\\)/g, (_, g1) => `<span class="math-expr">\\(${g1}\\)</span>`)
                    .replace(/\\\[([\s\S]*?)\\\]/g, (_, g1) => `<span class="math-expr">\\[${g1}\\]</span>`)
                    .replace(/<pre([^>]*)>/g, (_, attrs) => {
                      if (attrs.includes('class="')) {
                        return `<pre${attrs.replace('class="', 'class="tex2jax_process ')}>`;
                      } else if (attrs.includes("class='")) {
                        return `<pre${attrs.replace("class='", "class='tex2jax_process ")}>`;
                      } else {
                        return `<pre${attrs} class="tex2jax_process">`;
                      }
                    })
                    .replace(/<code([^>]*)>/g, (_, attrs) => {
                      if (attrs.includes('class="')) {
                        return `<code${attrs.replace('class="', 'class="tex2jax_process ')}>`;
                      } else if (attrs.includes("class='")) {
                        return `<code${attrs.replace("class='", "class='tex2jax_process ")}>`;
                      } else {
                        return `<code${attrs} class="tex2jax_process">`;
                      }
                    })
                }}
              />
            </section>
          </div>

          {/* Sidebar / Mobile Slider */}
          {displayName && (
            <aside className={`fixed inset-y-0 right-0 z-40 w-[320px] bg-neutral-900 border-l border-white/10 p-6 transform transition-transform duration-300 ease-in-out lg:static lg:w-auto lg:bg-transparent lg:border-l-0 lg:p-0 lg:transform-none flex flex-col gap-6 ${
              drawerOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            }`}>
              {/* Mobile Drawer Header */}
              <div className="flex justify-between items-center lg:hidden mb-2">
                <h2 className="text-lg font-bold text-white">Action Panel</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status card */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
                <h3 className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Problem Info</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Verdict</span>
                    <span className={problemStatus?.solved ? "text-emerald-400 font-bold" : "text-neutral-200"}>
                      {problemStatus?.lastVerdict ? (problemStatus.lastVerdict === "OK" ? "Accepted" : problemStatus.lastVerdict) : "Unattempted"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Attempts</span>
                    <span className="text-neutral-200 font-semibold">{problemStatus?.attempts ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Verify Submission Card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Verify Submission</h3>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Verify AtCoder/Codeforces submission ID or URL.
                  </p>
                </div>

                {contest?.status === "finished" ? (
                  <div className="text-center py-2.5 px-3 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl">
                    Contest has ended.
                  </div>
                ) : (
                  <form onSubmit={handleVerifySubmit} className="space-y-3">
                    <input
                      type="text"
                      value={verifyInput}
                      onChange={(e) => {
                        setVerifyInput(e.target.value);
                        setVerifyError(null);
                        setVerifySuccess(null);
                      }}
                      placeholder={
                        problem.oj === "codeforces"
                          ? "e.g. 123456789 or URL"
                          : "e.g. 50022786 or URL"
                      }
                      className="w-full px-3 py-2 bg-neutral-950 text-white border border-white/10 rounded-xl text-xs focus:border-emerald-400 focus:outline-none transition-colors"
                      disabled={verifying}
                    />
                    <button
                      type="submit"
                      disabled={verifying || !verifyInput.trim()}
                      className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-800 text-black font-bold py-2 rounded-xl transition-colors text-xs cursor-pointer"
                    >
                      {verifying ? "Verifying..." : "Verify ID"}
                    </button>
                  </form>
                )}

                {verifyError && (
                  <p className="text-xs text-red-400 font-semibold leading-relaxed">{verifyError}</p>
                )}
                {verifySuccess && (
                  <p className="text-xs text-emerald-400 font-semibold leading-relaxed">{verifySuccess}</p>
                )}
              </div>

              {/* Extra tools / links (e.g. submit code) */}
              {problem.oj === "atcoder" && (
                <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-2.5">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Quick Actions</h3>
                  {contest?.status === "finished" ? (
                    <button
                      disabled
                      className="w-full text-center bg-neutral-800 text-neutral-500 border border-white/5 font-bold py-2 rounded-xl text-xs cursor-not-allowed"
                    >
                      ⚡ Submit Code (Contest Ended)
                    </button>
                  ) : (
                    <Link
                      href={`/contest/${contestId}?tab=submit-code&problemId=${problem.problemId}`}
                      className="w-full inline-block text-center bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 hover:text-emerald-200 border border-emerald-400/20 font-bold py-2 rounded-xl transition-all text-xs cursor-pointer"
                    >
                      ⚡ Submit Code
                    </Link>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Custom CSS overrides to dark mode style AtCoder HTML */}
        <style dangerouslySetInnerHTML={{ __html: `
          #problem-html {
            color: #d4d4d8;
            font-size: 1.05rem;
            line-height: 1.7;
          }
          #problem-html h3, #problem-html h4 {
            font-size: 1.35rem;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            color: #34d399; /* emerald-400 */
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding-bottom: 0.5rem;
          }
          #problem-html pre {
            background-color: #171717; /* neutral-900 */
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 1.25rem;
            color: #f4f4f5;
            overflow-x: auto;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.95rem;
            line-height: 1.5;
          }
          #problem-html ul, #problem-html ol {
            margin-left: 1.5rem;
            margin-top: 0.75rem;
            margin-bottom: 0.75rem;
            list-style-type: disc;
          }
          #problem-html li {
            margin-bottom: 0.5rem;
          }
          #problem-html p {
            margin-bottom: 1rem;
          }
          #problem-html var {
            font-style: italic;
            font-family: serif;
            color: #fbbf24; /* amber-400 */
            padding: 0 2px;
          }
          #problem-html table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
          }
          #problem-html th, #problem-html td {
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0.75rem;
            text-align: left;
          }
          #problem-html th {
            background-color: rgba(255, 255, 255, 0.04);
            font-weight: 600;
          }
          #problem-html td {
            background-color: rgba(255, 255, 255, 0.01);
          }
        `}} />

        {/* MathJax configuration and library script */}
        <Script id="mathjax-config" strategy="afterInteractive">
          {`
            window.MathJax = {
              tex2jax: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processClass: "tex2jax_process",
                skipTags: ["script","noscript","style","textarea"]
              }
            };
          `}
        </Script>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML"
          strategy="afterInteractive"
          onLoad={() => {
            if (typeof window !== "undefined" && (window as any).MathJax && (window as any).MathJax.Hub) {
              try {
                (window as any).MathJax.Hub.Config({
                  tex2jax: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processClass: "tex2jax_process",
                    skipTags: ["script","noscript","style","textarea"]
                  }
                });
                (window as any).MathJax.Hub.Queue(["Typeset", (window as any).MathJax.Hub]);
              } catch (e) {
                console.error(e);
              }
            }
          }}
        />
      </div>

      {/* Floating action button for mobile */}
      {displayName && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 bg-emerald-400 hover:bg-emerald-300 text-black font-bold p-4 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          title="Open Action Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
