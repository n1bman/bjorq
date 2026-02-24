

# Smartare HA Entity-koppling i Build-inspektorn

## Oversikt

Gor det enkelt att koppla placerade enheter till Home Assistant-entiteter genom att ersatta det manuella textfaltet med en sokbar dropdown som visar alla tillgangliga HA-entiteter, filtrerade efter enhetstyp. Dessutom laggs en lista med okopplade HA-entiteter till i Enheter-fliken sa man snabbt kan se vilka som saknar koppling.

---

## 1. Sokbar HA Entity-dropdown i DeviceInspector

**`src/components/build/BuildInspector.tsx`** (DeviceInspector, rad 624-631):

Ersatt det enkla `<Input>`-faltet for "HA Entity ID" med en kombinerad sok/dropdown-komponent:

- Visa en lista over alla HA-entiteter fran `homeAssistant.entities` i storen
- **Filtrera efter domain** baserat pa enhetens `kind`:
  - `light` -> `light.*`
  - `switch` / `power-outlet` -> `switch.*`, `input_boolean.*`
  - `climate` -> `climate.*`
  - `sensor` -> `sensor.*`, `binary_sensor.*`
  - `camera` -> `camera.*`
  - `vacuum` -> `vacuum.*`
  - `door-lock` -> `lock.*`
  - `media_screen` -> `media_player.*`
  - Andra typer -> visa alla
- Visa `friendlyName` som primar text och `entityId` som sekundar text
- Markera entiteter som redan ar kopplade till en annan enhet (grayed out + "Kopplad till: X")
- Sokfalt langst upp for att filtrera pa namn/entityId
- Knapp for att koppla bort (rensa `ha.entityId`)
- Om HA inte ar anslutet: visa meddelande "Anslut till Home Assistant for att valja entitet" + behall manuellt textfalt som fallback

## 2. Okopplade HA-entiteter i sidopanelen

**`src/components/build/devices/DevicePlacementTools.tsx`** (eller ny sektion):

Lagg till en expanderbar sektion "HA-entiteter" i Enheter-fliken som visar:
- Antal kopplade / totalt antal entiteter
- Lista over **okopplade** HA-entiteter grupperade per domain
- Klick pa en okopplad entitet -> skapar automatiskt en ny DeviceMarker med ratt `kind` och `ha.entityId` ifyllt, redo att placeras
- Markera redan kopplade entiteter med en bock

## 3. Automatisk koppling vid placering

Nar anvandaren placerar en ny enhet (t.ex. `place-light`) och det finns okopplade HA-entiteter av ratt typ:
- Visa en liten forfragan/badge i inspektorn: "3 okopplade lampor i HA — valj en?"
- Oppna dropdown direkt sa anvandaren kan koppla pa en gang

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/components/build/BuildInspector.tsx` | Ersatt HA Entity ID-input med sokbar dropdown + domain-filtrering |
| `src/components/build/devices/DevicePlacementTools.tsx` | Ny sektion som visar okopplade HA-entiteter, klick skapar ny markering |
| `src/store/types.ts` | Ingen andring (befintliga typer racker) |
| `src/store/useAppStore.ts` | Ingen andring (befintliga actions racker) |

### Domain-mappning (kind -> HA domains)

```text
light          -> light
switch         -> switch, input_boolean
power-outlet   -> switch
sensor         -> sensor, binary_sensor
climate        -> climate
camera         -> camera
vacuum         -> vacuum
door-lock      -> lock
media_screen   -> media_player
fridge/oven/washer/garage-door -> alla (ingen specifik domain)
```

