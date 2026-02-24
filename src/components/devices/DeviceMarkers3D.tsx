import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, DeviceMarker, VacuumZone } from '@/store/types';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { randomPointInPolygon } from '@/lib/vacuumGeometry';

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
  buildMode?: boolean;
}

// ─── App Branding ───
const APP_BRANDING: Record<string, { color: string; label: string }> = {
  youtube:    { color: '#FF0000', label: 'YOUTUBE' },
  netflix:    { color: '#E50914', label: 'NETFLIX' },
  primevideo: { color: '#00A8E1', label: 'PRIME VIDEO' },
  'prime video': { color: '#00A8E1', label: 'PRIME VIDEO' },
  'amazon prime video': { color: '#00A8E1', label: 'PRIME VIDEO' },
  hbo:        { color: '#B535F6', label: 'HBO MAX' },
  'hbo max':  { color: '#B535F6', label: 'HBO MAX' },
  spotify:    { color: '#1DB954', label: 'SPOTIFY' },
  'svt play': { color: '#2DAB4F', label: 'SVT PLAY' },
  svt:        { color: '#2DAB4F', label: 'SVT PLAY' },
  'disney+':  { color: '#113CCF', label: 'DISNEY+' },
  disney:     { color: '#113CCF', label: 'DISNEY+' },
  plex:       { color: '#E5A00D', label: 'PLEX' },
};

function getAppBranding(source: string): { color: string; label: string } | null {
  const key = source.toLowerCase().trim();
  for (const [k, v] of Object.entries(APP_BRANDING)) {
    if (key.includes(k)) return v;
  }
  return null;
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

  const artist = (mediaState?.attributes?.media_artist as string) || '';

  if (!hasMedia) {
    // ── Standby mode ──
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#030308');
    grad.addColorStop(1, '#0a0a18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = 'rgba(129,140,248,0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // TV icon (monitor outline)
    const cx = w / 2, cy = h / 2 - 20;
    const mw = 80, mh = 55;
    ctx.strokeStyle = 'rgba(129,140,248,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - mw / 2, cy - mh / 2, mw, mh);
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + mh / 2);
    ctx.lineTo(cx - 30, cy + mh / 2 + 18);
    ctx.moveTo(cx + 20, cy + mh / 2);
    ctx.lineTo(cx + 30, cy + mh / 2 + 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(129,140,248,0.35)';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Standby', cx, cy + mh / 2 + 55);

    // Scanline effect
    ctx.fillStyle = 'rgba(129,140,248,0.02)';
    const scanY = (Date.now() % 3000) / 3000 * h;
    ctx.fillRect(0, scanY, w, 40);
  } else {
    // ── Now Playing ──
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#050510');
    grad.addColorStop(1, '#0a0a1f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // App branding badge
    const branding = getAppBranding(source);
    const badgeColor = branding?.color ?? '#6366f1';
    const badgeLabel = branding?.label ?? source.toUpperCase();

    if (source) {
      ctx.font = 'bold 22px sans-serif';
      const tw = ctx.measureText(badgeLabel).width + 28;
      const labelW = Math.min(tw, 220);
      const labelH = 40;
      const labelX = (w - labelW) / 2; // centered
      const labelY = 20;
      // Rounded badge
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelW, labelH, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(badgeLabel, w / 2, labelY + 28, labelW - 28);
    }

    // Title — centered
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Spelar…', w / 2, h / 2, w - 60);

    // Artist — centered
    if (artist) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(artist, w / 2, h / 2 + 34, w - 60);
    }

    // Play/Pause icon
    const iconX = w / 2, iconY = h / 2 + 80;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
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

    // Progress bar + time
    const mediaPos = mediaState?.attributes?.media_position as number | undefined;
    const duration = mediaState?.attributes?.media_duration as number | undefined;
    if (config.showProgress && duration && duration > 0) {
      const barY = h - 50, barW = w - 60;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(30, barY, barW, 6);
      const progress = Math.min(1, (mediaPos ?? 0) / duration);
      ctx.fillStyle = badgeColor;
      ctx.fillRect(30, barY, barW * progress, 6);

      // Time display
      const fmtTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
      };
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${fmtTime(mediaPos ?? 0)} / ${fmtTime(duration)}`, w / 2, barY + 26);
    }
  }
}

function MediaScreenMarker({ position, id, onSelect, onDragStart, selected, marker, buildMode }: MediaScreenMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const liveState = useAppStore((s) => marker.ha?.entityId ? s.homeAssistant.liveStates[marker.ha.entityId] : null);
  const config = marker.screenConfig ?? { aspectRatio: 16 / 9, uiStyle: 'minimal' as const, showProgress: true };
  const scale = marker.scale ?? [1.2, 0.675, 1];

  // Determine if screen is "on"
  const screenState = liveState?.state ?? '';
  const isScreenOn = !!screenState && !['off', 'standby', 'idle', 'unavailable', ''].includes(screenState);

  // Get branding color for ambient light
  const source = (liveState?.attributes?.app_name as string) || (liveState?.attributes?.source as string) || '';
  const brandingInfo = getAppBranding(source);
  const ambientColor = brandingInfo?.color ?? '#818cf8';

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

  // Animate: pulsing front glow + scanline refresh
  useFrame(() => {
    if (glowMeshRef.current) {
      const mat = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      if (isScreenOn) {
        mat.opacity = 0.03 + Math.sin(Date.now() * 0.002) * 0.02;
      } else {
        mat.opacity = 0.0;
      }
    }
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
      {/* Front glow overlay — pulsing transparent plane in front of screen */}
      <mesh position={[0, 0, 0.015]} ref={glowMeshRef as any}>
        <planeGeometry args={[scale[0], scale[1]]} />
        <meshBasicMaterial color={ambientColor} transparent opacity={0.0} side={THREE.FrontSide} depthWrite={false} />
      </mesh>

      {/* Screen plane — darker emissive */}
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        {texture ? (
          <meshStandardMaterial map={texture} emissive="#000000" emissiveIntensity={0.02} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1a2e" emissive="#818cf8" emissiveIntensity={0.1} side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Bezel — always visible */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[scale[0] + 0.06, scale[1] + 0.06]} />
        <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
      </mesh>

      {/* Ambient glow plane — build mode only */}
      {buildMode && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[scale[0] + 0.4, scale[1] + 0.3]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Corner markers — build mode only */}
      {buildMode && [[-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]].map(([cx, cy], i) => (
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

function VacuumMarker3D({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const vacData = state?.kind === 'vacuum' ? state.data : null;
  const status = vacData?.status ?? 'docked';
  const battery = vacData?.battery ?? 100;
  const currentRoom = vacData?.currentRoom;
  const marker = useAppStore((s) => s.devices.markers.find((m) => m.id === id));
  const floorId = marker?.floorId;
  const floor = useAppStore((s) => s.layout.floors.find((f) => f.id === floorId));
  const mapping = floor?.vacuumMapping;
  const rooms = floor?.rooms ?? [];

  const meshRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const batteryRingRef = useRef<THREE.Mesh>(null);
  const currentTarget = useRef<[number, number] | null>(null);
  const smoothRotation = useRef(0);
  const prevRoom = useRef<string | undefined>(undefined);
  const transitionProgress = useRef(1); // 1 = done transitioning

  const statusColor = useMemo(() => {
    switch (status) {
      case 'cleaning': return new THREE.Color('#3b82f6');
      case 'docked': return new THREE.Color('#22c55e');
      case 'returning': return new THREE.Color('#f97316');
      case 'paused': return new THREE.Color('#eab308');
      case 'error': return new THREE.Color('#ef4444');
      default: return new THREE.Color('#6b7280');
    }
  }, [status]);

  const batteryColor = useMemo(() => {
    if (battery > 50) return new THREE.Color('#22c55e');
    if (battery > 20) return new THREE.Color('#eab308');
    return new THREE.Color('#ef4444');
  }, [battery]);

  // Find the active zone for the current room
  const activeZone = useMemo((): VacuumZone | null => {
    if (!currentRoom || !mapping?.zones) return null;
    // Match by room name (case-insensitive)
    const zone = mapping.zones.find((z) => {
      const room = rooms.find((r) => r.id === z.roomId);
      return room?.name.toLowerCase() === currentRoom.toLowerCase() || z.roomId === currentRoom;
    });
    return zone ?? null;
  }, [currentRoom, mapping?.zones, rooms]);

  // Detect room change
  useEffect(() => {
    if (currentRoom !== prevRoom.current) {
      prevRoom.current = currentRoom;
      transitionProgress.current = 0;
      currentTarget.current = null; // Force new target in new zone
    }
  }, [currentRoom]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = 0.2; // m/s

    // If Valetudo XY is available, use it directly (future upgrade path)
    if (vacData?.position) {
      const [tx, tz] = vacData.position;
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, tx, 0.05);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, tz, 0.05);
    } else if (status === 'cleaning' && activeZone && activeZone.polygon.length >= 3) {
      // Room-based wandering
      if (!currentTarget.current) {
        currentTarget.current = randomPointInPolygon(activeZone.polygon);
      }

      const cx = meshRef.current.position.x;
      const cz = meshRef.current.position.z;
      const [tx, tz] = currentTarget.current;
      const dx = tx - cx;
      const dz = tz - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.1) {
        // Pick new target
        currentTarget.current = randomPointInPolygon(activeZone.polygon);
      } else {
        // Move toward target
        const step = Math.min(speed * delta, dist);
        meshRef.current.position.x += (dx / dist) * step;
        meshRef.current.position.z += (dz / dist) * step;

        // Smooth rotation toward movement direction
        const targetAngle = Math.atan2(dx, dz);
        smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, targetAngle, delta * 3);
        meshRef.current.rotation.y = smoothRotation.current;
      }

      // Room transition smoothing
      if (transitionProgress.current < 1) {
        transitionProgress.current = Math.min(1, transitionProgress.current + delta * 0.5);
      }
    } else if ((status === 'returning' || status === 'docked') && mapping?.dockPosition) {
      const [dx2, dz2] = mapping.dockPosition;
      const cx = meshRef.current.position.x;
      const cz = meshRef.current.position.z;
      const ddx = dx2 - cx;
      const ddz = dz2 - cz;
      const dist = Math.sqrt(ddx * ddx + ddz * ddz);
      if (dist > 0.05) {
        const step = Math.min(speed * delta, dist);
        meshRef.current.position.x += (ddx / dist) * step;
        meshRef.current.position.z += (ddz / dist) * step;
        const targetAngle = Math.atan2(ddx, ddz);
        smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, targetAngle, delta * 3);
        meshRef.current.rotation.y = smoothRotation.current;
      }
    }
    // paused: stay in place

    // LED pulsing
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      const t = performance.now() / 1000;
      const pulse = status === 'cleaning' ? 0.5 + Math.sin(t * 3) * 0.5
        : status === 'paused' ? 0.3 + Math.sin(t * 1.5) * 0.2
        : status === 'docked' ? 0.3 : 0.7;
      mat.emissiveIntensity = pulse;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) onDragStart(id, e);
  }, [selected, onDragStart, id]);

  return (
    <group ref={meshRef} position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      {/* Body — flat cylinder */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.05, 32]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* LED ring on top */}
      <mesh ref={ledRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <torusGeometry args={[0.12, 0.012, 8, 32]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>

      {/* Battery ring at base */}
      <mesh ref={batteryRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[0.17, 0.19, 32, 1, 0, Math.PI * 2 * (battery / 100)]} />
        <meshBasicMaterial color={batteryColor} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.27, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
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
  vacuum: VacuumMarker3D,
  camera: (props) => <GenericMarker {...props} color="#ef4444" />,
  fridge: (props) => <GenericMarker {...props} color="#cbd5e1" emissive="#94a3b8" />,
  oven: (props) => <GenericMarker {...props} color="#f97316" />,
  washer: (props) => <GenericMarker {...props} color="#7dd3fc" emissive="#38bdf8" />,
  'garage-door': (props) => <GenericMarker {...props} color="#f59e0b" />,
  'door-lock': (props) => <GenericMarker {...props} color="#fbbf24" />,
  'power-outlet': (props) => <GenericMarker {...props} color="#fde047" emissive="#eab308" />,
  media_screen: (props) => <GenericMarker {...props} color="#818cf8" />,
  fan: (props) => <GenericMarker {...props} color="#06b6d4" />,
  cover: (props) => <GenericMarker {...props} color="#a3a3a3" />,
  scene: (props) => <GenericMarker {...props} color="#8b5cf6" />,
};

interface DeviceMarkers3DProps {
  buildMode?: boolean;
}

export default function DeviceMarkers3D({ buildMode }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const showDeviceMarkers = useAppStore((s) => s.homeView.showDeviceMarkers ?? true);
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

  // When not in build mode and markers hidden: only render lights (for pointLight effect)
  const hideVisuals = !buildMode && !showDeviceMarkers;

  return (
    <group>
      {markers.map((marker) => {
        const isSelected = buildMode && selectedId === marker.id && selectedType === 'device';

        // When hiding visuals, only render light pointLights
        if (hideVisuals) {
          if (marker.kind === 'light') {
            return <LightMarkerLightOnly key={marker.id} position={marker.position} id={marker.id} />;
          }
          // Skip all other markers
          return null;
        }

        // Use special renderer for media_screen
        if (marker.kind === 'media_screen') {
          return (
            <MediaScreenMarker
              key={marker.id}
              position={marker.position}
              id={marker.id}
              marker={marker}
              buildMode={buildMode}
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

/** Light-only marker: renders just the pointLight without any visible mesh */
function LightMarkerLightOnly({ position, id }: { position: [number, number, number]; id: string }) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const lightData = state?.kind === 'light' ? state.data : null;
  const isOn = lightData?.on ?? false;

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

  return (
    <group position={position}>
      <pointLight color={lightColor} intensity={isOn ? brightness * 5 : 0} distance={8} decay={2} />
    </group>
  );
}
