import { useAppStore } from '../../store/useAppStore';
import type { BuildTab } from '../../store/types';
import { Ruler, Sofa, Archive } from 'lucide-react';
import { cn } from '../../lib/utils';

const tabs: { key: BuildTab; label: string; icon: typeof Ruler }[] = [
  { key: 'planritning', label: 'Planritning', icon: Ruler },
  { key: 'inredning', label: 'Inredning', icon: Sofa },
  { key: 'bibliotek', label: 'Bibliotek', icon: Archive },
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
