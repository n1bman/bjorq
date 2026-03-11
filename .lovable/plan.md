

# Fix: backups.js kraschar servern i Docker

## Problem

`server/api/backups.js` använde tidigare `readFileSync` för att läsa version från `package.json`. I v1.0.6 hårdkodades versionen som `APP_VERSION = '1.0.6'`, men **den gamla Docker-imagen kör fortfarande en version som försöker läsa `/app/package.json`** som inte existerar i runtime-containern.

Dock: den nuvarande koden (rad 8) har redan `const APP_VERSION = '1.0.6'` — alltså en hårdkodad sträng. Det betyder att **din HA-installation kör en äldre build** som fortfarande har den gamla `readFileSync`-koden.

## Åtgärd

Ingen kodändring behövs — koden är redan fixad. Du behöver bara **bygga om och installera den nya Docker-imagen** i Home Assistant så att den uppdaterade `backups.js` (med hårdkodad version istället för `readFileSync`) används.

Steg:
1. Bygg om Docker-imagen med den senaste koden
2. Uppdatera add-on i Home Assistant
3. Starta om add-on

Kraschloopen försvinner då direkt.

