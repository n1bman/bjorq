

## Plan: Document Full Roadmap + Implement Phase 1

### Step 1 — Create `/docs/roadmap-vNext.md`

Create a comprehensive roadmap document containing all 7 phases with:
- Phase title, description, and deliverables for each
- Status tracking (todo/in-progress/done)
- Technical notes on architecture impact (dual-mode, state schema changes)
- Dependencies between phases
- Implementation rules (relative imports, no breaking dev mode, etc.)

Content will mirror the user's specification, enriched with technical details from the current codebase (store shape, component structure, server API).

### Step 2 — Phase 1.1: Design System Consistency

Changes across the UI:

1. **Unified spacing tokens** — Add CSS custom properties for consistent padding/gaps (`--space-panel`, `--space-section`) used in all `glass-panel` components.

2. **Toggle state clarity** — The `PerformanceSettings` quality buttons use ad-hoc border styling. Refactor to a shared `OptionButton` component with clear active/inactive/disabled states that works across all themes.

3. **Theme improvements** — Review `src/index.css` for Midnight and Light theme variants. Midnight currently only exists as a profile option but has no distinct CSS variables. Add `:root[data-theme="midnight"]` and `:root[data-theme="light"]` variable blocks with appropriate contrast for wall-mounted tablet readability.

4. **Glass panel consistency** — Audit all panels in DashboardGrid for consistent `rounded-2xl p-4/p-5` usage. Standardize to `p-4` for cards, `p-5` for settings panels.

### Step 3 — Phase 1.2: Settings Restructure

1. **Move Location** — Remove `<LocationSettings />` from `WeatherCategory` in `DashboardGrid.tsx`. It already exists in `SettingsCategory`. Update `WeatherCategory` to show weather data only.

2. **Enhance ProfilePanel** — Add version display (from `package.json`), active location summary, and backup status indicator to `ProfilePanel.tsx`.

3. **Improve Prestanda visual states** — Make the quality option buttons in `PerformanceSettings.tsx` use the new shared `OptionButton` component with stronger active/inactive contrast.

4. **Settings grouping** — Reorder `SettingsCategory` panels into clearer logical groups with section headers: "Utseende" (Profile), "System" (Performance, Standby), "Anslutning" (HA, Location), "Data" (Backup/Export in ProfilePanel).

### Technical Details

- **Files created:** `docs/roadmap-vNext.md`
- **Files modified:** `src/index.css` (theme vars), `src/components/home/DashboardGrid.tsx` (settings restructure, remove Location from Weather), `src/components/home/cards/ProfilePanel.tsx` (version + status), `src/components/home/cards/PerformanceSettings.tsx` (visual states)
- **New component:** Shared `OptionButton` or extend existing Button variants
- **No state schema changes** — Phase 1 is purely visual/structural
- **Import convention:** All new files use relative imports only

