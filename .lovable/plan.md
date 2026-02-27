

# HomeTwin UI Upgrade — Touch + Premium Visual Polish

This is a visual-only upgrade. No functional changes. All state management, API calls, HA integration, 3D logic, and build mode remain untouched.

## Overview of Changes

### 1. Global CSS Tokens & Glass Panel Refinement
**File: `src/index.css`**
- Increase default `--radius` from `0.75rem` to `1rem`
- Soften `.glass-panel`: increase blur to `20px`, add subtle `box-shadow`, soften border opacity
- Add `.glass-panel-soft` variant with even lighter feel for nested cards
- Increase default font sizes slightly for readability on tablets

### 2. Home Screen — Widget Spacing & Touch Targets
**File: `src/components/home/HomeView.tsx`**
- Increase top widget area gap from `gap-3` to `gap-4`, add `top-5 left-5 right-5`
- Increase bottom device cards padding from `p-3` to `p-4`, min-width from `180px` to `200px`, gap from `gap-2` to `gap-3`
- Device marker toggle button: increase from `w-10 h-10` to `w-12 h-12` (48px touch target)
- Increase icon sizes in device cards for readability

### 3. Floating Navigation — Larger Touch Targets
**File: `src/components/home/HomeNav.tsx`**
- Increase button padding from `px-3 py-2` to `px-4 py-2.5`
- Increase icon size from `16` to `18`
- Increase text from `text-xs` to `text-[13px]`
- Add stronger active state: `bg-primary/10` background on active button
- Increase nav pill padding and rounded corners

### 4. Dashboard Top Tab Bar — Touch Friendly
**File: `src/components/home/DashboardGrid.tsx`**
- Increase tab button min-width from `52px` to `64px`
- Increase padding from `px-3 py-1.5` to `px-3 py-2.5`
- Increase icon size from `18` to `20`
- Increase label text from `text-[10px]` to `text-[11px]`
- Add bottom border indicator on active tab instead of just background color
- Increase content area padding from `p-4` to `p-5`

### 5. Widget Cards — Better Typography Hierarchy
**Files: `ClockWidget.tsx`, `WeatherWidget.tsx`, `EnergyWidget.tsx`, `TemperatureWidget.tsx`**
- Increase primary value font size (time, temperature) to `text-3xl` with `font-bold`
- Increase padding from `p-4` to `p-5`
- Increase label text from `text-[10px]` to `text-xs`
- Increase detail text from `text-[10px]` to `text-[11px]`
- Increase icon sizes from `14`/`16` to `16`/`18`
- Add more breathing room between sections

### 6. Category Cards — Softer Panels, Larger Controls
**File: `src/components/home/cards/CategoryCard.tsx`**
- Increase card padding from `p-3` to `p-4`
- Increase Switch from `scale-75` to `scale-90`
- Increase device row padding from `py-1.5 px-2` to `py-2.5 px-3` (48px min height)
- Increase inline Slider width from `w-12` to `w-16`
- Increase text sizes: category name `text-sm` → `text-base`, device name `text-xs` → `text-sm`

### 7. Device Section Cards — Better Touch & Spacing
**File: `src/components/home/cards/DevicesSection.tsx`**
- Increase card padding from `p-3` to `p-4`
- Remove `scale-75` from Switch (use full-size toggles)
- Increase slider width from `w-16` to `w-20`
- Increase spacing between device groups from `space-y-4` to `space-y-5`
- Increase device card spacing from `space-y-2` to `space-y-2.5`

### 8. Device Control Card — Larger Sliders & Buttons
**File: `src/components/home/cards/DeviceControlCard.tsx`**
- Increase all Button heights from `h-7`/`h-8` to `h-10` (minimum 48px touch targets)
- Increase Slider track height via className override
- Increase media control buttons from `h-7 w-7` to `h-10 w-10`
- Increase compact control button spacing
- Increase volume slider thumb size
- Better spacing between control sections (`space-y-3` → `space-y-4`)

### 9. Robot Panel — Touch-Friendly Room Cards
**File: `src/components/home/cards/RobotPanel.tsx`**
- Increase room zone card padding from `p-3` to `p-4`
- Increase control button heights from `h-9` to `h-11`
- Increase fan speed preset buttons from `h-6` to `h-8`
- Increase Slider track visibility
- Better spacing throughout (`space-y-4` → `space-y-5`)

### 10. Surveillance Panel — Larger Cards
**File: `src/components/home/cards/SurveillancePanel.tsx`**
- Increase card padding from `p-2` to `p-3`
- Increase text sizes for camera names and status

### 11. Activity Feed — Larger Touch Rows
**File: `src/components/home/cards/ActivityFeed.tsx`**
- Increase event row padding from `p-2` to `p-3`
- Increase text sizes slightly

### 12. Camera FAB — Larger Touch Target
**File: `src/components/home/CameraFab.tsx`**
- Increase FAB from `w-12 h-12` to `w-14 h-14`
- Increase preset buttons padding from `px-3 py-2` to `px-4 py-3`

### 13. UI Primitives — Touch-Optimized
**Files: `slider.tsx`, `switch.tsx`, `button.tsx`**
- Slider: increase thumb from `h-5 w-5` to `h-6 w-6`, track from `h-2` to `h-2.5`
- Switch: increase from `h-6 w-11` to `h-7 w-12`, thumb from `h-5 w-5` to `h-6 w-6`
- No changes to button variants (handled per-component via size props)

### 14. Standby-Ready Layout Prep (Visual Only)
**File: `src/index.css`**
- Add a `.standby-layout` utility class with CSS grid: `grid-template-columns: 1fr 1fr` — ready for future split-screen mode. No functionality yet.

## Files Changed (14 files, visual only)

| File | Change Type |
|------|-------------|
| `src/index.css` | Glass panel refinement, standby layout prep |
| `src/components/home/HomeView.tsx` | Spacing, touch targets |
| `src/components/home/HomeNav.tsx` | Larger nav buttons |
| `src/components/home/DashboardGrid.tsx` | Larger tabs, spacing |
| `src/components/home/CameraFab.tsx` | Larger FAB |
| `src/components/home/cards/ClockWidget.tsx` | Typography hierarchy |
| `src/components/home/cards/WeatherWidget.tsx` | Typography hierarchy |
| `src/components/home/cards/EnergyWidget.tsx` | Typography hierarchy |
| `src/components/home/cards/TemperatureWidget.tsx` | Typography hierarchy |
| `src/components/home/cards/CategoryCard.tsx` | Larger controls, spacing |
| `src/components/home/cards/DevicesSection.tsx` | Touch targets, spacing |
| `src/components/home/cards/DeviceControlCard.tsx` | Larger buttons/sliders |
| `src/components/home/cards/RobotPanel.tsx` | Larger room cards, controls |
| `src/components/home/cards/SurveillancePanel.tsx` | Spacing |
| `src/components/home/cards/ActivityFeed.tsx` | Larger rows |
| `src/components/ui/slider.tsx` | Larger thumb/track |
| `src/components/ui/switch.tsx` | Larger toggle |

