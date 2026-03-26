

# Nav-menyerna ska använda sektionsfärg + flytta Play/Delete till scen-editorn

## 1. Nav rail: sektionsspecifik accent för Energi, Klimat, Väder

**Fil:** `src/components/home/DashboardShell.tsx`

**Nu:** Alla aktiva menyval använder `text-primary` + `border-primary` + `amber-glow` (rad 218-219).

**Fix:** Lägg till en map som kopplar category-key till section-token:

```ts
const sectionAccent: Partial<Record<DashCategory, string>> = {
  energy: 'var(--section-energy)',
  climate: 'var(--section-climate)',
  weather: 'var(--section-weather)',
};
```

När `active` och category har en sectionAccent, använd den istället för `--primary` / `--amber-glow` för:
- `text-[hsl(...)]` istället för `text-primary`
- `border-[hsl(...)]` istället för `border-primary`
- `bg-[hsl(.../0.08)]` och `shadow` med sektionsfärgen

Övriga kategorier behåller `text-primary` som idag.

Gäller även mobilens bottom-tabs (rad 78-80) — samma logik.

---

## 2. Scener: flytta Play + Delete från hover till scen-editorn

**Fil:** `src/components/home/cards/ScenesPanel.tsx`

**Nu (rad 481-497):** Play och Trash2 visas i en hover-overlay (`opacity-0 group-hover:opacity-100`) — fungerar inte på touch.

**Fix:**
- **Ta bort** hela hover-overlay-blocket (rad 481-497).
- **Ta bort** hjälptexten "Hovra och tryck..." (rad 507).
- **Lägg till** Play- och Delete-knappar **inuti SceneForm** (edit-läget, rad 446-area), t.ex. som en footer-rad i editorn:
  - "Aktivera scen" (Play-knapp) — kör `activateScene(scene.id)`
  - "Ta bort scen" (Trash2-knapp, destructive) — kör `removeScene(scene.id)` + stäng editor
- Uppdatera hjälptexten till: "Klicka på en scen för att redigera, aktivera eller ta bort."

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/DashboardShell.tsx` | Sektionsfärg för Energi/Klimat/Väder i nav rail + mobil-tabs |
| `src/components/home/cards/ScenesPanel.tsx` | Flytta Play/Delete från hover till SceneForm, ta bort hover-overlay |

