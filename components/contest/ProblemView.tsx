"use client";

import { useEffect, useState } from "react";

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

interface ProblemViewProps {
  contestId: string;
  problemId: string;
  onBack: () => void;
  onSubmitClick: (probId: string) => void;
}

export default function ProblemView({ contestId, problemId, onBack, onSubmitClick }: ProblemViewProps) {
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProblem() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/contest/${contestId}/problem/${problemId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load problem statement");
          return;
        }
        setProblem(data);
      } catch (err) {
        setError("Error fetching problem data");
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [contestId, problemId]);

  // Queue typesetting for MathJax whenever HTML is loaded/updated
  useEffect(() => {
    if (!problem?.html) return;

    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && (window as any).MathJax) {
        const MathJax = (window as any).MathJax;
        if (MathJax.Hub) {
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
        }
      }
    }, 100);

    return () => clearTimeout(timer);
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
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">Loading problem statement...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-400 text-lg font-bold">⚠️ Error Loading Problem</p>
        <p className="text-neutral-400">{error || "The problem statement could not be scraped."}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-2xl transition-colors cursor-pointer"
        >
          Back to Problem List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Problem Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Back to Problem List
          </button>
          <h2 className="text-2xl font-extrabold mt-1">{problem.title}</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Judge: <span className="uppercase text-emerald-400 font-semibold">{problem.oj}</span>
            {problem.rating && ` · Rating: ${problem.rating}`}
            {problem.points && ` · Points: ${problem.points}`}
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
          {problem.oj === "atcoder" && (
            <button
              onClick={() => onSubmitClick(problem.problemId)}
              className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
            >
              📝 Submit ID
            </button>
          )}
        </div>
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
  );
}
