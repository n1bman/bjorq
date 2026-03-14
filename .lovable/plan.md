

# Plan: Flytta köket till biblioteket och ta bort Mallar

## Problem
Vite/Rollup kan inte lösa import-kedjan `KitchenFixtureModel3D → KitchenFixtureObject3D`. Filerna finns men resolvern är "poisoned".

## Lösning
Kopiera hela koden från `KitchenFixtureObject3D.tsx` direkt in i `KitchenFixtureModel3D.tsx` (en fil, inget import-hopp). Ta bort alla gamla filer och Mallar-fliken. Lägg till köket som ett inbyggt objekt i Inredning-katalogen.

## Steg

1. **`KitchenFixtureModel3D.tsx`** — skriv om med hela köksgeometrin (323 rader kopieras hit). Ingen import av andra köksfiler.

2. **Ta bort filer:**
   - `KitchenFixtureObject3D.tsx`
   - `KitchenFixture3D.tsx` (om den fortfarande finns)
   - `structure/TemplatesPicker.tsx`

3. **`BuildModeV2.tsx`** — ta bort:
   - `import TemplatesPicker`
   - `showTemplatePanel`-logiken
   - `activeTool === 'template'`-referenserna
   - Template-knappen i verktygsfältet

4. **`BuildModeV2.tsx`** — lägg till köket som ett inbyggt katalog-objekt i Inredning med namn "Standardkök 🍳", så att `addKitchenFixture` anropas vid placering (samma logik som TemplatesPicker hade).

5. **`KitchenFixtureModel3D.tsx`** — uppdatera `canInteract` att inte referera `activeTool === 'template'` (ersätt med `'furnish'` bara).

Inga ändringar i store-logiken (`addKitchenFixture`, `updateKitchenFixture`, etc.) — den behålls som den är.

