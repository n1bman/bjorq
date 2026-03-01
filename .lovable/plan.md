

## Sammanfattning av problemet

Vi har bekräftat att:
- Relativa importer (`./lib/utils`) fungerar
- `@/`-alias-importer misslyckas i Lovable-miljön trots korrekt `vite.config.ts` och `tsconfig.app.json`
- Det finns 254 `@/`-importer i 49 filer

Att fortsätta felsöka alias-konfigurationen kostar fler credits utan garanti. Problemet verkar vara miljöspecifikt i Lovable's Vite-setup.

## Plan: Konvertera alla `@/`-importer till relativa sökvägar

**Steg 1**: Återställ `App.tsx` till den fullständiga versionen (med alla routes, providers, etc.) men med relativa importer istället för `@/`.

**Steg 2**: Gå igenom alla 49 filer som använder `@/`-importer och ersätt dem med korrekta relativa sökvägar (t.ex. `@/lib/utils` → `../../lib/utils` beroende på filens plats).

**Steg 3**: Behåll alias-konfigurationen i `vite.config.ts` och `tsconfig.app.json` (för framtida kompatibilitet), men använd den inte i importerna.

## Tekniska detaljer

Filerna grupperade per katalog:
- `src/components/ui/` (ca 35 filer) — mestadels `@/lib/utils`
- `src/components/build/` (ca 10 filer) — `@/store`, `@/lib`, `@/components`
- `src/components/home/` (ca 10 filer) — `@/store`, `@/hooks`, `@/components`
- `src/pages/`, `src/hooks/`, `src/lib/` — diverse `@/`-importer

Varje fil får sin import-sökväg beräknad relativt sin egen position. Exempel:
- `src/components/ui/button.tsx`: `@/lib/utils` → `../../lib/utils`
- `src/components/build/BuildModeV2.tsx`: `@/store/useAppStore` → `../../store/useAppStore`
- `src/pages/Index.tsx`: `@/components/home/HomeView` → `../components/home/HomeView`

Detta är en mekanisk omskrivning som inte ändrar funktionalitet.

