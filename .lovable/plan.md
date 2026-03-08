

# Fix: Infinite WebGL Context Loss Recovery Loop

## Problem
The console shows context loss every ~1.5 seconds in an infinite loop. The current recovery mechanism remounts the Canvas, but the new Canvas immediately loses context again, creating a never-ending cycle. The 3D scene never renders — just flashes "Återställer 3D…" forever.

## Root Cause
The recovery has no retry limit or backoff. Each remount creates a new WebGL context that immediately fails (browser/GPU resource exhaustion), triggering another recovery, ad infinitum.

## Solution

### `src/components/Scene3D.tsx`
1. **Cap retries at 3** — after 3 failed recoveries, stop trying and show a static fallback (gradient background + message + "Försök igen" button)
2. **Exponential backoff** — wait 1s, then 2s, then 4s between retries instead of always 1s
3. **Manual retry button** resets the counter so the user can try again after switching tabs or waiting
4. **`failedAt` timestamp** — only count rapid failures (within 10s) as consecutive; if the scene ran fine for a while before failing, reset the counter

### `src/components/build/BuildScene3D.tsx`
Same pattern: max 3 retries with backoff, then show fallback with retry button.

### `src/components/home/DashboardView.tsx`
If Scene3D is in failed state, the gradient fallback from the scene itself handles it — no change needed.

## Key Logic
```typescript
const MAX_RECOVERY = 3;
const [recoveryCount, setRecoveryCount] = useState(0);
const [recovering, setRecovering] = useState(false);
const [failed, setFailed] = useState(false);
const lastSuccessRef = useRef(Date.now());

const handleCreated = ({ gl }) => {
  lastSuccessRef.current = Date.now(); // context created OK
  gl.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    // If scene ran >10s, reset counter (it was a one-off)
    const elapsed = Date.now() - lastSuccessRef.current;
    setRecoveryCount(prev => {
      const next = elapsed > 10000 ? 1 : prev + 1;
      if (next > MAX_RECOVERY) { setFailed(true); return prev; }
      setRecovering(true);
      const delay = Math.min(1000 * Math.pow(2, next - 1), 4000);
      setTimeout(() => { setRecovering(false); }, delay);
      return next;
    });
  });
};

// Fallback UI when failed
if (failed) return (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
    <p>3D-scenen kunde inte startas</p>
    <button onClick={() => { setFailed(false); setRecoveryCount(0); }}>Försök igen</button>
  </div>
);
```

## Files
| File | Change |
|------|--------|
| `src/components/Scene3D.tsx` | Max 3 retries, backoff, fallback UI |
| `src/components/build/BuildScene3D.tsx` | Same pattern |

