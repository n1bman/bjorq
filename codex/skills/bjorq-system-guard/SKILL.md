---
name: bjorq-system-guard
description: Guard the high-risk integration seams in BJORQ across DEV vs HOSTED mode, Home Assistant live sync, vacuum flows, hosted persistence, and Asset Wizard integration. Use when reviewing or changing features that cross frontend, Zustand store, Express backend, HA live transport, or Wizard asset contracts.
---

# BJORQ System Guard

Start from the full flow, not from one file.

## First Files

- `src/lib/apiClient.ts`
- `src/store/useAppStore.ts`
- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `server/server.js`
- `server/api/live.js`
- `server/ha/liveHub.js`

## Review Checklist

1. Is the behavior different in DEV and HOSTED?
2. Does data survive reload and restart where expected?
3. Does the flow depend on HA live state, SSE, fallback polling, or admin auth?
4. Does Wizard metadata or publish state affect downstream behavior?

## Rules

- Call out contract mismatch risk explicitly.
- Validate both write path and read-back path.
- Prefer end-to-end reasoning over local fixes.
