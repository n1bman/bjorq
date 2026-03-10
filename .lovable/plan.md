

# Audit, Onboarding Guide & Documentation Cleanup

## 1. Identified Risks & Issues

### Security / Code Quality

| Issue | Severity | Location |
|-------|----------|----------|
| **XSS in error fallback** — `main.tsx` line 11 uses `document.body.innerHTML` with unsanitized error object. If an attacker can influence the error message, this is exploitable. | Medium | `src/main.tsx` |
| **HA proxy double-fetch for camera** — `haProxy.js` line 34 fetches the URL once (JSON path), then line 39 fetches it *again* for camera. The first fetch result is wasted and the response body is consumed twice. | Low | `server/api/haProxy.js` |
| **Backup version hardcoded to 0.1.5** — `backups.js` line 18 writes `version: '0.1.5'` instead of the actual app version. | Low | `server/api/backups.js` |
| **`@` alias still in vite.config.ts** — The resolve alias `@` is defined but CI forbids its use. Harmless but confusing for contributors. | Info | `vite.config.ts` |

### Data / State

| Issue | Severity | Location |
|-------|----------|----------|
| **Old persisted state missing new fields** — Already fixed for `atmosphere`/`sunCalibration`, but any new slice additions risk the same crash if defaults aren't defensive. Store should have a migration or merge-defaults layer. | Medium | `useAppStore.ts` |
| **Wizard catalog cache is module-global** — `_catalogCache` in `wizardClient.ts` persists across HMR in dev and never invalidates on URL change. | Low | `src/lib/wizardClient.ts` |

### Documentation

| Issue | Location |
|-------|----------|
| **Duplicate rows in Settings table** — WiFi, Widgetar, Data & Backup listed twice | `docs/03-using-the-dashboard.md` lines 54-59 |
| **Missing Wizard docs** — No mention of Asset Wizard integration in any doc | All docs |
| **Missing Climate/Comfort docs** — Climate tab and comfort engine undocumented in user guide | `docs/03-using-the-dashboard.md` |
| **No onboarding guide** — No `ONBOARDING.md` or getting-started guide for new users on GitHub | Root |
| **Roadmap outdated** — `roadmap-vNext.md` says "Updated: 2026-03-08", all phases marked Done, no mention of Wizard or recent work | `docs/roadmap-vNext.md` |

### Version Consistency

All version sources currently show **0.7.3** — this is correct:
- `package.json` ✅
- `config.yaml` ✅  
- `README.md` badge ✅
- `CHANGELOG.md` top entry ✅
- `vite.config.ts` injects from `package.json` ✅

One exception: `server/api/backups.js` hardcodes `version: '0.1.5'`.

---

## 2. Plan

### Task A: Fix identified risks

1. **`main.tsx`** — Sanitize error in innerHTML fallback (use `textContent` instead)
2. **`haProxy.js`** — Remove the double-fetch for camera proxy (early return before the first `response` read)
3. **`backups.js`** — Read version from `package.json` or inject it, replace hardcoded `0.1.5`
4. **`wizardClient.ts`** — Clear `_catalogCache` when wizard URL changes

### Task B: Fix documentation issues

1. **`docs/03-using-the-dashboard.md`** — Remove duplicate WiFi/Widgetar/Data rows in Settings table. Add Wizard and Climate sections.
2. **`docs/roadmap-vNext.md`** — Add Phase 12 (Wizard Integration) entry, update date.

### Task C: Create onboarding guide

New file: **`ONBOARDING.md`** at project root (linked from README). Contents:

```text
# Getting Started with BJORQ Dashboard

## Step 1: Install & Launch
## Step 2: Connect Home Assistant  
## Step 3: Build Your Home (Import or Draw)
## Step 4: Place Devices
## Step 5: Furnish (optional)
## Step 6: Use the Dashboard
## Step 7: Kiosk Setup (optional)
## Tips & Next Steps
```

Each step: 3-5 lines with screenshots-ready descriptions and Settings path references. Links to detailed docs for deep dives.

### Task D: Version alignment

1. **`backups.js`** — Dynamic version from `package.json`
2. **`README.md`** — Add link to `ONBOARDING.md` in Documentation table

### Files changed

| File | Change |
|------|--------|
| `src/main.tsx` | Use `textContent` instead of `innerHTML` |
| `server/api/haProxy.js` | Fix camera double-fetch |
| `server/api/backups.js` | Dynamic version from package.json |
| `src/lib/wizardClient.ts` | Invalidate cache on URL change |
| `docs/03-using-the-dashboard.md` | Remove duplicates, add Wizard + Climate sections |
| `docs/roadmap-vNext.md` | Add Phase 12 Wizard entry |
| `ONBOARDING.md` | New onboarding guide |
| `README.md` | Add ONBOARDING.md link |

