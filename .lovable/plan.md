
Mål: göra temalogiken förutsägbar så att:
- Text inte “känns som border”
- Border faktiskt styr linjerna användaren ser
- Nordic Noir inte får vit inramning
- “Färger & ytor” alltid visar aktuella färger när man byter tema

## 1) Rätta border-logiken i theme-engine
**Fil:** `src/hooks/useThemeEffect.ts`

- Ta bort vit fallback (`0 0% 100%`) när `borderOpacity` används utan `borderColor`.
- Använd istället aktivt temas border-bas som fallback (så Nordic/Dark behåller sin karaktär).
- Låt `borderColor` styra:
  - `--border`
  - `--glass-border`
  - `--sidebar-border`
- Säkerställ att `textColor` endast påverkar textvariabler och aldrig border-variabler.

**Effekt:** “Text” och “Border” separeras tydligt i praktiken.

## 2) Justera Nordic Noir så den inte blir vit runt allt
**Fil:** `src/hooks/useThemeEffect.ts`

- Byt Nordic Noir default för border-relaterade tokens från vit/transparent till mörkare, samma tonalitet som Mörkt (subtil mörk grafit istället för vit linje).
- Finjustera `--glass-border` och `--sidebar-border` i Nordic Noir till mörk/subtil nivå.

**Effekt:** Nordic Noir får mörk premium-inramning i stället för vit “outline”.

## 3) Gör “Färger & ytor” alltid ifyllda med aktiva temafärger
**Filer:**  
- `src/hooks/useThemeEffect.ts`  
- `src/components/home/cards/ThemeCard.tsx`

- Inför en delad “theme defaults”-karta (hex) för visningsfärger per tema (button, slider, panel, meny, kort, text1, text2, border).
- I `ThemeCard`: varje färgprick visar **effektiv färg** = `customColors[field] ?? themeDefaults[theme][field]`.
- Därmed är pickers aldrig “tomma” vid temabyte.

**Effekt:** användaren ser direkt vilka färger temat faktiskt använder.

## 4) Tydlig logik vid temabyte
**Fil:** `src/components/home/cards/ThemeCard.tsx`

- Vid klick på bas-tema:
  - sätt `theme`
  - sätt temaets default-accent
  - nollställ `customColors` (så temat verkligen laddas rent)
- Sparade egna teman används för att återställa personliga varianter.

**Effekt:** temabyte blir logiskt och konsekvent; inga gamla overrides “läcker” in.

## 5) Förtydliga UI i färgsektionen
**Fil:** `src/components/home/cards/ThemeCard.tsx`

- Byt etiketter till:
  - `Text 1` (primär)
  - `Text 2` (sekundär)
  - `Border` (UI-linjer/ramar)
- Lägg kort hjälprad under Border (ex: “Styr panelramar, sektionlinjer och sidolinjer”).

**Effekt:** användaren förstår exakt vad varje kontroll ändrar.

## Tekniska detaljer (kort)
- Behåll `CustomColors` som override-lager, men låt UI visa effektiva värden från tema-defaults när override saknas.
- Återställningsknappen fortsätter att rensa custom overrides; eftersom UI nu har fallback syns ändå temafärger direkt.
- Ingen backend/databasändring krävs.

## Filer som ändras
- `src/hooks/useThemeEffect.ts`
- `src/components/home/cards/ThemeCard.tsx`
- (ev.) `src/store/types.ts` endast om vi behöver kompletterande display-fält, annars oförändrad

## Verifiering efter implementation
1. Byt mellan Mörkt/Midnatt/Ljust/Nordic Noir → “Färger & ytor” visar ifyllda färger direkt.
2. I Nordic Noir: inga vita ramar runt sektioner/linjer.
3. Ändra Text 1/Text 2 → text ändras, men border ligger kvar.
4. Ändra Border → linjer/ramar ändras tydligt.
5. Spara/ladda eget tema och kontrollera att logiken håller efter reload.
