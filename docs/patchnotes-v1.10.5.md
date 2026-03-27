# Patchnotes 1.10.5

Released: 2026-03-27

## Fokus

Den här releasen gör att BJORQ kan starta korrekt under Home Assistants ingress-path i stället för att falla till vit sida.

## Fixat

- Vite-bygget använder nu relativa asset-vägar i produktion.
- HTML-ingången använder relativ favicon, manifest och app-entry.
- Hosted-klienten bygger API- och stream-vägar relativt den aktuella app-URL:en.
- Proxade media- och kameravägar fungerar bättre under ingress-subpath.

## Verifierat

- `npm test`
- `npm run build`
