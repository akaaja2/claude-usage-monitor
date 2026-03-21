function pct(v) { return v != null ? `${v}%` : "—"; }

function colour(v) {
  if (v == null) return "var(--text)";
  if (v >= 90)   return "var(--crit)";
  if (v >= 70)   return "var(--warn)";
  return "var(--ok)";
}

function fmtReset(iso) {
  if (!iso) return "—";
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return "soon";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtAge(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function render(usage, lastUpdated) {
  const sp = usage.session_pct;
  const wp = usage.weekly_pct;
  const sr = fmtReset(usage.session_reset);
  const wr = fmtReset(usage.weekly_reset);
  const spend = usage.extra_spend ?? 0;
  const limit = usage.extra_limit ?? 2000;

  // Status dot colour
  const dot = document.getElementById("status-dot");
  const max = Math.max(sp ?? 0, wp ?? 0);
  dot.style.background = max >= 90 ? "var(--crit)" : max >= 70 ? "var(--warn)" : "var(--ok)";
  dot.style.boxShadow  = `0 0 6px ${dot.style.background}`;

  document.getElementById("last-updated").textContent = fmtAge(lastUpdated);

  document.getElementById("main-content").innerHTML = `
    <div class="metrics">
      <div class="metric-group">

        <div class="metric">
          <div class="metric-label">Session</div>
          <div class="metric-value" style="color:${colour(sp)}">${pct(sp)}</div>
          <div class="metric-sub">resets ${sr}</div>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${sp ?? 0}%; background:${colour(sp)}"></div>
          </div>
        </div>

        <div class="metric">
          <div class="metric-label">Weekly</div>
          <div class="metric-value" style="color:${colour(wp)}">${pct(wp)}</div>
          <div class="metric-sub">resets ${wr}</div>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${wp ?? 0}%; background:${colour(wp)}"></div>
          </div>
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
}

function showError(msg) {
  document.getElementById("main-content").innerHTML =
    `<div class="error">${msg}</div>`;
  const dot = document.getElementById("status-dot");
  dot.style.background = "var(--crit)";
}

// ── Load stored data
chrome.storage.local.get(["usage", "lastUpdated", "rawJson", "authError", "accountRaw"], (data) => {
  if (data.authError) {
    showError("Not logged in to claude.ai.<br>Open claude.ai, sign in, then click Refresh.");
    return;
  }
  if (data.usage) {
    render(data.usage, data.lastUpdated);
    if (data.rawJson) {
      document.getElementById("debug-text").value = data.rawJson;
    }
  } else {
    showError("No data yet — click Refresh.");
  }
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
