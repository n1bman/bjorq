# BJORQ Nordic Noir UI Redesign — Arbetsplan

> Levande dokument. Uppdateras vid större beslut.

## Status

| Fas | Beskrivning | Status |
|-----|-------------|--------|
| 1 | Backup + projektplanfil | ✅ Klar |
| 2 | Design tokens + glasspanel-upgrade | ✅ Klar |
| 3 | Hem-vy: fritt positioneringssystem med drag | ✅ Klar |
| 4 | Kontrollpanel: sektionsbaserad layout | ✅ Klar |
| 5 | Nordic Noir: typografi, materialitet, spacing | ✅ Klar |
| 6 | Nav rail: arkitektoniskt premium | ✅ Klar |
| 7 | Energi hero-widget, sparkline | ✅ Klar |
| 8 | Klimat nuvärde/mål/trend | ✅ Klar |
| 9 | Väder prognos, hemkoppling | ✅ Klar |
| 10 | Polish: settings, profil, design-läge | ✅ Klar |

## Stora designbeslut (v2)

### Hem-vy: Fritt positioneringssystem
- Widgets har **absolut position** (x%, y%) istället för fasta slots
- I layoutläge drar man widgets fritt med pointer-drag
- Subtilt rutnät som guide, inte tvingande
- Storlekar: compact / normal / expanded
- Widgets är HUD-typografiska, inte boxar

### Kontrollpanel: Sektionsbaserad komposition
- Inte CSS grid med col-span
- Vertikala sektioner med andrum (space-y-8/10)
- 3D-preview som hero-element (h-280px, rounded-[28px])
- Enhetssektioner = gradient-ytor, inte boxiga cards
- Typografisk hierarki: stor rubrik + micro-labels

### Nordic Noir: Komposition, inte bara färg
- Värden: Space Grotesk, 600, letter-spacing -0.02em
- Labels: 10px, uppercase, tracking 0.2em, opacity 0.4
- Borders nästan osynliga (opacity 0.12)
- Skuggor djupa (0 24px 60px)
- Scrollbars diskretare (opacity 0.25)
- Nav rail mörkare (hsl 222 20% 6%)

## Backup

- **Återställningspunkt**: Lovable version history (varje commit)
- **Återställning**: Använd Lovables inbyggda rollback

## Beslut tagna

- 2024: Planen godkänd, implementation påbörjad
- 2025-03: Fasta slot-positioner ersatta med fritt drag-system
- 2025-03: Kontrollpanel ombyggd från grid till sektioner
- 2025-03: Typografi och materialitet uppgraderad genomgående
