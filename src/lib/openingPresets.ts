import type { WallOpening } from '../store/types';

export type OpeningPreset = {
  id: string;
  label: string;
  type: WallOpening['type'];
  width: number;
  height: number;
  sillHeight: number;
  style?: string;
  description?: string;
};

export const openingPresets: OpeningPreset[] = [
  // Doors — Scandinavian standard (M8, M9, M10, M13, M16)
  { id: 'door-m8', label: 'M8 Enkeldörr', type: 'door', width: 0.8, height: 2.1, sillHeight: 0, style: 'single', description: '80 cm standard (M8)' },
  { id: 'door-single', label: 'M9 Enkeldörr', type: 'door', width: 0.9, height: 2.1, sillHeight: 0, style: 'single', description: '90 cm standard (M9)' },
  { id: 'door-m10', label: 'M10 Bred dörr', type: 'door', width: 1.0, height: 2.1, sillHeight: 0, style: 'single', description: '100 cm (M10)' },
  { id: 'door-wide', label: 'M13 Bred dörr', type: 'door', width: 1.3, height: 2.1, sillHeight: 0, style: 'single', description: '130 cm (M13, tillgänglighet)' },
  { id: 'door-double', label: 'Pardörr', type: 'door', width: 1.6, height: 2.1, sillHeight: 0, style: 'double', description: '160 cm pardörr' },
  { id: 'door-sliding', label: 'Skjutdörr', type: 'door', width: 1.8, height: 2.1, sillHeight: 0, style: 'sliding', description: '180 cm skjutdörr' },
  // Passages (open doorway, no leaf)
  { id: 'passage-standard', label: 'Passage', type: 'passage', width: 0.9, height: 2.1, sillHeight: 0, style: 'open', description: '90 cm öppen passage' },
  { id: 'passage-wide', label: 'Bred passage', type: 'passage', width: 1.2, height: 2.1, sillHeight: 0, style: 'open', description: '120 cm öppen passage' },
  { id: 'passage-arch', label: 'Valvbåge', type: 'passage', width: 0.8, height: 2.2, sillHeight: 0, style: 'arch', description: '80 cm valvbåge' },
  // Windows — Swedish standard
  { id: 'win-standard', label: 'Standardfönster', type: 'window', width: 1.2, height: 1.2, sillHeight: 0.9, style: 'casement', description: '120×120 cm' },
  { id: 'win-small', label: 'Litet fönster', type: 'window', width: 0.6, height: 0.6, sillHeight: 1.2, style: 'casement', description: '60×60 cm' },
  { id: 'win-panorama', label: 'Panoramafönster', type: 'window', width: 2.4, height: 1.5, sillHeight: 0.6, style: 'fixed', description: '240×150 cm fast glas' },
  { id: 'win-french', label: 'Altandörr', type: 'window', width: 1.8, height: 2.1, sillHeight: 0, style: 'french', description: '180 cm golv till tak' },
  // Garage doors — Swedish standard
  { id: 'garage-single', label: 'Garageport enkel', type: 'garage-door', width: 2.5, height: 2.2, sillHeight: 0, style: 'sectional', description: '250 cm sektionsport' },
  { id: 'garage-double', label: 'Garageport dubbel', type: 'garage-door', width: 5.0, height: 2.5, sillHeight: 0, style: 'sectional', description: '500 cm sektionsport' },
  { id: 'garage-roller', label: 'Rullport', type: 'garage-door', width: 3.0, height: 2.4, sillHeight: 0, style: 'roller', description: '300 cm rullport' },
];

export function getPresetsByType(type: WallOpening['type']): OpeningPreset[] {
  return openingPresets.filter((p) => p.type === type);
}
