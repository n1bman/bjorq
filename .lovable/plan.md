

## Plan: Theme Text Fix, Furniture Shadow Logic, Floor Picker Popup, Energy Widget Always-Expanded

### 1. Fix black/invisible text across entire app on dark themes

**Root cause**: Multiple elements lack explicit `text-foreground` or rely on inheritance that breaks in certain contexts.

**Files to fix:**

- **`src/components/ui/button.tsx`** — The `outline` variant (`border border-input bg-background hover:bg-accent hover:text-accent-foreground`) has no explicit text color for the non-hover state. Add `text-foreground` to ensure visibility on all themes.

- **`src/components/build/BuildTopToolbar.tsx`** — The `<select>` elements on lines 108-118 and 120-130 use `text-foreground` but native `<option>` elements inside selects can render with OS-default black text. Add explicit `text-foreground` and ensure the `<option>` elements also get proper coloring via inline styles or a class.

- **`src/components/ui/OptionButton.tsx`** — The inactive state uses `text-muted-foreground` which may be too dim. Verify and ensure labels remain visible.

- **`src/components/ModeHeader.tsx`** — Verify `text-foreground` was applied (already done in previous pass, but confirm it's on the right elements including subtitle).

- **Global sweep** — Search for any `<select>`, `<option>`, raw `<input>`, `<label>`, or heading elements that lack explicit theme-aware text color classes and add `text-foreground` where needed.

### 2. Furniture should only receive shadows from device lights, not from sunlight

**File: `src/components/build/Props3D.tsx`**
- Change `child.castShadow = true` and `child.receiveShadow = true` (line 201-202) to:
  - `child.castShadow = false` — furniture does NOT cast directional (sun) shadows
  - `child.receiveShadow = true` — furniture still receives shadows from other objects
- This means furniture won't block the directional sun light. Device point/spot lights with `castShadow` enabled will still interact with furniture normally since their shadow maps are independent.

### 3. Floor picker ("Våningar") should open as a dropdown card, not a slider

**File: `src/components/build/FloorPicker.tsx`**
- The current implementation already renders a dropdown (`<div className="absolute top-full ...">`) — this looks correct. However, the user says "en slider" appears. This might be due to the `FloorManager.tsx` component being used elsewhere. Check if `FloorManager` is rendered in the left panel and replaces the picker with an accordion/collapsible style. The `FloorPicker` in the toolbar already uses a proper popup card — confirm it's the only one visible and that the `FloorManager` isn't interfering.

Looking at the code, `FloorPicker` already renders as a popup card with proper styling. The "slider" behavior the user sees might be from a different component. Will verify `FloorManager` is not duplicating and ensure the dropdown has proper `bg-card rounded-xl shadow-xl` styling matching the Sol & Väder panel.

### 4. Energy widget always expanded when on Energy tab

**File: `src/components/home/cards/EnergyWidget.tsx`**
- Add an optional `alwaysExpanded` prop (default `false`)
- When `alwaysExpanded` is true, skip the toggle behavior and always show the expanded view

**File: `src/components/home/DashboardGrid.tsx`**
- In `EnergyCategory` (line 211-217), pass `alwaysExpanded` to `<EnergyWidget alwaysExpanded />`
- The widget on the Hem tab (line 121) keeps its toggle behavior

### Files modified (5)
- `src/components/ui/button.tsx` — add `text-foreground` to outline variant
- `src/components/build/Props3D.tsx` — `castShadow = false` for furniture
- `src/components/home/cards/EnergyWidget.tsx` — add `alwaysExpanded` prop
- `src/components/home/DashboardGrid.tsx` — pass `alwaysExpanded` to energy tab widget
- `src/components/build/BuildTopToolbar.tsx` — fix select/option text colors

