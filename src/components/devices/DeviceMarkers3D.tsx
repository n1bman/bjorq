// @ts-nocheck — R3F ThreeEvent<PointerEvent> vs ThreeEvent<MouseEvent> mismatch is safe
import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import { getDefaultState } from '../../store/useAppStore';
import type { DeviceKind, DeviceMarker, VacuumZone, LightType } from '../../store/types';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { randomPointInPolygon } from '../../lib/vacuumGeometry';

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
  const marker = useAppStore((s) => s.devices.markers.find((m) => m.id === id));
  const hasState = state?.kind === 'light';
  const lightData = hasState ? state.data : null;
  const isOn = hasState ? (lightData?.on ?? false) : true;
  const lightType: LightType = marker?.lightType ?? 'ceiling';

  const spotTargetRef = useRef<THREE.Object3D>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  // Compute color from state
  const lightColor = useMemo(() => {
    if (!isOn) return new THREE.Color('#555555');
    if (!lightData) return new THREE.Color('#f5c542'); // warm preview
    if (lightData.colorMode === 'rgb' && lightData.rgbColor) {
      return new THREE.Color(lightData.rgbColor[0] / 255, lightData.rgbColor[1] / 255, lightData.rgbColor[2] / 255);
    }
    if (lightData.colorMode === 'temp' && lightData.colorTemp) {
      return miredsToColor(lightData.colorTemp);
    }
    return new THREE.Color('#f5c542');
  }, [lightData?.colorMode, lightData?.rgbColor?.[0], lightData?.rgbColor?.[1], lightData?.rgbColor?.[2], lightData?.colorTemp, isOn, hasState]);

  const brightness = isOn ? (lightData?.brightness ?? 200) / 255 : 0;

  // Update spotlight target each frame
  useFrame(() => {
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.target = spotTargetRef.current;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); }
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);

  // Per-device light config with type-specific defaults
  const cfg = useMemo(() => {
    const defaults: Record<string, { intensity: number; distance: number; angle: number; penumbra: number }> = {
      'ceiling':       { intensity: 4, distance: 5, angle: Math.PI, penumbra: 0 },
      'ceiling-small': { intensity: 2, distance: 3, angle: Math.PI, penumbra: 0 },
      'strip':         { intensity: 2, distance: 6, angle: Math.PI, penumbra: 0 },
      'lightbar':      { intensity: 5.2, distance: 5, angle: Math.PI / 4, penumbra: 0.5 },
      'spot':          { intensity: 6, distance: 6, angle: Math.PI / 7, penumbra: 0.4 },
      'wall':          { intensity: 4.8, distance: 5, angle: Math.PI / 4, penumbra: 0.6 },
    };
    const d = defaults[lightType] ?? defaults['ceiling'];
    return { ...d, ...marker?.lightConfig };
  }, [lightType, marker?.lightConfig]);

  const intensity = isOn ? brightness * cfg.intensity : 0;

  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      {/* Light source varies by type — uses per-device cfg */}
      {lightType === 'ceiling' && (
        <pointLight color={lightColor} intensity={intensity} distance={cfg.distance} decay={2} />
      )}
      {lightType === 'ceiling-small' && (
        <pointLight color={lightColor} intensity={intensity} distance={cfg.distance} decay={2} />
      )}
      {lightType === 'strip' && (
        <>
          <pointLight color={lightColor} intensity={intensity} distance={cfg.distance} decay={2} />
          <mesh>
            <boxGeometry args={[0.6, 0.03, 0.05]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 3 : 0.1} transparent opacity={isOn ? 0.95 : 0.4} />
          </mesh>
        </>
      )}
      {lightType === 'lightbar' && (
        <>
          <spotLight
            ref={spotLightRef}
            color={lightColor}
            intensity={intensity}
            distance={cfg.distance}
            angle={cfg.angle}
            penumbra={cfg.penumbra}
            decay={2}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
          <object3D ref={spotTargetRef} position={[0, -3, 0]} />
          <mesh>
            <boxGeometry args={[0.4, 0.02, 0.04]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2.5 : 0.1} transparent opacity={isOn ? 0.95 : 0.4} />
          </mesh>
        </>
      )}
      {lightType === 'spot' && (
        <>
          <spotLight
            ref={spotLightRef}
            color={lightColor}
            intensity={intensity}
            distance={cfg.distance}
            angle={cfg.angle}
            penumbra={cfg.penumbra}
            decay={2}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
          <object3D ref={spotTargetRef} position={[0, -3, 0]} />
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.08, 0.15, 8]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2 : 0.1} transparent opacity={isOn ? 0.9 : 0.4} />
          </mesh>
        </>
      )}
      {lightType === 'wall' && (
        <>
          <spotLight
            ref={spotLightRef}
            color={lightColor}
            intensity={intensity}
            distance={cfg.distance}
            angle={cfg.angle}
            penumbra={cfg.penumbra}
            decay={2}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
          <object3D ref={spotTargetRef} position={[0, -1, 1]} />
          <mesh>
            <sphereGeometry args={[selected ? 0.12 : 0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2 : 0.1} transparent opacity={isOn ? 0.9 : 0.4} />
          </mesh>
        </>
      )}
      {/* Default sphere for ceiling / ceiling-small */}
      {(lightType === 'ceiling' || lightType === 'ceiling-small') && (
        <mesh>
          <sphereGeometry args={[lightType === 'ceiling-small' ? (selected ? 0.08 : 0.05) : (selected ? 0.15 : 0.1), 16, 16]} />
          <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2 : 0.1} transparent opacity={isOn ? 0.9 : 0.4} />
        </mesh>
      )}
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
      {/* Glow ring for visibility */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <ringGeometry args={[0.12, 0.18, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
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

const MediaScreenMarker = React.forwardRef<THREE.Group, MediaScreenMarkerProps>(function MediaScreenMarker({ position, id, onSelect, onDragStart, selected, marker, buildMode }, ref) {
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
      ref={ref}
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

      {/* Screen plane — darker emissive with fallback */}
      <mesh>
        <planeGeometry args={[scale[0], scale[1]]} />
        {texture ? (
          <meshStandardMaterial map={texture} emissive="#000000" emissiveIntensity={0.02} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1a2e" emissive="#818cf8" emissiveIntensity={0.15} side={THREE.DoubleSide} />
        )}
      </mesh>
      {/* Fallback label when no texture (production build edge case) */}
      {!texture && buildMode && (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[scale[0] * 0.8, scale[1] * 0.3]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.3} side={THREE.FrontSide} />
        </mesh>
      )}

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
});

function VacuumMarker3D({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const vacData = state?.kind === 'vacuum' ? state.data : null;
  const setVacuumDebug = useAppStore((s) => s.setVacuumDebug);
  const status = vacData?.status ?? 'docked';
  const battery = vacData?.battery ?? 100;
  const currentRoom = vacData?.currentRoom;
  const showDust = vacData?.showDustEffect !== false;
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
  const debugTimer = useRef(0);

  // Dust particles state
  const dustParticles = useRef<Array<{ x: number; y: number; z: number; life: number; vx: number; vy: number; vz: number }>>([]); 
  const dustMeshRef = useRef<THREE.InstancedMesh>(null);

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

  // Detect room change — transition to new zone via straight line
  useEffect(() => {
    if (currentRoom !== prevRoom.current) {
      prevRoom.current = currentRoom;
      currentTarget.current = null;
      // When switching rooms, move straight to the new zone centroid
      if (activeZone && activeZone.polygon.length >= 3) {
        const cx = activeZone.polygon.reduce((a, p) => a + p[0], 0) / activeZone.polygon.length;
        const cz = activeZone.polygon.reduce((a, p) => a + p[1], 0) / activeZone.polygon.length;
        isTransitioning.current = true;
        transitionTarget.current = [cx, cz];
      }
    }
  }, [currentRoom, activeZone]);

  // Clear transition immediately when status changes to non-cleaning states
  useEffect(() => {
    if (['returning', 'idle', 'paused', 'docked'].includes(status)) {
      isTransitioning.current = false;
      transitionTarget.current = null;
    }
  }, [status]);

  // Lawnmower pattern state
  const stripeLines = useRef<[number, number][][]>([]);
  const stripeIndex = useRef(0);
  const pointIndex = useRef(0);
  const isTransitioning = useRef(false);
  const transitionTarget = useRef<[number, number] | null>(null);

  // Generate lawnmower stripes when zone changes
  useEffect(() => {
    if (!activeZone || activeZone.polygon.length < 3) {
      stripeLines.current = [];
      return;
    }
    const poly = activeZone.polygon;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of poly) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const spacing = 0.35; // stripe width in meters
    const lines: [number, number][][] = [];
    let forward = true;
    for (let z = minZ + spacing / 2; z <= maxZ; z += spacing) {
      // Find intersections of this Z line with polygon edges
      const xIntersections: number[] = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i];
        const [xj, zj] = poly[j];
        if ((zi <= z && zj > z) || (zj <= z && zi > z)) {
          const t = (z - zi) / (zj - zi);
          xIntersections.push(xi + t * (xj - xi));
        }
      }
      xIntersections.sort((a, b) => a - b);
      // Create line segments from pairs
      for (let p = 0; p + 1 < xIntersections.length; p += 2) {
        const x0 = xIntersections[p] + 0.05;
        const x1 = xIntersections[p + 1] - 0.05;
        if (x1 <= x0) continue;
        const numPoints = Math.max(2, Math.ceil((x1 - x0) / 0.3));
        const line: [number, number][] = [];
        for (let k = 0; k <= numPoints; k++) {
          const t = k / numPoints;
          line.push([forward ? x0 + t * (x1 - x0) : x1 - t * (x1 - x0), z]);
        }
        lines.push(line);
        forward = !forward;
      }
    }
    stripeLines.current = lines;
    stripeIndex.current = 0;
    pointIndex.current = 0;
  }, [activeZone]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = vacData?.vacuumSpeed ?? 0.07;

    // If Valetudo XY is available, use it directly
    if (vacData?.position) {
      const [tx, tz] = vacData.position;
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, tx, 0.05);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, tz, 0.05);
    } else if (isTransitioning.current && transitionTarget.current) {
      // Moving straight to new zone centroid
      const cx = meshRef.current.position.x;
      const cz = meshRef.current.position.z;
      const [tx, tz] = transitionTarget.current;
      const dx = tx - cx;
      const dz = tz - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.1) {
        isTransitioning.current = false;
        transitionTarget.current = null;
      } else {
        const step = Math.min(speed * 1.5 * delta, dist);
        meshRef.current.position.x += (dx / dist) * step;
        meshRef.current.position.z += (dz / dist) * step;
        const targetAngle = Math.atan2(dx, dz);
        smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, targetAngle, delta * 3);
        meshRef.current.rotation.y = smoothRotation.current;
      }
    } else if (status === 'cleaning' && stripeLines.current.length > 0) {
      // Lawnmower pattern movement
      const lines = stripeLines.current;
      if (stripeIndex.current >= lines.length) {
        // Restart pattern
        stripeIndex.current = 0;
        pointIndex.current = 0;
      }
      const line = lines[stripeIndex.current];
      if (!line || pointIndex.current >= line.length) {
        stripeIndex.current++;
        pointIndex.current = 0;
      } else {
        const [tx, tz] = line[pointIndex.current];
        const cx = meshRef.current.position.x;
        const cz = meshRef.current.position.z;
        const dx = tx - cx;
        const dz = tz - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.05) {
          pointIndex.current++;
        } else {
          const step = Math.min(speed * delta, dist);
          meshRef.current.position.x += (dx / dist) * step;
          meshRef.current.position.z += (dz / dist) * step;
          const targetAngle = Math.atan2(dx, dz);
          smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, targetAngle, delta * 3);
          meshRef.current.rotation.y = smoothRotation.current;
        }
      }
    } else if (status === 'cleaning' && activeZone && activeZone.polygon.length >= 3) {
      // Fallback: random wandering within zone
      if (!currentTarget.current) {
        currentTarget.current = randomPointInPolygon(activeZone.polygon);
      }
      const cx = meshRef.current.position.x;
      const cz = meshRef.current.position.z;
      const [tx, tz] = currentTarget.current;
      const dx = tx - cx;
      const dz = tz - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.05) {
        currentTarget.current = randomPointInPolygon(activeZone.polygon);
      } else {
        const step = Math.min(speed * delta, dist);
        meshRef.current.position.x += (dx / dist) * step;
        meshRef.current.position.z += (dz / dist) * step;
        const targetAngle = Math.atan2(dx, dz);
        smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, targetAngle, delta * 3);
        meshRef.current.rotation.y = smoothRotation.current;
      }
    } else if (status === 'idle' || status === 'paused') {
      // Stay in place — do nothing
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

    // Dust particle update
    if (showDust && status === 'cleaning' && meshRef.current) {
      // Spawn new particles behind the vacuum
      const spawnRate = 3; // particles per frame
      for (let i = 0; i < spawnRate; i++) {
        if (dustParticles.current.length < 30) {
          const angle = smoothRotation.current + Math.PI + (Math.random() - 0.5) * 1.5;
          dustParticles.current.push({
            x: meshRef.current.position.x + Math.sin(angle) * 0.15,
            y: 0.02 + Math.random() * 0.06,
            z: meshRef.current.position.z + Math.cos(angle) * 0.15,
            life: 1.0,
            vx: Math.sin(angle) * 0.02 + (Math.random() - 0.5) * 0.01,
            vy: 0.015 + Math.random() * 0.01,
            vz: Math.cos(angle) * 0.02 + (Math.random() - 0.5) * 0.01,
          });
        }
      }
    }
    // Update existing particles
    const dummy = new THREE.Object3D();
    dustParticles.current = dustParticles.current.filter((p) => {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.life -= delta * 1.5;
      return p.life > 0;
    });
    if (dustMeshRef.current) {
      for (let i = 0; i < 30; i++) {
        const p = dustParticles.current[i];
        if (p) {
          // Positions are world-space; dustMesh is now outside the group
          dummy.position.set(p.x, p.y, p.z);
          const s = p.life * 0.03;
          dummy.scale.set(s, s, s);
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        dustMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      dustMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // LED pulsing
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      const t = performance.now() / 1000;
      if (status === 'error') {
        // Flash red rapidly
        mat.color.set('#ef4444');
        mat.emissive.set('#ef4444');
        mat.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.5;
      } else {
        mat.color.copy(statusColor);
        mat.emissive.copy(statusColor);
        const pulse = status === 'cleaning' ? 0.5 + Math.sin(t * 3) * 0.5
          : status === 'paused' ? 0.3 + Math.sin(t * 1.5) * 0.2
          : status === 'docked' ? 0.3 : 0.7;
        mat.emissiveIntensity = pulse;
      }
    }

    // Write debug telemetry (throttled to ~2Hz)
    if (vacData?.showDebugOverlay && meshRef.current) {
      debugTimer.current += delta;
      if (debugTimer.current > 0.5) {
        debugTimer.current = 0;
        setVacuumDebug(id, {
          pos3D: [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z] as [number, number, number],
          targetPos: currentTarget.current,
          stripeIdx: stripeIndex.current,
          pointIdx: pointIndex.current,
          stripesTotal: stripeLines.current.length,
          status,
          activeZone: activeZone ? (rooms.find(r => r.id === activeZone.roomId)?.name ?? activeZone.roomId) : null,
          fps: Math.round(1 / Math.max(delta, 0.001)),
          timestamp: Date.now(),
        });
      }
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
    <>
      <group ref={meshRef} position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
        {/* Body — flat disc lying on the floor */}
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.05, 32]} />
          <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* LED ring on top — flat horizontal */}
        <mesh ref={ledRef} position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.012, 8, 32]} />
          <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>

        {/* Battery ring at base */}
        <mesh ref={batteryRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[0.17, 0.19, 32, 1, 0, Math.PI * 2 * (battery / 100)]} />
          <meshBasicMaterial color={batteryColor} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>

        {/* Selection ring */}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <ringGeometry args={[0.22, 0.27, 32]} />
            <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Dust particles at world origin so positions aren't double-offset */}
      {showDust && (
        <instancedMesh ref={dustMeshRef} args={[undefined, undefined, 30]} frustumCulled={false}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#c4a882" transparent opacity={0.35} />
        </instancedMesh>
      )}
    </>
  );
}

// ─── Vacuum Dock 3D ───
function VacuumDock3D({ position, floorId, isDocked, buildMode, onDragStart }: {
  position: [number, number];
  floorId: string;
  isDocked: boolean;
  buildMode: boolean;
  onDragStart?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const setVacuumDock = useAppStore((s) => s.setVacuumDock);
  const selectedType = useAppStore((s) => s.build.selection.type);
  const selectedId = useAppStore((s) => s.build.selection.id);
  const setSelection = useAppStore((s) => s.setSelection);
  const dockId = `dock-${floorId}`;
  const isSelected = buildMode && selectedType === 'device' && selectedId === dockId;

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (buildMode) setSelection({ type: 'device', id: dockId });
  }, [buildMode, setSelection, dockId]);

  return (
    <group position={[position[0], 0, position[1]]} onClick={handleClick}>
      {/* Base plate */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[0.15, 0.01, 0.10]} />
        <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Back plate */}
      <mesh position={[0, 0.03, -0.045]}>
        <boxGeometry args={[0.12, 0.04, 0.01]} />
        <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* LED indicator */}
      <mesh position={[0, 0.035, -0.04]}>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshStandardMaterial
          color={isDocked ? '#22c55e' : '#6b7280'}
          emissive={isDocked ? '#22c55e' : '#6b7280'}
          emissiveIntensity={isDocked ? 1.2 : 0.2}
        />
      </mesh>

      {/* Charging contacts */}
      <mesh position={[-0.02, 0.012, 0.03]}>
        <boxGeometry args={[0.008, 0.006, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.02, 0.012, 0.03]}>
        <boxGeometry args={[0.008, 0.006, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[0.10, 0.13, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}


interface NoteParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  char: string;
  opacity: number;
}

let noteIdCounter = 0;

function MusicNoteParticles({ active, spread = 0.15 }: { active: boolean; spread?: number }) {
  const [notes, setNotes] = useState<NoteParticle[]>([]);
  const notesRef = useRef<NoteParticle[]>([]);

  useFrame((_, delta) => {
    let changed = false;
    const current = notesRef.current;

    // Spawn
    if (active && current.length < 6 && Math.random() < 0.08) {
      current.push({
        id: noteIdCounter++,
        x: (Math.random() - 0.5) * spread * 2,
        y: 0.15,
        z: (Math.random() - 0.5) * spread * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.1,
        char: Math.random() > 0.5 ? '♪' : '♫',
        opacity: 1,
      });
      changed = true;
    }

    // Update
    for (const p of current) {
      p.y += p.speed * delta;
      p.x += Math.sin(p.phase + p.y * 4) * delta * 0.08;
      p.opacity -= delta * 0.6;
    }

    const before = current.length;
    notesRef.current = current.filter((p) => p.opacity > 0);
    if (notesRef.current.length !== before) changed = true;

    if (changed || notesRef.current.length > 0) {
      setNotes([...notesRef.current]);
    }
  });

  const noteTextures = useMemo(() => {
    const map: Record<string, THREE.CanvasTexture> = {};
    for (const char of ['♪', '♫']) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 32, 32);
      map[char] = new THREE.CanvasTexture(canvas);
    }
    return map;
  }, []);

  return (
    <group>
      {notes.map((n) => (
        <sprite key={n.id} position={[n.x, n.y, n.z]} scale={[0.08, 0.08, 0.08]}>
          <spriteMaterial
            map={noteTextures[n.char]}
            transparent
            opacity={n.opacity}
            depthWrite={false}
            color="#4ade80"
          />
        </sprite>
      ))}
    </group>
  );
}

// ─── Speaker Marker (Google Home style) ───
function SpeakerMarker3D({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const speakerData = state?.kind === 'speaker' ? state.data : null;
  const isPlaying = speakerData?.state === 'playing';
  const isSpeaking = speakerData?.isSpeaking;
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      const t = performance.now() / 1000;
      mat.emissiveIntensity = isPlaying ? 0.5 + Math.sin(t * 4) * 0.3 : (isSpeaking ? 0.8 : 0.2);
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onSelect?.(id); }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => { if (selected && onDragStart) onDragStart(id, e); }, [selected, onDragStart, id]);

  const bodyColor = isPlaying ? '#e8e8e8' : '#d4d4d4';
  const ringColor = isPlaying ? '#4ade80' : isSpeaking ? '#60a5fa' : '#6b7280';

  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.06, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <torusGeometry args={[0.075, 0.008, 8, 32]} />
        <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.3} transparent opacity={0.9} />
      </mesh>
      {/* Music notes when playing */}
      <MusicNoteParticles active={isPlaying ?? false} spread={0.12} />
      {/* Speaking indicator - pulsing blue ring */}
      {isSpeaking && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
          <ringGeometry args={[0.04, 0.06, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[0.12, 0.16, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Soundbar Marker ───
function SoundbarMarker3D({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const speakerData = state?.kind === 'soundbar' ? state.data : null;
  const isPlaying = speakerData?.state === 'playing';
  const ledRef2 = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ledRef2.current) {
      const mat = ledRef2.current.material as THREE.MeshStandardMaterial;
      const t = performance.now() / 1000;
      mat.emissiveIntensity = isPlaying ? 0.5 + Math.sin(t * 3) * 0.3 : 0.1;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onSelect?.(id); }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => { if (selected && onDragStart) onDragStart(id, e); }, [selected, onDragStart, id]);

  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh ref={ledRef2} position={[0, 0.025, 0.041]}>
        <boxGeometry args={[0.4, 0.008, 0.001]} />
        <meshStandardMaterial color={isPlaying ? '#4ade80' : '#444'} emissive={isPlaying ? '#4ade80' : '#333'} emissiveIntensity={0.1} />
      </mesh>
      {/* Music notes when playing */}
      <MusicNoteParticles active={isPlaying ?? false} spread={0.3} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Light Fixture Marker ───
function LightFixtureMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const marker = useAppStore((s) => s.devices.markers.find((m) => m.id === id));
  const hasState = state?.kind === 'light';
  const lightData = hasState ? state.data : null;
  const isOn = hasState ? (lightData?.on ?? false) : true;
  const fixtureModel = marker?.fixtureModel ?? 'led-bulb';
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  const lightColor = useMemo(() => {
    if (!isOn) return new THREE.Color('#555555');
    if (!lightData) return new THREE.Color('#f5c542'); // warm preview
    if (lightData.colorMode === 'rgb' && lightData.rgbColor) {
      return new THREE.Color(lightData.rgbColor[0] / 255, lightData.rgbColor[1] / 255, lightData.rgbColor[2] / 255);
    }
    if (lightData.colorMode === 'temp' && lightData.colorTemp) {
      return miredsToColor(lightData.colorTemp);
    }
    return new THREE.Color('#f5c542');
  }, [lightData?.colorMode, lightData?.rgbColor?.[0], lightData?.rgbColor?.[1], lightData?.rgbColor?.[2], lightData?.colorTemp, isOn, hasState]);

  const brightness = isOn ? (lightData?.brightness ?? 200) / 255 : 0;

  // Per-device light config with fixture-model defaults
  const cfg = useMemo(() => {
    const defaults: Record<string, { intensity: number; distance: number; angle: number; penumbra: number }> = {
      'led-bulb': { intensity: 1, distance: 2, angle: Math.PI, penumbra: 0 },
      'led-bar':  { intensity: 0.5, distance: 1.4, angle: (118 * Math.PI) / 180, penumbra: 0.7 },
      'led-spot': { intensity: 2, distance: 2.5, angle: Math.PI / 10, penumbra: 0.3 },
      'led-gu10': { intensity: 2.5, distance: 3, angle: Math.PI / 8, penumbra: 0.4 },
    };
    const d = defaults[fixtureModel] ?? defaults['led-bulb'];
    return { ...d, ...marker?.lightConfig };
  }, [fixtureModel, marker?.lightConfig]);

  useFrame(() => {
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.target = spotTargetRef.current;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onSelect?.(id); }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => { if (selected && onDragStart) onDragStart(id, e); }, [selected, onDragStart, id]);

  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      {fixtureModel === 'led-bulb' && (
        <>
          {/* E27 base */}
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.04, 16]} />
            <meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Bulb sphere */}
          <mesh position={[0, 0.015, 0]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 3 : 0.1} transparent opacity={isOn ? 0.95 : 0.5} />
          </mesh>
          <pointLight color={lightColor} intensity={isOn ? brightness * cfg.intensity : 0} distance={cfg.distance} decay={2} />
        </>
      )}
      {fixtureModel === 'led-bar' && (
        <>
          <mesh>
            <boxGeometry args={[0.6, 0.02, 0.03]} />
            <meshStandardMaterial color="#ddd" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Frosted diffuser */}
          <mesh position={[0, -0.012, 0]}>
            <boxGeometry args={[0.56, 0.005, 0.025]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2 : 0.1} transparent opacity={isOn ? 0.85 : 0.3} />
          </mesh>
          <spotLight ref={spotLightRef} color={lightColor} intensity={isOn ? brightness * cfg.intensity : 0} distance={cfg.distance} angle={cfg.angle} penumbra={cfg.penumbra ?? 0.7} decay={2} position={[0, -0.012, 0]} />
          <object3D ref={spotTargetRef} position={[0, -3, 0]} />
        </>
      )}
      {fixtureModel === 'led-spot' && (
        <>
          {/* Puck body */}
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.015, 24]} />
            <meshStandardMaterial color="#ccc" roughness={0.3} metalness={0.2} />
          </mesh>
          {/* Lens */}
          <mesh position={[0, -0.008, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.003, 24]} />
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={isOn ? brightness * 2.5 : 0.1} transparent opacity={isOn ? 0.9 : 0.3} />
          </mesh>
          <spotLight ref={spotLightRef} color={lightColor} intensity={isOn ? brightness * cfg.intensity : 0} distance={cfg.distance} angle={cfg.angle} penumbra={cfg.penumbra ?? 0.3} decay={2} position={[0, -0.008, 0]} />
          <object3D ref={spotTargetRef} position={[0, -3, 0]} />
        </>
      )}
      {selected && <SelectionRing radius={0.15} />}
    </group>
  );
}

// ─── Smart Outlet Marker ───
function SmartOutletMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const isOn = state?.kind === 'generic' ? state.data.on : false;
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? 1.2 : 0.15;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onSelect?.(id); }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => { if (selected && onDragStart) onDragStart(id, e); }, [selected, onDragStart, id]);

  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      {/* Outlet body */}
      <mesh>
        <boxGeometry args={[0.05, 0.08, 0.03]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
      </mesh>
      {/* Socket hole */}
      <mesh position={[0, 0.01, 0.016]}>
        <cylinderGeometry args={[0.012, 0.012, 0.005, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#333" roughness={0.8} />
      </mesh>
      {/* Status LED */}
      <mesh ref={ledRef} position={[0.015, -0.025, 0.016]}>
        <sphereGeometry args={[0.004, 8, 8]} />
        <meshStandardMaterial
          color={isOn ? '#22c55e' : '#444'}
          emissive={isOn ? '#22c55e' : '#222'}
          emissiveIntensity={isOn ? 1.2 : 0.15}
        />
      </mesh>
      {selected && <SelectionRing radius={0.1} />}
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
  alarm: (props) => <GenericMarker {...props} color="#ef4444" emissive="#dc2626" />,
  'water-heater': (props) => <GenericMarker {...props} color="#f97316" emissive="#ea580c" />,
  humidifier: (props) => <GenericMarker {...props} color="#2dd4bf" emissive="#14b8a6" />,
  siren: (props) => <GenericMarker {...props} color="#f87171" emissive="#ef4444" />,
  valve: (props) => <GenericMarker {...props} color="#3b82f6" emissive="#2563eb" />,
  remote: (props) => <GenericMarker {...props} color="#9ca3af" emissive="#6b7280" />,
  'lawn-mower': (props) => <GenericMarker {...props} color="#22c55e" emissive="#16a34a" />,
  speaker: SpeakerMarker3D,
  soundbar: SoundbarMarker3D,
  'light-fixture': LightFixtureMarker,
  'smart-outlet': SmartOutletMarker,
};

interface DeviceMarkers3DProps {
  buildMode?: boolean;
  onLongPress?: (id: string) => void;
}

export default function DeviceMarkers3D({ buildMode, onLongPress }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const showDeviceMarkers = useAppStore((s) => s.homeView.showDeviceMarkers ?? true);
  const hiddenMarkerIds = useAppStore((s) => s.homeView.hiddenMarkerIds ?? []);
  const markerSize = useAppStore((s) => s.homeView.markerSize ?? 'medium');
  const markerScale = markerSize === 'small' ? 0.7 : markerSize === 'large' ? 1.4 : 1.0;
  const setSelection = useAppStore((s) => s.setSelection);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const selectedId = useAppStore((s) => s.build.selection.id);
  const selectedType = useAppStore((s) => s.build.selection.type);
  const { camera, raycaster, gl } = useThree();

  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const dragDeviceId = useRef<string | null>(null);
  const dragDeviceY = useRef(0);

  // Toggleable device kinds (on/off capable)
  const toggleableKinds = useMemo(() => new Set<DeviceKind>([
    'light', 'switch', 'fan', 'power-outlet', 'siren', 'humidifier', 'water-heater',
    'light-fixture', 'smart-outlet',
  ]), []);

  // Long-press support for 3D markers in home mode
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const clickHandled = useRef(false);

  const handlePointerDown3D = useCallback((id: string) => {
    if (buildMode || !onLongPress) return;
    clickHandled.current = false;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (clickHandled.current) return; // click already handled → abort
      longPressTriggered.current = true;
      onLongPress(id);
    }, 500);
  }, [buildMode, onLongPress]);

  const handlePointerUp3D = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSelect = useCallback((id: string) => {
    clickHandled.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (buildMode) {
      setSelection({ type: 'device', id });
    } else {
      // If long-press was already triggered, don't toggle
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      // In home/dashboard mode: toggle device state on click
      const marker = markers.find((m) => m.id === id);
      if (marker && toggleableKinds.has(marker.kind)) {
        toggleDeviceState(id);
      }
    }
  }, [buildMode, setSelection, markers, toggleableKinds, toggleDeviceState]);

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

  // Migrate stale light-fixture states (generic → light)
  const setDeviceState = useAppStore((s) => s.setDeviceState);
  useEffect(() => {
    const states = useAppStore.getState().devices.deviceStates;
    markers.forEach((m) => {
      if (m.kind === 'light-fixture') {
        const st = states[m.id];
        if (!st || st.kind === 'generic') {
          setDeviceState(m.id, getDefaultState('light-fixture'));
        }
      }
    });
  }, [markers, setDeviceState]);

  if (markers.length === 0) return null;
  // When not in build mode and markers hidden: only render lights (for pointLight effect)
  const hideVisuals = !buildMode && !showDeviceMarkers;

  return (
    <group>
      {markers.map((marker) => {
        const isSelected = buildMode && selectedId === marker.id && selectedType === 'device';

        // Per-device hidden check (only in non-build mode)
        const isMarkerHidden = !buildMode && hiddenMarkerIds.includes(marker.id);

        // When hiding visuals globally or per-device, render invisible click targets + light sources
        if (hideVisuals || isMarkerHidden) {
          if (marker.kind === 'light' || marker.kind === 'light-fixture') {
            return <LightMarkerLightOnly key={marker.id} position={marker.position} id={marker.id} onSelect={() => handleSelect(marker.id)} />;
          }
          // Invisible click sphere for all other marker types
          return (
            <InvisibleClickTarget key={marker.id} position={marker.position} onSelect={() => handleSelect(marker.id)} />
          );
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
              onSelect={handleSelect}
              onDragStart={buildMode ? handleDragStart : undefined}
              selected={!!isSelected}
            />
          );
        }

        const Component = markerComponents[marker.kind];
        if (!Component) return null;
        const isVacuum = marker.kind === 'vacuum';
        const rot = marker.rotation ? (marker.rotation.map((r) => r) as [number, number, number]) : [0, 0, 0] as [number, number, number];
        // Vacuum manages its own world-space position internally via useFrame,
        // so we must NOT set position on the outer group (causes double-offset).
        return (
          <group key={marker.id} position={isVacuum ? [0, 0, 0] : marker.position} rotation={isVacuum ? [0, 0, 0] : rot} scale={[markerScale, markerScale, markerScale]} onContextMenu={(e: any) => { e.nativeEvent?.preventDefault?.(); e.stopPropagation(); }} onPointerDown={() => handlePointerDown3D(marker.id)} onPointerUp={handlePointerUp3D} onPointerLeave={handlePointerUp3D}>
            <Component
              position={isVacuum ? marker.position : ([0, 0, 0] as [number, number, number])}
              id={marker.id}
              onSelect={handleSelect}
              onDragStart={buildMode ? handleDragStart : undefined}
              selected={!!isSelected}
            />
          </group>
        );
      })}

      {/* Render vacuum docks */}
      {!hideVisuals && floors.map((floor) => {
        const dock = floor.vacuumMapping?.dockPosition;
        if (!dock) return null;
        const hasVacuum = markers.some((m) => m.kind === 'vacuum' && m.floorId === floor.id);
        if (!hasVacuum) return null;
        // Check if vacuum is docked
        const vacuumMarker = markers.find((m) => m.kind === 'vacuum' && m.floorId === floor.id);
        const vacState = vacuumMarker ? useAppStore.getState().devices.deviceStates[vacuumMarker.id] : null;
        const isDocked = vacState?.kind === 'vacuum' ? vacState.data.status === 'docked' : false;
        return (
          <VacuumDock3D
            key={`dock-${floor.id}`}
            position={dock}
            floorId={floor.id}
            isDocked={isDocked}
            buildMode={!!buildMode}
          />
        );
      })}
    </group>
  );
}

/** Invisible click target for hidden device markers — opacity 0, but still raycastable */
function InvisibleClickTarget({ position, onSelect }: { position: [number, number, number]; onSelect: () => void }) {
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  return (
    <mesh position={position} onClick={handleClick}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/** Light-only marker: renders just the light source without any visible mesh + invisible click target */
function LightMarkerLightOnly({ position, id, onSelect }: { position: [number, number, number]; id: string; onSelect?: () => void }) {
  const state = useAppStore((s) => s.devices.deviceStates[id]);
  const marker = useAppStore((s) => s.devices.markers.find((m) => m.id === id));
  const lightData = state?.kind === 'light' ? state.data : null;
  const isOn = lightData?.on ?? false;
  const lightType: LightType = marker?.lightType ?? 'ceiling';
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

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
  const intensity = isOn ? brightness * 5 : 0;
  const rot = marker?.rotation ?? [0, 0, 0];

  useFrame(() => {
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.target = spotTargetRef.current;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect();
  }, [onSelect]);

  return (
    <group position={position} rotation={rot as [number, number, number]}>
      {(lightType === 'ceiling' || lightType === 'strip') && (
        <pointLight color={lightColor} intensity={lightType === 'strip' ? intensity * 0.6 : intensity} distance={lightType === 'strip' ? 10 : 8} decay={lightType === 'strip' ? 1.5 : 2} />
      )}
      {(lightType === 'spot' || lightType === 'wall') && (
        <>
          <spotLight
            ref={spotLightRef}
            color={lightColor}
            intensity={lightType === 'spot' ? intensity * 2 : intensity * 1.5}
            distance={lightType === 'spot' ? 12 : 8}
            angle={lightType === 'spot' ? Math.PI / 6 : Math.PI / 3}
            penumbra={lightType === 'spot' ? 0.3 : 0.5}
            decay={2}
            castShadow
          />
          <object3D ref={spotTargetRef} position={lightType === 'spot' ? [0, -3, 0] : [0, -1, 1]} />
        </>
      )}
      {/* Invisible click sphere for toggling lights when hidden */}
      <mesh onClick={handleClick}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
