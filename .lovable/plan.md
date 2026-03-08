

# Fix: WebGL Context Loss Recovery in Scene3D

## Problem
The console shows `THREE.WebGLRenderer: Context Lost.` — the 3D scene crashes and goes permanently black. The `ContextLossHandler` component detects context loss but does nothing about it (returns `null` in both states).

Home view and Dashboard both depend on `Scene3D` for their background. When the WebGL context is lost, users see only floating widgets on a black screen.

## Root Cause
Multiple Canvas instances (switching between Home/Dashboard/Build/Standby modes) or browser resource limits can trigger WebGL context loss. There is no recovery mechanism.

## Solution
Add automatic Canvas re-mount on context loss. When the WebGL context is lost, increment a key counter after a short delay, which forces React to destroy and recreate the entire `<Canvas>`, establishing a fresh WebGL context.

### Change: `src/components/Scene3D.tsx`

1. Add a `contextLostCount` state to the `Scene3D` component
2. Listen for `webglcontextlost` on the canvas element via an `onCreated` callback
3. On context loss, wait 1 second, then increment the counter — which changes the `key` prop and forces a full Canvas remount
4. Show a brief "Återställer 3D..." overlay during recovery so the user knows something is happening
5. Remove the useless `ContextLossHandler` inner component

### Key logic
```typescript
// Scene3D component
const [recoveryCount, setRecoveryCount] = useState(0);
const [recovering, setRecovering] = useState(false);

const handleCreated = ({ gl }) => {
  const canvas = gl.domElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    setRecovering(true);
    setTimeout(() => {
      setRecoveryCount(c => c + 1);
      setRecovering(false);
    }, 1000);
  });
};

// Canvas key includes recoveryCount
const canvasKey = `${quality}-${shadows}-...-${recoveryCount}`;
```

**One file changed**: `src/components/Scene3D.tsx`

