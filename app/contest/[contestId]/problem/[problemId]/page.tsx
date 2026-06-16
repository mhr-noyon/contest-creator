"use client";

import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Problem Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <Link
              href={`/contest/${contestId}`}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Contest
            </Link>
            <h1 className="text-3xl font-extrabold mt-1">{problem.title}</h1>
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
              <>
                <Link
                  href={`/contest/${contestId}?tab=submit&problemId=${problem.problemId}`}
                  className="px-3.5 py-1.5 bg-neutral-800 border border-white/10 hover:border-white/30 text-neutral-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm text-center whitespace-nowrap"
                >
                  📝 Verify ID
                </Link>
                <Link
                  href={`/contest/${contestId}?tab=submit-code&problemId=${problem.problemId}`}
                  className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md text-center whitespace-nowrap"
                >
                  ⚡ Submit Code
                </Link>
              </>
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
    </div>
  );
}
