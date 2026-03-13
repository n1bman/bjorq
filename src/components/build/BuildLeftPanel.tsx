import { useAppStore } from '../../store/useAppStore';
import { detectRooms } from '../../lib/roomDetection';
import type { BuildTab } from '../../store/types';
import {
  Ruler, Sofa, Archive, RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import FloorManager from './FloorManager';

export default function BuildLeftPanel() {
  const tab = useAppStore((s) => s.build.tab);
  const setBuildTab = useAppStore((s) => s.setBuildTab);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRooms = useAppStore((s) => s.setRooms);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);

  return (
    <div className="w-14 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col items-center py-1 gap-0.5 overflow-y-auto shrink-0">
      {/* Planritning-specific: Room detection + Floor manager */}
      {tab === 'planritning' && (
        <>
          {/* Room detection shortcut */}
          {floor && floor.walls.length >= 3 && (
            <button
              onClick={() => {
                if (!activeFloorId || !floor) return;
                pushUndo();
                const detected = detectRooms(floor.walls);
                setRooms(activeFloorId, detected);
              }}
              title="Detektera rum"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 transition-all"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
