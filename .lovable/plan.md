

## Förebyggande plan

### 1. Kodkonvention: Använd alltid relativa importer
Alla nya filer ska använda relativa importer (`../`, `./`) istället för `@/`-alias. Alias-konfigurationen kan finnas kvar i tsconfig/vite för kompatibilitet, men ska inte användas i importerna.

### 2. Lint-regel (valfri framtida förbättring)
Lägg till en ESLint-regel som varnar vid `@/`-importer, t.ex. via `eslint-plugin-no-restricted-imports`. Detta fångar problemet innan det når produktion.

### 3. Uppdatera .lovable/plan.md
Dokumentera beslutet att använda relativa importer i projektets plan-fil så att AI:n och framtida utvecklare följer samma konvention.

### 4. Verifiera devmiljön
Appen laddar nu korrekt. Nästa steg är att testa alla vyer (Hem, Kontrollpanel, Bygge/3D) för att säkerställa att inga andra problem uppstått under felsökningen.

### Tekniska detaljer
- **Filer ändrade:** ~80 filer, ~254 importrader
- **Typ av ändring:** Rent mekanisk omskrivning, ingen funktionalitet påverkad
- **Konfiguration:** `vite.config.ts` och `tsconfig.app.json` behåller `@`-alias för bakåtkompatibilitet men det används inte

