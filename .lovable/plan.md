

# Översikt av byggefel och fix-plan

Jag har gått igenom alla byggfel. De flesta verkar komma från ändringar du gjort på GitHub-sidan. Här är varje fel och vad som behöver göras:

---

## Fel 1: `BuildTopToolbar.tsx` — saknar `isHostedSync` import
**Rad 152 och 422** använder `isHostedSync()` men filen importerar aldrig funktionen.

**Fix:** Lägg till `import { isHostedSync } from '../../lib/apiClient';` i importerna (rad 1-20).

---

## Fel 2: `DataBackupCard.tsx` — `Record<string, unknown>` vs `Record<string, DeviceState>`
**Rad 146** deklarerar `deviceStates` som `Record<string, unknown>` men store-typen kräver `Record<string, DeviceState>`.

**Fix:** Ändra `const deviceStates: Record<string, unknown> = {};` till `const deviceStates: Record<string, DeviceState> = {};` och importera `DeviceState` från types.

---

## Fel 3: `HAConnectionPanel.tsx` — saknar `'degraded'` i statusConfig
Typen `HAConnectionStatus` inkluderar `'degraded'` (din GitHub-ändring i types.ts) men `statusConfig`-objektet i HAConnectionPanel har bara 4 nycklar (disconnected/connecting/connected/error).

**Fix:** Lägg till `degraded: { label: 'Degraderad', color: 'text-yellow-500', icon: AlertCircle }` i `statusConfig`-objektet.

---

## Fel 4: Testfiler — saknar typdeklarationer för server-JS
`auth.test.ts`, `backupEnvelope.test.ts`, `liveHub.test.ts`, `safePaths.test.ts` importerar `.js`-filer från `server/` som saknar typdeklarationer.

**Fix:** Skapa en minimal `server/types.d.ts` fil som deklarerar modulerna, eller lägg till `// @ts-ignore` ovanför varje import. Enklast: skapa en `src/test/server-modules.d.ts` med `declare module`-block.

---

## Fel 5: `haMenuSelectors.test.ts` — ofullständig mock av `AppState`
`createState()` returnerar ett objekt som saknar ~143 properties jämfört med `AppState`-typen (som du utökat på GitHub).

**Fix:** Behåll `as unknown as AppState` istället för direkt `as AppState`, eller lägg till saknade fält.

---

## Sammanfattning av ändringar

| Fil | Ändring |
|-----|---------|
| `BuildTopToolbar.tsx` | Lägg till `isHostedSync`-import från `apiClient` |
| `DataBackupCard.tsx` | Ändra `Record<string, unknown>` → `Record<string, DeviceState>`, importera typen |
| `HAConnectionPanel.tsx` | Lägg till `degraded`-entry i `statusConfig` |
| `src/test/server-modules.d.ts` | Ny fil: deklarera server-moduler för TS |
| `haMenuSelectors.test.ts` | Ändra `as AppState` → `as unknown as AppState` |

Ingen logik ändras — bara imports, typer och test-stubs fixas för att matcha de tillägg du gjort på GitHub.

