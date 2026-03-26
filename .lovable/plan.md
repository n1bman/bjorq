

# BJORQ — UI-korrigeringar (4 punkter)

## 1. Enhetskort: tydligare linje + brightness bar bara i stängt läge

**Problem:** Brightness-baren (den fadeade ljusraden) visas även i expanded-läge. Dubbel info: "68% neutral vit" visas både i stängt och öppet läge. Det finns 2 on/off-switchar (en i raden + en i DeviceControlCard).

**Fix i `CategoryCard.tsx`:**
- Lägg till en tydligare `border` runt varje enhetsrad (`border border-[hsl(var(--border)/0.15)] rounded-xl`)
- Villkora brightness-baren: visa **bara** när `!expanded` — när man öppnar enheten ska baren försvinna
- Ta bort `toneLabel`-texten under enhetsnamnet (rad 220-222: `{pct}% · {toneLabel}`) — den informationen finns redan i det expanderade DeviceControlCard
- Ta bort den duplicerade switchen: behåll **bara** switchen i raden (rad 251-254), ta bort switchen i `LightControl` inuti `DeviceControlCard.tsx` (rad 308)

**Fix i `DeviceControlCard.tsx` → `LightControl`:**
- Ta bort `<Switch>` från LightControl (rad 308) — switchen i CategoryCard-raden räcker

## 2. "Hantera kategorier" flytta till höger om filter-tabs

**Fix i `DashboardGrid.tsx` → `HomeCategory`:**
- Ta bort header-diven med "Hantera kategorier" + "Redigera" (rad 279-288)
- Flytta dessa knappar in i filter-tabs-raden (rad 341-356), placerade till höger efter alla filterchips
- Layout: `flex items-center` med chips till vänster, knappar till höger med `ml-auto`

## 3. Ta bort Hemstatus från vänstermenyn

**Fix i `DashboardShell.tsx`:**
- Ta bort `<NavHomeStatus collapsed={collapsed} />` (rad 269)
- Ta bort hela `NavHomeStatus`-funktionen (rad 287-311)

## 4. Info-korten (TID/UTE/ENERGI/KOMFORT) — mer livfulla + klickbara

**Fix i `DashboardGrid.tsx` → `InfoCard`:**
- Gör korten klickbara: UTE → navigerar till `weather`, ENERGI → `energy`, KOMFORT → `climate`
- Acceptera en `onClick`-prop och lägg till `cursor-pointer hover:ring-1 hover:ring-primary/20`
- Ge varje kort en subtil accent: TID = neutral, UTE = blå tint, ENERGI = amber tint, KOMFORT = grön tint
- Uppdatera anropen (rad 295-298) att skicka `onClick={() => setDashCategory('weather')}` etc.

---

## Filer som ändras

| Fil | Vad |
|-----|-----|
| `CategoryCard.tsx` | Border på rader, brightness bar bara !expanded, ta bort dubbel tone-text |
| `DeviceControlCard.tsx` | Ta bort Switch från LightControl |
| `DashboardGrid.tsx` | Flytta hantera/redigera till filter-rad, klickbara info-kort |
| `DashboardShell.tsx` | Ta bort NavHomeStatus |

