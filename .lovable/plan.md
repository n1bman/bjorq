

# Fix: Visa DevicePlacementTools i byggläget

## Problem

Komponenterna `DevicePlacementTools` och `VacuumMappingTools` finns färdiga i `src/components/build/devices/` men renderas **aldrig** — de är helt bortkopplade. När du klickar "Enheter" i dockan visas bara en enkel `DeviceCatalog` med platta knappar, utan:
- Kategoriserade enhetsverktyg (Ljus, Klimat, Sensorer, etc.)
- Lista över placerade enheter
- Vacuum docking & zoner (`VacuumMappingTools`)
- Okopplade HA-entiteter (`UnlinkedHAEntities`)

## Lösning

Ersätt den inlinade `DeviceCatalog` i katalograden med den fullständiga `DevicePlacementTools`-komponenten, renderad som en expanderbar sidopanel (liknande inspektören på höger sida) som visas när enhets-tabben är aktiv.

### Fil: `src/components/build/BuildModeV2.tsx`

1. **Importera** `DevicePlacementTools` från `./devices/DevicePlacementTools`
2. **Rendera panelen** som en absolut-positionerad sidopanel (vänster sida, under toolbar) som visas när `build.tab === 'devices'` — bredvid canvasen, ca 220px bred
3. **Ta bort** den inlinade `DeviceCatalog`-funktionen (rad 193-225) och dess referens i `BuildCatalogRow` (rad 237) — katalograden behövs inte längre för enheter eftersom all funktionalitet finns i sidopanelen

### Resultat

- Alla enhetsverktyg med ikoner och kategorier synliga
- Placerade enheter-lista med val och radering
- VacuumMappingTools med dockningsstation och rumszoner
- Okopplade HA-entiteter med snabbplacering

