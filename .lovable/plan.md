
Mål: få layoutläget att faktiskt fungera igen så att alla hemvy-element kan dras fritt (inkl. Navigering/Kamera/Rum), utan att menyer hoppar fel eller att andra overlays blockerar drag.

1) Rotorsak jag ser i nuvarande kod
- `HomeLayoutEditor.tsx`: drag-labeln har `pointer-events-none` och ligger delvis utanför widget-boxen. Det gör att “grepp”-ytan visuellt ser dragbar ut men inte tar emot drag.
- `HomeView.tsx`: i layoutläge renderas fortfarande live-komponenter (`HomeNav`, `CameraFab`, `RoomNavigator`, device-pill-rad, action-rad, visibility picker) ovanpå/utanför editorn. De stjäl pointer-events, särskilt på högersidan.
- Resultat: användaren upplever att “inget går att flytta” eller att höger-element beter sig off.

2) Planerad fix (utan att göra om temasystem/UI-koncept)
- Gör layoutläge till ett “exklusivt interaktionsläge”:
  - När `homeLayoutEditMode === true` visas bara layout-editor + dess draggable previews.
  - Dölj live-HUD (nav/kamera/rum, bottenrader, marker-picker) tills man klickar “Klar”.
- Gör drag-handtaget verkligt dragbart:
  - Ta bort `pointer-events-none` från label/handle.
  - Koppla `onPointerDown` på handle också (inte bara wrappern).
  - Lägg `touch-action: none` + `select-none` på draggable item för stabil touch-drag.
- Behåll drag från hela widgeten, men gör handle till primär och tydlig trigger.

3) Stabilitet för höger-element (Navigering/Kamera/Rum)
- Säkerställ att bara editorns placeholders används i edit-läge.
- Live-versionerna (`HomeNav`/`CameraFab`/`RoomNavigator`) renderas endast utanför edit-läge.
- Då försvinner “dubbel-rendering” och felaktig lagerordning.

4) Synlighet/defaults så inget “försvinner”
- Sätt robust fallback för `visibleWidgets` i HomeView/LayoutEditor:
  - Om `camera/rooms/nav` saknas i sparad state → behandla som synliga default i editorn.
- Detta minskar problem från äldre persistad data där nya nycklar saknas.

5) Verifiering efter implementation (detta körs punkt för punkt)
- Gå in i layoutläge och dra:
  - Klocka, Väder, Temperatur, Energi
  - Navigering, Kamera, Rum
- Dra via både label/handle och widgetkropp.
- Verifiera att höger-element inte längre “hoppar” eller öppnar fel meny i edit-läge.
- Avsluta layoutläge och kontrollera att normala menyer (kamera/rum/nav) fungerar som tidigare.

Tekniska detaljer (berörda filer)
- `src/components/home/HomeView.tsx`
  - Gating: rendera endast layout-editor-relaterat UI i edit-läge.
  - Flytta villkor så bottenrader + nav/kamera/rum + picker inte kan blockera drag i edit-läge.
- `src/components/home/HomeLayoutEditor.tsx`
  - Drag-handle får pointer-events och explicit `onPointerDown`.
  - Förbättra dragbar yta + touch-stabilitet.
  - Behåll fri positionering för alla 7 element.
- (vid behov liten fallback-justering)
  - `src/store/useAppStore.ts` eller defensiv fallback i komponenterna för `visibleWidgets`-nycklar som saknas.

Förväntat resultat
- “Kan inte flytta något” försvinner.
- Navigering/Kamera/Rum blir dragbara på riktigt.
- Widgets kan placeras fritt som tänkt, utan att andra overlays stör.
