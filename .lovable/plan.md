

# Fix: Rumsdetektering hittar överlappande rum + golv-flicker

## Rotorsak

Rumsdetekteringsalgoritmen har **två buggar** som tillsammans orsakar problemen:

### 1. Floating-point-nycklar ger trasig graf
`keyFor()` beräknar `Math.round(p[0] / 0.05) * 0.05` — men detta ger flyttalsfel som `0.30000000000000004`. Två punkter som borde matcha får olika strängnycklar, så grafen missar kopplingar.

### 2. Algoritmen hittar "supercykler" (stora cykler som omsluter flera rum)
Cykeldetektorn hittar **alla** cykler — både minimala inre rum OCH stora yttre cykler som omsluter flera rum. Resultatet: 4 överlappande rum istället för 2, med polygoner som täcker samma yta → multipla golv-lager renderas ovanpå varandra → z-fighting.

## Lösning

### `src/lib/roomDetection.ts`

**Fix 1 — Heltalsnycklar:**
Ändra `keyFor()` till att returnera heltalsnycklar baserade på avrundade grid-index istället för flyttal:
```typescript
function keyFor(p: [number, number]): string {
  return `${Math.round(p[0] / EPSILON)},${Math.round(p[1] / EPSILON)}`;
}
```

**Fix 2 — Filtrera bort supercykler:**
Efter att alla cykler hittats, kontrollera om en cykel "innehåller" en annan cykel genom att testa om den mindre cykelns centroid ligger inuti den större cykelns polygon (point-in-polygon test). Om ja → det är en supercykel, ta bort den.

```text
Före:  [Rum1(stort), Rum2(litet inuti Rum1), Rum4(=Rum1), Rum7(variant)]
Efter: [Rum1(kök), Rum2(vardagsrum)] — bara minimala cykler
```

**Fix 3 — Bättre duplikatfiltrering:**
Nuvarande normalisering (`cycle.reduce((a,b) => a < b ? a : b)`) kan missa dubbletter. Ersätt med en striktare normalisering som sorterar cykeln kanoniskt.

### Teknisk implementation

Ny hjälpfunktion `pointInPolygon(point, polygon)` — ray-casting-algoritm (~10 rader). Lägg till ett filtreringssteg efter `findMinimalCycles()` som tar bort alla cykler vars polygon omsluter en annan cykels centroid.

Totalt ~30 rader ny/ändrad kod i en fil.

