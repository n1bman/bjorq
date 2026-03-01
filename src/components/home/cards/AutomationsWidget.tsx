import { useAppStore } from '../../../store/useAppStore';
import { Workflow } from 'lucide-react';

export default function AutomationsWidget() {
  const automations = useAppStore((s) => s.automations);
  const activeCount = automations.filter((a) => a.enabled).length;

  if (automations.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Workflow size={14} className="text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">{activeCount}/{automations.length}</p>
          <p className="text-[10px] text-muted-foreground">Aktiva automationer</p>
        </div>
      </div>
    </div>
  );
}
