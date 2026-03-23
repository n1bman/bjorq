# BJORQ Dashboard v1.9.1

## Fokus

Den har releasen hardar Dashboardens konsumtion av thumbnails fran BJORQ Asset Wizard v2.9.6. Malet ar att Wizard-assets alltid ska visa riktig bild i biblioteket, bade i Wizard-fliken och efter import till lokalt bibliotek.

## Andrat

- Wizard-assets normaliseras nu mot den direkta endpointen `/assets/:id/thumbnail` i stallet for att forlita sig pa varierande `thumbnail`-falt i metadata.
- Bibliotekskorten har nu en robust bildfallback som forsoker Wizard-endpointen en gang om bilden failar och annars visar placeholder utan trasig ikon.
- Importerade Wizard-assets sparar nu thumbnail lokalt/persistent sa de inte onodigt fortsatter bero pa remote thumbnail-URL.

## Tekniskt

- `wizardClient` exponerar nu ett tydligare thumbnailflode med direkt endpoint som primarkalla och enkel fallback-hjalpare.
- `BuildModeV2` anvander nu gemensam thumbnail-rendering for Wizard-assets i bade byggbiblioteket och den separata biblioteksvyn.
- Gamla lokala Wizard-poster som saknar persistent thumbnail backfillas nu fran Wizard nar anslutningen ar aktiv.

## Verifierat

- `npm run lint`
- `npm run build`

## Rekommenderat att testa

- Oppna Wizard-fliken i biblioteket och verifiera att alla starter-assets visar riktiga thumbnails utan trasiga bildikoner.
- Importera en Wizard-asset och kontrollera att thumbnail fortsatt visas efter sync/refresh i lokalt bibliotek.
- Testa en gammal lokal Wizard-post med tidigare trasig thumbnail och verifiera att den fylls pa igen nar Wizard ar ansluten.

## Kanda begransningar

- Om Wizard sjalv saknar en faktisk thumbnail visas fortfarande placeholder, men nu utan trasig bildikon eller UI-krasch.
