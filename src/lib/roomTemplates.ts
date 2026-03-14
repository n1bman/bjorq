import type { RoomTemplate } from '../store/types';

export const roomTemplates: RoomTemplate[] = [
  { id: 'tpl-bedroom-small', name: 'Sovrum (litet)', width: 3, depth: 3, category: 'bedroom' },
  { id: 'tpl-bedroom-medium', name: 'Sovrum (medel)', width: 4, depth: 3.5, category: 'bedroom' },
  { id: 'tpl-bedroom-master', name: 'Sovrum (master)', width: 5, depth: 4, category: 'bedroom' },
  { id: 'tpl-kitchen-small', name: 'Kök (litet)', width: 3, depth: 3, category: 'kitchen' },
  { id: 'tpl-kitchen-medium', name: 'Kök (medel)', width: 4, depth: 3.5, category: 'kitchen' },
  { id: 'tpl-kitchen-standard', name: 'Standardkök', width: 3.8, depth: 3, category: 'kitchen', fixture: 'standard-kitchen' },
  { id: 'tpl-living-small', name: 'Vardagsrum (litet)', width: 4, depth: 4, category: 'livingroom' },
  { id: 'tpl-living-large', name: 'Vardagsrum (stort)', width: 6, depth: 5, category: 'livingroom' },
  { id: 'tpl-bathroom-small', name: 'Badrum (litet)', width: 2, depth: 2, category: 'bathroom' },
  { id: 'tpl-bathroom-medium', name: 'Badrum (medel)', width: 3, depth: 2.5, category: 'bathroom' },
];

export function getTemplatesByCategory(category: RoomTemplate['category']): RoomTemplate[] {
  return roomTemplates.filter((t) => t.category === category);
}

export const templateCategoryLabels: Record<RoomTemplate['category'], string> = {
  bedroom: 'Sovrum',
  kitchen: 'Kök',
  livingroom: 'Vardagsrum',
  bathroom: 'Badrum',
};

export const templateCategoryIcons: Record<RoomTemplate['category'], string> = {
  bedroom: '🛏️',
  kitchen: '🍳',
  livingroom: '🛋️',
  bathroom: '🚿',
};
