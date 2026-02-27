import * as THREE from 'three';
import type { ModelStats, PerformanceRating } from '@/store/types';

export function analyzeModel(scene: THREE.Object3D): ModelStats {
  let triangles = 0;
  const materials = new Set<string>();
  const textures = new Set<string>();
  let maxTextureRes = 0;

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat) {
          materials.add(mat.uuid);
          // Check all texture maps
          const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const;
          for (const prop of texProps) {
            const tex = (mat as any)[prop] as THREE.Texture | undefined;
            if (tex?.image) {
              textures.add(tex.uuid);
              const w = tex.image.width || 0;
              const h = tex.image.height || 0;
              maxTextureRes = Math.max(maxTextureRes, w, h);
            }
          }
        }
      }
    }
  });

  const triCount = Math.round(triangles);
  const matCount = materials.size;
  const texCount = textures.size;

  let rating: PerformanceRating = 'ok';
  if (triCount > 500000 || texCount > 20 || maxTextureRes > 4096) {
    rating = 'too-heavy';
  } else if (triCount > 150000 || texCount > 10 || maxTextureRes > 2048) {
    rating = 'heavy';
  }

  return {
    triangles: triCount,
    materials: matCount,
    textures: texCount,
    maxTextureRes,
    rating,
  };
}
