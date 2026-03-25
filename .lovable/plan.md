

# BJORQ Nordic Noir UI Redesign — Final Plan

## 1. Backup
- Skapa git-branch `pre-redesign-snapshot` innan första ändringen
- Lovable version history som sekundär återställning

## 2. Projektplanfil
Skapar `docs/bjorq-ui-redesign-plan.md` som levande dokument.

---

## 3. Hem-vyn (3D-first)

**Bevaras:** 3D-scen som huvudfokus, center FAB, CameraFab, RoomNavigator.

**Nytt — konfigurerbar widget-overlay med layoutläge:**
- Overlay-widgets (klocka, väder, energi, temperatur) blir positionerbara och storleksbara
- Positionering sker i ett **dedikerat layoutläge** (edit-mode) — inte fritt drag i vanlig vy
- I layoutläge: visa grid-guides, drag-handles, storleksväljare (compact/normal/expanded)
- Utanför layoutläge: widgets är låsta, Hem känns lugn och ren
- Layout sparas i store (`homeView.widgetLayout`)
- Enhetskort i botten → pill-formade kontroller (ikon + namn + toggle i en rad)

## 4. Kontrollpanelen — fri widgetyta

### Widgetsystem (kärna)
- Storlekar: **S** (1 col, kompakt) / **M** (1 col, ~200px) / **L** (2 col, ~300px) / **Hero** (full bredd, ~400px)
- **Drag & drop reorder** med visuell feedback
- **Gruppering/kategorisering**: widgets kan taggas och filtreras
- **Spara layout** per breakpoint: `layoutDesktop`, `layoutTablet`, `layoutMobile`
- **Density-lägen**: Lugn / Balans / Tät (påverkar spacing och antal synliga widgets)
- Användaren bygger sin egen startsida — detta är en kärndel av produkten

### Navigation — informationsarkitektur först
Exakt antal poster låses inte. Principerna:

- **Desktop**: full rail med ikoner + labels, grupperad med separatorer (Huvudmenyer / System)
- **Tablet**: rail kollapsar till ikoner — **ingen hover-tooltip**, istället: tap öppnar label-flyout eller inline-expand. Touch-first.
- **Mobil**: rail borta, bottom tab-bar med **max 5 synliga tabs** + "Mer" som öppnar sheet med resterande poster

Föreslagna huvudgrupper (kan justeras under implementation):
```
Hem · Kontrollpanel · Enheter · Energi · Klimat · Väder · Inställningar · Profil
```
Automation, Scener, Övervakning, Robot, Kalender, Aktivitet → tillgängliga som widgets i Kontrollpanelen + via "Mer" på mobil.

### Summary-bar
Smalare, mörkare. Klocka + väder + snabbstatus. Minimal höjd.

---

## 5. Energi — egen identitet, produktnytta

- **Hero-widget**: Live-förbrukningscirkel (aktuell watt i centrum, ring = andel av dagsmål)
- **Sparkline-graf** (inline SVG): timvis/daglig förbrukning
- **Kostnadspanel**: estimerad dagskostnad baserat på elpris
- **Peak-markering**: visuellt utmärkta topptider
- **Enhetsranking**: sorterad efter förbrukning med progressbar

## 6. Klimat — produktnyttig, inte gauge-dashboard

Klimatvyn ska prioritera **beslutsstöd** framför visuell effekt:

- **Nuvärde + mål**: Tydlig display av nuvarande temperatur/fukt vs inställt mål per rum
- **Trend**: 24h kurva (inline SVG) — visar riktning, inte bara ögonblicksbild
- **Rumsjämförelse**: Alla rum med temperatur side-by-side, snabb överblick av avvikelser
- **Regler/status**: ComfortRules med tydlig status (aktiv/inaktiv/triggered) och senaste åtgärd
- **Override-panel**: bevaras, tydligare visuell koppling till aktiva regler
- Inga cirkulära gauges bara för show — data ska vara läsbar och actionable

## 7. Väder — visuell identitet

- **Nu-panel**: Stor temperatur + ikon + känsla ("Klart och kallt")
- **Prognos-strip**: 24h horisontell med timvisa ikoner
- **Hemkoppling**: "Påverkan på hemmet" baserat på fönster + solvinkel
- Subtil gradient baserad på tid på dygnet

---

## 8. Nordic Noir designregler

**ÄR:**
- Mörkt som standard (`222 18% 11%`, blåtonad kolsvart)
- Amber sparsamt: bara aktiv nav-indikator, FAB-glow, primära interaktioner
- Materialitet: sotad metall, mörk sten, frostat glas — djupare blur (24px), gradient-bakgrunder på widgets (`from-[#1a1a22] to-[#12121a]`), subtila borders (`border-border/20`)
- Typografi-hierarki: stora värden (28-48px Space Grotesk), labels (10-11px uppercase tracking-wider), rubriker (14-16px)
- Spacing: mer luft, `gap-4` minimum
- Färre men rikare moduler

**ÄR INTE:**
- Generisk admin-dashboard
- Neon-accenter
- 20 identiska cards
- Flat design utan djup
- 3D-scenen reducerad till ett kort

---

## 9. Implementeringsordning

| Fas | Fokus | Huvudfiler |
|-----|-------|-----------|
| **1** | Git-branch backup + projektplanfil | `docs/bjorq-ui-redesign-plan.md` |
| **2** | Design tokens + glasspanel-upgrade | `index.css`, `tailwind.config.ts` |
| **3** | Hem-vy: layoutläge, widget-positionering, pills, visuell polish | `HomeView.tsx`, widgets |
| **4** | Kontrollpanel: nav-gruppering, responsiv kollaps, WidgetCard | `DashboardShell.tsx`, `DashboardGrid.tsx` |
| **5** | Widget-storlekar, drag, density, layout-sparning | `types.ts`, `useAppStore.ts`, `SortableWidgetGrid.tsx` |
| **6** | Energi med hero-widget, sparkline, kostnad | `EnergyWidget.tsx`, ny `EnergyHero.tsx` |
| **7** | Klimat med nuvärde/mål/trend/rumsjämförelse/regler | `ClimateTab.tsx` |
| **8** | Väder med prognos, hemkoppling | `WeatherWidget.tsx`, `SunWeatherPanel.tsx` |
| **9** | Polish: settings, profil, design-läge | Diverse cards, toolbar |

**Tekniskt:** React + Tailwind + TS, inga nya dependencies fas 1-5, inline SVG för grafer fas 6-8, Tailwind breakpoints för responsivitet, all befintlig logik (store, hooks, HA, 3D) bevaras intakt.

