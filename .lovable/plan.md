

## Plan: Banner Cleanup + Release Script Polish

### FAS 1 — Remove debug banners, add System Status card in Settings

**`src/pages/Index.tsx`**
- Remove the `ModeBanner` component entirely
- Remove `banner` variable and all `{banner}` references
- Remove unused imports (`Server`, `Monitor`, `AlertTriangle`, `getMode`)

**`src/components/home/cards/ProfilePanel.tsx`**
- Update `APP_VERSION` from `'0.0.0'` to `'0.1.5'`
- Add a new "Systemstatus" card at the bottom of the panel showing:
  - Mode: DEV / HOSTED (from `getMode()`)
  - Persistens: LocalStorage (DEV) / Disk (`data/`) (HOSTED)
  - HA-läge: Direkt WebSocket (DEV) / Server Proxy (HOSTED)
  - Server: `window.location.origin` if HOSTED
- Uses existing glass-panel styling, compact `text-xs` rows with labels

### FAS 2 — Release scripts and packaging

**`start.bat`**
- Add `start "" "http://localhost:%PORT%"` after `node server/server.js` is launched (use `start /b node server/server.js` to run server in background, then open browser, then wait)
- Actually: simpler approach — open browser first, then start server (blocking). The browser will retry on its own. Add `start "" "http://localhost:%PORT%"` right before `node server/server.js`

**`start.sh`**
- Add network IP detection: `hostname -I | awk '{print $1}'` or fallback
- Add `xdg-open` / `open` browser launch (best-effort, non-fatal) before starting server
- Print Network URL with detected IP

**`README.md`**
- Rewrite Quick Start to be more concise and "idiot-proof"
- Add PowerShell note: `.\start.bat`
- Mention browser opens automatically
- Simplify structure

**`package.json`**
- Bump version to `0.1.5`

### Files modified (5)
1. `src/pages/Index.tsx` — remove ModeBanner
2. `src/components/home/cards/ProfilePanel.tsx` — add Systemstatus card, update version
3. `start.bat` — auto-open browser
4. `start.sh` — auto-open browser, show network IP
5. `README.md` — simplified Quick Start
6. `package.json` — version bump to 0.1.5

