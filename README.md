# Claude Usage Monitor

A Chrome/Edge extension that shows your Claude.ai session and weekly usage limits as a live badge on your browser toolbar.

No need to visit the settings page — see your usage at a glance, colour-coded green / amber / red.

## Features

- Session usage % with a live countdown to reset (and the clock time it resets)
- Weekly usage % with a live countdown to reset
- Optional toolbar badge showing time left until the session resets
- Adjustable text size (S / M / L / XL)
- Choice of countdown format: `2h 05m`, `2:05` or `125m`
- Extra credits balance
- Colour-coded badge: green / amber / red
- Works automatically using your existing Claude.ai login
- Requires a Claude Pro or Max account

## Install from Chrome Web Store

[Claude Usage Monitor on the Chrome Web Store](https://chromewebstore.google.com/detail/claude-usage-monitor/nopnffbnihnabiocahnfmfhjkhehmmlh)

## Manual Install (Developer Mode)

1. Download or clone this repo
2. Open Chrome/Edge and go to: `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select this folder
5. The extension appears in your toolbar immediately

## Usage

- The **badge** on the icon shows your highest usage %
- Click the icon for the full breakdown
- Click **↻ Refresh** to poll immediately
- Click **⚙** to change text size, countdown format, and what the badge shows (usage % or time to reset). Settings sync across your Chrome profile.
- Click **{ } Raw** to see the raw API response
- Click **⬥ Claude** to open claude.ai usage settings

## Troubleshooting

**Shows "Not logged in"**
→ Open claude.ai, sign in, then click Refresh

**Badge shows "?" or popup shows "No data"**
→ Make sure you're logged into claude.ai in the same browser
→ Click Refresh in the popup

**Still not working**
→ Go to `chrome://extensions` → Claude Usage Monitor → click **Service Worker**
→ In the console run: `chrome.storage.local.clear(() => console.log("cleared"))`
→ Then click Refresh in the popup

## Privacy Policy

This extension does not collect, transmit, or store any personal data on external servers.

All data fetched from claude.ai (usage percentages, reset times, credit balance) is stored locally in your browser using `chrome.storage.local` and never leaves your device.

The extension communicates only with `claude.ai` using your existing browser session. It makes no connections to any third-party servers.

No analytics, no tracking, no ads.

## Permissions

- **storage** — Caches your organisation ID and usage data locally so the popup loads instantly. No data is sent to any external server.
- **alarms** — Polls the claude.ai usage API once per minute in the background to keep the toolbar badge up to date.
- **host_permissions (claude.ai)** — Required to call the claude.ai usage API using your existing browser session. The extension only reads usage/limit data and makes no modifications to your account.

## License

MIT
