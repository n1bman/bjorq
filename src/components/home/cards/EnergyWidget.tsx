import { Zap, TrendingDown, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function EnergyWidget() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-4 cursor-pointer transition-all duration-300',
        expanded ? 'min-w-[220px]' : 'min-w-[140px] max-w-[160px]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-primary shrink-0" />
        <div>
          <p className="text-lg font-semibold font-display text-foreground">1 541 W</p>
          <p className="text-[10px] text-muted-foreground">1.5 kr/kWh</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
        <TrendingDown size={12} className="text-green-400" />
        <span className="text-[10px] text-muted-foreground">Idag: 12.4 kWh</span>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Denna vecka: 84.2 kWh</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Denna månad: 312 kWh</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Kostnad idag: ~18.6 kr</span>
          </div>
          <p className="text-[9px] text-muted-foreground/60 mt-1">Anslut HA för realtidsdata</p>
        </div>
      )}
    </div>
  );
}
