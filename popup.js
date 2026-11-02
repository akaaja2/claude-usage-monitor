function pct(v) { return v != null ? `${v}%` : "—"; }

function colour(v) {
  if (v == null) return "var(--text)";
  if (v >= 90)   return "var(--crit)";
  if (v >= 70)   return "var(--warn)";
  return "var(--ok)";
}

function fmtAge(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ── State
let settings = { ...DEFAULT_SETTINGS };
let current = { usage: null, lastUpdated: null };

// ── Text size: apply instantly from a local mirror to avoid a flash on open
function applyScale(scale) {
  document.documentElement.style.zoom = String(scale);
}
try {
  const cached = parseFloat(localStorage.getItem("textScale"));
  if (cached) applyScale(cached);
} catch (e) { /* storage unavailable: fall back to synced value below */ }

function render(usage, lastUpdated) {
  current = { usage, lastUpdated };
  const sp = usage.session_pct;
  const wp = usage.weekly_pct;
  const spend = usage.extra_spend ?? 0;
  const limit = usage.extra_limit ?? 2000;

  // Status dot colour
  const dot = document.getElementById("status-dot");
  const max = Math.max(sp ?? 0, wp ?? 0);
  dot.style.background = max >= 90 ? "var(--crit)" : max >= 70 ? "var(--warn)" : "var(--ok)";
  dot.style.boxShadow  = `0 0 6px ${dot.style.background}`;

  document.getElementById("main-content").innerHTML = `
    <div class="metrics">
      <div class="metric-group">

        <div class="metric">
          <div class="metric-label">Session</div>
          <div class="metric-value" style="color:${colour(sp)}">${pct(sp)}</div>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${sp ?? 0}%; background:${colour(sp)}"></div>
          </div>
          <div class="metric-reset">resets in
            <span class="left" id="session-left">—</span>
            <span class="when" id="session-at"></span></div>
        </div>

        <div class="metric">
          <div class="metric-label">Weekly</div>
          <div class="metric-value" style="color:${colour(wp)}">${pct(wp)}</div>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${wp ?? 0}%; background:${colour(wp)}"></div>
          </div>
          <div class="metric-reset">resets in
            <span class="left" id="weekly-left">—</span>
            <span class="when" id="weekly-at"></span></div>
        </div>

      </div>
    </div>

    <div class="footer-row">
      <div class="footer-metric">
        <span class="footer-label">Extra credits</span>
        <span class="footer-value">${spend} / ${limit}</span>
      </div>
    </div>
  `;
  tick();
}

// ── Live countdown, updated every second while the popup is open
function tick() {
  if (current.lastUpdated != null) {
    document.getElementById("last-updated").textContent = fmtAge(current.lastUpdated);
  }
  const u = current.usage;
  if (!u) return;
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("session-left", fmtCountdown(u.session_reset, settings.timeFormat));
  set("weekly-left",  fmtCountdown(u.weekly_reset,  settings.timeFormat));
  const sAt = fmtClock(u.session_reset);
  const wAt = fmtClock(u.weekly_reset);
  set("session-at", sAt ? `at ${sAt}` : "");
  set("weekly-at",  wAt ? `at ${wAt}` : "");
}
setInterval(tick, 1000);

function showError(msg) {
  current.usage = null;
  document.getElementById("main-content").innerHTML =
    `<div class="error">${msg}</div>`;
  const dot = document.getElementById("status-dot");
  dot.style.background = "var(--crit)";
}

// ── Settings pane
function paintSettings() {
  document.querySelectorAll("#settings-pane .seg").forEach((seg) => {
    const key = seg.dataset.key;
    seg.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", String(settings[key]) === btn.dataset.value);
    });
  });
}

document.querySelectorAll("#settings-pane .seg").forEach((seg) => {
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const key = seg.dataset.key;
    const value = key === "textScale" ? parseFloat(btn.dataset.value) : btn.dataset.value;
    settings[key] = value;
    chrome.storage.sync.set({ [key]: value });
    if (key === "textScale") {
      applyScale(value);
      try { localStorage.setItem("textScale", String(value)); } catch (err) { /* ignore */ }
    }
    paintSettings();
    tick();
  });
});

let settingsVisible = false;
document.getElementById("btn-settings").addEventListener("click", () => {
  settingsVisible = !settingsVisible;
  document.getElementById("settings-pane").style.display = settingsVisible ? "block" : "none";
});

// ── Load settings, then stored data
getSettings().then((s) => {
  settings = s;
  applyScale(settings.textScale);
  try { localStorage.setItem("textScale", String(settings.textScale)); } catch (e) { /* ignore */ }
  paintSettings();

  chrome.storage.local.get(["usage", "lastUpdated", "rawJson", "authError"], (data) => {
    if (data.authError) {
      showError("Not logged in to claude.ai.<br>Open claude.ai, sign in, then click Refresh.");
      return;
    }
    if (data.usage) {
      render(data.usage, data.lastUpdated);
      if (data.rawJson) document.getElementById("debug-text").value = data.rawJson;
    } else {
      showError("No data yet — click Refresh.");
    }
  });
});

// ── Refresh button
document.getElementById("btn-refresh").addEventListener("click", () => {
  document.getElementById("last-updated").textContent = "refreshing…";
  chrome.runtime.sendMessage({ action: "refresh" }, () => {
    chrome.storage.local.get(["usage", "lastUpdated", "rawJson", "authError"], (data) => {
      if (data.authError) {
        showError("Not logged in to claude.ai.<br>Open claude.ai, sign in, then click Refresh.");
      } else if (data.usage) {
        render(data.usage, data.lastUpdated);
        if (data.rawJson) document.getElementById("debug-text").value = data.rawJson;
      } else {
        showError("Still no data. Are you logged into claude.ai?");
      }
    });
  });
});

// ── Debug toggle
let debugVisible = false;
document.getElementById("btn-debug").addEventListener("click", () => {
  debugVisible = !debugVisible;
  document.getElementById("debug-pane").style.display = debugVisible ? "block" : "none";
});

// ── Open Claude
document.getElementById("btn-claude").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://claude.ai" });
});
