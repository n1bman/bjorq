# Patchnotes Draft

Detta dokument samlar pågående ändringar som ännu inte har fått en släppt versionsfil.

## Nu pågår

### Kontrollpanel
- `Profil` är nu en egen huvudmeny i dashboardens kontrollpanel.
- `Grafik & Miljö` har vikts in under `Inställningar` i stället för att ligga som separat toppnivå.
- `Inställningar` fokuserar nu på tema, display, standby, systemstatus och scen-/miljöjusteringar.
- `Profil` samlar konto, adminskydd, kopplingar, projektdata och backup.

### Kompatibilitet
- Äldre sparade dashboard-profiler som använde `graphics` som aktiv kategori migreras nu till `settings` vid bootstrap i hosted/add-on-läget.

### Verifierat
- `npm test`
- `npm run lint`
- `npm run build`
