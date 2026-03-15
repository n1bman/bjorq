
Patchplan: återställ riktig 3D-skärm + gör Bibliotek-importen tydligt/verifierbart fungerande.

1) Rotorsak 3D-skärm (hittad i kod)
- I `PersistentScene3D.tsx` (3D-placering) görs:
  `const kind = activeTool.replace('place-', '')`
  vilket ger `media-screen` (fel) istället för `media_screen` (rätt).
- Konsekvens:
  - enheten sparas med fel kind
  - `MediaScreenMarker` används inte
  - inspector faller tillbaka till lamp-ikon
  - “spotify/skärm”-visualisering försvinner.

2) Fix för 3D-skärm (stabil + bakåtkompatibel)
- Inför en central normalisering (helper) för device-kind:
  - `media-screen` -> `media_screen`
  - används både vid placering och vid rendering/inspector.
- Uppdatera 3D-placeringsflödet i `PersistentScene3D.tsx` att alltid använda normaliserad kind innan `addDevice`.
- Lägg in migrering för redan felaktigt sparade enheter i store (`useAppStore.ts` migrate):
  - konvertera alla `marker.kind === 'media-screen'` till `media_screen`
  - uppdatera `deviceStates` till korrekt default för dessa.
- Lägg defensiv fallback i visning:
  - `BuildInspector.tsx` och `DeviceMarkers3D.tsx` hanterar legacy-kind under övergången, så gamla projekt inte ser trasiga ut innan migrering slagit in.

3) Bibliotek-import: “tillagd men syns inte”
- Nuvarande import skriver till catalog, men UX gör det otydligt var den hamnar.
- Gör importflödet deterministiskt i `BuildModeV2.tsx` (BibliotekWorkspace):
  - vänta in fil->base64 (Promise) innan dialog stängs
  - spara item, därefter:
    - rensa söktext
    - sätt `sourceFilter = 'user'` (eller `all` + tydlig markering)
    - sätt `filterCategory = importerad kategori`
    - expandera den kategorisektionen
    - auto-välj nyimporterad asset i högerpanelen.
- Lägg tydligare success-toast:
  - ex: “Tillagd i biblioteket under Soffor”.
- Lägg skydd mot dubletter-ID (använd robust id, ej bara timestamp).

4) Tekniska filer som ändras
- `src/components/PersistentScene3D.tsx` (rätt kind-mappning vid 3D-placering)
- `src/store/useAppStore.ts` (persist-migrering + state-normalisering)
- `src/components/devices/DeviceMarkers3D.tsx` (legacy-kind fallback till MediaScreenMarker)
- `src/components/build/BuildInspector.tsx` (legacy-kind ikon/inspector-fallback)
- `src/components/build/BuildModeV2.tsx` (Bibliotek-import: säker commit + auto-fokus av ny asset)

5) Verifieringsplan (måste köras end-to-end)
- 3D-skärm:
  - placera “Skärm” i Inredning (3D) -> korrekt monitormodell visas direkt
  - inspector visar skärm (inte lampa)
  - koppla `media_player.*` -> standby/now-playing (Spotify/app-name/titel) renderas på skärmen.
- Migrering:
  - ladda gammalt projekt med `media-screen` -> enheter blir `media_screen` och renderas korrekt.
- Bibliotek-import:
  - importera GLB i Bibliotek, sista “Importera”:
    - toast visas
    - ny asset väljs automatiskt och syns direkt i lista + metadata-panel
    - kvarstår efter reload (för <=4MB med fileData).

6) Release
- Om du vill att jag tar den som ny patch efter detta: bump till `v1.7.2` i alla version-filer + changelog + HA add-on metadata i samma svep.
