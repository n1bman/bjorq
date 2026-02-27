

# Fix: ZIP-import "invalid zip data"

## Problem
The user's file is a **RAR archive** (WinRAR), not a ZIP file. `fflate` only supports ZIP format, so it throws "invalid zip data". The file picker also has `accept=".zip"` which hides the file in Windows Explorer (user has to switch to "Alla filer" to even see it).

From the screenshots:
- The file "Nyexporthus" is 159 MB, listed as "Komprimerad arkivmapp" — this is a RAR file created by WinRAR
- RAR is a proprietary format that cannot be parsed client-side with `fflate`

## Solution

### 1. Accept more archive formats in the file picker
Change `accept=".zip"` to `accept=".zip,.rar,.7z"` so the file is visible, but add **format detection** to give a clear error message for unsupported formats.

### 2. Detect RAR/7z and show helpful error
Before calling `unzipSync`, check the file's magic bytes:
- ZIP starts with `PK` (0x50, 0x4B)
- RAR starts with `Rar!` (0x52, 0x61, 0x72, 0x21)
- 7z starts with `7z` (0x37, 0x7A)

If RAR or 7z is detected, show a friendly message: "RAR-filer stöds inte. Packa om filerna som ZIP först (högerklicka → Skicka till → Komprimerad mapp)."

### 3. Also accept `.zip` files that WinRAR creates
WinRAR can create actual ZIP files (not RAR). The user needs to re-export as ZIP. The error message should guide them.

## Files to change

| File | Change |
|------|--------|
| `src/components/build/import/SketchUpWizard.tsx` | Change `accept` to include `.rar,.7z`, update error message |
| `src/lib/sketchupImport.ts` | Add magic-byte detection before `unzipSync`, throw descriptive error for RAR/7z |

