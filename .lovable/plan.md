

# BJORQ — 4 fixar: brightness-bar, scen-klick → redigera, timer, automation i scener

## 1. Brightness-bar saknar fyllnad (CategoryCard.tsx)

**Problem:** Gradienten slutar lite för tidigt — `transparent ${pct + 15}%` skapar ett gap.

**Fix:** Ändra gradient från fade-out till solid fill upp till `pct%`:
- Rad 185-186: Byt `${pct + 15}%` → `${pct}%` och öka opaciteten så baren känns fylld fram till brightness-nivån. Gör gradientens slut mjukare med `${pct}%` → `transparent ${Math.min(pct + 5, 100)}%` istället för +15.

## 2. Klick på scen → redigera (ScenesPanel.tsx)

**Problem:** Klick på scen-knappen (rad 437) kör `activateScene(scene.id)`. Användaren vill att klick = redigera.

**Fix:**
- Byt `onClick` på scen-knappen (rad 437) till `setEditingId(scene.id)` istället för `activateScene`
- Lägg till en separat "Aktivera"-knapp (Play-ikon) i hover-overlay (rad 446-461) bredvid pennan
- Ta bort pennan från hover (den behövs inte om klick = redigera)
- Så: **klick = redigera**, **play-knapp = aktivera**

## 3. Timer-lösning för scener (ScenesPanel.tsx + types.ts)

Lägg till möjlighet att schemalägga en scen med timer/tidsstyrning.

**types.ts — utöka `SavedScene`:**
```ts
timer?: {
  enabled: boolean;
  activateAt?: string;   // "HH:MM" — tidpunkt att aktivera
  deactivateAfter?: number; // minuter — stäng av efter X min
  repeat?: 'once' | 'daily' | 'weekdays' | 'weekends';
};
```

**ScenesPanel.tsx — i SceneForm:**
- Lägg till en "Timer"-sektion efter rumslänkning:
  - Switch: "Aktivera på tid"
  - Om på: tidväljare (input type="time") + repeat-val (engång/dagligen/vardagar/helger)
  - Switch: "Avaktivera efter" + minutslider (5–120 min)
- Spara i scen-objektet

**Notera:** Faktisk timer-exekvering hanteras inte nu (kräver bakgrundsprocess), men inställningarna sparas och visas. En liten klock-ikon visas på scen-knappen om timer är aktiv.

## 4. Automation inbakat i scener (ScenesPanel.tsx)

Lägg till en "Automation"-sektion i SceneForm som kopplar scen-aktivering till triggers.

**I SceneForm, ny sektion efter Timer:**
- Rubrik: "Automation (valfritt)"
- Trigger-typ dropdown: `Tid` / `Enhetstillstånd` / `Händelse`
  - Tid: tidväljare
  - Enhetstillstånd: välj enhet + tillstånd (på/av)
  - Händelse: fritext
- Om automation är inställd, skapas/uppdateras en `Automation` i store som har `scene_activate` som action
- Visa en liten blixt-ikon på scen-knappen om automation finns kopplad

**types.ts — utöka `SavedScene`:**
```ts
automation?: {
  enabled: boolean;
  trigger: AutomationTrigger;
};
```

**useAppStore.ts:**
- Vid spara/uppdatera scen: om `scene.automation?.enabled`, synka en automation-entry i `automations[]` med `action: { type: 'scene_activate', sceneId: scene.id }`

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `CategoryCard.tsx` | Brightness-bar gradient — ta bort +15 gap |
| `ScenesPanel.tsx` | Klick = redigera, play = aktivera, timer-sektion, automation-sektion |
| `types.ts` | `SavedScene.timer` + `SavedScene.automation` |
| `useAppStore.ts` | Synka automation vid scen-sparning |

