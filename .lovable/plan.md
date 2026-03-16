
Målet här är att få väggsystemet att bli visuellt stabilt i alla hörn utan att “jaga” små artefakter per scenario.

## Vad som sannolikt orsakar dina två sista fel
Jag ser två konkreta riskpunkter i nuvarande geometri:

1) `computeMiterOffsets` lägger L-corner-padding på båda sidor av änden.  
Det stänger glipor, men kan samtidigt skapa en liten spets på utsidan (convex sida) — exakt det du visar.

2) Junction-bedömningen är känslig för “nästan samma nod”/små avvikelser.  
När kandidater inte “agree” blir änden flat (legacy från tiden med corner blocks), vilket nu kan ge konstigt hörn eftersom corner blocks inte längre renderas.

## Plan (nästa implementation)
1. **Gör padding ensidig och riktad**
   - Behåll padding endast vid L-hörn.
   - Applicera padding bara på den **retraherade** sidan (inte den redan utstickande sidan).
   - Effekt: glipa stängs, men utsidan får inte extra spets.

2. **Stabilisera junction-lösning vid “nästan T”**
   - Behåll nuvarande “agree”-logik för rena fall.
   - Vid små avvikelser (samma tecken, liten spridning): använd robust median/medel istället för att falla till flat direkt.
   - Vid riktig konflikt (+-tecken / korsning): behåll flat.
   - Effekt: färre “konstiga enstaka hörn”.

3. **Tighta nodmatchning för miter-beräkning**
   - Byt till konsekvent avståndskontroll (euclidean) och snävare tolerans för connected endpoint i miter.
   - Effekt: färre falska kopplingar som ger skev miter.

4. **Säkerhetskoll för väggar med öppningar**
   - Verifiera att yttersegment (första/sista strip) fortfarande följer miter-ändar.
   - Om inte: applicera samma miter-offset på ändsegmenten.
   - Effekt: inga specialfall där hörn blir annorlunda bara för att väggen har fönster/dörr.

5. **Verifiering (måste köras efter fix)**
   - L-hörn åt båda håll (clockwise + counterclockwise)
   - T-korsning (flush, ingen spets)
   - Sned vinkel (inte bara 90°)
   - Ett scenario med öppningar nära hörn
   - Top-down + låg kameravinkel (som i dina bilder)

## Förväntat resultat
- Utsidans hörn blir flush utan liten utstickare.
- L-hörn förblir täta (ingen glipa).
- Enstaka “konstigt hörn” försvinner genom robustare junction-val i stället för legacy-flat-fallback i borderline-fall.
