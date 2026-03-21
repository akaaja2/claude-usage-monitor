const POLL_MINUTES = 1;

// ── Get the current user's org ID dynamically
async function getOrgId() {
  // Check cache first
  const cached = await chrome.storage.local.get("orgId");
  if (cached.orgId) return cached.orgId;

  try {
    const resp = await fetch("https://claude.ai/api/organizations", {
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    if (!resp.ok) {
      console.warn("Could not fetch organizations:", resp.status);
      return null;
    }
    const orgs = await resp.json();

    // Find the org with claude_pro capability (the main chat org)
    const org = Array.isArray(orgs)
      ? orgs.find(o => o.capabilities?.includes("claude_pro")) || orgs[0]
      : null;

    const orgId = org?.uuid || null;

    if (orgId) {
      await chrome.storage.local.set({ orgId });
      console.log("Org ID resolved:", orgId);
    } else {
      console.warn("No org found in response");
    }
    return orgId;
  } catch (e) {
    console.error("getOrgId error:", e);
    return null;
  }
}

// ── Fetch usage from claude.ai (runs inside browser, so cookies are automatic)
async function fetchUsage() {
  const orgId = await getOrgId();
  if (!orgId) {
    console.warn("No org ID — are you logged into claude.ai?");
    await chrome.storage.local.set({ authError: "not_logged_in" });
    return null;
  }

  const url = `https://claude.ai/api/organizations/${orgId}/usage`;
  try {
    const resp = await fetch(url, {
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    if (!resp.ok) {
      console.warn("Claude usage fetch failed:", resp.status);
      // Clear cached org ID on auth failure so it re-fetches next time
      if (resp.status === 401 || resp.status === 403) {
        await chrome.storage.local.remove("orgId");
      }
      return null;
    }
    await chrome.storage.local.remove("authError");
    return await resp.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
}

// ── Parse the response into normalised fields
function parseUsage(data) {
  const out = {
    session_pct:    null,
    weekly_pct:     null,
    session_reset:  null,
    weekly_reset:   null,
    extra_spend:    0,
    raw:            data
  };
  try {
    // five_hour = session limit
    const fh = data.five_hour;
    if (fh) {
      out.session_pct   = fh.utilization ?? null;
      out.session_reset = fh.resets_at   ?? null;
    }

    // seven_day = weekly limit
    const sd = data.seven_day;
    if (sd) {
      out.weekly_pct   = sd.utilization ?? null;
      out.weekly_reset = sd.resets_at   ?? null;
    }

    // Extra usage credits (used_credits / monthly_limit)
    const ex = data.extra_usage ?? {};
    const used  = ex.used_credits  ?? 0;
    const limit = ex.monthly_limit ?? 0;
    out.extra_spend = used;           // raw credits used; £ = credits / 100 approx
    out.extra_limit = limit;

  } catch (e) {
    console.error("Parse error:", e);
  }
  return out;
}

// ── Badge colour based on worst usage %
function badgeColour(sp, wp) {
  const max = Math.max(sp ?? 0, wp ?? 0);
  if (max >= 90) return "#e05555";
  if (max >= 70) return "#f5a623";
  return "#7bc67e";
}

// ── Format ISO reset time → "54m" / "2h 3m"
function fmtReset(iso) {
  if (!iso) return "—";
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return "soon";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Update the toolbar badge
function updateBadge(parsed) {
  const sp = parsed.session_pct;
  const wp = parsed.weekly_pct;
  const max = Math.max(sp ?? 0, wp ?? 0);
  const text = max > 0 ? `${max}%` : "?";

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: badgeColour(sp, wp) });
  chrome.action.setTitle({
    title: `Claude Usage\nSession: ${sp ?? "—"}%  Weekly: ${wp ?? "—"}%\nResets: ${fmtReset(parsed.session_reset)}`
  });
}

// ── Main poll cycle
async function poll() {
  const raw = await fetchUsage();
  if (!raw) return;

  const parsed = parseUsage(raw);
  await chrome.storage.local.set({
    usage: parsed,
    lastUpdated: Date.now(),
    rawJson: JSON.stringify(raw, null, 2)
  });
  updateBadge(parsed);
}

// ── Alarms setup
chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll") poll();
});

// ── Run immediately on install / browser start
chrome.runtime.onInstalled.addListener(poll);
chrome.runtime.onStartup.addListener(poll);

// ── Allow popup to trigger a manual refresh
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.action === "refresh") {
    poll().then(() => reply({ ok: true }));
    return true; // async reply
  }
});
