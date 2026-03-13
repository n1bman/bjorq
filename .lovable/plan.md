

# Fasplan C — Stylized Surfaces, Floor Textures & Placement Foundation

## Motivering till ordningen

Fas C1 kommer först eftersom den löser det mest akuta problemet: väggar som ser fula ut med full textur. Att rensa detta ger omedelbar visuell förbättring. C2 förbättrar golv som redan fungerar men behöver bättre defaults. C3 gör editorn trevligare att använda. C4 förbereder placement-reglerna som behövs innan vi bygger vidare på inredning.

---

## Fas C1 — Stylized Wall Surfaces (färg/material, inte textur)

**Mål:** Väggar renderas med färg, roughness och subtil materialkänsla — utan bildtexturer som standard.

**Åtgärder:**
- `wallTextureLoader` / `wallMaterials` ändras så att väggmaterial INTE laddar `mapPath`/`normalMapPath` som default — bara färg, roughness, metalness
- Behåll texturstöd som opt-in flagga (`forceTexture` eller liknande) för framtida avancerat val
- Justera material-presets: väggar (paint, wallpaper, tile, stone, texture, metal) får enbart färg+roughness+metalness som renderingsväg
- Verifiera att face-aware editing fortfarande fungerar
- Verifiera save/load-kompatibilitet

**Vad som bevaras:** Alla preset-definitioner, `realWorldSize`, texturvägar — de finns kvar i data men används inte för rendering på väggar som standard.

**Vad som väntar:** Egna texturer som avancerat val, panelobj/accentzoner.

---

## Fas C2 — Floor Texture Defaults & Scaling

**Mål:** Golv fortsätter vara texturdrivna med bra defaults och automatisk skala.

**Åtgärder:**
- Verifiera att `Floors3D` korrekt applicerar texturer från presets med `realWorldSize`-baserad repeat
- Säkerställ att golv-kategorier (wood, tile, stone, texture) har fungerande texturfiler
- Justera repeat/scale-defaults om de ser fel ut visuellt
- Lägg till sizeMode-stöd (auto/small/standard/large) för golv om det saknas
- Fallback till flat färg om texturfil saknas

**Vad som bevaras:** Alla befintliga golvmaterial, texturpack från B4.1.

---

## Fas C3 — Surface Editor UX Cleanup

**Mål:** Inspektorn och yteditor känns designorienterad, inte teknisk.

**Åtgärder:**
- Omstrukturera inspektörens ordning: ytstil först, tekniska mått sist
- Förenkla vägg-materialbrowsing till färgpaletter + finish-val (matt/satin/glans) istället för texturkategorier
- Golv behåller kategoribaserad browsing med texturer
- Gör sizeMode-väljaren (Auto/Liten/Standard/Stor) synlig bara för golv (väggar behöver den inte längre)
- Touch-vänlig: tillräckligt stora träffytor, inga hover-beroenden

**Vad som väntar:** Avancerat texturval för väggar, custom texture upload UI.

---

## Fas C4 — Placement Rules Foundation

**Mål:** Förbered placementlogik med väggbarriärer och fri placering.

**Åtgärder:**
- Vanliga möbler ska kollisionsdetekteras mot väggar (barriär)
- Wall-mount triggas BARA för objekt markerade som `wallMount: true`
- Lägg till "Fri placering / Ignorera väggar" i objektets long-press-meny (touch-first)
- Ingen tangentbordsmodifierare som huvudlösning
- Behåll befintlig drag-och-släpp-logik, bygg reglerna ovanpå

**Vad som väntar:** Avancerad snap-logik, panelplacering, accentzoner.

---

## Sammanfattning

```text
Fas    Fokus                              Beroende
────── ──────────────────────────────── ──────────
C1     Stylized walls (färg, ej textur)   —
C2     Floor texture defaults              C1 (delar scaling-logik)
C3     Surface editor UX cleanup           C1+C2
C4     Placement rules foundation          C1 (väggbarriär)
```

## Vad som uttryckligen väntar

- Egna texturer som avancerat val → efter C3
- Paneler / accentzoner / backsplash → efter C4
- Takytmaterial → ej i scope
- Material-marketplace / online-browsing → ej planerat
- Avancerad UV-redigering → ej planerat

