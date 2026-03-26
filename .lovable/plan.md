

# Redigera scener med per-enhet åtgärder (on/off, ljusstyrka, färg)

## Problem idag
- Scener kan bara skapas, inte redigeras efteråt
- `SceneSnapshot` sparar enbart en kopia av `state` — men man kan inte ställa in *vad* scenen ska göra per enhet (t.ex. "dra ner till 50%", "stäng av", "sätt på med rosa färg")
- Ingen `updateScene`-action i store

## Vad som behövs

### 1. Store: lägg till `updateScene`

**`src/store/types.ts`:**
- Lägg till `updateScene: (id: string, changes: Partial<SavedScene>) => void` i AppState-interfacet

**`src/store/useAppStore.ts`:**
- Implementera `updateScene` som mergar ändringar på rätt scen och synkar till server

### 2. SceneSnapshot: utöka med explicit action-typ

**`src/store/types.ts` — utöka `SceneSnapshot`:**
```
interface SceneSnapshot {
  deviceId: string;
  state: Record<string, unknown>;
  action: 'on' | 'off' | 'set';  // ny — vad ska hända
}
```
- `on` = sätt på med angivna inställningar (brightness, färg etc.)
- `off` = stäng av enheten
- `set` = ställ in specifika värden (t.ex. brightness 50%)

### 3. `activateScene` — respektera action

**`src/store/useAppStore.ts`:**
- Om `snap.action === 'off'` → uppdatera enheten till `{ on: false }`
- Om `snap.action === 'on'` → uppdatera med `{ on: true, ...snap.state }`
- Om `snap.action === 'set'` → uppdatera med `snap.state` (som idag)

### 4. ScenesPanel: redigera-läge + per-enhet kontroller

**`src/components/home/cards/ScenesPanel.tsx`:**

**Redigera befintlig scen:**
- Klick på en scen öppnar ett redigerings-formulär (samma form som "skapa", men förfyllt)
- Kan ändra namn, ikon, rumslänkning
- Per enhet i scenen: visa en rad med:
  - Enhetsnamn
  - Action-dropdown: `På` / `Av` / `Ställ in`
  - Om `På` eller `Ställ in`: brightness-slider (0–100%)
  - Om enheten är ljus: färg-slider (samma spektrum-slider som DeviceControlCard)
  - Ta bort enhet från scen
- Kan lägga till fler enheter
- Spara-knapp → `updateScene(id, changes)`

**Scen-grid:**
- Lång-tryck eller redigera-ikon → öppna redigering
- Kort tryck → aktivera scen (som idag)

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `SceneSnapshot.action`, `updateScene` i AppState |
| `src/store/useAppStore.ts` | `updateScene` implementation, `activateScene` respekterar action |
| `src/components/home/cards/ScenesPanel.tsx` | Redigera-formulär med per-enhet action/brightness/färg |

