# BJORQ Dashboard v1.8.7

## Fokus

Den har releasen hardar 3D-lastningen och hosted-syncen. Sarskilt importerade husmodeller ska bete sig lugnare mellan hemvy, kontrollpanel och design, samtidigt som vacuum-kartflodet i Home Assistant far ratt svarstyp.

## Andrat

- Importerade 3D-hus anvander nu en cachad template-scen som klonas per vy i stallet for att lasas om fullt varje gang.
- Modellstatistik ateranvands fran cache i stallet for att raknas om pa nytt per mount.
- Bekraftat dod kod som inte langre anvands i runtime-tradet har tagits bort.

## Fixat

- Vacuum map-anropet i hosted-laget begar nu `return_response` via ratt HA-endpoint-query, vilket matchar vad loggarna efterfragade.
- Previewytor som visar importerade modeller ateranvander nu laddad modell betydligt battre, vilket ska minska omladdningar och ge jamnare vybyten.

## Rekommenderat att testa

- Importera ett hus och vaxla mellan `Hem`, `Kontrollpanel` och `Design`.
- Oppna `Installningar` och kontrollera om previewrutorna fortfarande kanns snabbare och lugnare.
- Testa vacuum/robot-flodet och se om de tidigare `return_response`-felen forsvunnit ur add-on-loggen.

## Verifierat

- `npm test`
- `npm run lint`
- `npm run build`
