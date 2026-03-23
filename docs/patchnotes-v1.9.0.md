# BJORQ Dashboard v1.9.0

## Fokus

Den har releasen riktar in sig pa aldre iPad-modeller som laddar dashboarden via webben. Bygget genererar nu en kompatibel legacy-bundle for aldre Safari, samtidigt som startskarmen ger lugnare och mer korrekt feedback om forsta laddningen tar tid.

## Andrat

- Produktionen bygger nu bade modern och legacy JavaScript-bundle sa aldre iPad/Safari kan starta dashboarden utan att moderna klienter tappar sin optimerade bundle.
- Startskarmen markerar nu explicit nar appen faktiskt har bootat, i stallet for att anta fel efter fem sekunder.
- Laddfallbacken ar mindre aggressiv och visar en mjukare status efter 15 sekunder i stallet for att direkt signalera att bundlen inte laddades.

## Tekniskt

- `@vitejs/plugin-legacy` ar inkopplad i Vite-bygget med mal for `iOS >= 11` och `Safari >= 11`.
- Produktionsbygget genererar nu separata `*-legacy`-filer och polyfills for aldre webblasare.
- Startskalet i `index.html` samordnas nu med `src/main.tsx` via en enkel boot-flagga sa fallbacktexten inte triggas i onodan.

## Verifierat

- `npm run build`
- Bekraftat att builden genererar `polyfills-legacy` och `index-legacy` i `dist/`

## Rekommenderat att testa

- Oppna dashboarden pa den aldre iPaden igen och verifiera att startsidan gar vidare till riktig appstart.
- Testa en kall forstaladdning efter hard refresh for att se om legacy-bundlen fortsatter ladda stabilt.
- Bekrafta att en modern iPad eller desktop-webblasare fortfarande startar utan regressionskansla.

## Kanda begransningar

- Huvudbundlen ar fortfarande stor, sa mycket gamla iPads kan fortfarande upplevas sega trots att kompatibiliteten ar battre.

## Upgrade notes

- Hosted/add-on-installationer behover byggas och rullas ut med `v1.9.0` for att den nya legacy-bundlen ska komma med i produktion.
