

# BJORQ Nordic Noir — Visuell korrigering

## Vad som behöver fixas (från dina bilder)

### 1. Summary bar (bild 1)
Ska vara **fyra separata kort/celler i ett grid** med synliga borders/ramar — inte bara text i en flat strip. Varje cell har `label-micro` + stort värde + en tredje rad med detalj (datum, väderbeskrivning, pris, status).

### 2. Ta bort placeholder-texter
Radera:
- `"Bjorq Home / Nordic Noir"` + `"Hem, översatt från nuvarande dashboard"`
- `"Home Overview"` + `"Samma hemvy, men mer lugn och materialitet"`

### 3. Trekolumnslayout med 3D + Aktivt rum (bild 4a)
- Vänster: 3D-preview (hero) med snabbknappar (Scener, Enheter, Klimat, Robot) inuti/under
- Höger: "AKTIVT RUM" panel där användaren väljer rum och ser enheter
- Men detta är **fritt** — inte låst i exakt denna layout

### 4. Switch/toggle (bild 5)
Nuvarande switch är för ljus. Ska ha **mörkare track** (off = mörk, on = amber) med en **mörkare thumb**. Matcha Nordic Noir-temat.

### 5. Färgsättning och känsla
- Text som `label-micro` ska ha rätt opacity
- Amber brightness-bars ska vara mer levande
- Generellt mörkare, mer premium-känsla

---

## Ändrade filer

| Fil | Ändring |
|-----|---------|
| `DashboardShell.tsx` → `SummaryBar` | Grid med 4 celler, borders, tredje rad detalj |
| `DashboardGrid.tsx` → `HomeCategory` | Ta bort placeholder-text, behåll 3D + filter + cards |
| `switch.tsx` | Mörkare track + thumb som matchar Nordic Noir |
| `index.css` | Eventuella justeringar av `nn-widget`, summary-bar tokens |

## Implementationsordning

1. **SummaryBar** — grid med ramar, tre rader per cell (label, value, detalj)
2. **HomeCategory** — rensa bort texter, behåll 3D hero + filter + rumskort
3. **Switch** — mörkare track off-state, mörkare thumb, amber on-state med glow
4. **CSS polish** — summary-bar grid tokens

