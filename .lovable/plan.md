

## Problem

The "Module failed to load" error persists because **4 files still have `@/` imports** that were missed in the previous bulk conversion. The session replay confirms the error: `Failed to resolve import "@/components/ui/button" from "src/components/ui/calendar.tsx"`.

## Fix — 4 remaining `@/` imports

| File | Current import | Fix |
|---|---|---|
| `src/components/ui/calendar.tsx:6` | `@/components/ui/button` | `./button` |
| `src/components/ui/carousel.tsx:6` | `@/components/ui/button` | `./button` |
| `src/components/ui/skeleton.tsx:1` | `@/lib/utils` | `../../lib/utils` |
| `src/components/ui/resizable.tsx:4` | `@/lib/utils` | `../../lib/utils` |

That is all. No rollback needed — the app should load once these 4 lines are fixed.

