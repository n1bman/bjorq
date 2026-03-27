# Patchnotes 1.10.6

Released: 2026-03-27

## Fokus

Den här releasen tätar sista kända ingressfelet där BJORQ visade sin egen 404-sida i stället för dashboarden.

## Fixat

- BrowserRouter fångar nu Home Assistants ingress-path och renderar dashboarden i stället för `NotFound`.
- Add-onen ska därmed kunna öppna både lokalt och externt via Home Assistant-ingress utan att landa på 404-vyn.

## Verifierat

- `npm test`
- `npm run build`
