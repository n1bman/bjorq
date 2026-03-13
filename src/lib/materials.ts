import type { Material } from '../store/types';

export const presetMaterials: Material[] = [
  // ─── Paint ───
  { id: 'mat-white-paint', name: 'Vit färg', type: 'paint', color: '#f2f0eb', roughness: 0.92, surfaceCategory: 'paint' },
  { id: 'mat-grey-paint', name: 'Grå färg', type: 'paint', color: '#8e8c88', roughness: 0.88, surfaceCategory: 'paint' },
  { id: 'mat-warm-beige', name: 'Varm beige', type: 'paint', color: '#d6c6a8', roughness: 0.92, surfaceCategory: 'paint' },
  { id: 'mat-dark-blue', name: 'Mörkblå', type: 'paint', color: '#2e3d68', roughness: 0.88, surfaceCategory: 'paint' },
  { id: 'mat-sage-green', name: 'Salviagrön', type: 'paint', color: '#7c9c80', roughness: 0.90, surfaceCategory: 'paint' },
  { id: 'mat-terracotta', name: 'Terrakotta', type: 'paint', color: '#c2653e', roughness: 0.90, surfaceCategory: 'paint' },
  { id: 'mat-dusty-rose', name: 'Dusty rose', type: 'paint', color: '#c4a0a0', roughness: 0.90, surfaceCategory: 'paint' },
  { id: 'mat-charcoal', name: 'Kol', type: 'paint', color: '#3a3a3a', roughness: 0.88, surfaceCategory: 'paint' },
  { id: 'mat-cream', name: 'Grädde', type: 'paint', color: '#f5e8d0', roughness: 0.92, surfaceCategory: 'paint' },
  { id: 'mat-navy', name: 'Marinblå', type: 'paint', color: '#1e2a4a', roughness: 0.88, surfaceCategory: 'paint' },

  // ─── Wallpaper (B4: texture-ready) ───
  { id: 'mat-wp-linen', name: 'Linnetapet', type: 'wallpaper', color: '#e8e0d0', roughness: 0.75, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/wallpaper/linen_diff.jpg', normalMapPath: '/textures/wallpaper/linen_nor.jpg' },
  { id: 'mat-wp-silk', name: 'Silkestapet', type: 'wallpaper', color: '#d8d0c4', roughness: 0.40, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/wallpaper/silk_diff.jpg' },
  { id: 'mat-wp-grasscloth', name: 'Gräsväv', type: 'wallpaper', color: '#b8a888', roughness: 0.82, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG',
    mapPath: '/textures/wallpaper/grasscloth_diff.jpg', normalMapPath: '/textures/wallpaper/grasscloth_nor.jpg' },
  { id: 'mat-wp-velvet', name: 'Sammetstapet', type: 'wallpaper', color: '#4a3050', roughness: 0.65, surfaceCategory: 'wallpaper' },
  { id: 'mat-wp-stripe', name: 'Randig tapet', type: 'wallpaper', color: '#c8d0d8', roughness: 0.70, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [4, 1], source: 'procedural',
    mapPath: '/textures/wallpaper/stripe_diff.jpg' },
  { id: 'mat-wp-damask', name: 'Damast', type: 'wallpaper', color: '#a89878', roughness: 0.68, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/wallpaper/damask_diff.jpg', normalMapPath: '/textures/wallpaper/damask_nor.jpg' },
  { id: 'mat-wp-botanical', name: 'Botanisk', type: 'wallpaper', color: '#5a7a5e', roughness: 0.72, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [1, 1], source: 'CC0',
    mapPath: '/textures/wallpaper/botanical_diff.jpg' },
  { id: 'mat-wp-geometric', name: 'Geometrisk', type: 'wallpaper', color: '#2a3a4a', roughness: 0.70, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [3, 3], source: 'procedural',
    mapPath: '/textures/wallpaper/geometric_diff.jpg' },

  // ─── Wall Tile (B4: texture-ready) ───
  { id: 'mat-white-tile', name: 'Vitt kakel', type: 'tile', color: '#f0efed', roughness: 0.24, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'ambientCG',
    mapPath: '/textures/tile/white_tile_diff.jpg', normalMapPath: '/textures/tile/white_tile_nor.jpg', roughnessMapPath: '/textures/tile/white_tile_rough.jpg' },
  { id: 'mat-dark-tile', name: 'Mörkt kakel', type: 'tile', color: '#3c3a38', roughness: 0.30, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'ambientCG',
    mapPath: '/textures/tile/dark_tile_diff.jpg', normalMapPath: '/textures/tile/dark_tile_nor.jpg' },
  { id: 'mat-marble', name: 'Marmor', type: 'tile', color: '#e8e0d8', roughness: 0.20, surfaceCategory: 'tile',
    hasTexture: true, repeat: [1, 1], source: 'Poly Haven',
    mapPath: '/textures/tile/marble_diff.jpg', normalMapPath: '/textures/tile/marble_nor.jpg', roughnessMapPath: '/textures/tile/marble_rough.jpg' },
  { id: 'mat-subway-tile', name: 'Tunnelbanekakel', type: 'tile', color: '#f0ece8', roughness: 0.22, surfaceCategory: 'tile',
    hasTexture: true, repeat: [6, 3], source: 'ambientCG',
    mapPath: '/textures/tile/subway_diff.jpg', normalMapPath: '/textures/tile/subway_nor.jpg' },
  { id: 'mat-zellige', name: 'Zellige', type: 'tile', color: '#c8d8d0', roughness: 0.35, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'CC0',
    mapPath: '/textures/tile/zellige_diff.jpg', normalMapPath: '/textures/tile/zellige_nor.jpg' },
  { id: 'mat-terrazzo', name: 'Terrazzo', type: 'tile', color: '#d0c8c0', roughness: 0.28, surfaceCategory: 'tile',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven',
    mapPath: '/textures/tile/terrazzo_diff.jpg', normalMapPath: '/textures/tile/terrazzo_nor.jpg' },
  { id: 'mat-hex-tile', name: 'Hexagonkakel', type: 'tile', color: '#e0e0e0', roughness: 0.26, surfaceCategory: 'tile',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG',
    mapPath: '/textures/tile/hex_diff.jpg', normalMapPath: '/textures/tile/hex_nor.jpg' },
  { id: 'mat-mosaic', name: 'Mosaik', type: 'tile', color: '#88a0b0', roughness: 0.30, surfaceCategory: 'tile',
    hasTexture: true, repeat: [5, 5], source: 'CC0',
    mapPath: '/textures/tile/mosaic_diff.jpg', normalMapPath: '/textures/tile/mosaic_nor.jpg' },

  // ─── Stone/Concrete (B4: texture-ready) ───
  { id: 'mat-concrete', name: 'Betong', type: 'concrete', color: '#9a9894', roughness: 0.95, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/stone/concrete_diff.jpg', normalMapPath: '/textures/stone/concrete_nor.jpg', roughnessMapPath: '/textures/stone/concrete_rough.jpg' },
  { id: 'mat-polished-concrete', name: 'Polerad betong', type: 'concrete', color: '#b0aea8', roughness: 0.32, surfaceCategory: 'stone',
    hasTexture: true, repeat: [1, 1], source: 'Poly Haven',
    mapPath: '/textures/stone/polished_concrete_diff.jpg', normalMapPath: '/textures/stone/polished_concrete_nor.jpg' },
  { id: 'mat-limestone', name: 'Kalksten', type: 'concrete', color: '#d0c8b8', roughness: 0.78, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven',
    mapPath: '/textures/stone/limestone_diff.jpg', normalMapPath: '/textures/stone/limestone_nor.jpg' },
  { id: 'mat-slate', name: 'Skiffer', type: 'concrete', color: '#5a5a5e', roughness: 0.72, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/stone/slate_diff.jpg', normalMapPath: '/textures/stone/slate_nor.jpg' },
  { id: 'mat-sandstone', name: 'Sandsten', type: 'concrete', color: '#c8b898', roughness: 0.82, surfaceCategory: 'stone' },

  // ─── Wood (B4: texture-ready) ───
  { id: 'mat-oak', name: 'Ek', type: 'wood', color: '#c8a568', roughness: 0.68, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'Poly Haven',
    mapPath: '/textures/wood/oak_diff.jpg', normalMapPath: '/textures/wood/oak_nor.jpg', roughnessMapPath: '/textures/wood/oak_rough.jpg' },
  { id: 'mat-walnut', name: 'Valnöt', type: 'wood', color: '#5e3c20', roughness: 0.63, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'Poly Haven',
    mapPath: '/textures/wood/walnut_diff.jpg', normalMapPath: '/textures/wood/walnut_nor.jpg' },
  { id: 'mat-pine', name: 'Furu', type: 'wood', color: '#d8bc7e', roughness: 0.73, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'ambientCG',
    mapPath: '/textures/wood/pine_diff.jpg', normalMapPath: '/textures/wood/pine_nor.jpg' },
  { id: 'mat-ash', name: 'Ask', type: 'wood', color: '#dfd2ba', roughness: 0.68, surfaceCategory: 'wood' },
  { id: 'mat-birch', name: 'Björk', type: 'wood', color: '#eadeca', roughness: 0.68, surfaceCategory: 'wood' },
  { id: 'mat-warm-wood-floor', name: 'Varm trägolv', type: 'wood', color: '#c8a060', roughness: 0.72, surfaceCategory: 'wood' },
  { id: 'mat-herringbone', name: 'Fiskbensparkett', type: 'wood', color: '#bc985e', roughness: 0.63, surfaceCategory: 'wood',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG',
    mapPath: '/textures/wood/herringbone_diff.jpg', normalMapPath: '/textures/wood/herringbone_nor.jpg' },
  { id: 'mat-cedar', name: 'Ceder', type: 'wood', color: '#a07048', roughness: 0.70, surfaceCategory: 'wood' },

  // ─── Metal ───
  { id: 'mat-brushed-steel', name: 'Borstat stål', type: 'metal', color: '#c0beb8', roughness: 0.42, metalness: 0.7, surfaceCategory: 'metal' },
  { id: 'mat-brass', name: 'Mässing', type: 'metal', color: '#c8a848', roughness: 0.38, metalness: 0.6, surfaceCategory: 'metal' },
  { id: 'mat-black-metal', name: 'Svart metall', type: 'metal', color: '#2c2a28', roughness: 0.52, metalness: 0.5, surfaceCategory: 'metal' },
  { id: 'mat-copper', name: 'Koppar', type: 'metal', color: '#b87040', roughness: 0.40, metalness: 0.65, surfaceCategory: 'metal' },
  { id: 'mat-corten', name: 'Cortenstål', type: 'metal', color: '#8a4830', roughness: 0.85, metalness: 0.3, surfaceCategory: 'metal' },

  // ─── Textured surfaces (B4: texture-ready) ───
  { id: 'mat-stucco', name: 'Stuckatur', type: 'texture', color: '#e8e0d4', roughness: 0.88, surfaceCategory: 'texture',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG',
    mapPath: '/textures/texture/stucco_diff.jpg', normalMapPath: '/textures/texture/stucco_nor.jpg' },
  { id: 'mat-venetian', name: 'Venetiansk puts', type: 'texture', color: '#d8cfc0', roughness: 0.45, surfaceCategory: 'texture',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven',
    mapPath: '/textures/texture/venetian_diff.jpg', normalMapPath: '/textures/texture/venetian_nor.jpg' },
  { id: 'mat-limewash', name: 'Kalkfärg', type: 'texture', color: '#ede8e0', roughness: 0.90, surfaceCategory: 'texture',
    hasTexture: true, repeat: [2, 2], source: 'CC0',
    mapPath: '/textures/texture/limewash_diff.jpg', normalMapPath: '/textures/texture/limewash_nor.jpg' },
  { id: 'mat-clay', name: 'Lera', type: 'texture', color: '#c0a888', roughness: 0.92, surfaceCategory: 'texture' },
  { id: 'mat-microcement', name: 'Mikrociment', type: 'texture', color: '#a8a4a0', roughness: 0.50, surfaceCategory: 'texture',
    hasTexture: true, repeat: [1, 1], source: 'ambientCG',
    mapPath: '/textures/texture/microcement_diff.jpg', normalMapPath: '/textures/texture/microcement_nor.jpg', roughnessMapPath: '/textures/texture/microcement_rough.jpg' },
];

// In-memory custom materials (runtime only)
const customMaterials: Material[] = [];

export function addCustomMaterial(material: Material) {
  customMaterials.push(material);
}

export function getAllMaterials(): Material[] {
  return [...presetMaterials, ...customMaterials];
}

export function getMaterialById(id: string): Material | undefined {
  return presetMaterials.find((m) => m.id === id) || customMaterials.find((m) => m.id === id);
}

/** Get materials filtered by surface category */
export function getMaterialsByCategory(category: string): Material[] {
  return presetMaterials.filter((m) => m.surfaceCategory === category);
}

/** All surface categories with labels */
export const surfaceCategoryLabels: Record<string, string> = {
  paint: 'Väggfärg',
  wallpaper: 'Tapet',
  tile: 'Kakel',
  stone: 'Sten & Betong',
  wood: 'Trä',
  metal: 'Metall',
  texture: 'Textur & Puts',
};

/** Wall-appropriate surface categories (ordered) */
export const wallSurfaceCategories = ['paint', 'wallpaper', 'tile', 'stone', 'wood', 'metal', 'texture'] as const;

/** Floor-appropriate surface categories */
export const floorSurfaceCategories = ['wood', 'tile', 'stone', 'metal'] as const;
