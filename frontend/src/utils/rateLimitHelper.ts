import { RateLimitInfo } from "../types/chat";

export function getDailyResetTime(): { untilTimestamp: number; resetTimeString: string } {
  const now = new Date();
  const reset = new Date(now);
  
  // Set target to 5:30 AM (05:30:00) local time (IST)
  reset.setHours(5, 30, 0, 0);
  if (now >= reset) {
    reset.setDate(reset.getDate() + 1);
  }
  
  const untilTimestamp = reset.getTime();
  const isTomorrow = reset.getDate() !== now.getDate();
  const dayPrefix = isTomorrow ? "Tomorrow" : "Today";
  const timeStr = reset.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  
  return {
    untilTimestamp,
    resetTimeString: `${dayPrefix} at ${timeStr} (5:30 AM Reset)`
  };
}

export function detectRateLimitFromText(text: string): RateLimitInfo | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  
  // Extract exact remaining seconds from server response if provided e.g. "(Resets in 14s)" or "wait 14 second(s)"
  const secondsMatch = text.match(/\(Resets in (\d+)s\)/i) || 
                       text.match(/(?:try again in|wait)\s*(\d+)\s*second/i);
  const parsedSeconds = secondsMatch ? parseInt(secondsMatch[1], 10) : null;

  // 1. Daily limit (20 req/day)
  if (
    lower.includes("20 queries per day") || 
    lower.includes("20 requests per day") || 
    lower.includes("daily quota") || 
    lower.includes("daily limit") ||
    lower.includes("20/20")
  ) {
    const dailyReset = getDailyResetTime();
    const until = parsedSeconds !== null ? Date.now() + parsedSeconds * 1000 : dailyReset.untilTimestamp;
    const date = new Date(until);
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return {
      isLimited: true,
      type: "daily",
      message: "Daily Quota Reached (20/20 Questions Exhausted)",
      resetTimeString: parsedSeconds !== null ? `Available again at ${timeStr}` : dailyReset.resetTimeString,
      untilTimestamp: until
    };
  }
  
  // 2. Minute limit (5 req/min)
  if (
    lower.includes("5 queries per minute") || 
    lower.includes("5 requests per minute") || 
    lower.includes("maximum 5 queries") ||
    lower.includes("rate limit exceeded")
  ) {
    const secsLeft = parsedSeconds !== null ? parsedSeconds : 60;
    const until = Date.now() + secsLeft * 1000;
    const date = new Date(until);
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return {
      isLimited: true,
      type: "minute",
      message: "Rate Limit Reached (5 Questions / Minute)",
      resetTimeString: `Available again at ${timeStr}`,
      untilTimestamp: until
    };
  }

  // 3. Permanent ban
  if (lower.includes("permanently revoked") || lower.includes("permanent ban")) {
    return {
      isLimited: true,
      type: "permanent",
      message: "Access Permanently Revoked due to repeated security violations",
      resetTimeString: "Permanent Block",
      untilTimestamp: Date.now() + 365 * 24 * 60 * 60 * 1000
    };
  }
  
  // 4. Temporary Security ban (5m, 1h, 1d)
  if (
    lower.includes("security guardrail alert") || 
    lower.includes("access suspended") || 
    lower.includes("blocked for") ||
    lower.includes("request flood/attack")
  ) {
    let minutes = 5;
    const matchMins = text.match(/(\d+)\s*(more\s*)?minute/i) || text.match(/blocked for\s*(\d+)/i);
    if (matchMins && matchMins[1]) {
      minutes = parseInt(matchMins[1], 10) || 5;
    } else if (lower.includes("1 hour") || lower.includes("1 hr")) {
      minutes = 60;
    } else if (lower.includes("1 day") || lower.includes("24 hours")) {
      minutes = 1440;
    }
    const until = Date.now() + minutes * 60 * 1000;
    const date = new Date(until);
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return {
      isLimited: true,
      type: "ban",
      message: `Security Suspension Active (${minutes}m Ban)`,
      resetTimeString: `Suspension ends at ${timeStr}`,
      untilTimestamp: until
    };
  }

  return null;
}
