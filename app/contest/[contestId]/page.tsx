"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Contest,
  ContestProblem,
  ContestSubmission,
  Scoreboard,
  ScoreboardEntry,
  ScoreboardProblemState,
  ContestParticipant,
  ContestSettings,
} from "@/lib/contest/types";

const VERDICT_MAP: Record<string, string> = {
  OK: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compilation Error",
  OTHER: "Other",
};

export default function ContestPage() {
  const params = useParams();
  const contestId = params?.contestId as string;
  const pathname = usePathname();

  const [contest, setContest] = useState<Contest | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const serverOffsetRef = useRef<number>(0);

  const refreshIntervalMs = useMemo(() => {
    const minutes = parseFloat(process.env.RefreshIntervalTime || "0.133");
    return Math.max(1000, minutes * 60 * 1000);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [lockedName, setLockedName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [ownerSnapshotName, setOwnerSnapshotName] = useState("");
  const [joinGroups, setJoinGroups] = useState<{ oj: string; handles: string[] }[]>([]);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [startingCountdown, setStartingCountdown] = useState(10);
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null);
  const [showContestStarted, setShowContestStarted] = useState(false);
  const [syncingSubmissions, setSyncingSubmissions] = useState(false);

  // Consolidated Tab State
  const [activeTab, setActiveTab] = useState<"problems" | "leaderboard" | "status" | "info">("problems");
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBackHomeClick = (e: React.MouseEvent) => {
    const isParticipant = isOwner || Boolean(selfParticipant);
    const isFinished = contest?.status === "finished";

    if (!isParticipant || isFinished) {
      window.location.href = "/contest";
      return;
    }

    e.preventDefault();
    setShowLeaveModal(true);
  };

  const handleLeaveContest = () => {
    window.location.href = "/contest";
  };

  const buttonPillClass =
    "px-4 py-2 rounded-xl bg-emerald-400 text-black font-semibold shadow-md hover:-translate-y-0.5 transition-transform cursor-pointer";
  const buttonGhostClass =
    "text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer";
  
  const navLinkClass = (tab: "problems" | "leaderboard" | "status" | "info") =>
    `px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 cursor-pointer ${
      activeTab === tab
        ? "border-emerald-400/60 text-emerald-200 bg-emerald-500/10 shadow-sm"
        : "border-white/10 text-neutral-300 hover:border-white/30 hover:bg-white/5"
    }`;

  // Sync tab with URL search parameter without reloading
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "problems" || tab === "leaderboard" || tab === "status" || tab === "info") {
        setActiveTab(tab as any);
      }
    }
  }, []);

  const handleTabChange = (tab: "problems" | "leaderboard" | "status" | "info") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  // Auto dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Trigger toast on backend errorMsg
  useEffect(() => {
    if (contest?.errorMsg) {
      setToast(contest.errorMsg);
    }
  }, [contest?.errorMsg]);

  // Load profile from localStorage on mount to pre-fill the join fields
  useEffect(() => {
    if (!contestId) return;
    const saved = localStorage.getItem("user-profile");
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        if (profile.expiresAt && profile.expiresAt > Date.now()) {
          const storedJoinName = localStorage.getItem(`contest-join-${contestId}`);
          if (!storedJoinName && profile.name) {
            setJoinName(profile.name);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    }
  }, [contestId]);

  // Tick starting countdown when contest status is "starting"
  // Starts at 10 seconds and auto-extends by 10 seconds (up to 90s max) if backend is still generating.
  useEffect(() => {
    if (contest?.status !== "starting" || !contest?.startRequestedAt) {
      setStartingCountdown(10);
      return;
    }
    const tick = () => {
      const adjustedNow = Date.now() - serverOffsetRef.current;
      const elapsed = Math.floor((adjustedNow - (contest.startRequestedAt || 0)) / 1000);
      let limit = 10;
      while (elapsed >= limit && limit < 90) {
        limit += 10;
      }
      const remaining = Math.max(0, limit - elapsed);
      setStartingCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [contest?.status, contest?.startRequestedAt]);

  // Manage the starting/waiting lobby countdown seen by the user
  useEffect(() => {
    if (!contest) return;

    if (contest.status === "waiting") {
      setLobbyCountdown(null);
      setShowContestStarted(false);
      return;
    }

    if (contest.status === "starting") {
      setLobbyCountdown(startingCountdown);
      setShowContestStarted(false);
      return;
    }

    if (contest.status === "running") {
      const adjustedNow = Date.now() - serverOffsetRef.current;
      const isPastStart = contest.settings.startTime && (adjustedNow >= contest.settings.startTime);

      if (isPastStart) {
        setShowContestStarted(true);
        setLobbyCountdown(null);
      } else {
        // Under startup countdown!
        setLobbyCountdown((prev) => {
          if (prev === null) {
            // Compute remaining seconds
            const remaining = Math.max(0, Math.ceil(((contest.settings.startTime || 0) - adjustedNow) / 1000));
            // Wait at least 5 seconds
            return remaining > 5 ? remaining : 5;
          }
          return prev;
        });
      }
    }

    if (contest.status === "finished") {
      setShowContestStarted(true);
      setLobbyCountdown(null);
    }
  }, [contest?.status, contest?.settings.startTime, startingCountdown]);

  // Tick down lobby countdown every second
  useEffect(() => {
    if (lobbyCountdown === null || lobbyCountdown <= 0) {
      if (lobbyCountdown === 0 && contest?.status === "running") {
        setShowContestStarted(true);
      }
      return;
    }
    const timer = setTimeout(() => {
      setLobbyCountdown((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lobbyCountdown, contest?.status]);

  // Trigger sync on loading leaderboard
  useEffect(() => {
    if (activeTab === "leaderboard" && contest?.status === "running") {
      triggerSync();
    }
  }, [activeTab, contest?.status]);

  // Owner auto-abort starting if countdown reaches 0
  useEffect(() => {
    if (contest?.status === "starting" && startingCountdown === 0 && isOwner) {
      fetch(`/api/contest/${contestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_starting" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.contest) setContest(data.contest);
        })
        .catch(console.error);
    }
  }, [contest?.status, startingCountdown, isOwner, contestId]);

  useEffect(() => {
    if (!contestId) return;

    const storedAuth = localStorage.getItem(`contest-auth-${contestId}`);
    if (storedAuth === "true") setAuthorized(true);

    const storedName = localStorage.getItem(`contest-join-${contestId}`);
    if (storedName) {
      setJoinName(storedName);
      setLockedName(storedName);
    }

    const storedOwner = localStorage.getItem(`blitz-contest-${contestId}`);
    if (storedOwner) {
      try {
        const parsed = JSON.parse(storedOwner);
        if (parsed?.ownerName) {
          setOwnerSnapshotName(String(parsed.ownerName));
        }
      } catch {
        setOwnerSnapshotName("");
      }
    }
  }, [contestId]);

  useEffect(() => {
    if (!contest?.settings.startTime) return;
    const tick = () => {
      const adjustedNow = Date.now() - serverOffsetRef.current;
      const remaining = Math.max(0, Math.ceil(((contest.settings.startTime || 0) - adjustedNow) / 1000));
      setStartCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [contest?.settings.startTime]);

  useEffect(() => {
    if (!contestId) return;

    let active = true;
    const storedJoinName = typeof window !== "undefined" ? localStorage.getItem(`contest-join-${contestId}`) : null;
    const ownerSnapshotName = typeof window !== "undefined" ? localStorage.getItem(`blitz-contest-${contestId}`) ? JSON.parse(localStorage.getItem(`blitz-contest-${contestId}`)!).ownerName : null : null;

    async function fetchContest() {
      try {
        const res = await fetch(`/api/contest/${contestId}`, { cache: "no-store" });
        const dateHeader = res.headers.get("Date");
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          serverOffsetRef.current = Date.now() - serverTime;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Contest not found");
          return;
        }
        setContest(data.contest);
        if (data.contest?.ownerName && ownerSnapshotName) {
          const ownerMatch = data.contest.ownerName.toLowerCase() === ownerSnapshotName.toLowerCase();
          setIsOwner(ownerMatch);
          if (ownerMatch && !joinName) {
            setJoinName(data.contest.ownerName);
          }
        }
        if (data.contest?.handles?.length) {
          setJoinGroups((prev) => {
            if (prev.length > 0) return prev;
            const ojs = Array.from(new Set(data.contest.handles.map((handle: any) => String(handle.oj || "")))) as string[];
            
            // Check if there is already a saved display name for this contest, or if we have a profile display name
            const currentJoinName = (localStorage.getItem(`contest-join-${contestId}`) || "").trim();
            const savedProfile = localStorage.getItem("user-profile");
            let profileName = "";
            let profileCf = "";
            let profileAtcoder = "";
            if (savedProfile) {
              try {
                const parsed = JSON.parse(savedProfile);
                if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
                  profileName = parsed.name || "";
                  profileCf = parsed.cfHandle || "";
                  profileAtcoder = parsed.atcoderHandle || "";
                }
              } catch {}
            }

            const activeName = currentJoinName || profileName || joinName;

            const self = data.contest.participants?.find(
              (participant: any) =>
                participant.displayName?.toLowerCase() === activeName.trim().toLowerCase()
            );
            if (self) {
              return ojs.map((oj) => ({
                oj,
                handles: self.handles
                  .filter((handle: any) => handle.oj === oj)
                  .map((handle: any) => String(handle.handle || "")),
              }));
            }

            // Otherwise pre-fill with profile handles where matches OJ
            return ojs.map((oj) => {
              if (oj === "codeforces" && profileCf) {
                return { oj, handles: [profileCf] };
              }
              if (oj === "atcoder" && profileAtcoder) {
                return { oj, handles: [profileAtcoder] };
              }
              return { oj, handles: [""] };
            });
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load contest");
      }
    }

    fetchContest();
    const interval = setInterval(fetchContest, contest?.status === "starting" ? 1000 : refreshIntervalMs);
    return () => clearInterval(interval);
  }, [contestId, ownerSnapshotName, joinName, contest?.status]);

  // Auto authorize if contest does not require password
  useEffect(() => {
    if (contest && !contest.settings.requirePassword) {
      setAuthorized(true);
    }
  }, [contest]);

  useEffect(() => {
    if (!contestId || contest?.status !== "running") return;

    const sync = async () => {
      await fetch(`/api/contest/${contestId}/sync`, { method: "POST" });
    };

    sync();
    const interval = setInterval(sync, 15000);
    return () => clearInterval(interval);
  }, [contestId, contest?.status]);

  // Scoreboard Polling Effect
  useEffect(() => {
    if (!contestId || !authorized || (contest?.status !== "running" && contest?.status !== "finished")) return;

    async function fetchScoreboard() {
      try {
        const res = await fetch(`/api/contest/${contestId}/scoreboard`, { cache: "no-store" });
        const dateHeader = res.headers.get("Date");
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          serverOffsetRef.current = Date.now() - serverTime;
        }
        const data = await res.json();
        if (res.ok) setScoreboard(data.scoreboard);
      } catch (err) {
        console.error("Failed to fetch scoreboard:", err);
      }
    }

    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [contestId, authorized, contest?.status]);

  // Scoreboard elapsed updates ticker
  useEffect(() => {
    if (!scoreboard?.updatedAt) return;
    const tick = () => {
      const adjustedNow = Date.now() - serverOffsetRef.current;
      const elapsed = Math.floor((adjustedNow - scoreboard.updatedAt) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [scoreboard?.updatedAt]);

  // Sync timeLeft when contest details are fetched/loaded
  useEffect(() => {
    if (!contest?.settings.startTime) {
      setTimeLeft((contest?.settings.durationMinutes || 0) * 60);
      return;
    }
    const adjustedNow = Date.now() - serverOffsetRef.current;
    const elapsed = Math.floor((adjustedNow - contest.settings.startTime) / 1000);
    const total = (contest.settings.durationMinutes || 0) * 60;
    const remaining = Math.max(0, total - elapsed);
    setTimeLeft(remaining);
  }, [contest?.settings.startTime, contest?.settings.durationMinutes]);

  // Tick time remaining automatically every second
  useEffect(() => {
    if (contest?.status !== "running") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [contest?.status]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [timeLeft]);

  const selfParticipant = useMemo(() => {
    if (!contest) return null;
    const name = (lockedName || joinName).trim();
    if (!name) return null;
    return (
      contest.participants.find(
        (participant) => participant.displayName.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }, [contest, joinName, lockedName]);

  const selfHandles = useMemo(() => {
    if (!contest) return [] as { oj: string; handle: string }[];
    if (isOwner) return contest.handles;
    if (selfParticipant) return selfParticipant.handles;
    return [] as { oj: string; handle: string }[];
  }, [contest, isOwner, selfParticipant]);

  const problemStatus = useMemo(() => {
    if (!contest || selfHandles.length === 0) return new Map<string, { solved: boolean; incorrect: boolean; attempts: number }>();
    const handleSet = new Set(selfHandles.map((handle) => `${handle.oj}:${handle.handle.toLowerCase()}`));
    const map = new Map<string, { solved: boolean; incorrect: boolean; attempts: number }>();
    contest.submissions.forEach((submission) => {
      const key = `${submission.oj}:${submission.handle.toLowerCase()}`;
      if (!handleSet.has(key)) return;
      const entry = map.get(submission.problemId) || { solved: false, incorrect: false, attempts: 0 };
      entry.attempts += 1;
      if (submission.verdict === "OK") {
        entry.solved = true;
        entry.incorrect = false;
      } else if (!entry.solved) {
        entry.incorrect = true;
      }
      map.set(submission.problemId, entry);
    });
    return map;
  }, [contest, selfHandles]);

  // Self submissions filtering memo
  const selfSubmissions = useMemo(() => {
    if (!contest || !selfParticipant) return [];
    const handleSet = new Set(selfParticipant.handles.map((h) => `${h.oj}:${h.handle.toLowerCase()}`));
    return (contest.submissions || [])
      .filter((sub) => handleSet.has(`${sub.oj}:${sub.handle.toLowerCase()}`))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }, [contest, selfParticipant]);

  async function handlePassword() {
    if (!contestId) return;
    const res = await fetch(`/api/contest/${contestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", password: passwordInput }),
    });

    if (res.ok) {
      setAuthorized(true);
      localStorage.setItem(`contest-auth-${contestId}`, "true");
    } else {
      alert("Invalid password");
    }
  }

  function updateJoinHandle(groupIndex: number, handleIndex: number, value: string) {
    setJoinGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== groupIndex) return group;
        return {
          ...group,
          handles: group.handles.map((handle, hIdx) => (hIdx === handleIndex ? value : handle)),
        };
      })
    );
  }

  function addJoinHandle(groupIndex: number) {
    setJoinGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== groupIndex) return group;
        return { ...group, handles: [...group.handles, ""] };
      })
    );
  }

  function removeJoinHandle(groupIndex: number, handleIndex: number) {
    setJoinGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== groupIndex) return group;
        if (group.handles.length <= 1) return group;
        return { ...group, handles: group.handles.filter((_, hIdx) => hIdx !== handleIndex) };
      })
    );
  }

  async function handleJoinSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!contestId) return;

    const displayName = joinName.trim();
    if (!displayName) {
      alert("Display name is required.");
      return;
    }

    const handles = joinGroups.flatMap((group) =>
      group.handles
        .map((h) => h.trim())
        .filter(Boolean)
        .map((handle) => ({ oj: group.oj as any, handle }))
    );

    const requiredOjs = Array.from(new Set(contest?.handles.map((h) => h.oj)));
    const missing = requiredOjs.filter((oj) => !handles.some((h) => h.oj === oj));

    if (missing.length > 0) {
      alert("Please provide at least one handle for each judge required by this contest.");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/contest/${contestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", displayName, handles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to join contest");

      if (typeof window !== "undefined") {
        localStorage.setItem(`contest-join-${contestId}`, displayName);
      }
      if (!isOwner) setLockedName(displayName);
      setContest(data.contest);
    } catch (err: any) {
      alert(err.message || "Failed to join contest");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    if (!contestId) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/contest/${contestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start contest");
      setContest(data.contest);
    } catch (err: any) {
      alert(err.message || "Failed to start contest");
    } finally {
      setStarting(false);
    }
  }

  async function triggerSync() {
    if (syncingSubmissions || !contestId || contest?.status !== "running") return;
    setSyncingSubmissions(true);
    try {
      const res = await fetch(`/api/contest/${contestId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.contest) {
          setContest(data.contest);
        }
      }
    } catch (err) {
      console.error("Failed to sync submissions:", err);
    } finally {
      setSyncingSubmissions(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (contest.settings.requirePassword && !authorized) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold">Contest locked</h1>
          <p className="text-neutral-400 mt-2">Enter the contest password to continue.</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            className="mt-6 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Password"
          />
          <button
            onClick={handlePassword}
            className="mt-4 w-full bg-emerald-400 text-black font-bold py-3 rounded-xl cursor-pointer"
          >
            Unlock contest
          </button>
        </div>
      </div>
    );
  }

  if (contest.status === "waiting" || contest.status === "starting" || !showContestStarted) {
    const hasJoined = isOwner || Boolean(selfParticipant);
    const showJoinForm = !isOwner && !selfParticipant;

    return (
      <main className="min-h-screen bg-neutral-950 text-white px-6 py-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <button onClick={handleBackHomeClick} className="text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">← Back home</button>
              <h1 className="text-4xl font-extrabold mt-3">{contest.settings.title}</h1>
              <p className="text-neutral-400 mt-2">Host: {contest.ownerName || "Host"}</p>
            </div>
          </header>

          {contest.status === "starting" && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4 animate-pulse">
              <h2 className="text-2xl font-bold text-emerald-200">Generating problems...</h2>
              
              <div className="text-sm text-neutral-300 flex items-center justify-center gap-2">
                <span>Problems Generated:</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {contest.problemsGeneratedCount ?? 0}
                </span>
                <span className="text-neutral-500">/</span>
                <span className="font-mono text-neutral-400">
                  {contest.settings.numberOfProblems}
                </span>
              </div>

              <p className="text-sm text-neutral-300">
                Checking pool & verifying participant submissions... Retrying in <span className="font-mono text-lg font-bold text-white">{startingCountdown}s</span>.
              </p>
              
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-[250ms] ease-linear" 
                  style={{ width: `${(startingCountdown / 10) * 100}%` }}
                />
              </div>
            </div>
          )}

          {contest.status === "running" && !showContestStarted && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4">
              <h2 className="text-2xl font-bold text-emerald-200">Problems generated!</h2>
              <p className="text-sm text-neutral-300">
                The contest starts in <span className="font-mono text-lg font-bold text-white">{lobbyCountdown}s</span>. Get ready!
              </p>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-[250ms] ease-linear" 
                  style={{ width: `${(Math.min(5, lobbyCountdown || 5) / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className={`grid gap-6 ${showJoinForm ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
            {showJoinForm && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-bold">Join the contest</h2>
                <p className="text-sm text-neutral-400 mt-2">
                  Enter your display name and your handles for each judge to be ranked.
                </p>
                <div className="mt-6 grid gap-4">
                  <input
                    value={joinName}
                    onChange={(event) => setJoinName(event.target.value)}
                    placeholder="Your display name"
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />

                  {joinGroups.map((group, groupIndex) => (
                    <div key={`join-${group.oj}`} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm uppercase tracking-widest text-neutral-400">{group.oj}</h3>
                        <button
                          onClick={() => addJoinHandle(groupIndex)}
                          className="text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          + Add handle
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {group.handles.map((handle, handleIndex) => (
                          <div key={`${group.oj}-${handleIndex}`} className="flex items-center gap-2">
                            <input
                              value={handle}
                              onChange={(event) => updateJoinHandle(groupIndex, handleIndex, event.target.value)}
                              placeholder={`${group.oj} handle`}
                              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                            />
                            {group.handles.length > 1 && (
                              <button
                                onClick={() => removeJoinHandle(groupIndex, handleIndex)}
                                className="text-xs text-red-400 hover:text-red-300 px-2"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleJoinSubmit}
                    disabled={joining}
                    className="mt-2 bg-emerald-400 text-black font-bold py-3 rounded-xl cursor-pointer hover:bg-emerald-300 transition-colors disabled:opacity-50"
                  >
                    {joining ? "Joining..." : "Join Contest"}
                  </button>
                </div>
              </section>
            )}

            <div className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-bold">Lobby</h2>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-neutral-400">
                    {contest.participants.length} {contest.participants.length === 1 ? "participant" : "participants"} joined
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {/* Host Section */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {contest.ownerName}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Host handles: {contest.handles.map((h) => `${h.oj}: ${h.handle}`).join(", ")}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                      Host
                    </span>
                  </div>

                  {/* Other Participants */}
                  {contest.participants
                    .filter((participant) => participant.displayName.toLowerCase() !== contest.ownerName.toLowerCase())
                    .map((participant) => (
                      <div key={participant.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                        <p className="text-sm font-semibold text-white">
                          {participant.displayName}
                          {selfParticipant?.id === participant.id ? " (you)" : ""}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {participant.handles.map((h) => `${h.oj}: ${h.handle}`).join(", ")}
                        </p>
                      </div>
                    ))}
                </div>
              </section>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold">Ready to compete?</h3>
                <p className="text-sm text-neutral-400 mt-2 max-w-sm">
                  {isOwner 
                    ? "As the host, you can initiate the contest start phase once all participants have joined."
                    : "The contest will start as soon as the host initiates the start sequence."}
                </p>
                <div className="mt-6">
                  {isOwner ? (
                    <button
                      onClick={handleStart}
                      disabled={starting || contest.status === "starting"}
                      className="px-6 py-3 rounded-xl bg-emerald-400 text-black font-bold shadow-md hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {starting ? "Starting..." : contest.status === "starting" ? "Generating..." : "Start contest now"}
                    </button>
                  ) : (
                    <p className="text-sm text-neutral-400">Waiting for the owner to start the contest.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-red-500/30 bg-red-950 px-5 py-4 text-red-100 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-relaxed">{toast}</p>
              <button
                onClick={() => setToast(null)}
                className="text-xs uppercase tracking-widest text-red-200/70 hover:text-red-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 max-w-md w-full space-y-6 shadow-2xl">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Leave Contest?</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Are you sure you want to leave the page? You can copy the contest link before leaving.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-xl border border-white/10 transition-colors text-sm cursor-pointer"
                >
                  {copiedLink ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={handleLeaveContest}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
                >
                  Leave
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
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

  const activeProblemId = contest.problems[contest.currentProblemIndex]?.id;
  const visibleProblems = contest.settings.mode === "blitz"
    ? contest.problems.filter((problem) => problem.visible)
    : contest.problems;

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <button onClick={handleBackHomeClick} className="text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">← Back</button>
            <h1 className="text-2xl font-extrabold mt-3">{contest.settings.title}</h1>
            {(!isOwner && !selfParticipant) && (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 mt-3 px-5 py-3 text-blue-200 text-sm font-semibold flex items-center gap-2">
                <span>📢</span>
                <span>You have joined as a visitor.</span>
              </div>
            )}
            <nav className="mt-4 flex flex-wrap gap-2">
              <button 
                onClick={() => handleTabChange("problems")} 
                className={navLinkClass("problems")}
              >
                Problems
              </button>
              <button 
                onClick={() => handleTabChange("leaderboard")} 
                className={navLinkClass("leaderboard")}
              >
                Leaderboard
              </button>
              <button 
                onClick={() => handleTabChange("status")} 
                className={navLinkClass("status")}
              >
                Status
              </button>
              <button 
                onClick={() => handleTabChange("info")} 
                className={navLinkClass("info")}
              >
                Info
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-xs uppercase tracking-widest text-neutral-500">Status</p>
              <p className="text-lg font-bold text-emerald-200">{contest.status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-xs uppercase tracking-widest text-neutral-500">Time remaining</p>
              <p className="text-lg font-bold text-white font-mono">{formattedTime}</p>
            </div>
          </div>
        </header>

        {startCountdown > 0 && !showContestStarted && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-emerald-100 font-semibold">
            Contest starts in {startCountdown}s. Get ready!
          </div>
        )}

        {/* Tab content rendering */}
        {activeTab === "problems" && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Problem list</h2>
              <p className="text-sm text-neutral-400">
                Mode: {contest.settings.mode === "blitz" ? "Blitz progression" : "Standard"}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {visibleProblems.length === 0 ? (
                <p className="text-sm text-neutral-400">Problems unlock once the contest starts.</p>
              ) : (
                visibleProblems.map((problem) => {
                  const index = contest.problems.findIndex((item) => item.id === problem.id);
                  const status = problemStatus.get(problem.id);
                  const solved = Boolean(status?.solved);
                  const incorrect = Boolean(status?.incorrect);
                  const dim = contest.settings.mode === "blitz" && problem.id !== activeProblemId;
                  const stateClass = solved
                    ? "border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-400/60 hover:bg-emerald-500/20"
                    : incorrect
                      ? "border-red-500/40 bg-red-500/10 hover:border-red-500/60 hover:bg-red-500/20"
                      : "border-white/10 bg-black/60 hover:border-white/30 hover:bg-white/5";
                  return (
                    <a
                      key={problem.id}
                      href={dim ? undefined : problem.url}
                      target={dim ? undefined : "_blank"}
                      rel="noreferrer"
                      className={`block w-full rounded-2xl border p-4 transition-all duration-200 ${stateClass} ${
                        dim 
                          ? "opacity-30 cursor-not-allowed pointer-events-none" 
                          : "opacity-100 hover:scale-[1.01] active:scale-[0.99] hover:shadow-lg"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {/* <p className="text-xs uppercase tracking-widest text-neutral-500">
                            Problem
                          </p> */}
                          <h3 className="text-lg font-bold mt-1"> {String.fromCharCode(65 + Math.max(0, index))}. {problem.title}</h3>
                          <p className="text-sm text-neutral-400 mt-1">
                            {contest.settings.showRatings && problem.rating ? `Rating ${problem.rating} ${<span className="px-2">·</span>}` : ""}
                            
                            {problem.oj}
                          </p>
                          {contest.settings.showRatings && problem.tags.length > 0 && (
                            <p className="text-xs text-neutral-500 mt-2">
                              {problem.tags.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {problem.points > 0 && <p className="text-sm font-semibold text-emerald-200">{problem.points} pts</p>}
                          {solved && <p className="text-xs text-emerald-200 mt-2">Solved</p>}
                          {!solved && incorrect && <p className="text-xs text-red-300 mt-2">Attempted</p>}
                          {contest.settings.mode === "blitz" && problem.id === activeProblemId && (
                            <p className="text-xs text-emerald-200 mt-2">Active</p>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </section>
        )}

        {activeTab === "leaderboard" && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Leaderboard</h2>
                {syncingSubmissions && (
                  <span className="text-xs text-emerald-400 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Syncing...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={triggerSync}
                  disabled={syncingSubmissions || contest?.status !== "running"}
                  className="bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {syncingSubmissions ? "⟳ Syncing..." : "↻ Refresh"}
                </button>
                <p className="text-sm text-neutral-400">
                  {scoreboard ? `Updated ${elapsedSeconds}s ago` : "Live updates every few seconds"}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              {scoreboard ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[800px] w-full text-left text-sm border-collapse">
                    <thead className="text-neutral-400 uppercase tracking-widest text-xs">
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4 text-center">Solved</th>
                        {contest.settings.rules.rankingType === "score" ? (
                          <th className="py-3 px-4 text-center">Score</th>
                        ) : (
                          <th className="py-3 px-4 text-center">Penalty</th>
                        )}
                        {contest.problems.map((problem, index) => (
                          <th 
                            key={problem.id} 
                            className="py-3 px-4 text-center border-l border-white/5 bg-white/5 whitespace-nowrap min-w-[100px] cursor-pointer"
                            onClick={() => {
                              if (problem?.url) {
                                window.open(problem.url, "_blank");
                              }
                            }}
                          >
                            <span className="text-emerald-300 font-bold block text-sm">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span 
                              className="text-[10px] text-neutral-400 font-normal block truncate max-w-[110px] mx-auto mt-0.5" 
                              title={problem.title}
                            >
                              {problem.title}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboard.entries.map((entry, index) => {
                        const isSelf = (lockedName || joinName || (isOwner ? contest.ownerName : "")).trim().toLowerCase() === entry.displayName.toLowerCase();
                        return (
                          <tr 
                            key={entry.participantId} 
                            className={`border-t border-white/10 hover:bg-white/5 transition-colors ${
                              isSelf 
                                ? "bg-[oklch(22%_0.005_106.5)] border-l-2 border-l-emerald-400 font-bold" 
                                : ""
                            }`}
                          >
                            <td className="py-4 px-4 font-mono text-neutral-300">{index + 1}</td>
                            <td className="py-4 px-4 font-semibold text-white whitespace-nowrap">{entry.displayName} {isSelf ? "(You)" : ""}</td>
                            <td className="py-4 px-4 text-center text-neutral-300 font-semibold">{entry.solvedCount}</td>
                            {contest.settings.rules.rankingType === "score" ? (
                              <td className="py-4 px-4 text-center text-emerald-200 font-semibold">{entry.totalScore}</td>
                            ) : (
                              <td className="py-4 px-4 text-center text-neutral-300 font-mono">{entry.penaltyMinutes}</td>
                            )}
                            {contest.problems.map((problem) => {
                              const state = entry.problems[problem.id];
                              const attempts = state?.attempts ?? 0;
                              const solved = Boolean(state?.solved);
                              const solveMinutes = state?.solveTimeSeconds ? Math.floor(state.solveTimeSeconds / 60) : null;
                              
                              const cellBg = solved 
                                ? "bg-emerald-500/10" 
                                : attempts > 0 
                                  ? "bg-red-500/10" 
                                  : "bg-white/5";

                              return (
                                <td 
                                  key={`${entry.participantId}-${problem.id}`} 
                                  className={`py-4 px-4 text-center text-xs border-l border-white/5 ${cellBg} min-w-[100px]`}
                                >
                                  {contest.settings.rules.rankingType === "score" ? (
                                    <div className="space-y-1">
                                      <p className={solved ? "text-emerald-300 font-bold" : "text-neutral-400"}>
                                        {solved ? problem.points : 0}
                                      </p>
                                      <p className="text-[10px] text-neutral-500">{attempts} att</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <p className={solved ? "text-emerald-300 font-bold" : attempts ? "text-red-400" : "text-neutral-500"}>
                                        {solved ? `+${attempts}` : attempts ? `-${attempts}` : ""}
                                      </p>
                                      {solved && solveMinutes !== null && (
                                        <p className="text-[10px] text-neutral-500">{solveMinutes}m</p>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {scoreboard.frozen && (
                    <p className="text-xs text-amber-200 mt-3">Scoreboard is currently frozen.</p>
                  )}
                </div>
              ) : (
                <p className="text-neutral-400">Loading scoreboard...</p>
              )}
            </div>
          </section>
        )}

        {activeTab === "status" && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">My submissions</h2>
              <p className="text-sm text-neutral-400">
                Showing submissions for {selfParticipant?.displayName || "you"}
              </p>
            </div>
            
            <div className="mt-6 space-y-4">
              {selfSubmissions.length === 0 ? (
                <p className="text-neutral-400 text-sm">No submissions tracked yet.</p>
              ) : (
                selfSubmissions.map((submission) => {
                  const problem = contest.problems.find((p) => p.id === submission.problemId);
                  const submittedAt = submission.submittedAt;
                  
                  const verdictClass =
                    submission.verdict === "OK"
                      ? "text-emerald-200"
                      : submission.verdict === "WA"
                        ? "text-red-300"
                        : "text-amber-200";

                  return (
                    <div key={submission.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {/* Show online judge also and make the problem title clickable */}
                          <p className="text-base font-semibold text-white">{String.fromCharCode((problem?.order ?? 0) + 65)}. <a href={problem?.url} target="_blank" rel="noopener noreferrer">{problem?.title || "Unknown problem"}</a></p>
                          {problem?.url && (
                            <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 mt-1">
                              View on {problem?.oj}
                            </a>
                          )}
                          {contest.settings.showRatings && problem?.tags?.length ? (
                            <p className="text-xs text-neutral-500 mt-1">
                              {problem.tags.join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${verdictClass}`}>
                            {VERDICT_MAP[submission.verdict] || submission.verdict}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {new Date(submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {activeTab === "info" && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold">About this contest</h2>
                <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                  {contest.settings.description || "No description provided."}
                </p>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <h3 className="text-lg font-bold">Rules & Settings</h3>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Mode</p>
                    <p className="text-base font-bold mt-1 text-white capitalize">{contest.settings.mode}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Ranking Type</p>
                    <p className="text-base font-bold mt-1 text-white uppercase">{contest.settings.rules.rankingType}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Duration</p>
                    <p className="text-base font-bold mt-1 text-white">{contest.settings.durationMinutes} minutes</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Problems Count</p>
                    <p className="text-base font-bold mt-1 text-white">{contest.problems.length} problems</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Wrong Submission Penalty</p>
                    <p className="text-base font-bold mt-1 text-white">{contest.settings.rules.wrongSubmissionPenaltyMinutes} mins</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">First Solve Bonus</p>
                    <p className="text-base font-bold mt-1 text-white">+{contest.settings.rules.firstSolveBonus} pts</p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-xl font-bold">Joined participants</h2>
              <div className="space-y-3">
                {/* Host */}
                {(() => {
                  const isHostYou =
                    selfParticipant?.displayName?.toLowerCase() === contest.ownerName?.toLowerCase();

                  return (
                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                      <p className="text-sm font-semibold text-white">
                        {contest.ownerName}
                        {isHostYou && (
                          " (you)"
                        )}
                        <span className="ml-2 text-xs text-emerald-300 font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Host
                        </span>
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-neutral-400">
                        {contest.handles.map((h, idx) => (
                          <p key={`info-host-${idx}`}>• {h.oj}: {h.handle}</p>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* Host */}
                {/* <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                  <p className="text-sm font-semibold text-white">
                    {contest.ownerName} <span className="text-xs text-emerald-300 font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-2">Host</span>
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-neutral-400">
                    {contest.handles.map((h, idx) => (
                      <p key={`info-host-${idx}`}>• {h.oj}: {h.handle}</p>
                    ))}
                  </div>
                </div> */}

                {/* Others */}
                {contest.participants
                  .filter((p) => p.displayName.toLowerCase() !== contest.ownerName.toLowerCase())
                  .map((participant) => (
                    <div key={participant.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm font-semibold text-white">
                        {participant.displayName}
                        {selfParticipant?.id === participant.id ? " (you)" : ""}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-neutral-400">
                        {participant.handles.map((h, idx) => (
                          <p key={`info-part-${participant.id}-${idx}`}>• {h.oj}: {h.handle}</p>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </aside>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-red-500/30 bg-red-950 px-5 py-4 text-red-100 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm leading-relaxed">{toast}</p>
            <button
              onClick={() => setToast(null)}
              className="text-xs uppercase tracking-widest text-red-200/70 hover:text-red-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Leave Contest?</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Are you sure you want to leave the page? You can copy the contest link before leaving.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-xl border border-white/10 transition-colors text-sm cursor-pointer"
              >
                {copiedLink ? "✓ Copied!" : "Copy Link"}
              </button>
              <button
                onClick={handleLeaveContest}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Leave
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
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
