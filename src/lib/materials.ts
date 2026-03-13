import type { Material } from '../store/types';

export const presetMaterials: Material[] = [
  { id: 'mat-white-paint', name: 'Vit färg', type: 'paint', color: '#f2f0eb', roughness: 0.92 },
  { id: 'mat-grey-paint', name: 'Grå färg', type: 'paint', color: '#8e8c88', roughness: 0.88 },
  { id: 'mat-warm-beige', name: 'Varm beige', type: 'paint', color: '#d6c6a8', roughness: 0.92 },
  { id: 'mat-dark-blue', name: 'Mörkblå', type: 'paint', color: '#2e3d68', roughness: 0.88 },
  { id: 'mat-sage-green', name: 'Salviagrön', type: 'paint', color: '#7c9c80', roughness: 0.90 },
  { id: 'mat-terracotta', name: 'Terrakotta', type: 'paint', color: '#c2653e', roughness: 0.90 },
  { id: 'mat-concrete', name: 'Betong', type: 'concrete', color: '#9a9894', roughness: 0.95 },
  { id: 'mat-polished-concrete', name: 'Polerad betong', type: 'concrete', color: '#b0aea8', roughness: 0.32 },
  { id: 'mat-oak', name: 'Ek', type: 'wood', color: '#c4a265', roughness: 0.65 },
  { id: 'mat-walnut', name: 'Valnöt', type: 'wood', color: '#5c3a1e', roughness: 0.60 },
  { id: 'mat-pine', name: 'Furu', type: 'wood', color: '#d6ba7c', roughness: 0.70 },
  { id: 'mat-ash', name: 'Ask', type: 'wood', color: '#ddd0b8', roughness: 0.65 },
  { id: 'mat-birch', name: 'Björk', type: 'wood', color: '#e8dcc8', roughness: 0.65 },
  { id: 'mat-white-tile', name: 'Vitt kakel', type: 'tile', color: '#f0efed', roughness: 0.22 },
  { id: 'mat-dark-tile', name: 'Mörkt kakel', type: 'tile', color: '#3c3a38', roughness: 0.28 },
  { id: 'mat-marble', name: 'Marmor', type: 'tile', color: '#e8e0d8', roughness: 0.18 },
  { id: 'mat-herringbone', name: 'Fiskbensparkett', type: 'wood', color: '#ba965c', roughness: 0.60 },
  { id: 'mat-brushed-steel', name: 'Borstat stål', type: 'metal', color: '#c0beb8', roughness: 0.42 },
  { id: 'mat-brass', name: 'Mässing', type: 'metal', color: '#c8a848', roughness: 0.38 },
  { id: 'mat-black-metal', name: 'Svart metall', type: 'metal', color: '#2c2a28', roughness: 0.52 },
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
