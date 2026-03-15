/**
 * FPS Walk Mode — Camera controller (R3F component)
 * Easter egg: Roberto Mode
 *
 * WASD movement + pointer lock mouse look.
 * Isolated component — mounts only when FPS mode is active.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { resolveCollision } from '../../lib/fpsCollision';
import type { WallSegment } from '../../store/types';

interface FPSControllerProps {
  spawnPosition: [number, number, number];
  floorId: string;
  elevation: number;
  onExit: () => void;
}

const MOVE_SPEED = 3.0; // m/s
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI * 85 / 180;

export default function FPSController({ spawnPosition, floorId, elevation, onExit }: FPSControllerProps) {
  const { camera, gl } = useThree();
  const keysRef = useRef(new Set<string>());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const savedCameraRef = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const mountedRef = useRef(true);
  const eyeHeight = elevation + 1.80;

  // Get walls for collision
  const walls = useAppStore((s) => {
    const floor = s.layout.floors.find((f) => f.id === floorId);
    return floor?.walls ?? [];
  }) as WallSegment[];

  // Save camera state on mount
  useEffect(() => {
    mountedRef.current = true;
    savedCameraRef.current.pos.copy(camera.position);
    // Compute current look target
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    savedCameraRef.current.target.copy(camera.position).add(dir.multiplyScalar(10));

    // Set initial position
    camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);

    // Compute initial yaw from camera direction (face forward)
    yawRef.current = Math.atan2(
      -(spawnPosition[0]),
      -(spawnPosition[2]),
    );
    pitchRef.current = 0;

    // Request pointer lock (desktop only)
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    if (isDesktop) {
      gl.domElement.requestPointerLock?.();
    }

    return () => {
      mountedRef.current = false;
      // Restore camera
      camera.position.copy(savedCameraRef.current.pos);
      camera.lookAt(savedCameraRef.current.target);
      // Release pointer lock
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Key handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
      if (key === 'p' || key === 'escape') {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onExit]);

  // Mouse look (pointer lock)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      pitchRef.current = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitchRef.current - e.movementY * MOUSE_SENSITIVITY),
      );
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [gl.domElement]);

  // Re-request pointer lock on click (if lost)
  useEffect(() => {
    const onClick = () => {
      const isDesktop = window.matchMedia('(pointer: fine)').matches;
      if (isDesktop && document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock?.();
      }
    };
    gl.domElement.addEventListener('click', onClick);
    return () => gl.domElement.removeEventListener('click', onClick);
  }, [gl.domElement]);

  // Movement + collision in useFrame
  useFrame((_, delta) => {
    if (!mountedRef.current) return;

    const keys = keysRef.current;
    const forward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const move = new THREE.Vector3();
    if (keys.has('w')) move.add(forward);
    if (keys.has('s')) move.sub(forward);
    if (keys.has('d')) move.add(right);
    if (keys.has('a')) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * Math.min(delta, 0.05));

      const candidateX = camera.position.x + move.x;
      const candidateZ = camera.position.z + move.z;

      const resolved = resolveCollision({ x: candidateX, z: candidateZ }, walls);
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }

    // Lock height
    camera.position.y = eyeHeight;

    // Apply rotation from yaw/pitch
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}
