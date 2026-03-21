# Claude Usage Monitor — Browser Extension

Shows your Claude session & weekly usage as a toolbar badge.
Click the icon for the full breakdown.

## Install (Chrome or Edge)

1. Open Chrome/Edge and go to: chrome://extensions
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (claude_extension)
5. The extension appears in your toolbar

## Usage

- The **badge** on the icon shows your highest usage % (green/amber/red)
- Click the icon for session %, weekly %, reset timers, and extra spend
- Click **↻ Refresh** to poll immediately
- Click **{ } Raw** to see the raw API response (useful for debugging)

## Troubleshooting

**Badge shows "?" or popup shows "No data"**
→ Make sure you're logged into claude.ai in the same browser
→ Click Refresh in the popup
→ Click { } Raw to see what the API returned — share this if something looks wrong

**Still not working**
→ Go to chrome://extensions → Claude Usage Monitor → click "Service Worker"
→ Check the console for errors
