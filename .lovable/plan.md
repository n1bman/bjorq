
Mål: fixa tre saker i samma implementation
1) Köket är spegelvänt (ordningen känns bakvänd),
2) Köksobjektet beter sig inte som övriga 3D-objekt/enheter (meny/logik),
3) säkra att `KitchenFixture3D`-importen inte fortsätter ge Vite-resolve-fel.

Steg-för-steg-plan

1. Stabiliserad modulupplösning (build-felet först)
- Kontrollera och normalisera importkedjan mellan:
  - `src/components/build/BuildScene3D.tsx`
  - `src/components/build/KitchenFixture3D.tsx`
- Säkerställa exakt filnamn/case + default export + en entydig importväg.
- Om resolvern fortfarande är instabil: gör en kontrollerad namn-normalisering (rename + uppdaterad import) för att bryta ev. cache/case-problem.

2. Vänd kökslayouten så vänster sida börjar med skafferi/kyl
- I `KitchenFixture3D.tsx` byter jag från hårdkodad positionskedja till en sekventiell layout-beräkning från vänster till höger enligt önskemål.
- Ny visuell ordning i X-led:
  - Skafferi → Kylskåp (med överskåp) → Spis/Ugn/Fläkt → Diskmaskin → Diskbänk/Kran → Lådskåp
- Behåller totalbredd 3.80m och samma djup/höjdspråk.
- Säkrar att fronter/handtag fortsatt är åt rumssidan (inte mot vägg).

3. Ge köket samma interaktionslogik som andra objekt
- I `KitchenFixture3D.tsx`:
  - Begränsa interaktion till samma lägen som möbler (select/furnish-liknande logik i build-läget).
  - Separera “select” och “drag” bättre (så klick inte alltid känns som dragstart).
  - Behåll vänsterklick/touch för val/flytt; högerklick fortsatt kamera.
- Lägg till snabbmeny i 3D för köksobjekt (samma koncept som möbler):
  - Rotera 45°
  - Duplicera
  - Ta bort

4. Fixa “ingen meny i 3D/2D” via Inspector-stöd
- I `BuildInspector.tsx` lägger jag till en dedikerad `KitchenFixtureInspector` för `selection.type === 'kitchen-fixture'`.
- Inspector innehåll:
  - Rotation (slider + snabbknappar)
  - Position (X/Z)
  - Ta bort
- Detta gör att meny/editpanel öppnas konsekvent i både 2D och 3D när köket är markerat.

5. 2D-paritet och träffyta
- I `BuildCanvas2D.tsx` förbättra hit-test för kök:
  - Från enkel distans mot center till footprint-baserad träff (roterad rektangel), så val känns som övriga objekt.
- Behåll befintlig drag i 2D men synka upplevelsen med 3D (markering + inspector + samma delete/rotate-flöde).

Tekniska detaljer (kort)
- Beräkningsmodell för kök:
```text
X-start = -TOTAL_W/2
placera modul i ordning med kumulativ offset
centerX = start + modulBredd/2
start += modulBredd
```
- Inspector-integrering:
  - `BuildSelection.type` har redan `'kitchen-fixture'`, så vi använder befintlig state-modell.
  - Åtgärder går via befintliga store-actions:
    - `updateKitchenFixture`
    - `removeKitchenFixture`
    - `addKitchenFixture` (för duplicera)

Verifiering efter implementation
1) Build: `vite build --mode development` ska passera utan resolve-fel.
2) 3D: placera kök, klicka/long-pressa, se meny, rotera/duplicera/ta bort fungerar.
3) 2D: markera kök via footprint, flytta, och inspector visas med samma kontroller.
4) Visuell kontroll: vänster sida börjar med skafferi/kyl (inte spegelvänd ordning).
