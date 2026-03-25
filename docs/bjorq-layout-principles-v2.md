# BJORQ Layout Principles v2 — Omtolkning

> Skriven efter feedback: "Du bygger fortfarande fel sorts UI."

---

## Grundproblem med nuvarande spår

1. **Hem** använder fasta slot-positioner (top-left, top-right etc.) — det är inte frihet, det är en dropdown-meny för position.
2. **Kontrollpanelen** är fortfarande en grid med boxar i edit-mode — det känns som en admin-dashboard med drag-handle.
3. **Nordic Noir** stannar vid färgpalett — det syns inte i komposition, typografi eller materialitet.
4. **Touch/tablet** behandlas som "desktop men mindre" istället för att designas på riktigt.

---

## Ny riktning

### Hem — Fritt komponerad 3D-vy

**Inte:** Fasta zoner med dropdowns.  
**Är:** Widgets som flyter fritt ovanpå 3D-scenen, positionerade med riktig drag.

Principer:
- Widgets har **absolut position** (x%, y%) relativt viewporten — inte låsta till grid-slots
- I **layoutläge** kan man dra dem fritt, snappa till kanter om man vill, men inte tvingas
- Widgetarna är **minimala och transparenta** — de ska inte konkurrera med 3D-scenen
- Typografi-first: stora värden, nästan ingen bakgrund, blur bara där det behövs
- Känsla: som en HUD i ett spel eller en kamera-overlay, inte som cards ovanpå en vy
- Center FAB bevaras som navigationsankare

Storlekar:
- **Whisper**: bara ett värde (t.ex. "21°" eller "14:32")
- **Glance**: värde + label (t.ex. "21° Vardagsrum" eller "Energi 4.2 kWh")  
- **Card**: traditionell widget med mer info — men fortfarande glassmorphism, inte solid box

Positionering:
- Sparas som `{ x: number, y: number }` i procent
- Layoutläge visar ett subtilt rutnät som hjälp, men tvingar inte
- Snap-to-edge som option, inte default

### Kontrollpanelen — Öppen personlig yta

**Inte:** Grid med identiska cards i rader.  
**Är:** En komposition som användaren bygger själv, mer som en personlig startsida.

Principer:
- **Blandade storlekar** som faktiskt ser olika ut — Hero-widgets tar hela bredden med rik visualisering, kompakta widgets är nästan bara text
- **Sektioner istället för grid** — användaren grupperar efter mening (t.ex. "Morgon", "Vardagsrum", "Energi") snarare än att fylla ett rutnät
- **Negativ space är en feature** — tomma ytor är medvetna, inte ett fel
- **Scroll istället för pack** — panelen scrollar vertikalt med generösa mellanrum
- Widgetar har **olika visuella uttryck** beroende på typ:
  - Energi: cirkulär visualisering, levande
  - Klimat: horisontell bar med rum-jämförelse
  - Scener: stora touch-targets, nästan knappar
  - Enheter: kompakta pills eller switchar
  - Väder: full-width panorama med gradient

Layout-modell:
- Inte CSS grid med col-span
- Snarare: en vertikal stack av **sektioner**, varje sektion har sin egen layout
- Sektioner kan vara: full-width hero, 2-kolumn, 3-kolumn compact, eller fritext
- Användaren väljer sektionstyp, inte individuella col-spans

### Nordic Noir — Komposition, inte bara färg

**Inte:** Mörk bakgrund + amber accent + rounded cards.  
**Är:** En arkitektonisk känsla som syns i varje beslut.

Typografi:
- **Värden**: 32-56px, Space Grotesk, tungt — de ska dominera
- **Labels**: 9-10px, uppercase, letter-spacing 0.2em, mycket svag färg
- **Mellanrum** mellan värde och label är medvetet stort (16-24px)
- Inga mellanstora texter — antingen stort eller litet

Materialitet:
- Ytor ska kännas som **mörk betong eller sotad metall**, inte som cards
- Borders ska vara nästan osynliga — djup kommer från skugga och gradient, inte linjer
- Glassmorphism används sparsamt — bara på element som faktiskt flyter (overlays, modals)
- Bakgrunder använder subtila **radiella gradienter** som ger känslan av belysning

Komposition:
- **Asymmetri** — inte allt centrerat eller jämnt fördelat
- **Hierarki via storlek** — det viktigaste är 4x större än det sekundära
- **Luft** — minimum 24px gap mellan sektioner, 48px före nya kontexter
- **Färre element** — visa 4-6 widgets istället för 12

Touch/Tablet:
- **Minimum touch-target: 48x48px**
- Text aldrig under 13px för body, 11px för labels
- Generösa paddings: 20px minimum på interaktiva ytor
- Scroll-areas med tydlig inertia och snap-points
- Tablet är **primär** målplattform, inte desktop

---

## Sammanfattning av skillnaden

| Aspekt | Gammalt spår | Nytt spår |
|--------|-------------|-----------|
| Hem-widgets | Fasta slots (top-left etc.) | Fria positioner (x%, y%) |
| Kontrollpanel | Grid med col-span | Sektionsbaserad komposition |
| Widget-uttryck | Alla ser likadana ut | Varje typ har egen identitet |
| Nordic Noir | Färgpalett | Typografi + materialitet + luft |
| Edit-mode | Drag handle på cards | Fri positionering + sektionsval |
| Tablet | Desktop shrunk | Primär målplattform |
| Känsla | Admin-dashboard | Premium smart home |

---

## Nästa steg (efter godkännande)

1. Implementera fritt positionerings-system för Hem-overlay-widgets
2. Bygga sektionsbaserad kontrollpanel
3. Uppgradera typografi-system (värde/label-hierarki)
4. Stärka materialitet (gradienter, skuggor, mindre borders)
5. Touch-first spacing och targets
