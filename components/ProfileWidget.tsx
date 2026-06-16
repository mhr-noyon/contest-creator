"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

interface ProfileData {
  name: string;
  cfHandle: string;
  atcoderHandle: string;
  atcoderSessionId?: string;
  expiresAt: number;
}

export default function ProfileWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const [atcoderHandle, setAtcoderHandle] = useState("");
  const [atcoderSessionId, setAtcoderSessionId] = useState("");
  
  // Track initial values to detect changes
  const [initialName, setInitialName] = useState("");
  const [initialCfHandle, setInitialCfHandle] = useState("");
  const [initialAtcoderHandle, setInitialAtcoderHandle] = useState("");
  const [initialAtcoderSessionId, setInitialAtcoderSessionId] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Hide on particular contest pages (e.g. /contest/ury445, /contest/ury445/status)
  const isContestPage = pathname?.startsWith("/contest/") && pathname !== "/contest/create";
  if (isContestPage) return null;

  // Load profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("user-profile");
    if (saved) {
      try {
        const parsed: ProfileData = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          const n = parsed.name || "";
          const cf = parsed.cfHandle || "";
          const ac = parsed.atcoderHandle || "";
          const sid = parsed.atcoderSessionId || "";
          setName(n);
          setCfHandle(cf);
          setAtcoderHandle(ac);
          setAtcoderSessionId(sid);
          setInitialName(n);
          setInitialCfHandle(cf);
          setInitialAtcoderHandle(ac);
          setInitialAtcoderSessionId(sid);
        } else {
          localStorage.removeItem("user-profile");
        }
      } catch {
        localStorage.removeItem("user-profile");
      }
    }
  }, []);

  // Handle click outside to close the widget
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const trimmedName = name.trim();
    const trimmedCf = cfHandle.trim();
    const trimmedAtcoder = atcoderHandle.trim();

    try {
      // 1. Verify Codeforces handle if not empty
      if (trimmedCf && trimmedCf !== initialCfHandle) {
        const cfRes = await fetch(`/api/user/verify?oj=codeforces&handle=${encodeURIComponent(trimmedCf)}`);
        const cfData = await cfRes.json();
        if (!cfData.exists) {
          showToast(`Codeforces handle "${trimmedCf}" does not exist!`, "error");
          setLoading(false);
          return;
        }
      }

      // 2. Verify AtCoder handle if not empty
      if (trimmedAtcoder && trimmedAtcoder !== initialAtcoderHandle) {
        const acRes = await fetch(`/api/user/verify?oj=atcoder&handle=${encodeURIComponent(trimmedAtcoder)}`);
        const acData = await acRes.json();
        if (!acData.exists) {
          showToast(`AtCoder handle "${trimmedAtcoder}" does not exist!`, "error");
          setLoading(false);
          return;
        }
      }

      // 3. Save profile data to localStorage with 7-day expiration
      const profile: ProfileData = {
        name: trimmedName,
        cfHandle: trimmedCf,
        atcoderHandle: trimmedAtcoder,
        atcoderSessionId: atcoderSessionId.trim(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      };

      localStorage.setItem("user-profile", JSON.stringify(profile));
      setInitialName(trimmedName);
      setInitialCfHandle(trimmedCf);
      setInitialAtcoderHandle(trimmedAtcoder);
      setInitialAtcoderSessionId(atcoderSessionId.trim());
      showToast("Profile saved successfully!", "success");
      setIsOpen(false);
    } catch (error) {
      showToast("Failed to verify handles. Please check your internet connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    name.trim() !== initialName ||
    cfHandle.trim() !== initialCfHandle ||
    atcoderHandle.trim() !== initialAtcoderHandle ||
    atcoderSessionId.trim() !== initialAtcoderSessionId;

  const isButtonDisabled = loading || !hasChanges;

  return (
    <div ref={widgetRef} className="relative z-30">
      {/* Floating Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-black/60 text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/50 shadow-lg backdrop-blur-md transition-all duration-300 cursor-pointer focus:outline-none"
        title="Manage Profile & Handles"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>

      {/* Profile Sidebar/Container */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-3xl border border-white/10 bg-neutral-900 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Your Profile
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CodeChamp"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                Codeforces Handle
              </label>
              <input
                type="text"
                value={cfHandle}
                onChange={(e) => setCfHandle(e.target.value)}
                placeholder="e.g. tourist"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                AtCoder Handle
              </label>
              <input
                type="text"
                value={atcoderHandle}
                onChange={(e) => setAtcoderHandle(e.target.value)}
                placeholder="e.g. chokudai"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-semibold">
                AtCoder Session ID (REVEL_SESSION)
              </label>
              <input
                type="password"
                value={atcoderSessionId}
                onChange={(e) => setAtcoderSessionId(e.target.value)}
                placeholder="e.g. REVEL_SESSION cookie value"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <span className="text-[9px] text-neutral-500 block mt-1 leading-tight">
                To find this: Log into AtCoder.jp, open DevTools (F12) &rarr; Application &rarr; Cookies &rarr; copy the value of "REVEL_SESSION".
              </span>
            </div>

            <button
              type="submit"
              disabled={isButtonDisabled}
              className={`w-full mt-2 font-bold py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
                isButtonDisabled
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                  : "bg-emerald-400 hover:bg-emerald-300 text-black cursor-pointer shadow-lg shadow-emerald-400/10"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verifying Handles...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </form>

          <p className="text-[10px] text-neutral-500 text-center mt-4 leading-normal">
            Profile values will auto-fill your name and handles when creating or joining contests. Saved locally for 7 days.
          </p>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border px-5 py-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-100"
              : "border-red-500/30 bg-red-950/90 text-red-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{toast.type === "success" ? "✓" : "⚠"}</span>
            <p className="text-sm leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
