import { useAppStore } from '@/store/useAppStore';
import type { BuildTab } from '@/store/types';
import { Hammer, Upload, Sofa, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs: { key: BuildTab; label: string; icon: typeof Hammer }[] = [
  { key: 'structure', label: 'Struktur', icon: Hammer },
  { key: 'import', label: 'Importera', icon: Upload },
  { key: 'furnish', label: 'Möblera', icon: Sofa },
  { key: 'devices', label: 'Enheter', icon: Lightbulb },
];

export default function BuildTabBar() {
  const activeTab = useAppStore((s) => s.build.tab);
  const setBuildTab = useAppStore((s) => s.setBuildTab);

  return (
    <div className="flex items-center justify-center gap-1 px-2 py-1.5 border-t border-border bg-card/80 backdrop-blur-sm">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setBuildTab(key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]',
            activeTab === key
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
