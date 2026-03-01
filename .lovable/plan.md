

## Plan: App Polish — Performance Feedback, Branding, Kiosk Mode

### FAS 1 — Performance Settings Feedback + Save/Backup

**Problem**: Performance settings (shadows, quality, DPR) are applied via Zustand state and consumed by `Scene3D.tsx` Canvas props (`shadows`, `dpr`, `gl.antialias`) and `SceneContent` (shadow map size, point light). These ARE reactive — but the Canvas `shadows`, `dpr`, and `gl` props only take effect on mount, not on re-render. The Canvas needs to remount when quality/shadows change.

**Fix `src/components/Scene3D.tsx`**:
- Add a `key` prop to `<Canvas>` derived from `shadows + quality` so it remounts when these change.

**Fix `src/components/home/cards/PerformanceSettings.tsx`**:
- Add a toast notification ("Ändringar sparade") when any setting changes via `sonner` toast.
- Add note text: "3D-scenen laddas om automatiskt" under the card title.

**Fix `src/components/home/cards/ProfilePanel.tsx`**:
- Add a "Spara & Backup" button in the Data & Backup card.
- On click: trigger the existing export logic + show toast "Backup sparad".
- In hosted mode: POST to a new endpoint `POST /api/backup` that writes to `data/backups/bjorq-backup-{timestamp}.json`.
- Keep existing manual "Exportera backup" button as-is.

**New file `server/api/backups.js`**:
- `POST /api/backup` — reads current state from profiles + projects, writes timestamped JSON to `data/backups/`.

### FAS 2 — Branding: Title, Favicon, PWA Manifest

**`index.html`**:
- Change `<title>` to "BJORQ Dashboard".
- Update all `og:title`, `og:description`, `twitter:site` meta tags.
- Add `<link rel="manifest" href="/manifest.json">`.
- Add `<meta name="theme-color" content="#0a0a0f">`.
- Change favicon link to `/favicon.png` (the logo).

**Copy logo files to `public/`**:
- Copy `borq-logo6.png` → `public/favicon.png` (icon mark).
- Copy `borq-logo7.png` → `public/logo-text.png` (wordmark, for PWA splash).

**New `public/manifest.json`**:
```json
{
  "name": "BJORQ Dashboard",
  "short_name": "BJORQ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#f59e0b",
  "icons": [
    { "src": "/favicon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### FAS 3 — Display / Kiosk Mode Settings

**New file `src/components/home/cards/DisplaySettings.tsx`**:
A settings card with three sections:

1. **App Mode** — info text explaining `--app` flag for Chrome/Edge with copyable command examples.
2. **Browser Fullscreen** — "Gå Fullscreen" / "Lämna Fullscreen" buttons using `document.fullscreenElement` API. Toggle for "auto-fullscreen vid start" (stored in profile, attempted on first user gesture).
3. **OS Kiosk** — info-only section with instructions for Windows kiosk, Linux `--kiosk`, and how to exit (ESC, Alt+F4, Ctrl+Alt+Del).

Add "Admin unlock" hint: long-press 5s on the top nav bar reveals exit tips overlay.

**`src/components/home/DashboardGrid.tsx`**:
- Add `DisplaySettings` to the Settings category, in a new "Skärm" section between System and Anslutning.

**`src/store/types.ts`** + **`src/store/useAppStore.ts`**:
- Add `autoFullscreen: boolean` to profile (default false).

**`src/components/home/HomeNav.tsx`** or **`src/pages/Index.tsx`**:
- Add long-press (5s) handler on nav bar that shows a small overlay with "Lämna fullscreen" / kiosk exit tips.

### Files Modified/Created (approx 10)
1. `src/components/Scene3D.tsx` — add key for Canvas remount
2. `src/components/home/cards/PerformanceSettings.tsx` — toast feedback
3. `src/components/home/cards/ProfilePanel.tsx` — save & backup button
4. `server/api/backups.js` — new backup endpoint
5. `server/server.js` — mount backup route
6. `index.html` — branding, manifest link, favicon
7. `public/manifest.json` — new PWA manifest
8. `public/favicon.png` — copied from logo
9. `src/components/home/cards/DisplaySettings.tsx` — new kiosk/display card
10. `src/components/home/DashboardGrid.tsx` — add DisplaySettings to settings
11. `src/store/types.ts` — add autoFullscreen
12. `src/store/useAppStore.ts` — add autoFullscreen default + setter
13. `src/components/home/HomeNav.tsx` — long-press admin unlock

