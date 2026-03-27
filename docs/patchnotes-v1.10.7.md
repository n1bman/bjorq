# Patchnotes 1.10.7

Released: 2026-03-27

## Fokus

Den här releasen gör det möjligt att återhämta sig från en felaktig eller fastnad Home Assistant-anslutning i hosted-läget utan att behöva manuellt nollställa serverdata.

## Fixat

- HA-kopplingspanelen i hosted-läget låser inte längre url/token-fälten när status står på `Ansluter...`.
- Knappraden ger nu ett direkt sätt att avbryta och återställa en fastnad HA-anslutning.
- Hjälptexten i panelen förklarar tydligare att rätt adress är Home Assistant på `:8123` eller Nabu Casa, inte BJORQ på `:3000`.

## Verifierat

- `npm test`
- `npm run build`
