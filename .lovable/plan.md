

# Plan: Synlig "Rensa allt"-knapp i bygglägets toolbar

## Nuläge
"Rensa allt" finns redan men är gömd inuti Settings-popovern (kugghjulet). Användaren vill ha den mer lättillgänglig.

## Lösning
Flytta "Rensa allt" till en egen knapp direkt i toolbaren (bredvid ghost-toggle / settings). Vid klick öppnas en `AlertDialog` med varningstext och Ja/Nej-knappar. Behåll inte den gamla versionen i settings-popovern (ta bort dubbletten).

### Ändringar i `BuildTopToolbar.tsx`

1. Importera `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` från `ui/alert-dialog`
2. Lägg till en `Trash2`-knapp i toolbaren (före settings-knappen), wrappat i `AlertDialog`:
   - Trigger: röd ikon-knapp med `Trash2`
   - Dialog: "Är du säker?", beskrivning "Alla väggar, rum och möbler tas bort permanent.", knappar "Nej" (cancel) och "Ja, rensa" (action som kör `clearAllFloors()`)
3. Ta bort "Clear"-sektionen (rad 353-369) från settings-popovern
4. Ta bort `showClearConfirm` state (inte längre behövt — AlertDialog hanterar sitt eget open/close)

