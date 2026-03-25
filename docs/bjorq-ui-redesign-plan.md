# BJORQ Nordic Noir UI Redesign — Arbetsplan

> Levande dokument. Uppdateras vid större beslut.

## Status

| Fas | Beskrivning | Status |
|-----|-------------|--------|
| 1 | Backup + projektplanfil | ✅ Klar |
| 2 | Design tokens + glasspanel-upgrade | ✅ Klar |
| 3 | Hem-vy: layoutläge, pills, polish | ✅ Klar |
| 4 | Kontrollpanel: nav, shell, WidgetCard | ✅ Klar |
| 5 | Widget-storlekar, drag, density | ✅ Klar |
| 6 | Energi hero-widget, sparkline | ✅ Klar |
| 7 | Klimat nuvärde/mål/trend | ✅ Klar |
| 8 | Väder prognos, hemkoppling | ✅ Klar |
| 9 | Polish: settings, profil, design-läge | ✅ Klar |

## Backup

- **Återställningspunkt**: Lovable version history (varje commit)
- **Återställning**: Använd Lovables inbyggda rollback

## Designprinciper — Nordic Noir

### ÄR
- Mörkt som standard (blåtonad kolsvart `222 18% 11%`)
- Amber sparsamt: aktiv nav, FAB-glow, primära interaktioner
- Materialitet: sotad metall, mörk sten, frostat glas
- Djupare blur (24px), gradient-bakgrunder, subtila borders
- Typografi-hierarki: stora värden (28-48px), labels (10-11px uppercase)
- Mer luft, `gap-4` minimum
- Färre men rikare moduler

### ÄR INTE
- Generisk admin-dashboard
- Neon-accenter
- 20 identiska cards
- Flat design utan djup
- 3D reducerad till ett kort

## Hem-vy (3D-first)

- 3D-scenen = huvudfokus
- Center FAB bevaras
- Overlay-widgets konfigurerbart via layoutläge (edit-mode)
- Positioner: top-left, top-right, bottom-left, bottom-right
- Storlekar: compact / normal / expanded
- Enhetskort → pill-kontroller
- Layout sparas i store

## Kontrollpanelen

- Fri widgetyta där användaren formar sin startsida
- Storlekar: S / M / L / Hero
- Drag & drop reorder
- Spara layout per breakpoint
- Density-lägen: Lugn / Balans / Tät

## Navigation

- Desktop: full rail med ikoner + labels
- Tablet: kollapsar till ikoner, touch-first (ingen hover)
- Mobil: bottom tab-bar, max 5 tabs + "Mer"

## Beslut tagna

- 2024: Planen godkänd, implementation påbörjad fas 1-3
