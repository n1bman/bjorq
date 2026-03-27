# Patchnotes 1.10.4

Released: 2026-03-27

## Fokus

Den här releasen gör Home Assistant-add-onen mer pålitlig för extern åtkomst via Home Assistant-appen och Nabu Casa.

## Ändrat

- Add-onen använder nu riktig Home Assistant-ingress som huvudväg.
- Add-onens metadata visar BJORQ i Home Assistant-panelen med egen titel och ikon.
- Dokumentationen för add-on och snabbstart pekar nu på ingress i stället för att rekommendera rå `:3000`-URL som standard.

## Fixat

- Externa öppningar som tidigare kunde hamna på `http://...ui.nabu.casa:3000` ska nu inte längre vara standardvägen.
- Dashboarden blir därmed bättre anpassad för testning från mobil utanför det lokala nätverket.

## Verifierat

- `npm test`
- `npm run build`
