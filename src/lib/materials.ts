import type { Material, SurfaceSizeMode } from '../store/types';

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

  // ─── Wallpaper (B4: texture-ready, B5: realWorldSize) ───
  { id: 'mat-wp-linen', name: 'Linnetapet', type: 'wallpaper', color: '#e8e0d0', roughness: 0.75, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [0.53, 0.53],
    mapPath: '/textures/wallpaper/linen_diff.jpg', normalMapPath: '/textures/wallpaper/linen_nor.jpg' },
  { id: 'mat-wp-silk', name: 'Silkestapet', type: 'wallpaper', color: '#d8d0c4', roughness: 0.40, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [0.53, 0.53],
    mapPath: '/textures/wallpaper/silk_diff.jpg' },
  { id: 'mat-wp-grasscloth', name: 'Gräsväv', type: 'wallpaper', color: '#b8a888', roughness: 0.82, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG', realWorldSize: [0.45, 0.45],
    mapPath: '/textures/wallpaper/grasscloth_diff.jpg', normalMapPath: '/textures/wallpaper/grasscloth_nor.jpg' },
  { id: 'mat-wp-velvet', name: 'Sammetstapet', type: 'wallpaper', color: '#4a3050', roughness: 0.65, surfaceCategory: 'wallpaper',
    realWorldSize: [0.53, 0.53] },
  { id: 'mat-wp-stripe', name: 'Randig tapet', type: 'wallpaper', color: '#c8d0d8', roughness: 0.70, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [4, 1], source: 'procedural', realWorldSize: [0.53, 1.0],
    mapPath: '/textures/wallpaper/stripe_diff.jpg' },
  { id: 'mat-wp-damask', name: 'Damast', type: 'wallpaper', color: '#a89878', roughness: 0.68, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [0.53, 0.53],
    mapPath: '/textures/wallpaper/damask_diff.jpg', normalMapPath: '/textures/wallpaper/damask_nor.jpg' },
  { id: 'mat-wp-botanical', name: 'Botanisk', type: 'wallpaper', color: '#5a7a5e', roughness: 0.72, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [1, 1], source: 'CC0', realWorldSize: [0.70, 0.70],
    mapPath: '/textures/wallpaper/botanical_diff.jpg' },
  { id: 'mat-wp-geometric', name: 'Geometrisk', type: 'wallpaper', color: '#2a3a4a', roughness: 0.70, surfaceCategory: 'wallpaper',
    hasTexture: true, repeat: [3, 3], source: 'procedural', realWorldSize: [0.40, 0.40],
    mapPath: '/textures/wallpaper/geometric_diff.jpg' },

  // ─── Wall Tile (B4: texture-ready, B5: realWorldSize) ───
  { id: 'mat-white-tile', name: 'Vitt kakel', type: 'tile', color: '#f0efed', roughness: 0.24, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'ambientCG', realWorldSize: [0.20, 0.20],
    mapPath: '/textures/tile/white_tile_diff.jpg', normalMapPath: '/textures/tile/white_tile_nor.jpg', roughnessMapPath: '/textures/tile/white_tile_rough.jpg' },
  { id: 'mat-dark-tile', name: 'Mörkt kakel', type: 'tile', color: '#3c3a38', roughness: 0.30, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'ambientCG', realWorldSize: [0.30, 0.30],
    mapPath: '/textures/tile/dark_tile_diff.jpg', normalMapPath: '/textures/tile/dark_tile_nor.jpg' },
  { id: 'mat-marble', name: 'Marmor', type: 'tile', color: '#e8e0d8', roughness: 0.20, surfaceCategory: 'tile',
    hasTexture: true, repeat: [1, 1], source: 'Poly Haven', realWorldSize: [0.60, 0.60],
    mapPath: '/textures/tile/marble_diff.jpg', normalMapPath: '/textures/tile/marble_nor.jpg', roughnessMapPath: '/textures/tile/marble_rough.jpg' },
  { id: 'mat-subway-tile', name: 'Tunnelbanekakel', type: 'tile', color: '#f0ece8', roughness: 0.22, surfaceCategory: 'tile',
    hasTexture: true, repeat: [6, 3], source: 'ambientCG', realWorldSize: [0.30, 0.15],
    mapPath: '/textures/tile/subway_diff.jpg', normalMapPath: '/textures/tile/subway_nor.jpg' },
  { id: 'mat-zellige', name: 'Zellige', type: 'tile', color: '#c8d8d0', roughness: 0.35, surfaceCategory: 'tile',
    hasTexture: true, repeat: [4, 4], source: 'CC0', realWorldSize: [0.10, 0.10],
    mapPath: '/textures/tile/zellige_diff.jpg', normalMapPath: '/textures/tile/zellige_nor.jpg' },
  { id: 'mat-terrazzo', name: 'Terrazzo', type: 'tile', color: '#d0c8c0', roughness: 0.28, surfaceCategory: 'tile',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven', realWorldSize: [0.60, 0.60],
    mapPath: '/textures/tile/terrazzo_diff.jpg', normalMapPath: '/textures/tile/terrazzo_nor.jpg' },
  { id: 'mat-hex-tile', name: 'Hexagonkakel', type: 'tile', color: '#e0e0e0', roughness: 0.26, surfaceCategory: 'tile',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG', realWorldSize: [0.25, 0.25],
    mapPath: '/textures/tile/hex_diff.jpg', normalMapPath: '/textures/tile/hex_nor.jpg' },
  { id: 'mat-mosaic', name: 'Mosaik', type: 'tile', color: '#88a0b0', roughness: 0.30, surfaceCategory: 'tile',
    hasTexture: true, repeat: [5, 5], source: 'CC0', realWorldSize: [0.15, 0.15],
    mapPath: '/textures/tile/mosaic_diff.jpg', normalMapPath: '/textures/tile/mosaic_nor.jpg' },

  // ─── Stone/Concrete (B5: realWorldSize) ───
  { id: 'mat-concrete', name: 'Betong', type: 'concrete', color: '#9a9894', roughness: 0.95, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [1.0, 1.0],
    mapPath: '/textures/stone/concrete_diff.jpg', normalMapPath: '/textures/stone/concrete_nor.jpg', roughnessMapPath: '/textures/stone/concrete_rough.jpg' },
  { id: 'mat-polished-concrete', name: 'Polerad betong', type: 'concrete', color: '#b0aea8', roughness: 0.32, surfaceCategory: 'stone',
    hasTexture: true, repeat: [1, 1], source: 'Poly Haven', realWorldSize: [1.5, 1.5],
    mapPath: '/textures/stone/polished_concrete_diff.jpg', normalMapPath: '/textures/stone/polished_concrete_nor.jpg' },
  { id: 'mat-limestone', name: 'Kalksten', type: 'concrete', color: '#d0c8b8', roughness: 0.78, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven', realWorldSize: [0.60, 0.60],
    mapPath: '/textures/stone/limestone_diff.jpg', normalMapPath: '/textures/stone/limestone_nor.jpg' },
  { id: 'mat-slate', name: 'Skiffer', type: 'concrete', color: '#5a5a5e', roughness: 0.72, surfaceCategory: 'stone',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [0.40, 0.40],
    mapPath: '/textures/stone/slate_diff.jpg', normalMapPath: '/textures/stone/slate_nor.jpg' },
  { id: 'mat-sandstone', name: 'Sandsten', type: 'concrete', color: '#c8b898', roughness: 0.82, surfaceCategory: 'stone',
    realWorldSize: [0.50, 0.50] },

  // ─── Wood (B5: realWorldSize) ───
  { id: 'mat-oak', name: 'Ek', type: 'wood', color: '#c8a568', roughness: 0.68, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'Poly Haven', realWorldSize: [0.20, 1.2],
    mapPath: '/textures/wood/oak_diff.jpg', normalMapPath: '/textures/wood/oak_nor.jpg', roughnessMapPath: '/textures/wood/oak_rough.jpg' },
  { id: 'mat-walnut', name: 'Valnöt', type: 'wood', color: '#5e3c20', roughness: 0.63, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'Poly Haven', realWorldSize: [0.18, 1.2],
    mapPath: '/textures/wood/walnut_diff.jpg', normalMapPath: '/textures/wood/walnut_nor.jpg' },
  { id: 'mat-pine', name: 'Furu', type: 'wood', color: '#d8bc7e', roughness: 0.73, surfaceCategory: 'wood',
    hasTexture: true, repeat: [1, 2], source: 'ambientCG', realWorldSize: [0.15, 1.0],
    mapPath: '/textures/wood/pine_diff.jpg', normalMapPath: '/textures/wood/pine_nor.jpg' },
  { id: 'mat-ash', name: 'Ask', type: 'wood', color: '#dfd2ba', roughness: 0.68, surfaceCategory: 'wood',
    realWorldSize: [0.18, 1.2] },
  { id: 'mat-birch', name: 'Björk', type: 'wood', color: '#eadeca', roughness: 0.68, surfaceCategory: 'wood',
    realWorldSize: [0.18, 1.2] },
  { id: 'mat-warm-wood-floor', name: 'Varm trägolv', type: 'wood', color: '#c8a060', roughness: 0.72, surfaceCategory: 'wood',
    realWorldSize: [0.20, 1.2] },
  { id: 'mat-herringbone', name: 'Fiskbensparkett', type: 'wood', color: '#bc985e', roughness: 0.63, surfaceCategory: 'wood',
    hasTexture: true, repeat: [2, 2], source: 'ambientCG', realWorldSize: [0.50, 0.50],
    mapPath: '/textures/wood/herringbone_diff.jpg', normalMapPath: '/textures/wood/herringbone_nor.jpg' },
  { id: 'mat-cedar', name: 'Ceder', type: 'wood', color: '#a07048', roughness: 0.70, surfaceCategory: 'wood',
    realWorldSize: [0.15, 1.0] },

  // ─── Metal ───
  { id: 'mat-brushed-steel', name: 'Borstat stål', type: 'metal', color: '#c0beb8', roughness: 0.42, metalness: 0.7, surfaceCategory: 'metal' },
  { id: 'mat-brass', name: 'Mässing', type: 'metal', color: '#c8a848', roughness: 0.38, metalness: 0.6, surfaceCategory: 'metal' },
  { id: 'mat-black-metal', name: 'Svart metall', type: 'metal', color: '#2c2a28', roughness: 0.52, metalness: 0.5, surfaceCategory: 'metal' },
  { id: 'mat-copper', name: 'Koppar', type: 'metal', color: '#b87040', roughness: 0.40, metalness: 0.65, surfaceCategory: 'metal' },
  { id: 'mat-corten', name: 'Cortenstål', type: 'metal', color: '#8a4830', roughness: 0.85, metalness: 0.3, surfaceCategory: 'metal' },

  // ─── Textured surfaces (B5: realWorldSize) ───
  { id: 'mat-stucco', name: 'Stuckatur', type: 'texture', color: '#e8e0d4', roughness: 0.88, surfaceCategory: 'texture',
    hasTexture: true, repeat: [3, 3], source: 'ambientCG', realWorldSize: [0.80, 0.80],
    mapPath: '/textures/texture/stucco_diff.jpg', normalMapPath: '/textures/texture/stucco_nor.jpg' },
  { id: 'mat-venetian', name: 'Venetiansk puts', type: 'texture', color: '#d8cfc0', roughness: 0.45, surfaceCategory: 'texture',
    hasTexture: true, repeat: [2, 2], source: 'Poly Haven', realWorldSize: [1.0, 1.0],
    mapPath: '/textures/texture/venetian_diff.jpg', normalMapPath: '/textures/texture/venetian_nor.jpg' },
  { id: 'mat-limewash', name: 'Kalkfärg', type: 'texture', color: '#ede8e0', roughness: 0.90, surfaceCategory: 'texture',
    hasTexture: true, repeat: [2, 2], source: 'CC0', realWorldSize: [1.2, 1.2],
    mapPath: '/textures/texture/limewash_diff.jpg', normalMapPath: '/textures/texture/limewash_nor.jpg' },
  { id: 'mat-clay', name: 'Lera', type: 'texture', color: '#c0a888', roughness: 0.92, surfaceCategory: 'texture',
    realWorldSize: [1.0, 1.0] },
  { id: 'mat-microcement', name: 'Mikrociment', type: 'texture', color: '#a8a4a0', roughness: 0.50, surfaceCategory: 'texture',
    hasTexture: true, repeat: [1, 1], source: 'ambientCG', realWorldSize: [1.5, 1.5],
    mapPath: '/textures/texture/microcement_diff.jpg', normalMapPath: '/textures/texture/microcement_nor.jpg', roughnessMapPath: '/textures/texture/microcement_rough.jpg' },

  // ═══════════════════════════════════════════════════════════════
  // F3: Curated Floor Texture Pack — ambientCG-sourced (CC0)
  // These presets are floor-only and appear in the floor material browser.
  // Texture files go under public/textures/floor/<category>/
  // Until real ambientCG files are placed, flat color fallback is used.
  // ═══════════════════════════════════════════════════════════════

  // ─── Floor: Wood (5) ───
  // ambientCG assets: download 1K-JPG ZIPs from https://ambientcg.com/get?file={ID}_1K-JPG.zip
  // Extract *_Color.jpg → mapPath, *_NormalGL.jpg → normalMapPath
  { id: 'floor-light-oak', name: 'Ljus ek planka', type: 'wood', color: '#d4b88c', roughness: 0.65, surfaceCategory: 'wood', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.20, 1.2],
    ambientCGId: 'WoodFloor051',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor051.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor051.jpg' },
  { id: 'floor-dark-walnut', name: 'Mörk valnöt planka', type: 'wood', color: '#4a2e18', roughness: 0.60, surfaceCategory: 'wood', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.20, 1.2],
    ambientCGId: 'WoodFloor040',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor040.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor040.jpg' },
  { id: 'floor-ash-white', name: 'Ask vitvax', type: 'wood', color: '#e8dcc8', roughness: 0.68, surfaceCategory: 'wood', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.18, 1.2],
    ambientCGId: 'WoodFloor044',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor044.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor044.jpg' },
  { id: 'floor-smoked-oak', name: 'Rökt ek', type: 'wood', color: '#6e5038', roughness: 0.62, surfaceCategory: 'wood', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.20, 1.2],
    ambientCGId: 'WoodFloor043',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor043.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor043.jpg' },
  { id: 'floor-bamboo', name: 'Bambu', type: 'wood', color: '#c8b480', roughness: 0.55, surfaceCategory: 'wood', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.15, 0.90],
    ambientCGId: 'WoodFloor006',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor006.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor006.jpg' },

  // ─── Floor: Tile (5) ───
  { id: 'floor-porcelain-large', name: 'Stor porslin', type: 'tile', color: '#e8e4e0', roughness: 0.22, surfaceCategory: 'tile', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.60, 0.60],
    ambientCGId: 'Tiles074',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Tiles074.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Tiles074.jpg' },
  { id: 'floor-terracotta', name: 'Terrakotta golv', type: 'tile', color: '#c07040', roughness: 0.78, surfaceCategory: 'tile', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.30, 0.30],
    ambientCGId: 'Tiles093',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Tiles093.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Tiles093.jpg' },
  { id: 'floor-hex-cement', name: 'Hexagon cement', type: 'tile', color: '#b0aaa0', roughness: 0.72, surfaceCategory: 'tile', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.25, 0.25],
    ambientCGId: 'Tiles054',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Tiles054.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Tiles054.jpg' },
  { id: 'floor-checkerboard', name: 'Schackrutigt', type: 'tile', color: '#d0d0d0', roughness: 0.25, surfaceCategory: 'tile', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.40, 0.40],
    ambientCGId: 'Tiles012',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Tiles012.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Tiles012.jpg' },
  { id: 'floor-slate-tile', name: 'Skiffer kakel', type: 'tile', color: '#505458', roughness: 0.70, surfaceCategory: 'tile', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.40, 0.40],
    ambientCGId: 'Tiles082',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Tiles082.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Tiles082.jpg' },

  // ─── Floor: Stone / Concrete (5) ───
  { id: 'floor-polished-concrete', name: 'Polerad betong golv', type: 'concrete', color: '#b8b4ae', roughness: 0.30, surfaceCategory: 'stone', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [1.5, 1.5],
    ambientCGId: 'Concrete034',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Concrete034.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Concrete034.jpg' },
  { id: 'floor-raw-concrete', name: 'Rå betong', type: 'concrete', color: '#9a9690', roughness: 0.92, surfaceCategory: 'stone', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [1.0, 1.0],
    ambientCGId: 'Concrete032',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Concrete032.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Concrete032.jpg' },
  { id: 'floor-travertine', name: 'Travertin', type: 'concrete', color: '#d8ccb4', roughness: 0.55, surfaceCategory: 'stone', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.60, 0.60],
    ambientCGId: 'Marble006',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Marble006.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Marble006.jpg' },
  { id: 'floor-granite', name: 'Granit', type: 'concrete', color: '#686868', roughness: 0.45, surfaceCategory: 'stone', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.60, 0.60],
    ambientCGId: 'Rock030',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Rock030.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Rock030.jpg' },
  { id: 'floor-microcement', name: 'Mikrociment golv', type: 'concrete', color: '#a8a4a0', roughness: 0.48, surfaceCategory: 'stone', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [1.5, 1.5],
    ambientCGId: 'Concrete040',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Concrete040.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Concrete040.jpg' },

  // ─── Floor: Texture / Plaster-like (5) ───
  { id: 'floor-tadelakt', name: 'Tadelakt', type: 'texture', color: '#c8baa8', roughness: 0.42, surfaceCategory: 'texture', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [1.0, 1.0],
    ambientCGId: 'PaintedPlaster017',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/PaintedPlaster017.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/PaintedPlaster017.jpg' },
  { id: 'floor-epoxy', name: 'Epoxigolv', type: 'texture', color: '#d4d0ca', roughness: 0.15, metalness: 0.05, surfaceCategory: 'texture', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [2.0, 2.0],
    ambientCGId: 'Metal034',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Metal034.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Metal034.jpg' },
  { id: 'floor-cork', name: 'Kork', type: 'texture', color: '#c4a870', roughness: 0.80, surfaceCategory: 'texture', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.30, 0.30],
    ambientCGId: 'Cork002',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Cork002.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Cork002.jpg' },
  { id: 'floor-vinyl-plank', name: 'Vinylplanka', type: 'texture', color: '#b8a480', roughness: 0.50, surfaceCategory: 'texture', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.18, 1.2],
    ambientCGId: 'WoodFloor038',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/WoodFloor038.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/WoodFloor038.jpg' },
  { id: 'floor-linoleum', name: 'Linoleum', type: 'texture', color: '#a0a898', roughness: 0.55, surfaceCategory: 'texture', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [2.0, 2.0],
    ambientCGId: 'PaintedPlaster020',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/PaintedPlaster020.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/PaintedPlaster020.jpg' },

  // ─── Floor: Carpet / Fabric (5) ───
  { id: 'floor-loop-grey', name: 'Slinga grå', type: 'custom', color: '#8a8a8a', roughness: 0.95, surfaceCategory: 'carpet', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.50, 0.50],
    ambientCGId: 'Fabric032',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Fabric032.jpg',
    mapPath: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/Fabric032.jpg' },
  { id: 'floor-cut-beige', name: 'Velour beige', type: 'custom', color: '#c8b898', roughness: 0.92, surfaceCategory: 'carpet', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.50, 0.50],
    ambientCGId: 'Fabric030',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Fabric030.jpg',
    mapPath: '/textures/floor/carpet/cut_beige_diff.jpg' },
  { id: 'floor-sisal', name: 'Sisal natur', type: 'custom', color: '#b8a878', roughness: 0.88, surfaceCategory: 'carpet', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.40, 0.40],
    ambientCGId: 'Fabric029',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Fabric029.jpg',
    mapPath: '/textures/floor/carpet/sisal_diff.jpg' },
  { id: 'floor-berber', name: 'Berber grädde', type: 'custom', color: '#e0d4c0', roughness: 0.90, surfaceCategory: 'carpet', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.60, 0.60],
    ambientCGId: 'Fabric026',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Fabric026.jpg',
    mapPath: '/textures/floor/carpet/berber_diff.jpg' },
  { id: 'floor-wool-charcoal', name: 'Ull antracit', type: 'custom', color: '#3e3e3e', roughness: 0.94, surfaceCategory: 'carpet', floorOnly: true,
    hasTexture: true, source: 'ambientCG', realWorldSize: [0.50, 0.50],
    ambientCGId: 'Fabric036',
    thumbnailUrl: 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/Fabric036.jpg',
    mapPath: '/textures/floor/carpet/wool_charcoal_diff.jpg' },
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

/** F2: Get floor-appropriate materials by category (includes floorOnly + shared presets) */
export function getFloorMaterialsByCategory(category: string): Material[] {
  return presetMaterials.filter((m) => m.surfaceCategory === category && m.floorOnly !== false);
}

/** F2: Get wall-only materials by category (excludes floorOnly presets) */
export function getWallMaterialsByCategory(category: string): Material[] {
  return presetMaterials.filter((m) => m.surfaceCategory === category && !m.floorOnly);
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
  carpet: 'Matta',
};

/** Wall-appropriate surface categories (ordered) */
export const wallSurfaceCategories = ['paint', 'wallpaper', 'tile', 'stone', 'wood', 'metal', 'texture'] as const;

/** F2: Floor-appropriate surface categories with better labels */
export const floorSurfaceCategories = ['wood', 'tile', 'stone', 'texture', 'carpet'] as const;

/** F2: Floor category labels (Swedish) */
export const floorCategoryLabels: Record<string, string> = {
  wood: 'Trä & Parkett',
  tile: 'Kakel & Klinker',
  stone: 'Sten & Betong',
  texture: 'Textur',
  carpet: 'Matta',
};

/** Size mode labels */
export const sizeModelLabels: Record<SurfaceSizeMode, string> = {
  auto: 'Auto',
  small: 'Liten',
  standard: 'Standard',
  large: 'Stor',
};

/** Size mode multipliers — applied to realWorldSize to get actual texture repeat */
export const sizeModeMultipliers: Record<SurfaceSizeMode, number> = {
  auto: 1.0,
  small: 0.6,
  standard: 1.0,
  large: 1.6,
};

/**
 * B5: Calculate texture repeat values from real-world size and surface dimensions.
 * F4: Added aspect-ratio clamping for elongated floors.
 */
export function calculateRepeat(
  preset: Material,
  surfaceWidth: number,
  surfaceHeight: number,
  sizeMode: SurfaceSizeMode = 'auto'
): [number, number] {
  const multiplier = sizeModeMultipliers[sizeMode];

  if (preset.realWorldSize) {
    const [rw, rh] = preset.realWorldSize;
    const effectiveW = rw * multiplier;
    const effectiveH = rh * multiplier;
    let repeatX = surfaceWidth / effectiveW;
    let repeatY = surfaceHeight / effectiveH;

    // F4: Clamp aspect ratio to prevent extreme stretching on elongated floors
    const ratio = repeatX / repeatY;
    if (ratio > 8) repeatY = repeatX / 8;
    if (ratio < 0.125) repeatX = repeatY * 0.125;

    return [repeatX, repeatY];
  }

  // Fallback to preset repeat or [1,1]
  const base = preset.repeat ?? [1, 1];
  if (sizeMode === 'auto') return base;
  return [base[0] / multiplier, base[1] / multiplier];
}
