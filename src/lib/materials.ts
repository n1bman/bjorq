import type { Material } from '../store/types';

export const presetMaterials: Material[] = [
  { id: 'mat-white-paint', name: 'Vit färg', type: 'paint', color: '#f5f5f0', roughness: 0.9 },
  { id: 'mat-grey-paint', name: 'Grå färg', type: 'paint', color: '#8a8a8a', roughness: 0.85 },
  { id: 'mat-warm-beige', name: 'Varm beige', type: 'paint', color: '#d4c4a8', roughness: 0.9 },
  { id: 'mat-dark-blue', name: 'Mörkblå', type: 'paint', color: '#2c3e6b', roughness: 0.85 },
  { id: 'mat-sage-green', name: 'Salviagrön', type: 'paint', color: '#7a9a7e', roughness: 0.88 },
  { id: 'mat-terracotta', name: 'Terrakotta', type: 'paint', color: '#c4643a', roughness: 0.88 },
  { id: 'mat-concrete', name: 'Betong', type: 'concrete', color: '#9a9a9a', roughness: 0.95 },
  { id: 'mat-polished-concrete', name: 'Polerad betong', type: 'concrete', color: '#b0b0b0', roughness: 0.3 },
  { id: 'mat-oak', name: 'Ek', type: 'wood', color: '#c4a265', roughness: 0.6 },
  { id: 'mat-walnut', name: 'Valnöt', type: 'wood', color: '#5c3a1e', roughness: 0.55 },
  { id: 'mat-pine', name: 'Furu', type: 'wood', color: '#d4b87a', roughness: 0.65 },
  { id: 'mat-ash', name: 'Ask', type: 'wood', color: '#ddd0b8', roughness: 0.6 },
  { id: 'mat-birch', name: 'Björk', type: 'wood', color: '#e8dcc8', roughness: 0.6 },
  { id: 'mat-white-tile', name: 'Vitt kakel', type: 'tile', color: '#f0f0f0', roughness: 0.2 },
  { id: 'mat-dark-tile', name: 'Mörkt kakel', type: 'tile', color: '#3a3a3a', roughness: 0.25 },
  { id: 'mat-marble', name: 'Marmor', type: 'tile', color: '#e8e0d8', roughness: 0.15 },
  { id: 'mat-herringbone', name: 'Fiskbensparkett', type: 'wood', color: '#b8945a', roughness: 0.55 },
  { id: 'mat-brushed-steel', name: 'Borstat stål', type: 'metal', color: '#c0c0c0', roughness: 0.4 },
  { id: 'mat-brass', name: 'Mässing', type: 'metal', color: '#c8a848', roughness: 0.35 },
  { id: 'mat-black-metal', name: 'Svart metall', type: 'metal', color: '#2a2a2a', roughness: 0.5 },
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
