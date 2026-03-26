
Mål: Få färglogiken i Utseende att bli förutsägbar (särskilt accent + senaste använda), separera 3D-bakgrund från UI-bakgrund, och lägga temats export/import i Profil.

1) Stabilisera färgval och byt färg-popup-logik
- Fil: `src/components/home/cards/ThemeCard.tsx`
- Ersätt nuvarande “live-spara på varje drag”-beteende för accent/custom pickers med två steg:
  - preview (visuell uppdatering medan man drar)
  - commit (spara slutvärde när man bekräftar/stänger picker)
- Byt från nuvarande native `type="color"`-flöde till en mer kontrollerad popover-flow för att undvika att sista färgen tappas.
- Spara alltid både “startfärg” och “slutfärg” vid commit så användaren kan gå tillbaka.

2) Fixa “Senast använda” så den blir praktiskt användbar
- Fil: `src/components/home/cards/ThemeCard.tsx`
- Nu floodas listan med nästan identiska blå nyanser (bekräftat av replay-event).
- Ändra logik så recent-färger uppdateras endast på commit, inte på varje drag-event.
- Normalisera hex (lowercase), deduplicera, behåll max 6.
- Låt “Senast använda” kunna appliceras på aktuell färgkontroll (inte bara accent implicit), så den matchar användarens arbetsflöde från popupen.

3) Särskilj bakgrundslogiken (3D-scen vs UI)
- Filer:  
  - `src/components/home/cards/ThemeCard.tsx`  
  - `src/pages/Index.tsx` (eller `src/components/home/DashboardShell.tsx`, beroende på var overlay ska ligga)  
  - `src/store/types.ts`
- Behåll bakgrundslägena (3D-vy/Gradient/Enfärgad) som “scen-bakgrund”.
- Döp om nuvarande färgpunkt “Bakgrund” till “Panelbakgrund (UI)” för att undvika sammanblandning.
- Lägg till separat scenfärg för läget “Enfärgad” (t.ex. `sceneOverlayColor`) så färgen gäller 3D-bilden, inte hela UI:t.
- Wire:a `profile.dashboardBg` till faktisk rendering via overlay ovanpå 3D-scenen:
  - `scene3d` = ingen overlay
  - `gradient` = gradient overlay
  - `solid` = solid overlay med vald scenfärg

4) Lägg temahantering för export/import under Profil
- Filer:
  - Ny: `src/components/home/cards/ThemeBackupCard.tsx`
  - `src/components/home/DashboardGrid.tsx`
  - ev. `src/store/types.ts` (export payload-typ)
- Lägg ett nytt kort i Profil → Data: “Teman”.
- Exportera/importera tema-data separat (utan full installationsbackup):
  - `theme`, `accentColor`, `dashboardBg`, `customColors`, `savedThemes`
- Import ska validera JSON-format och merge:a säkert (dedupe på tema-id/namn).

5) Säkerställ kompatibilitet och migrering
- Fil: `src/store/types.ts` (+ ev. lätt guard i `useAppStore.ts` vid behov)
- Nya fält görs optional för bakåtkompatibilitet.
- Existerande sparad data fortsätter fungera utan hård migration.
- Ingen ändring i full backup-format krävs för att befintliga backups ska fortsätta gå att läsa.

Tekniska detaljer (kort)
- Huvudorsak till “Senast använda funkar inte”: färginput skickar många mellanvärden under drag, och varje värde pushas till recent-listan.
- Rotfix: commit-baserad persist + recent-lista uppdateras endast vid commit.
- Bakgrundsförvirring idag: `dashboardBg` visas i UI men är i praktiken inte tydligt kopplad till en separat scen-overlay; samtidigt används `bgColor` för UI-variabler. Dessa två måste separeras tydligt i både namn och rendering.

Filer som ändras
- `src/components/home/cards/ThemeCard.tsx`
- `src/store/types.ts`
- `src/pages/Index.tsx` (alternativt `src/components/home/DashboardShell.tsx`)
- `src/components/home/DashboardGrid.tsx`
- `src/components/home/cards/ThemeBackupCard.tsx` (ny)
