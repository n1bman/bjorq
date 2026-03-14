

# Dashboard Correction Plan

## 1. Layout Issues & Fixes

**Current problems:**
- Nav rail is 72px — too narrow, cramped labels (9px font)
- Cards auto-stretch via CSS grid with no max-height control
- MediaScreenWidget has unconstrained `h-28` artwork + controls that stretch awkwardly
- No Home mode button in nav rail — only "Design" at bottom
- Scrollbars use browser defaults (harsh)
- Graphics & Settings use card grid when they should be page-like sections

**Fixes:**

### Nav Rail → 120px wide
- Widen to `w-[120px]`, left-align icon+label in a row (not stacked), `text-[11px]`
- Active state: subtle left border accent + bg highlight
- Add BJORQ logo/icon at top
- Bottom section: both "Hem" (Home icon) and "Design" (PenTool) buttons

### Home card sizing
- Widget grid: use `grid-auto-rows: min-content` so cards don't stretch
- MediaScreenWidget: cap artwork to `h-20`, make entire card compact (~160px max)
- CategoryCard: add `max-h` behavior, scroll internally if many devices

### 3D preview
- Keep current ~40% width, cap height to 280px on home view

## 2. Lights → Room-Based Grouping

**Current:** `HomeCategory` groups by `kindCategory` mapping (Ljus, Klimat, Media etc.) or custom categories. No room awareness.

**Fix:** When no custom categories exist, group lights by room:
- Read `markers` and cross-reference each device's `roomId` with `layout.floors[].rooms[]` to get room name
- Build groups: `{ roomName: DeviceMarker[] }` for light-type devices
- Non-light devices keep current kind-based grouping
- Result: "💡 Vardagsrum", "💡 Kök", "💡 Hall" etc. as default cards
- Devices without `roomId` go to "💡 Övrigt"

## 3. Page-Like Sections (not widget grids)

**Graphics & Settings already use section-based layout** — they just need polish:
- Graphics: remove `max-w-[700px]`, use full width with two-column section layout
- Settings: already has sections — just clean up spacing, use `gap-6` between sections, larger section headers

These will NOT use `SortableWidgetGrid` — they stay as structured settings pages.

## 4. Navigation Hierarchy Fix

Bottom of nav rail currently only has "Design". Fix:
- When in dashboard: show "Design" button at bottom
- The nav rail categories already include "Hem" as first item, so Home is accessible
- Ensure `appMode` toggle works: clicking "Design" → build mode, and build mode has a way back to dashboard (already exists via BuildModeV2's header)

## 5. Visual Design Push

- **Scrollbars**: Add global thin scrollbar styling (like `.catalog-scroll` but for all `overflow-y-auto`)
- **Glass panels**: Increase `box-shadow` depth, add subtle inner glow on hover
- **Nav rail**: Add warm gradient background (`from-[hsl(222,18%,10%)] to-[hsl(222,16%,13%)]`)
- **Active nav item**: Amber left-border accent + soft glow
- **Summary cards top row**: Add subtle bottom gradient separator instead of flat `border-b`
- **Card hover**: Subtle scale + glow on hover for interactive feel

## Files Changed

| File | Change |
|------|--------|
| `src/components/home/DashboardShell.tsx` | Wider nav rail (120px), restore Home nav, improve visual styling, scrollbar classes |
| `src/components/home/DashboardGrid.tsx` | Room-based light grouping in HomeCategory, polish Graphics/Settings layouts |
| `src/components/home/cards/CategoryCard.tsx` | Add max-height + internal scroll for large device lists |
| `src/components/home/cards/MediaScreenWidget.tsx` | Compact card height, smaller artwork area |
| `src/index.css` | Global scrollbar styling, enhanced glass-panel variants, nav glow utilities |

## Implementation Order
1. CSS: scrollbars, glass enhancements, nav styling
2. DashboardShell: wider nav, Home button, visual polish
3. HomeCategory: room-based light grouping
4. Card sizing: MediaScreenWidget compact, CategoryCard max-height
5. Graphics/Settings: page-like section polish

