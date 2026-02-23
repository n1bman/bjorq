import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, DeviceMarker } from '@/store/types';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface MarkerProps {
  position: [number, number, number];
  id: string;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  selected?: boolean;
}

function SelectionRing({ radius }: { radius: number }) {
  return (
    <mesh>
      <ringGeometry args={[radius, radius + 0.05, 32]} />
      <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function miredsToColor(mireds: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (mireds - 153) / (500 - 153)));
  const r = 255;
  const g = Math.round(255 - t * 100);
  const b = Math.round(255 - t * 200);
  return new THREE.Color(r / 255, g / 255, b / 255);
}

function LightMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const lightData = state?.kind === 'light' ? state.data : null;
  const isOn = lightData?.on ?? false;

  // Compute color from state
  const lightColor = useMemo(() => {
    if (!lightData || !isOn) return new THREE.Color('#555555');
    if (lightData.colorMode === 'rgb' && lightData.rgbColor) {
      return new THREE.Color(lightData.rgbColor[0] / 255, lightData.rgbColor[1] / 255, lightData.rgbColor[2] / 255);
    }
    if (lightData.colorMode === 'temp' && lightData.colorTemp) {
      return miredsToColor(lightData.colorTemp);
    }
    return new THREE.Color('#f5c542');
  }, [lightData?.colorMode, lightData?.rgbColor?.[0], lightData?.rgbColor?.[1], lightData?.rgbColor?.[2], lightData?.colorTemp, isOn]);

  const brightness = isOn ? (lightData?.brightness ?? 200) / 255 : 0;

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); }
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <pointLight color={lightColor} intensity={isOn ? brightness * 5 : 0} distance={8} decay={2} />
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2 : 0.1} transparent opacity={isOn ? 0.9 : 0.4} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

function SwitchMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const isOn = state?.kind === 'generic' ? state.data.on : false;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      const target = isOn ? 1.2 : 1;
      ref.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 5);
    }
  });
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); }
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshStandardMaterial color={isOn ? '#4a9eff' : '#666'} emissive={isOn ? '#4a9eff' : '#333'} emissiveIntensity={isOn ? 0.8 : 0.1} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {selected && <SelectionRing radius={0.22} />}
    </group>
  );
}

function SensorMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      ref.current.scale.set(s, s, s);
    }
  });
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh ref={ref}>
        <sphereGeometry args={[selected ? 0.12 : 0.08, 16, 16]} />
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {selected && <SelectionRing radius={0.18} />}
    </group>
  );
}

function ClimateMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} transparent opacity={selected ? 0.3 : 0.15} />
      </mesh>
      {selected && <SelectionRing radius={0.55} />}
    </group>
  );
}

function GenericMarker({ position, id, onSelect, onDragStart, selected, color, emissive }: MarkerProps & { color: string; emissive?: string }) {
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

// ─── Media Screen Marker ───
interface MediaScreenMarkerProps extends MarkerProps {
  marker: DeviceMarker;
}

function drawScreenCanvas(
  canvas: HTMLCanvasElement,
  mediaState: { state: string; attributes: Record<string, unknown> } | null,
  config: { uiStyle: 'minimal' | 'poster'; showProgress: boolean }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  const title = (mediaState?.attributes?.media_title as string) || '';
  const source = (mediaState?.attributes?.app_name as string) || (mediaState?.attributes?.source as string) || '';
  const isPlaying = mediaState?.state === 'playing';
  const hasMedia = !!(title || isPlaying);

  if (!hasMedia) {
    // ── Standby mode ──
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = 'rgba(129,140,248,0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // TV icon (monitor outline)
    const cx = w / 2, cy = h / 2 - 20;
    const mw = 80, mh = 55;
    ctx.strokeStyle = 'rgba(129,140,248,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - mw / 2, cy - mh / 2, mw, mh);
    // Stand
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + mh / 2);
    ctx.lineTo(cx - 30, cy + mh / 2 + 18);
    ctx.moveTo(cx + 20, cy + mh / 2);
    ctx.lineTo(cx + 30, cy + mh / 2 + 18);
    ctx.stroke();

    // "Standby" text
    ctx.fillStyle = 'rgba(129,140,248,0.5)';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Standby', cx, cy + mh / 2 + 55);

    // Scanline effect
    ctx.fillStyle = 'rgba(129,140,248,0.03)';
    const scanY = (Date.now() % 3000) / 3000 * h;
    ctx.fillRect(0, scanY, w, 40);
  } else {
    // ── Now Playing ──
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Source label with colored background
    const srcLower = source.toLowerCase();
    const srcColor = srcLower.includes('netflix') ? '#e11d48' : srcLower.includes('spotify') ? '#22c55e' : '#6366f1';
    if (source) {
      ctx.fillStyle = srcColor;
      const tw = ctx.measureText(source.toUpperCase()).width + 20;
      const labelW = Math.min(tw, 200);
      ctx.beginPath();
      ctx.roundRect(24, 24, labelW, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(source.toUpperCase(), 34, 49, labelW - 20);
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Spelar…', 30, h / 2 + 10, w - 60);

    // Play/Pause icon
    const iconX = w / 2, iconY = h / 2 + 70;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (isPlaying) {
      ctx.fillRect(iconX - 18, iconY - 15, 10, 30);
      ctx.fillRect(iconX + 8, iconY - 15, 10, 30);
    } else {
      ctx.beginPath();
      ctx.moveTo(iconX - 12, iconY - 18);
      ctx.lineTo(iconX - 12, iconY + 18);
      ctx.lineTo(iconX + 18, iconY);
      ctx.closePath();
      ctx.fill();
    }

    // Progress bar
    const position = mediaState?.attributes?.media_position as number | undefined;
    const duration = mediaState?.attributes?.media_duration as number | undefined;
    if (config.showProgress && duration && duration > 0) {
      const barY = h - 40, barW = w - 60;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(30, barY, barW, 6);
      const progress = Math.min(1, (position ?? 0) / duration);
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(30, barY, barW * progress, 6);
    }
  }
}

function MediaScreenMarker({ position, id, onSelect, onDragStart, selected, marker }: MediaScreenMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const liveState = useAppStore((s) => marker.ha?.entityId ? s.homeAssistant.liveStates[marker.ha.entityId] : null);
  const config = marker.screenConfig ?? { aspectRatio: 16 / 9, uiStyle: 'minimal' as const, showProgress: true };
  const scale = marker.scale ?? [1.2, 0.675, 1];

  // Create canvas once
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = 512;
    canvasRef.current.height = Math.round(512 / config.aspectRatio);
  }

  // Update texture when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.height = Math.round(512 / config.aspectRatio);
    drawScreenCanvas(canvas, liveState ?? null, config);
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [liveState, config.uiStyle, config.showProgress, config.aspectRatio]);

  const texture = useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    drawScreenCanvas(canvas, liveState ?? null, config);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return tex;
  }, []);

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);

  // Periodically update texture for scanline animation in standby
  useFrame(() => {
    if (!liveState && canvasRef.current && textureRef.current) {
      drawScreenCanvas(canvasRef.current, null, config);
      textureRef.current.needsUpdate = true;
    }
  });

  const hw = scale[0] / 2;
  const hh = scale[1] / 2;
  const cornerSize = 0.06;

  return (
    <group
      position={position}
      rotation={marker.rotation.map((r) => r) as [number, number, number]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      {/* Screen glow light */}
      <pointLight position={[0, 0, 0.4]} intensity={0.8} color="#818cf8" distance={4} decay={2} />

      {/* Screen plane - emissive so it glows */}
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        {texture ? (
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveIntensity={0.4} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1a2e" emissive="#818cf8" emissiveIntensity={0.2} side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Bezel */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[scale[0] + 0.06, scale[1] + 0.06]} />
        <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
      </mesh>

      {/* Ambient glow plane behind */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[scale[0] + 0.4, scale[1] + 0.3]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* Corner markers (always visible) */}
      {[[-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]].map(([cx, cy], i) => (
        <mesh key={i} position={[cx, cy, 0.005]}>
          <boxGeometry args={[cornerSize, cornerSize, 0.01]} />
          <meshBasicMaterial color={selected ? '#a5b4fc' : '#818cf8'} transparent opacity={selected ? 1 : 0.6} />
        </mesh>
      ))}

      {/* Selection glow frame */}
      {selected && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[scale[0] + 0.12, scale[1] + 0.12]} />
          <meshBasicMaterial color="#a5b4fc" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

const markerComponents: Record<DeviceKind, React.FC<MarkerProps>> = {
  light: LightMarker,
  switch: SwitchMarker,
  sensor: SensorMarker,
  climate: ClimateMarker,
  vacuum: (props) => <GenericMarker {...props} color="#a78bfa" />,
  camera: (props) => <GenericMarker {...props} color="#ef4444" />,
  fridge: (props) => <GenericMarker {...props} color="#cbd5e1" emissive="#94a3b8" />,
  oven: (props) => <GenericMarker {...props} color="#f97316" />,
  washer: (props) => <GenericMarker {...props} color="#7dd3fc" emissive="#38bdf8" />,
  'garage-door': (props) => <GenericMarker {...props} color="#f59e0b" />,
  'door-lock': (props) => <GenericMarker {...props} color="#fbbf24" />,
  'power-outlet': (props) => <GenericMarker {...props} color="#fde047" emissive="#eab308" />,
  media_screen: (props) => <GenericMarker {...props} color="#818cf8" />, // fallback, overridden below
};

interface DeviceMarkers3DProps {
  buildMode?: boolean;
}

export default function DeviceMarkers3D({ buildMode }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const selectedId = useAppStore((s) => s.build.selection.id);
  const selectedType = useAppStore((s) => s.build.selection.type);
  const { camera, raycaster, gl } = useThree();

  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const dragDeviceId = useRef<string | null>(null);
  const dragDeviceY = useRef(0);

  const handleSelect = useCallback((id: string) => {
    if (buildMode) {
      setSelection({ type: 'device', id });
    }
  }, [buildMode, setSelection]);

  const handleDragStart = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    if (!buildMode) return;
    e.stopPropagation();

    const marker = markers.find((m) => m.id === id);
    if (!marker) return;

    dragDeviceId.current = id;
    dragDeviceY.current = marker.position[1];
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -marker.position[1]);
    dragOffset.current.set(
      e.point.x - marker.position[0],
      0,
      e.point.z - marker.position[2]
    );
    gl.domElement.style.cursor = 'grabbing';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, target);
      if (target && dragDeviceId.current) {
        updateDevice(dragDeviceId.current, {
          position: [
            target.x - dragOffset.current.x,
            dragDeviceY.current,
            target.z - dragOffset.current.z,
          ],
        });
      }
    };

    const onPointerUp = () => {
      dragDeviceId.current = null;
      gl.domElement.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [buildMode, markers, camera, raycaster, gl, updateDevice]);

  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => {
        const isSelected = buildMode && selectedId === marker.id && selectedType === 'device';

        // Use special renderer for media_screen
        if (marker.kind === 'media_screen') {
          return (
            <MediaScreenMarker
              key={marker.id}
              position={marker.position}
              id={marker.id}
              marker={marker}
              onSelect={buildMode ? handleSelect : undefined}
              onDragStart={buildMode ? handleDragStart : undefined}
              selected={!!isSelected}
            />
          );
        }

        const Component = markerComponents[marker.kind];
        if (!Component) return null;
        return (
          <Component
            key={marker.id}
            position={marker.position}
            id={marker.id}
            onSelect={buildMode ? handleSelect : undefined}
            onDragStart={buildMode ? handleDragStart : undefined}
            selected={!!isSelected}
          />
        );
      })}
    </group>
  );
}
