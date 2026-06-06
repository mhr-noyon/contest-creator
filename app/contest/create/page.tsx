"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

const OJ_OPTIONS = [
  { label: "Codeforces", value: "codeforces" },
  { label: "AtCoder", value: "atcoder" }
];

type OjHandleGroup = {
  oj: string;
  handles: string[];
};

type DifficultyRange = {
  min: number | string;
  max: number | string;
};

export default function ContestCreatePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    router.push("/");
  };

  const [handleGroups, setHandleGroups] = useState<OjHandleGroup[]>([
    { oj: "codeforces", handles: [""] },
  ]);

  const [ownerName, setOwnerName] = useState("");
  const [title, setTitle] = useState("Custom Virtual Contest");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | string>(120);
  const [numberOfProblems, setNumberOfProblems] = useState<number | string>(5);
  const [mode, setMode] = useState<"standard" | "blitz">("standard");

  const [difficultyMode, setDifficultyMode] = useState<"global" | "per-problem">("global");
  const [globalDifficulty, setGlobalDifficulty] = useState<DifficultyRange>({ min: 800, max: 1600 });
  const [perProblemRanges, setPerProblemRanges] = useState<DifficultyRange[]>([
    { min: 800, max: 1000 },
    { min: 1100, max: 1300 },
    { min: 1400, max: 1600 },
  ]);
  const [perProblemScores, setPerProblemScores] = useState<number[]>([100, 150, 200]);

  const [rankingType, setRankingType] = useState("icpc");
  const [wrongPenalty, setWrongPenalty] = useState<number | string>(20);
  const [order, setOrder] = useState("random");
  const [showRatings, setShowRatings] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState("");

  const selectClass =
    "appearance-none bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400 transition-all duration-200 ease-out cursor-pointer";
  const buttonGhostClass =
    "text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer";
  const buttonPillClass =
    "text-sm font-semibold text-emerald-200 border border-emerald-400/30 px-3 py-1.5 rounded-full hover:border-emerald-300/60 transition-colors cursor-pointer";
  const chevronClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform duration-300 ease-in-out";

  const limitText = (value: string, maxChar: number) =>
    value.length > maxChar ? value.slice(0, maxChar) : value;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    const lines = value.split("\n");

    if (lines.length > 50 || value.length > 1000) return;

    setDescription(value);
    if (value.trim()) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.description;
        return next;
      });
    }
  };

  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  useEffect(() => {
    const count = typeof numberOfProblems === "string" ? parseInt(numberOfProblems || "0") : numberOfProblems;
    if (!count || count <= 0) return;

    setPerProblemRanges((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push({ min: 800, max: 1200 });
      }
      return next.slice(0, count);
    });
    setPerProblemScores((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push(100);
      }
      return next.slice(0, count);
    });
  }, [numberOfProblems]);

  useEffect(() => {
    if (!formError) return;
    const timeoutId = window.setTimeout(() => setFormError(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [formError]);

  function addHandleGroup() {
    const used = new Set(handleGroups.map((group) => group.oj));
    const available = OJ_OPTIONS.find((option) => !used.has(option.value));
    if (!available) {
      setFormError("All available judges are already added.");
      return;
    }
    setHandleGroups((prev) => [...prev, { oj: available.value, handles: [""] }]);
  }

  function removeHandleGroup(index: number) {
    setHandleGroups((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateGroupOj(index: number, oj: string) {
    const duplicateIndex = handleGroups.findIndex((group, idx) => group.oj === oj && idx !== index);
    if (duplicateIndex !== -1) {
      setFormError("Each online judge can only be selected once.");
      setFieldErrors((prev) => ({ ...prev, [`oj-${index}`]: "This judge is already selected." }));
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`oj-${index}`];
      return next;
    });
    setHandleGroups((prev) => prev.map((group, idx) => (idx === index ? { ...group, oj } : group)));
  }

  function updateGroupHandle(index: number, handleIndex: number, value: string) {
    const nextValue = limitText(value, 100);
    setHandleGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== index) return group;
        const handles = [...group.handles];
        handles[handleIndex] = nextValue;
        return { ...group, handles };
      })
    );
    if (nextValue.trim()) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`handle-${index}-${handleIndex}`];
        return next;
      });
    }
  }

  function addHandle(index: number) {
    setHandleGroups((prev) =>
      prev.map((group, idx) => (idx === index ? { ...group, handles: [...group.handles, ""] } : group))
    );
  }

  function removeHandle(index: number, handleIndex: number) {
    setHandleGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== index) return group;
        const handles = group.handles.filter((_, hidx) => hidx !== handleIndex);
        return { ...group, handles: handles.length ? handles : [""] };
      })
    );
  }

  function updateGlobalDifficulty(field: "min" | "max", value: string) {
    setGlobalDifficulty((prev) => ({
      ...prev,
      [field]: value === "" ? "" : parseInt(value),
    }));
    if (value !== "") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`global-${field}`];
        return next;
      });
    }
  }

  function updateProblemRange(index: number, field: "min" | "max", value: string) {
    setPerProblemRanges((prev) =>
      prev.map((range, idx) => (idx === index ? { ...range, [field]: value === "" ? "" : parseInt(value) } : range))
    );
    if (value !== "") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`range-${index}-${field}`];
        return next;
      });
    }
  }

  function updateProblemScore(index: number, value: string) {
    const parsed = value === "" ? 0 : parseInt(value);
    setPerProblemScores((prev) => prev.map((score, idx) => (idx === index ? parsed : score)));
    if (value !== "") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`score-${index}`];
        return next;
      });
    }
  }

  function scrollToField(key: string) {
    const target = document.querySelector(`[data-error-key="${key}"]`) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = target.querySelector("input, textarea, select") as HTMLElement | null;
      input?.focus();
    }
  }

  async function handleCreate() {
    setCreating(true);
    setFormError(null);

    try {
      const nextErrors: Record<string, string> = {};

      if (!ownerName.trim()) nextErrors.ownerName = "Owner name is required.";
      if (!title.trim()) nextErrors.title = "Contest title is required.";
      // if (!description.trim()) nextErrors.description = "Contest description is required.";
      if (!durationMinutes || Number(durationMinutes) <= 0) nextErrors.durationMinutes = "Duration is required.";
      if (!numberOfProblems || Number(numberOfProblems) <= 0) nextErrors.numberOfProblems = "Number of problems is required.";
      if (!mode) nextErrors.mode = "Contest mode is required.";
      if (!wrongPenalty || Number(wrongPenalty) <= 0) nextErrors.wrongPenalty = "Penalty is required.";
      if (requirePassword && !password.trim()) nextErrors.password = "Password is required.";

      const usedOj = new Set<string>();
      handleGroups.forEach((group, groupIndex) => {
        if (usedOj.has(group.oj)) {
          nextErrors[`oj-${groupIndex}`] = "This judge is already selected.";
        }
        usedOj.add(group.oj);
        if (!group.oj) nextErrors[`oj-${groupIndex}`] = "Judge is required.";
        group.handles.forEach((handle, handleIndex) => {
          if (!handle.trim()) {
            nextErrors[`handle-${groupIndex}-${handleIndex}`] = "Handle is required.";
          }
        });
      });

      if (difficultyMode === "global") {
        if (!globalDifficulty.min) nextErrors["global-min"] = "Min rating is required.";
        if (!globalDifficulty.max) nextErrors["global-max"] = "Max rating is required.";
      } else {
        perProblemRanges.forEach((range, index) => {
          if (!range.min) nextErrors[`range-${index}-min`] = "Min rating is required.";
          if (!range.max) nextErrors[`range-${index}-max`] = "Max rating is required.";
        });
      }

      if (rankingType === "score") {
        perProblemScores.forEach((score, index) => {
          if (!score || score <= 0) nextErrors[`score-${index}`] = "Score is required.";
        });
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setFormError("Please fill all required fields.");
        scrollToField(Object.keys(nextErrors)[0]);
        return;
      }
      setFieldErrors({});

      const payload = {
        ownerName,
        handles: handleGroups,
        settings: {
          title,
          description,
          durationMinutes,
          mode,
          numberOfProblems,
          difficulty: {
            mode: difficultyMode,
            global: globalDifficulty,
            perProblem: difficultyMode === "per-problem" ? perProblemRanges : null,
          },
          rules: {
            rankingType,
            wrongSubmissionPenaltyMinutes: Number(wrongPenalty || 20),
            frozenScoreboardMinutes: 0,
            firstSolveBonus: 0,
            attemptPenalty: 0,
            tieBreakers: [],
          },
          problemScores: rankingType === "score" ? perProblemScores : null,
          order,
          showRatings,
          requirePassword,
        },
        password: requirePassword ? password : null,
      };

      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create contest");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("blitz-last-contest", data.contestId);
        localStorage.setItem(
          `blitz-contest-${data.contestId}`,
          JSON.stringify({ createdAt: Date.now(), ownerName })
        );
        localStorage.setItem(`contest-join-${data.contestId}`, ownerName);
        localStorage.setItem(`contest-auth-${data.contestId}`, "true");
      }

      router.push(`/contest/${data.contestId}`);
    } catch (error: any) {
      setFormError(error.message || "Failed to create contest");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancelClick}
            className="text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Cancel creation
          </button>
        </div>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-emerald-200 text-sm uppercase tracking-widest">Virtual Contest Builder</p>
            <h1 className="text-4xl md:text-6xl font-extrabold mt-2">Create a custom contest</h1>
            <p className="text-neutral-400 mt-3 max-w-2xl">
              Mix problems across Codeforces, and AtCoder with smart filters. Track submissions live
              with Vercel-safe polling.
            </p>
          </div>
        </div>

        {formError && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-100 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-relaxed">{formError}</p>
              <button
                onClick={() => setFormError(null)}
                className="text-xs uppercase tracking-widest text-red-100/70 hover:text-red-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          <section className="lg:col-span-2 space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Contest Configuration</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-neutral-400" data-error-key="title">
                  Contest title
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(limitText(event.target.value, 100));
                      if (event.target.value.trim()) clearFieldError("title");
                    }}
                    maxLength={100}
                    placeholder="Contest title"
                    className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.title ? "border-red-500/70" : "border-white/10"}`}
                  />
                  {fieldErrors.title && <span className="mt-2 text-xs text-red-400">{fieldErrors.title}</span>}
                </label>
                <label className="text-sm text-neutral-400 md:col-span-2" data-error-key="description">
                  Contest description
                  <textarea
                    value={description}
                    onChange={handleChange}
                    placeholder="write here..."
                    className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white h-[100px] md:h-[300px] overflow-y-auto resize-none ${fieldErrors.description ? "border-red-500/70" : "border-white/10"}`}
                  />
                  {fieldErrors.description && (
                    <span className="mt-2 text-xs text-red-400">{fieldErrors.description}</span>
                  )}
                </label>
                <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                  <label className="text-sm text-neutral-400" data-error-key="durationMinutes">
                    Duration (minutes)
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(event) => {
                        setDurationMinutes(event.target.value === "" ? "" : parseInt(event.target.value));
                        if (event.target.value !== "") clearFieldError("durationMinutes");
                      }}
                      placeholder="Duration (minutes)"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.durationMinutes ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors.durationMinutes && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors.durationMinutes}</span>
                    )}
                  </label>
                  <label className="text-sm text-neutral-400" data-error-key="numberOfProblems">
                    Number of problems
                    <input
                      type="number"
                      value={numberOfProblems}
                      onChange={(event) => {
                        setNumberOfProblems(event.target.value === "" ? "" : parseInt(event.target.value));
                        if (event.target.value !== "") clearFieldError("numberOfProblems");
                      }}
                      placeholder="Number of problems"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.numberOfProblems ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors.numberOfProblems && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors.numberOfProblems}</span>
                    )}
                  </label>
                  <label className="text-sm text-neutral-400" data-error-key="mode">
                    Contest mode
                    <div className="relative mt-2">
                      <select
                        value={mode}
                        onChange={(event) => setMode(event.target.value as "standard" | "blitz")}
                        onFocus={() => setOpenDropdown("mode")}
                        onBlur={() => setOpenDropdown((prev) => (prev === "mode" ? null : prev))}
                        className={`w-full pr-10 ${selectClass} ${fieldErrors.mode ? "border-red-500/70" : "border-white/10"}`}
                      >
                        <option value="standard">Standard (all problems visible)</option>
                        <option value="blitz">Blitz (unlock one by one)</option>
                      </select>
                      <span className={`${chevronClass} ${openDropdown === "mode" ? "rotate-180" : "rotate-0"}`}>▼</span>
                    </div>
                    {fieldErrors.mode && <span className="mt-2 text-xs text-red-400">{fieldErrors.mode}</span>}
                  </label>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-xl font-semibold">Ranking Configuration</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-neutral-400" data-error-key="rankingType">
                    Ranking type
                    <div className="relative mt-2">
                      <select
                        value={rankingType}
                        onChange={(event) => setRankingType(event.target.value)}
                        onFocus={() => setOpenDropdown("rankingType")}
                        onBlur={() => setOpenDropdown((prev) => (prev === "rankingType" ? null : prev))}
                        className={`w-full pr-10 ${selectClass}`}
                      >
                        <option value="icpc">ICPC Style</option>
                        <option value="score">Score Based</option>
                      </select>
                      <span className={`${chevronClass} ${openDropdown === "rankingType" ? "rotate-180" : "rotate-0"}`}>▼</span>
                    </div>
                  </label>
                  <label className="text-sm text-neutral-400" data-error-key="wrongPenalty">
                    Wrong submission penalty (minutes)
                    <input
                      type="number"
                      value={wrongPenalty}
                      onChange={(event) => {
                        setWrongPenalty(event.target.value === "" ? "" : parseInt(event.target.value));
                        if (event.target.value !== "") clearFieldError("wrongPenalty");
                      }}
                      placeholder="20"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.wrongPenalty ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors.wrongPenalty && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors.wrongPenalty}</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="mt-6 lg:hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Problem Difficulty</h3>
                  <label className="text-sm text-neutral-400" data-error-key="difficultyMode">
                    Difficulty mode
                    <div className="relative mt-2">
                      <select
                        value={difficultyMode}
                        onChange={(event) => setDifficultyMode(event.target.value as "global" | "per-problem")}
                        onFocus={() => setOpenDropdown("difficultyMode")}
                        onBlur={() => setOpenDropdown((prev) => (prev === "difficultyMode" ? null : prev))}
                        className={`pr-10 ${selectClass}`}
                      >
                        <option value="global">Global range</option>
                        <option value="per-problem">Per-problem range</option>
                      </select>
                      <span className={`${chevronClass} ${openDropdown === "difficultyMode" ? "rotate-180" : "rotate-0"}`}>▼</span>
                    </div>
                  </label>
                </div>

                {difficultyMode === "global" ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm text-neutral-400" data-error-key="global-min">
                      Min rating
                      <input
                        type="number"
                        value={globalDifficulty.min}
                        onChange={(event) => updateGlobalDifficulty("min", event.target.value)}
                        placeholder="Min rating"
                        className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors["global-min"] ? "border-red-500/70" : "border-white/10"}`}
                      />
                      {fieldErrors["global-min"] && (
                        <span className="mt-2 text-xs text-red-400">{fieldErrors["global-min"]}</span>
                      )}
                    </label>
                    <label className="text-sm text-neutral-400" data-error-key="global-max">
                      Max rating
                      <input
                        type="number"
                        value={globalDifficulty.max}
                        onChange={(event) => updateGlobalDifficulty("max", event.target.value)}
                        placeholder="Max rating"
                        className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors["global-max"] ? "border-red-500/70" : "border-white/10"}`}
                      />
                      {fieldErrors["global-max"] && (
                        <span className="mt-2 text-xs text-red-400">{fieldErrors["global-max"]}</span>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {perProblemRanges.map((range, index) => (
                      <div key={`range-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4" data-error-key={`range-${index}-min`}>
                        <p className="text-sm text-neutral-400">Problem {String.fromCharCode(65 + index)}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <label className="text-xs text-neutral-500">
                            Min
                            <input
                              type="number"
                              value={range.min}
                              onChange={(event) => updateProblemRange(index, "min", event.target.value)}
                              placeholder="Min"
                              className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`range-${index}-min`] ? "border-red-500/70" : "border-white/10"}`}
                            />
                            {fieldErrors[`range-${index}-min`] && (
                              <span className="mt-2 text-xs text-red-400">{fieldErrors[`range-${index}-min`]}</span>
                            )}
                          </label>
                          <label className="text-xs text-neutral-500" data-error-key={`range-${index}-max`}>
                            Max
                            <input
                              type="number"
                              value={range.max}
                              onChange={(event) => updateProblemRange(index, "max", event.target.value)}
                              placeholder="Max"
                              className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`range-${index}-max`] ? "border-red-500/70" : "border-white/10"}`}
                            />
                            {fieldErrors[`range-${index}-max`] && (
                              <span className="mt-2 text-xs text-red-400">{fieldErrors[`range-${index}-max`]}</span>
                            )}
                          </label>
                          {rankingType === "score" && (
                            <label className="text-xs text-neutral-500" data-error-key={`score-${index}`}>
                              Score
                              <input
                                type="number"
                                value={perProblemScores[index] ?? 0}
                                onChange={(event) => updateProblemScore(index, event.target.value)}
                                placeholder="Score"
                                className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`score-${index}`] ? "border-red-500/70" : "border-white/10"}`}
                              />
                              {fieldErrors[`score-${index}`] && (
                                <span className="mt-2 text-xs text-red-400">{fieldErrors[`score-${index}`]}</span>
                              )}
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {difficultyMode === "global" && rankingType === "score" && (
                  <div className="mt-4 space-y-3">
                    {perProblemScores.map((score, index) => (
                      <div key={`score-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4" data-error-key={`score-${index}`}>
                        <p className="text-sm text-neutral-400">Problem {String.fromCharCode(65 + index)}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <label className="text-xs text-neutral-500">
                            Score
                            <input
                              type="number"
                              value={score}
                              onChange={(event) => updateProblemScore(index, event.target.value)}
                              placeholder="Score"
                              className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`score-${index}`] ? "border-red-500/70" : "border-white/10"}`}
                            />
                            {fieldErrors[`score-${index}`] && (
                              <span className="mt-2 text-xs text-red-400">{fieldErrors[`score-${index}`]}</span>
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Online Judges & Handles</h2>
                <button
                  onClick={addHandleGroup}
                  className={buttonPillClass}
                >
                  + Add Judge
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-neutral-400" data-error-key="ownerName">
                  Owner name
                  <input
                    value={ownerName}
                    onChange={(event) => {
                      setOwnerName(limitText(event.target.value, 100));
                      if (event.target.value.trim()) clearFieldError("ownerName");
                    }}
                    maxLength={100}
                    placeholder="Your display name"
                    className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.ownerName ? "border-red-500/70" : "border-white/10"}`}
                  />
                  {fieldErrors.ownerName && (
                    <span className="mt-2 text-xs text-red-400">{fieldErrors.ownerName}</span>
                  )}
                </label>
              </div>
              <div className="mt-6 space-y-6">
                {handleGroups.map((group, index) => (
                  <div key={`group-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4" data-error-key={`oj-${index}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="relative">
                        <select
                          value={group.oj}
                          onChange={(event) => updateGroupOj(index, event.target.value)}
                            onFocus={() => setOpenDropdown(`oj-${index}`)}
                            onBlur={() => setOpenDropdown((prev) => (prev === `oj-${index}` ? null : prev))}
                          className={`pr-10 ${selectClass} ${fieldErrors[`oj-${index}`] ? "border-red-500/70" : "border-white/10"}`}
                        >
                          {OJ_OPTIONS.map((option) => {
                            const isUsed = handleGroups.some(
                              (groupItem, groupIndex) => groupItem.oj === option.value && groupIndex !== index
                            );
                            return (
                              <option key={option.value} value={option.value} disabled={isUsed}>
                                {option.label}
                              </option>
                            );
                          })}
                        </select>
                        <span className={`${chevronClass} ${openDropdown === `oj-${index}` ? "rotate-180" : "rotate-0"}`}>▼</span>
                      </div>
                      <button
                        onClick={() => removeHandleGroup(index)}
                        className={buttonGhostClass}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {group.handles.map((handle, handleIndex) => (
                        <div key={`handle-${index}-${handleIndex}`} className="flex items-center gap-2" data-error-key={`handle-${index}-${handleIndex}`}>
                          <input
                            value={handle}
                            onChange={(event) => updateGroupHandle(index, handleIndex, event.target.value)}
                            maxLength={100}
                            placeholder="Handle"
                            className={`flex-1 bg-black/50 border rounded-xl px-3 py-2 text-sm text-white ${fieldErrors[`handle-${index}-${handleIndex}`] ? "border-red-500/70" : "border-white/10"}`}
                          />
                          <button
                            onClick={() => removeHandle(index, handleIndex)}
                            className={buttonGhostClass}
                          >
                            ✕
                          </button>
                          {fieldErrors[`handle-${index}-${handleIndex}`] && (
                            <span className="text-xs text-red-400">{fieldErrors[`handle-${index}-${handleIndex}`]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {fieldErrors[`oj-${index}`] && (
                      <span className="mt-3 block text-xs text-red-400">{fieldErrors[`oj-${index}`]}</span>
                    )}
                    <button
                      onClick={() => addHandle(index)}
                      className="mt-3 text-sm text-emerald-200 hover:text-emerald-100 transition-colors cursor-pointer"
                    >
                      + Add Handle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Ordering & Visibility</h2>
              <div className="mt-4 space-y-4">
                <div className="relative">
                  <select
                    value={order}
                    onChange={(event) => setOrder(event.target.value)}
                    onFocus={() => setOpenDropdown("order")}
                    onBlur={() => setOpenDropdown((prev) => (prev === "order" ? null : prev))}
                    className={`w-full pr-10 ${selectClass}`}
                  >
                    <option value="random">Random order</option>
                    <option value="difficulty">Sorted by difficulty</option>
                    <option value="oj">Sorted by Online Judge</option>
                    <option value="manual">Manual arrangement</option>
                  </select>
                  <span className={`${chevronClass} ${openDropdown === "order" ? "rotate-180" : "rotate-0"}`}>▼</span>
                </div>
                <label className="flex items-center gap-3 text-neutral-300">
                  <input
                    type="checkbox"
                    checked={showRatings}
                    onChange={(event) => setShowRatings(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  Show ratings to participants
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Contest Security</h2>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-3 text-neutral-300">
                  <input
                    type="checkbox"
                    checked={requirePassword}
                    onChange={(event) => setRequirePassword(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  Require password to join
                </label>
                {requirePassword && (
                  <label className="text-sm text-neutral-400" data-error-key="password">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(limitText(event.target.value, 100));
                        if (event.target.value.trim()) clearFieldError("password");
                      }}
                      maxLength={100}
                      placeholder="Contest password"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors.password ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors.password && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors.password}</span>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 hidden lg:block">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Problem Difficulty</h3>
                <label className="text-sm text-neutral-400" data-error-key="difficultyMode">
                  Difficulty mode
                  <div className="relative mt-2">
                    <select
                      value={difficultyMode}
                      onChange={(event) => setDifficultyMode(event.target.value as "global" | "per-problem")}
                      onFocus={() => setOpenDropdown("difficultyMode")}
                      onBlur={() => setOpenDropdown((prev) => (prev === "difficultyMode" ? null : prev))}
                      className={`pr-10 ${selectClass}`}
                    >
                      <option value="global">Global range</option>
                      <option value="per-problem">Per-problem range</option>
                    </select>
                    <span className={`${chevronClass} ${openDropdown === "difficultyMode" ? "rotate-180" : "rotate-0"}`}>▼</span>
                  </div>
                </label>
              </div>

              {difficultyMode === "global" ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm text-neutral-400" data-error-key="global-min">
                    Min rating
                    <input
                      type="number"
                      value={globalDifficulty.min}
                      onChange={(event) => updateGlobalDifficulty("min", event.target.value)}
                      placeholder="Min rating"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors["global-min"] ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors["global-min"] && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors["global-min"]}</span>
                    )}
                  </label>
                  <label className="text-sm text-neutral-400" data-error-key="global-max">
                    Max rating
                    <input
                      type="number"
                      value={globalDifficulty.max}
                      onChange={(event) => updateGlobalDifficulty("max", event.target.value)}
                      placeholder="Max rating"
                      className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-3 text-white ${fieldErrors["global-max"] ? "border-red-500/70" : "border-white/10"}`}
                    />
                    {fieldErrors["global-max"] && (
                      <span className="mt-2 text-xs text-red-400">{fieldErrors["global-max"]}</span>
                    )}
                  </label>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {perProblemRanges.map((range, index) => (
                    <div key={`range-lg-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4" data-error-key={`range-${index}-min`}>
                      <p className="text-sm text-neutral-400">Problem {String.fromCharCode(65 + index)}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="text-xs text-neutral-500">
                          Min
                          <input
                            type="number"
                            value={range.min}
                            onChange={(event) => updateProblemRange(index, "min", event.target.value)}
                            placeholder="Min"
                            className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`range-${index}-min`] ? "border-red-500/70" : "border-white/10"}`}
                          />
                          {fieldErrors[`range-${index}-min`] && (
                            <span className="mt-2 text-xs text-red-400">{fieldErrors[`range-${index}-min`]}</span>
                          )}
                        </label>
                        <label className="text-xs text-neutral-500" data-error-key={`range-${index}-max`}>
                          Max
                          <input
                            type="number"
                            value={range.max}
                            onChange={(event) => updateProblemRange(index, "max", event.target.value)}
                            placeholder="Max"
                            className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`range-${index}-max`] ? "border-red-500/70" : "border-white/10"}`}
                          />
                          {fieldErrors[`range-${index}-max`] && (
                            <span className="mt-2 text-xs text-red-400">{fieldErrors[`range-${index}-max`]}</span>
                          )}
                        </label>
                        {rankingType === "score" && (
                          <label className="text-xs text-neutral-500" data-error-key={`score-${index}`}>
                            Score
                            <input
                              type="number"
                              value={perProblemScores[index] ?? 0}
                              onChange={(event) => updateProblemScore(index, event.target.value)}
                              placeholder="Score"
                              className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`score-${index}`] ? "border-red-500/70" : "border-white/10"}`}
                            />
                            {fieldErrors[`score-${index}`] && (
                              <span className="mt-2 text-xs text-red-400">{fieldErrors[`score-${index}`]}</span>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {difficultyMode === "global" && rankingType === "score" && (
                <div className="mt-4 space-y-3">
                  {perProblemScores.map((score, index) => (
                    <div key={`score-lg-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4" data-error-key={`score-${index}`}>
                      <p className="text-sm text-neutral-400">Problem {String.fromCharCode(65 + index)}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="text-xs text-neutral-500">
                          Score
                          <input
                            type="number"
                            value={score}
                            onChange={(event) => updateProblemScore(index, event.target.value)}
                            placeholder="Score"
                            className={`mt-2 w-full bg-black/50 border rounded-xl px-4 py-2 text-white ${fieldErrors[`score-${index}`] ? "border-red-500/70" : "border-white/10"}`}
                          />
                          {fieldErrors[`score-${index}`] && (
                            <span className="mt-2 text-xs text-red-400">{fieldErrors[`score-${index}`]}</span>
                          )}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="mt-10 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-3 rounded-2xl bg-emerald-400 text-black font-bold shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-60 cursor-pointer"
          >
            {creating ? "Generating..." : "Generate Contest"}
          </button>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Cancel Contest Creation?</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Are you sure you want to cancel? Any unsaved configuration will be lost.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmCancel}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
