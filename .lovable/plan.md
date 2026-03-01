

## Plan: Performance Dashboard, Transparency Fix, Demo Models, v0.1.8

### 1. Performance Status Dashboard in PerformanceSettings

Add a visual "Performance Impact" summary to `src/components/home/cards/PerformanceSettings.tsx`:

- Show a computed "performance score" (0-100) based on current settings:
  - Quality: low=30, medium=60, high=100
  - Shadows: +25 if on
  - Postprocessing: +15 if on
  - TabletMode: override to 20
- Display as a colored progress bar (green/yellow/red) with label like "Lätt", "Balanserad", "Krävande"
- Show estimated resource usage: shadow map resolution, DPR value, effects count
- Add a "Rekommendation" section: if score > 80 and device has low GPU (detect via `navigator.hardwareConcurrency` or `gl.getParameter` for renderer info), suggest switching to Medium or Low
- Show a device capability hint based on `navigator.hardwareConcurrency` (cores) and screen resolution

### 2. Fix Transparent Textures (Windows/Glass)

**Bug in `src/components/build/ImportedHome3D.tsx`** lines 126-132:

When `opacity >= 1` (default), the code forcefully sets `transparent = false` on ALL materials, destroying inherent transparency from the GLTF model (glass, windows, etc.).

**Fix**: Track each material's original `transparent` state before modifying. When opacity is 1, only reset materials that were NOT originally transparent.

- On initial load (line 71-83): store `child.material._originalTransparent = child.material.transparent` before any modifications
- In the re-apply effect (line 127): check `child.material._originalTransparent` — if it was originally transparent, leave it alone when opacity is 1

### 3. Bundle Demo Models as Examples

Add two built-in demo assets so new users have something to start with. Since we can't ship GLB files in the Lovable preview, we'll use a different approach:

- Create `src/lib/demoData.ts` with a function `loadDemoProject()` that sets up:
  - A small procedural house layout (walls + rooms on floor-1)
  - A couple of demo device markers (light, sensor)
- Add a "Ladda demo-projekt" button in the home/settings area (e.g. in ProfilePanel under Data & Backup)
- The button populates the store with the demo layout so users can explore the UI immediately
- Note: The actual 3D models (house GLB + furniture GLB) that the user has imported are stored in localStorage/server state — we cannot bundle those. Instead, we create a procedural demo with walls/rooms that demonstrates the build system.

### 4. Version Bump to 0.1.8

- `package.json`: version `"0.1.5"` → `"0.1.8"`

### Files Modified/Created (4-5)
1. `src/components/home/cards/PerformanceSettings.tsx` — performance score dashboard + device recommendation
2. `src/components/build/ImportedHome3D.tsx` — fix transparency preservation for glass/windows
3. `src/lib/demoData.ts` — new: demo project layout data + loader function
4. `src/components/home/cards/ProfilePanel.tsx` — add "Ladda demo-projekt" button
5. `package.json` — version bump to 0.1.8

