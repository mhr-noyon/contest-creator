import { redis } from "@/lib/store";

const localMemoryCache = new Map<string, string>();
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — problem statements are static

// In-memory cache of AtCoder problem IDs that are confirmed to have English statements.
// "true" = English available, "false" = 404 or Japanese-only.
const englishCheckCache = new Map<string, boolean>();

const AC_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Checks whether an AtCoder problem has an English statement available.
 * Results are cached in-memory for the lifetime of the server process.
 */
export async function canScrapeEnglish(problemId: string): Promise<boolean> {
  const pid = problemId.toLowerCase();
  if (englishCheckCache.has(pid)) return englishCheckCache.get(pid)!;

  const lastUnderscore = problemId.lastIndexOf("_");
  if (lastUnderscore === -1) {
    englishCheckCache.set(pid, false);
    return false;
  }

  const contestId = problemId.substring(0, lastUnderscore);
  const url = `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`;

  try {
    const res = await fetch(url, { headers: AC_HEADERS, cache: "no-store" });
    if (!res.ok) {
      englishCheckCache.set(pid, false);
      return false;
    }
    // Only read enough of the body to find the lang-en marker (~100 KB should be plenty)
    const text = await res.text();
    const hasEnglish = /class=['"]lang-en['"]/i.test(text);
    englishCheckCache.set(pid, hasEnglish);
    return hasEnglish;
  } catch {
    englishCheckCache.set(pid, false);
    return false;
  }
}

// Cache for Codeforces problem existence checks
const cfExistenceCache = new Map<string, boolean>();

/**
 * Checks whether a Codeforces problem exists and is accessible.
 * All Codeforces problems in the public API are in English, so this is purely an existence check.
 * Results are cached in-memory.
 */
export async function canScrapeCodeforcesEnglish(problemId: string): Promise<boolean> {
  const pid = problemId.toLowerCase();
  if (cfExistenceCache.has(pid)) return cfExistenceCache.get(pid)!;

  // Extract contestId and index from e.g. "1513C" → contestId=1513, index=C
  const match = problemId.match(/^(\d+)([A-Z]\d*)$/i);
  if (!match) {
    cfExistenceCache.set(pid, false);
    return false;
  }

  const contestId = match[1];
  const index = match[2].toUpperCase();

  try {
    const url = `https://codeforces.com/api/problemset.problems?tags=`;
    // Lightweight: use contest.standings to verify the problem belongs to the contest
    const res = await fetch(
      `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1&showUnofficial=false`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      cfExistenceCache.set(pid, false);
      return false;
    }
    const data = await res.json();
    if (data.status !== "OK") {
      cfExistenceCache.set(pid, false);
      return false;
    }
    // Verify the problem index appears in the contest problems list
    const exists = (data.result?.problems || []).some(
      (p: any) => String(p.index).toUpperCase() === index
    );
    cfExistenceCache.set(pid, exists);
    return exists;
  } catch {
    cfExistenceCache.set(pid, false);
    return false;
  }
}

/**
 * Extracts the problem statement from a Codeforces problem page HTML.
 * Codeforces wraps statements in <div class="problem-statement">.
 */
function extractCodeforcesStatement(pageHtml: string): string {
  const startMarker = 'class="problem-statement"';
  const startIdx = pageHtml.indexOf(startMarker);
  if (startIdx === -1) return "";

  // Walk back to find the opening <div
  const tagStart = pageHtml.lastIndexOf("<div", startIdx);
  if (tagStart === -1) return "";

  // Track nesting to find the matching closing </div>
  let currentIndex = tagStart + 4;
  let nesting = 1;

  while (nesting > 0 && currentIndex < pageHtml.length) {
    const nextOpen = pageHtml.indexOf("<div", currentIndex);
    const nextClose = pageHtml.indexOf("</div>", currentIndex);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      nesting++;
      currentIndex = nextOpen + 4;
    } else {
      nesting--;
      currentIndex = nextClose + 6;
    }
  }

  const fullBlock = pageHtml.substring(tagStart, currentIndex);
  const firstClose = fullBlock.indexOf(">");
  if (firstClose === -1) return "";
  return fullBlock.substring(firstClose + 1, fullBlock.length - 6).trim();
}

/**
 * Extracts the English section from an AtCoder task statement page.
 * Returns: { html, isEnglish }
 */
function extractAtCoderEnglish(pageHtml: string): { html: string; isEnglish: boolean } {
  // Modern bilingual pages: find <span class="lang-en"> or <div class="lang-en">
  const match = pageHtml.match(/<(span|div)\b[^>]*class=['"][^'"]*\blang-en\b[^'"]*['"][^>]*>/i);

  if (match && match.index !== undefined) {
    const tagStart = match.index;
    const tagName = match[1].toLowerCase();

    let currentIndex = tagStart + match[0].length;
    let nesting = 1;

    while (nesting > 0 && currentIndex < pageHtml.length) {
      const nextOpen = pageHtml.indexOf(`<${tagName}`, currentIndex);
      const nextClose = pageHtml.indexOf(`</${tagName}>`, currentIndex);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        nesting++;
        currentIndex = nextOpen + tagName.length + 1;
      } else {
        nesting--;
        currentIndex = nextClose + tagName.length + 3;
      }
    }

    const fullTag = pageHtml.substring(tagStart, currentIndex);
    const firstCloseTag = fullTag.indexOf('>');
    if (firstCloseTag !== -1) {
      const inner = fullTag.substring(firstCloseTag + 1, fullTag.length - (tagName.length + 3)).trim();
      if (inner) return { html: inner, isEnglish: true };
    }
  }

  // Older pages with task-statement div but no lang-en (typically Japanese only)
  const startIdx = pageHtml.indexOf('<div id="task-statement">');
  if (startIdx !== -1) {
    const rest = pageHtml.substring(startIdx);
    const endIdx = rest.search(/<script|<footer/);
    const rawHtml = (endIdx !== -1 ? rest.substring(0, endIdx) : rest).trim();
    return { html: rawHtml, isEnglish: false };
  }

  return { html: "", isEnglish: false };
}

/**
 * Builds a styled fallback HTML card when a problem statement cannot be embedded.
 */
function buildFallbackCard(
  reason: "not_found" | "japanese_only" | "unavailable",
  url: string,
  problemId: string
): string {
  const messages: Record<string, { icon: string; title: string; body: string }> = {
    not_found: {
      icon: "🔍",
      title: "Problem Page Not Found",
      body: "This problem returned a 404 on AtCoder. It may have been moved, renamed, or is part of a private/expired contest."
    },
    japanese_only: {
      icon: "🇯🇵",
      title: "No English Version Available",
      body: "This is an older AtCoder problem that does not have an English translation. Please view it directly on the AtCoder website."
    },
    unavailable: {
      icon: "⚠️",
      title: "Could Not Load Problem",
      body: "The problem statement could not be extracted. Please view it directly on the AtCoder website."
    }
  };

  const { icon, title, body } = messages[reason];
  const hasLink = url && url !== "#";

  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2rem;text-align:center;gap:1rem;">
  <div style="font-size:3rem;">${icon}</div>
  <h2 style="font-size:1.25rem;font-weight:700;color:#f87171;margin:0;">${title}</h2>
  <p style="color:#a1a1aa;max-width:420px;line-height:1.6;margin:0;">${body}</p>
  ${hasLink ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="margin-top:0.5rem;display:inline-flex;align-items:center;gap:0.5rem;padding:0.6rem 1.4rem;background:#059669;color:#fff;border-radius:0.5rem;font-weight:600;text-decoration:none;font-size:0.9rem;">View on AtCoder ↗</a>` : ""}
  <p style="color:#52525b;font-size:0.75rem;margin:0;">${problemId}</p>
</div>`;
}

/**
 * Main function: get or scrape a problem statement, using memory/Redis cache.
 */
export async function getOrScrapeProblemStatement(oj: string, problemId: string, bypassCache = false): Promise<string> {
  // Strip any OJ prefix that might have been prepended accidentally
  const cleanProblemId = problemId.startsWith(`${oj}:`)
    ? problemId.substring(oj.length + 1)
    : problemId.startsWith("atcoder:")
    ? problemId.substring(8)
    : problemId.startsWith("codeforces:")
    ? problemId.substring(11)
    : problemId;

  const cacheKey = `scraped:problem:v3:${oj}:${cleanProblemId.toLowerCase()}`;

  if (bypassCache) {
    localMemoryCache.delete(cacheKey);
    if (redis) {
      try {
        await redis.del(cacheKey);
        await redis.del(`scraped:problem:v2:${oj}:${cleanProblemId.toLowerCase()}`);
        await redis.del(`scraped:problem:${oj}:${cleanProblemId.toLowerCase()}`);
      } catch (err) {
        console.warn("Failed to delete cached problem from Redis:", err);
      }
    }
  } else {
    // 1. Try Redis cache
    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) return cached;
      } catch (err) {
        console.warn("Failed to retrieve problem statement from Redis:", err);
      }
    }

    // 2. Try in-memory cache
    const memCached = localMemoryCache.get(cacheKey);
    if (memCached) return memCached;
  }

  // 3. Scrape
  let htmlContent = "";

  if (oj === "atcoder") {
    const lastUnderscore = cleanProblemId.lastIndexOf("_");
    if (lastUnderscore === -1) {
      return buildFallbackCard("unavailable", "https://atcoder.jp/", cleanProblemId);
    }

    const atcoderContestId = cleanProblemId.substring(0, lastUnderscore);
    const url = `https://atcoder.jp/contests/${atcoderContestId}/tasks/${cleanProblemId}`;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    };

    console.log(`Scraping AtCoder: ${url}`);
    let res: Response;
    try {
      res = await fetch(url, { headers, cache: "no-store" });
    } catch (err) {
      console.error(`Network error fetching AtCoder problem ${cleanProblemId}:`, err);
      return buildFallbackCard("unavailable", url, cleanProblemId);
    }

    if (!res.ok) {
      console.warn(`AtCoder returned ${res.status} for ${url}`);
      return buildFallbackCard("not_found", url, cleanProblemId);
    }

    const pageHtml = await res.text();
    const { html, isEnglish } = extractAtCoderEnglish(pageHtml);

    if (!html) {
      return buildFallbackCard("unavailable", url, cleanProblemId);
    }

    if (!isEnglish) {
      // Old-format Japanese-only page — do not cache it, show a graceful card
      return buildFallbackCard("japanese_only", url, cleanProblemId);
    }

    htmlContent = html;

  } else if (oj === "codeforces") {
    // Build the Codeforces problem URL from externalId e.g. "1513C" → contest 1513, index C
    const cfMatch = cleanProblemId.match(/^(\d+)([A-Z]\d*)$/i);
    if (!cfMatch) {
      return buildFallbackCard("unavailable", "https://codeforces.com/", cleanProblemId);
    }
    const cfContestId = cfMatch[1];
    const cfIndex = cfMatch[2].toUpperCase();
    const cfUrl = `https://codeforces.com/contest/${cfContestId}/problem/${cfIndex}`;

    const cfHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    };

    console.log(`Scraping Codeforces: ${cfUrl}`);
    let cfRes: Response;
    try {
      cfRes = await fetch(cfUrl, { headers: cfHeaders, cache: "no-store" });
    } catch (err) {
      console.error(`Network error fetching Codeforces problem ${cleanProblemId}:`, err);
      return buildFallbackCard("unavailable", cfUrl, cleanProblemId);
    }

    if (!cfRes.ok) {
      console.warn(`Codeforces returned ${cfRes.status} for ${cfUrl}`);
      return buildFallbackCard("not_found", cfUrl, cleanProblemId);
    }

    const cfPageHtml = await cfRes.text();
    const cfHtml = extractCodeforcesStatement(cfPageHtml);

    if (!cfHtml) {
      return buildFallbackCard("unavailable", cfUrl, cleanProblemId);
    }

    htmlContent = cfHtml;
  } else {
    return buildFallbackCard("unavailable", "#", cleanProblemId);
  }

  // 4. Save to caches
  localMemoryCache.set(cacheKey, htmlContent);
  if (redis && htmlContent) {
    try {
      await redis.set(cacheKey, htmlContent, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.warn("Failed to cache problem statement to Redis:", err);
    }
  }

  return htmlContent;
}
