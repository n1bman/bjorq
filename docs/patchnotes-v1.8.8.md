# BJORQ Dashboard v1.8.8

## Fokus

Den har releasen hardar robotflodet. Robotpanelen skickar nu viktiga dammsugarkommandon direkt till Home Assistant, och 3D-roboten far battre fallbacklogik sa den inte blir staende nar rumssynken ar lite sen.

## Andrat

- Sugkraft, start, paus, stopp, dockning, lokalisering och rumsstadning i robotpanelen gar nu via explicita HA-serviceanrop.
- 3D-roboten och robotens minimap kan nu folja `targetRoom` och senast kanda rum medan `currentRoom` fortfarande ar pa vag tillbaka fran Home Assistant.

## Fixat

- Sugkraftsreglaget och presetknapparna for vacuum slog tidigare inte igenom konsekvent i hosted/add-on-laget. De skickar nu riktiga serviceanrop direkt till HA.
- Robotkortets huvudknappar kandes tidigare opalitliga eftersom de byggde for mycket pa lokal state. De uppdaterar nu Home Assistant direkt och visar fel tydligare om nagot misslyckas.
- Rumsstadning kunde tidigare fa roboten att sta still i 3D tills rumssensorn hunnit rapportera tillbaka. Nu kan den borja rora sig mot malrummet direkt efter lyckat kommando.

## Rekommenderat att testa

- Andra sugeffekt och se att Roborock faktiskt byter lage i Home Assistant.
- Testa `Stada allt`, `Pausa`, `Stoppa`, `Docka` och `Lokalisera (pip)`.
- Starta rumsstadning och se att roboten borjar rora sig i 3D mot det valda rummet.
- Kontrollera add-on-loggen igen och se om de tidigare `return_response`-felen fortfarande finns kvar efter uppdatering och omstart.

## Verifierat

- `npm test`
- `npm run lint`
- `npm run build`
