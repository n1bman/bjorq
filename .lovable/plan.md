

# Standby Fade-in, Camera Fix & Theme/Accent

## 3 Issues

### 1. Standby fade-in animation (`src/components/standby/StandbyMode.tsx`)
- Add CSS transition: wrap the standby root div with an opacity animation using Tailwind's `animate-fade-in` (already defined in the project).
- Apply `animate-fade-in` to the outer container and a slightly delayed animation to the overlay panel for a staggered effect.

### 2. Camera resets to consistent angle on dashboard (`src/components/home/DashboardView.tsx` + `src/components/Scene3D.tsx`)
The problem: Home and Dashboard share `Scene3D` with the same `CameraController`. The `cameraPreset` is often `'free'`, so camera stays at whatever angle the user left it. When switching to Dashboard, it should snap to a nice top-down or angled view.

Fix approach:
- In `CameraController`, detect when `appMode === 'dashboard'` and force the camera to the `'angle'` preset position (lerp to `[12, 12, 12]` looking at `[0, 0, 0]`).
- This means the dashboard always shows a consistent dollhouse view regardless of what the user did on the home screen.

### 3. Theme & accent color don't apply (`src/App.tsx` or `src/pages/Index.tsx`)
The problem: `profile.theme` and `profile.accentColor` are stored in zustand but nothing applies them to the DOM. No CSS variables get updated, no classes change.

Fix approach — add a `useEffect` in `src/App.tsx` (or a new `useThemeEffect.ts` hook) that:
- Watches `profile.theme` and applies CSS variable overrides to `:root`:
  - `dark` → current default (no changes needed)
  - `midnight` → deeper blues, darker backgrounds
  - `light` → light mode colors
- Watches `profile.accentColor` and sets `--primary` CSS variable to the selected hex color (convert hex to HSL for Tailwind compatibility).

New file: `src/hooks/useThemeEffect.ts`
- Subscribes to `profile.theme` and `profile.accentColor` from the store
- On theme change: update CSS variables on `document.documentElement` for background, foreground, card, muted, border, etc.
- On accent change: convert hex to HSL, set `--primary`, `--ring`, `--sidebar-primary` CSS variables.
- Define three theme palettes (dark, midnight, light) as HSL value maps.

Call `useThemeEffect()` in `src/App.tsx`.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useThemeEffect.ts` | **New** — applies theme palette + accent color CSS vars to DOM |
| `src/App.tsx` | Add `useThemeEffect()` call |
| `src/components/standby/StandbyMode.tsx` | Add `animate-fade-in` classes |
| `src/components/Scene3D.tsx` | Force camera to angle preset when `appMode === 'dashboard'` |

