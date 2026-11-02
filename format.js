// Shared formatting + settings helpers.
// Loaded by popup.html (<script>) and background.js (importScripts).

const DEFAULT_SETTINGS = {
  textScale:  1,      // 0.9 | 1 | 1.2 | 1.4
  timeFormat: "hm",   // "hm" -> 2h 05m | "hhmm" -> 2:05 | "min" -> 125m
  badgeMode:  "pct"   // "pct" -> 42% | "time" -> session time left
};

function msUntil(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t - Date.now();
}

function pad2(n) { return String(n).padStart(2, "0"); }

// Long form, used in the popup and tooltip.
function fmtCountdown(iso, mode = "hm") {
  const diff = msUntil(iso);
  if (diff == null) return "—";
  if (diff <= 0) return "now";

  const totalMin = Math.floor(diff / 60000);
  if (totalMin < 1) return "<1m";

  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;

  // Anything a day or more away reads best as days + hours in every mode.
  if (d > 0) return `${d}d ${h}h`;

  if (mode === "min")  return `${totalMin}m`;
  if (mode === "hhmm") return `${h}:${pad2(m)}`;
  return h > 0 ? `${h}h ${pad2(m)}m` : `${m}m`;
}

// Short form for the toolbar badge (Chrome shows ~4 characters).
function fmtBadgeCountdown(iso, mode = "hm") {
  const diff = msUntil(iso);
  if (diff == null) return "?";
  if (diff <= 0) return "0m";

  const totalMin = Math.max(1, Math.floor(diff / 60000));
  if (totalMin >= 1440) return `${Math.floor(totalMin / 1440)}d`;
  if (totalMin < 60 || mode === "min") {
    return totalMin < 1000 ? `${totalMin}m` : `${Math.floor(totalMin / 60)}h`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (mode === "hhmm" && h < 10) return `${h}:${pad2(m)}`;
  return `${h}h`;
}

// Wall-clock time of the reset, e.g. "14:30" or "Tue 09:00".
function fmtClock(iso) {
  const diff = msUntil(iso);
  if (diff == null) return "";
  const at = new Date(iso);
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = at.toDateString() === new Date().toDateString();
  if (sameDay) return time;
  const day = at.toLocaleDateString([], { weekday: "short" });
  return `${day} ${time}`;
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => resolve({ ...DEFAULT_SETTINGS, ...s }));
  });
}
