# BJORQ Dashboard v1.8.5

## Fokus

Den här releasen gör kontrollpanelen mer logisk som systemyta. `Profil` är nu en egen huvudmeny, medan grafik-, preview- och miljöinställningar har flyttats in under `Inställningar`.

## Ändrat

- `Profil` är nu en egen toppnivå i dashboarden.
- `Inställningar` samlar nu tema, display, standby, 3D-preview, grafik, miljö och systemstatus.
- `Profil` samlar nu konto, adminskydd, kopplingar, projektdata och backup.
- `Grafik & Miljö` finns inte längre som separat huvudmeny.

## Fixat

- Äldre sparade dashboard-profiler som fortfarande pekade på `graphics` migreras nu automatiskt till `settings` i hosted/add-on-läget.

## Bevarat

- Standby-kameravy och 3D-preview finns kvar.
- `Spara aktuell kameravy` och `Förhandsgranska Standby` fungerar fortsatt från standbysektionen.
- Grafikinställningarna ligger kvar i kontrollpanelen, men nu under `Inställningar`.

## Verifierat

- `npm test`
- `npm run lint`
- `npm run build`
