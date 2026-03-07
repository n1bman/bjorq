

## Fix Build Error + Redesign Build Mode UI (Sims 4-inspired)

### Build Error Fix

The `TerrainEnvironment3D` file exists but Vite can't resolve it. The fix is to re-save the file content to force module detection. This is a one-line fix applied first.

### Current Problems

The build mode UI is functional but feels "stiff" compared to games like The Sims 4:

- **Top toolbar is overcrowded**: 20+ buttons crammed into one row (tools, undo, grid, view modes, wall modes, environment, clear, save)
- **Left panel is text-heavy**: Narrow sidebar with small text labels that collapse to icons on mobile
- **Bottom tab bar is plain**: Four text buttons with no visual hierarchy
- **Inspector floats awkwardly**: Glass panel overlapping the viewport

### Sims 4 UI Patterns to Adopt (from reference images)

```text
┌──────────────────────────────────────────────────┐
│  [Undo][Redo]  [View: Plan|3D]  [Floor▾]  [Klar]│  ← Minimal top bar
├────┬─────────────────────────────────────────────┤
│ 🏠 │                                             │
│ 🚪 │           VIEWPORT (2D / 3D)                │
│ 🪟 │                                             │
│ 🪜 │                              [Inspector]    │
│ 🎨 │                                             │
│ 📐 │                                             │
│ 📦 │                                             │
├────┴─────────────────────────────────────────────┤
│ [Search 🔍] │ ████ ████ ████ ████ ████ ████ ████│  ← Catalog strip
│  Category   │  scrollable thumbnails / options   │
│  icons      │                                    │
└─────────────┴────────────────────────────────────┘
```

### Implementation Plan

**1. Fix build error** — Re-save `TerrainEnvironment3D.tsx` to clear Vite cache.

**2. Redesign `BuildTopToolbar`** — Slim it down to only:
- Undo/Redo
- View toggle (Plan / 3D / Isolate)
- Wall view mode (compact icon group)
- Floor picker
- "Klar" (done) button
- Move grid, snap, environment, clear into a settings popover (gear icon)

**3. Redesign `BuildLeftPanel` → icon-only category sidebar** — Inspired by Sims 4's left sidebar:
- Vertical strip of large icon buttons (no text, tooltip on hover)
- Categories: Struktur, Importera, Möblera, Enheter (replaces bottom tab bar)
- Within Struktur: sub-icons for Wall, Room, Door, Window, Stairs, Paint, etc.
- Active tool highlighted with amber accent + subtle glow
- Width: 56px fixed, no expanding

**4. New `BuildCatalogStrip` (bottom bar)** — Replaces `BuildTabBar`:
- Horizontal scrollable strip showing context-sensitive content
- For Structure: material swatches, template thumbnails, preset cards
- For Furnish: prop catalog thumbnails with search
- For Devices: device type cards with icons
- For Import: import action cards
- Search field on the left side
- Visual thumbnails instead of text lists
- Height: ~120px with two rows of items

**5. Relocate sub-panels** — Templates, Paint, Scale calibration, Reference drawing, and Terrain tools move into the catalog strip or slide-up panels from the bottom, instead of expanding the left sidebar.

**6. Inspector stays** but gets a slight visual refresh — rounded card with better spacing, matching the darker game-UI aesthetic.

### Files Changed

| File | Action |
|------|--------|
| `src/components/build/TerrainEnvironment3D.tsx` | Re-save (fix build) |
| `src/components/build/BuildTopToolbar.tsx` | Slim down, move secondary controls to popover |
| `src/components/build/BuildLeftPanel.tsx` | Rewrite as icon-only category + tool sidebar |
| `src/components/build/BuildTabBar.tsx` | Replace with `BuildCatalogStrip.tsx` |
| `src/components/build/BuildCatalogStrip.tsx` | New — horizontal scrollable catalog bar |
| `src/components/build/BuildModeV2.tsx` | Update layout to new component structure |
| `src/index.css` | Add catalog strip scrollbar styles |

### Technical Details

- Left sidebar uses a two-level icon system: top-level tabs (4 categories) and sub-tools (varies by category) separated by a divider
- Catalog strip uses `overflow-x: auto` with `scrollbar-hide` for smooth horizontal scroll
- Sub-panels (paint, templates, terrain) render inside the catalog strip area instead of expanding the sidebar
- Settings popover uses Radix `Popover` for grid size, snap mode, environment controls
- All buttons maintain 44px minimum touch targets

