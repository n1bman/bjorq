

# Dashboard Redesign Plan -- BJORQ Kontrollpanel

## Current Architecture

The dashboard is split across three app modes:

| Mode | Component | Purpose |
|------|-----------|---------|
| `home` | `HomeView` | Full-screen 3D scene with floating widgets |
| `dashboard` | `DashboardView` → `DashboardGrid` | 3D at top (35vh) + horizontal tab bar + scrollable content |
| `build` | `BuildModeV2` | Design/editor mode |

**Current problems identified:**
- `DashboardView` uses a stacked layout: 3D (35vh) on top, then a horizontal scrolling tab bar, then content below
- The horizontal tab bar at the top is cramped with 14 categories in a scrollable row
- No per-category widget layout persistence exists in the store
- No drag-to-reorder infrastructure for widgets (only for device categories within HomeCategory)
- The 3D view dominates the viewport
- The `home` and `dashboard` modes are separate — the concept image merges them

---

## Redesign Plan (4 Phases)

### Phase 1: Layout Shell (the biggest change)

Merge `home` and `dashboard` into a single unified view. Replace the current stacked layout with a **sidebar + main content** layout:

```text
┌──────┬──────────────────────────────────────┐
│      │  [Clock] [Weather] [Energy] [Scenes] │  ← summary cards
│ Nav  ├──────────────┬───────────────────────┤
│ Rail │   3D Preview │   Widget Grid         │
│      │   (medium)   │   (category content)  │
│ 14   │              │                       │
│ icons│              │                       │
│      ├──────────────┴───────────────────────┤
│      │   More widget cards below            │
└──────┴──────────────────────────────────────┘
```

**Technical approach:**
- Create a new `DashboardShell.tsx` replacing both `DashboardView` and `DashboardGrid`
- Left nav rail: ~72px wide, icon + label, vertical scroll, touch-friendly (48px+ hit targets)
- Top row: summary cards (clock, weather, energy, scenes) — same widgets, horizontal flex
- Main area: CSS Grid with 3D preview as one cell (~40% width on "Hem" tab) and widget grid filling the rest
- 3D preview size controlled per category (visible on Hem, smaller/hidden on Settings etc.)
- Remove `HomeNav` (the floating FAB) — navigation moves to left rail
- Keep `home` and `dashboard` as a single `AppMode` or keep `dashboard` and redirect `home` → `dashboard`

**Files changed:**
- New: `src/components/home/DashboardShell.tsx`
- Modified: `src/pages/Index.tsx` (merge home/dashboard modes)
- Modified: `src/components/home/HomeNav.tsx` (remove or repurpose)
- Existing category content functions from `DashboardGrid.tsx` are preserved and imported

### Phase 2: Per-Category Widget Layouts & Persistence

Add a store slice for per-category widget arrangement:

```typescript
// In types.ts
interface WidgetPlacement {
  widgetId: string;    // e.g. 'clock', 'weather', 'energy-chart', 'device-lights'
  order: number;       // sort order within grid
  colSpan?: 1 | 2;    // grid column span
}

interface CategoryLayout {
  categoryKey: DashCategory;
  widgets: WidgetPlacement[];
}

// In AppState
categoryLayouts: Record<DashCategory, WidgetPlacement[]>;
setCategoryLayout: (cat: DashCategory, widgets: WidgetPlacement[]) => void;
```

- Each category gets a default widget set (e.g. "energy" defaults to `[EnergyWidget, EnergyDeviceList]`)
- User rearrangements are persisted per category
- Stored via existing Zustand persist + autosave to server in hosted mode
- No external dependency needed

**Files changed:**
- `src/store/types.ts` — add types
- `src/store/useAppStore.ts` — add slice + defaults + actions

### Phase 3: Touch Drag-to-Reorder

Implement long-press → drag reorder for widget cards:

- Long-press (500ms) enters "edit mode" for the current category
- Cards get a subtle wobble/outline animation
- Touch drag uses `pointer` events (pointerdown/pointermove/pointerup) with manual position tracking — no external library needed
- On drop, update `categoryLayouts[activeCategory]` order
- An explicit "Klar" button exits edit mode
- Alternative: a dedicated "Redigera" button in the top-right (like current implementation) that toggles edit mode

**Technical approach:**
- Build a `SortableWidgetGrid` component wrapping children
- Track drag state with `useRef` for positions, `useState` for visual reorder
- CSS `transform: translate()` for smooth drag visuals
- On release, commit new order to store

**Files changed:**
- New: `src/components/home/SortableWidgetGrid.tsx`
- Modified: each category content component to wrap in `SortableWidgetGrid`

### Phase 4: Polish & Category-Specific Layouts

- Refine each category's default widget composition
- Add "Lägg till widget" button per category with available widget picker
- 3D preview visibility/size per category (large on Hem, medium on Devices, hidden on Settings)
- Smooth transitions between categories
- Tablet breakpoint tuning (target 1024-1366px landscape)
- Ensure `build` mode access from nav rail (bottom icon or separate area)

---

## What to Preserve

- All existing widget components (ClockWidget, WeatherWidget, EnergyWidget, etc.)
- All category content logic (HomeCategory, DevicesCategory, SettingsCategory, etc.)
- Store structure for devices, HA connection, standby, etc.
- The glassmorphism/dark theme design language
- Device interaction patterns (long-press for control, toggle on tap)
- The 3D scene as a visual element (just smaller/repositioned)

## What Changes

- Layout: stacked → sidebar + grid
- Navigation: horizontal tab bar → vertical nav rail
- 3D: 35vh full-width banner → medium inline card (~40% width, ~300px height)
- Widget arrangement: fixed per category → user-customizable per category
- App modes: `home` + `dashboard` → single unified mode
- HomeNav FAB: removed (nav rail replaces it)

## Suggested Implementation Order

1. **Phase 1** first — it's the structural foundation. Everything else builds on it.
2. **Phase 2** next — persistence layer before drag logic.
3. **Phase 3** — drag interaction on top of the persistence.
4. **Phase 4** — polish pass.

Each phase is independently deployable and testable.

