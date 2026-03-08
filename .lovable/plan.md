

# Plan: Fix 3D wall auto-close + material orientation

## Root cause found

The **3D wall drawing mode** (BuildScene3D.tsx) is missing the auto-close logic that exists in the **2D mode** (useCanvas2DTools.ts lines 254-274, BuildCanvas2D.tsx lines 702-705).

In 2D mode, when the user clicks within 0.3m of the first node (with ≥3 nodes drawn), the loop auto-closes by appending `firstNode` and creating all walls. In 3D mode, clicks just keep adding nodes — the loop never closes. The double-click handler creates walls between consecutive nodes but does NOT add a closing segment back to the first node.

**Result**: Walls appear to form a closed shape visually (corners touch), but the last wall segment connecting the last node back to the first node is missing. The graph has two dead-end nodes, so no cycle is found, and no room is detected.

The blue "outside" coloring on wrong sides is a separate issue: the `+z`/`-z` face of each BoxGeometry depends on the wall's `from→to` direction. Walls drawn in different directions have their "exterior" face pointing in arbitrary directions. This is only corrected when `setRoomMaterial` runs (which requires a detected room). Without a detected room, the default coloring is direction-dependent.

## Changes

### 1. Add auto-close to 3D wall drawing (`src/components/build/BuildScene3D.tsx`)

In `handleGroundPointerDown` (wall tool branch), add the same auto-close logic as the 2D mode:
- When `wallDrawing.nodes.length >= 3` and the clicked point is within 0.3m of `wallDrawing.nodes[0]`, auto-close the loop
- Append `firstNode` to the nodes array, create all walls, and stop drawing

### 2. Add snap-to-first-node in 3D cursor (`src/components/build/BuildScene3D.tsx`)

In `handleGroundPointerMove`, also check distance to `wallDrawing.nodes[0]` and snap cursor to it when within 0.3m. This gives the user visual feedback (green snap indicator) that clicking will close the loop.

### 3. Fix double-click to also auto-close if near start (`src/components/build/BuildScene3D.tsx`)

In `handleDoubleClick`, check if the last node is within 0.3m of the first node. If so, add the closing segment. Also filter out zero-length walls (from duplicate nodes caused by the click events of the double-click).

### 4. Enhanced debug logging (`src/lib/roomDetection.ts`)

Add detailed graph dump when no cycles are found: list all nodes with their neighbor counts, highlight dead-ends. This makes future debugging trivial.

## Files changed

1. **`src/components/build/BuildScene3D.tsx`** — Add auto-close on click + snap-to-first-node + fix double-click (~30 lines)
2. **`src/lib/roomDetection.ts`** — Enhanced debug logging when cycles=0 (~10 lines)

