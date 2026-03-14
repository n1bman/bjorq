import { useAppStore } from '../../../store/useAppStore';

const generateId = () => Math.random().toString(36).slice(2, 10);

interface ObjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  action: 'kitchen';
}

const objectTemplates: ObjectTemplate[] = [
  {
    id: 'obj-standard-kitchen',
    name: 'Standardkök',
    description: '3,80 m — Skafferi, kylskåp, spis, diskmaskin, diskbänk, lådskåp',
    icon: '🍳',
    action: 'kitchen',
  },
];

export default function TemplatesPicker() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const addKitchenFixture = useAppStore((s) => s.addKitchenFixture);

  const handlePlace = (tpl: ObjectTemplate) => {
    if (!activeFloorId) return;
    if (tpl.action === 'kitchen') {
      addKitchenFixture(activeFloorId, {
        id: generateId(),
        floorId: activeFloorId,
        position: [0, 0],
        rotation: 0,
      });
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        3D-objekt
      </h4>

      <div className="space-y-1">
        {objectTemplates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => handlePlace(tpl)}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-xs transition-all min-h-[44px] text-left"
          >
            <span className="text-lg">{tpl.icon}</span>
            <div className="flex flex-col items-start">
              <span className="text-foreground font-medium">{tpl.name}</span>
              <span className="text-muted-foreground text-[10px]">{tpl.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
