# BJORQ Dashboard v1.8.6

## Fokus

Den har releasen fokuserar pa 3D-konsistens och tydligare sparlogik. Hemvyn har stadats upp visuellt, kontrollpanelens 3D-preview foljer nu samma miljo- och grafikinstallningar som resten av systemet, och profilsektionen gor storre skillnad mellan projektfiler och full backup av hela installationen.

## Andrat

- Rutnatet i hemvyns 3D-scen ar borttaget.
- 3D-previewrutorna i kontrollpanelen anvander nu samma ljus, dimma, terrang, vader och prestandaprofil som hemvy och designlage.
- `Projektfil` under Profil ar nu tydligare beskriven som export/import av det aktuella hemmet: layout, 3D-modell, material, props och enheter.
- `Installation & Backup` under Profil ar nu tydligare beskriven som hel backup av profil, installningar, kopplingar, dashboardytor och alla sparade projekt.

## Fixat

- Hosted backup och export forsoker nu forst spara aktuell projektstate till servern innan hel backup skapas.
- Golvmaterial kan nu ta lokala texturer fran `public/textures` nar motsvarande filer finns i repot, med fallback till tidigare kallor for ovriga material.

## Bevarat

- Standbykameran och dess 3D-preview ar kvar.
- Hemvy, kontrollpanel och designlage fortsatter dela samma overgripande scenmodell.
- Projektimport/export och full backup ar fortfarande separata funktioner, men nu tydligare namngivna.

## Verifierat

- `npm test`
- `npm run lint`
- `npm run build`
