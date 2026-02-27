

# Plan: HA Add-on Remote Conversion for SketchUp Import

## Overview
Move large OBJ/DAE conversion from browser to a Home Assistant Add-on. The web app uploads files to the add-on's HTTP API and downloads the resulting GLB. Browser conversion remains as fallback for small models.

## Architecture

```text
┌─────────────────────┐         ┌──────────────────────────┐
│  HomeTwin Web App   │  HTTP   │  HA Add-on               │
│                     │────────>│  "hometwin-converter"     │
│  Upload ZIP/folder  │         │                          │
│  Poll status        │<────────│  POST /convert → jobId   │
│  Download GLB       │         │  GET /status/:id         │
│  Import into scene  │         │  GET /result/:id → GLB   │
└─────────────────────┘         └──────────────────────────┘
```

The add-on runs on the HA host (Python + trimesh/pygltflib), so it can handle 600MB+ OBJ files without browser memory limits.

## Changes

### 1. New file: `src/lib/haConverterApi.ts`
HTTP client for the HA add-on converter:
- `getHABaseUrl()` — derive HTTP base URL from stored `wsUrl` (wss://host → https://host)
- `checkAddonAvailable(baseUrl, token)` — `GET /api/hassio/ingress/<slug>/health` with bearer token
- `uploadForConversion(baseUrl, token, zipBlob)` — `POST` multipart to add-on ingress, returns `jobId`
- `pollConversionStatus(baseUrl, token, jobId)` — `GET /status/:jobId`, returns `{ state, percent, message }`
- `downloadResult(baseUrl, token, jobId)` — `GET /result/:jobId`, returns `Blob` (GLB)

All requests use the HA long-lived access token as `Authorization: Bearer <token>`.

### 2. Update: `src/components/build/import/SketchUpWizard.tsx`

**New state:**
- `conversionMode: 'auto' | 'ha' | 'browser'` (default `'auto'`)
- `haAddonAvailable: boolean | null` (checked on wizard open)
- `haUploadProgress: number`

**New step: mode selection** (after `validate`, before `settings`):
- Two radio options:
  - "Konvertera via Home Assistant (Rekommenderas)" — enabled only when `haAddonAvailable`
  - "Konvertera i webbläsaren (endast små modeller)"
- Auto-select HA when `fileMap.totalSize > 150MB` and addon is available
- If HA not connected or addon not found, show info box: "Installera HomeTwin Converter add-on i Home Assistant" with link/instructions

**HA conversion flow** (replaces `startConversion` when HA mode selected):
1. Build ZIP blob from `fileMap.files` (re-zip all extracted files)
2. Upload to add-on → show "Laddar upp..." with progress
3. Poll `/status/:jobId` every 2s → show progress bar
4. On complete: download GLB blob from `/result/:jobId`
5. Feed GLB blob into existing `importResult()` path (same as browser conversion done step)

**Progress UI updates:**
- New stages: `'uploading' | 'remote-converting' | 'downloading'`
- Show which conversion mode is active

### 3. Update: `src/lib/sketchupImport.ts`

**Add `buildZipFromFileMap(fileMap)`:**
- Uses fflate `zipSync` to create a ZIP blob from the current FileMap
- Used to upload to the HA add-on

**Add to `ConversionProgress` type:**
- New stages: `'uploading' | 'remote-converting' | 'downloading'`

### 4. New file: `public/hometwin-converter/README.md`
Reference documentation for the HA add-on (not executable in Lovable, but serves as spec):
- `config.yaml` for HA add-on manifest
- Python conversion script using `trimesh` + `pygltflib`
- Endpoints: `/convert`, `/status/:id`, `/result/:id`
- Dockerfile outline

## File summary

| File | Change |
|------|--------|
| `src/lib/haConverterApi.ts` | New — HTTP client for HA add-on API |
| `src/lib/sketchupImport.ts` | Add `buildZipFromFileMap`, extend `ConversionProgress` stages |
| `src/components/build/import/SketchUpWizard.tsx` | Add mode selector, HA conversion flow, upload/poll/download UI |
| `public/hometwin-converter/README.md` | New — Add-on spec and reference code |

