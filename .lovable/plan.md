

# Fix: CategoryManager placement + brightness-bar i expanded-läge

## 1. CategoryManager ska renderas under filter-raden, inte ovanför

**Problem:** `showManager && <CategoryManager />` renderas på rad 298, *före* gridet (rad 301). Det hamnar alltså ovanför allt.

**Fix i `DashboardGrid.tsx`:**
- Flytta `{showManager && <CategoryManager />}` till efter filter-raden (efter rad 375), inuti gridet med `col-span-2 md:col-span-4` så den landar under filtren men ovanför rumskorten.

## 2. Brightness-bar ska synas även i expanded, men bara på header-raden

**Problem:** Brightness-baren (fade-bakgrunden) döljs helt vid `expanded` (`!expanded` villkor på rad 204). Användaren vill att den fortfarande syns på header-delen, men inte följer med ner i detaljvyn.

**Fix i `CategoryCard.tsx`:**
- Ta bort `!expanded` från villkoret på rad 204 → visa baren alltid när `isLight && on`
- Men begränsa baren till bara header-höjden: istället för `absolute inset-0` (hela kortet), ge den en fast höjd som matchar headern (`h-[52px]` + `top-0 left-0 right-0`) så den stannar uppe och inte täcker expanded-innehållet

## Filer

| Fil | Ändring |
|-----|---------|
| `DashboardGrid.tsx` | Flytta `CategoryManager` rendering till efter filter-raden |
| `CategoryCard.tsx` | Brightness-bar: ta bort `!expanded`, begränsa till header-höjd |

