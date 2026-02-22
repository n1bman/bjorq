
# Implementerat

## ✅ Gizmo-frysning fixad
- Bytte från `onObjectChange` till `dragging-changed` event i DeviceMarkers3D
- State uppdateras bara när drag avslutas, inte varje frame

## ✅ Importerad modell persistens
- Modellen sparas som base64 i `fileData` vid upload
- Vid sidladdning återskapas blob-URL från base64 automatiskt

## ✅ Live väder med Open-Meteo
- `useWeatherSync` hook pollar Open-Meteo API var 15:e minut
- Toggle i Sol & Väder-panelen för att aktivera/avaktivera live väder
- Visar temperatur, vindhastighet och luftfuktighet från API

## ✅ Kontrollpanel med kategorier
- DashboardGrid har nu kategori-navigation: Hem, Väder, Enheter, Energi, Inställningar, HA
- Varje kategori visar relevant innehåll
