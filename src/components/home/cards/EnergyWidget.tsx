import { Zap, TrendingDown } from 'lucide-react';

export default function EnergyWidget() {
  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[140px]">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-primary" />
        <div>
          <p className="text-lg font-semibold font-display text-foreground">1 541 W</p>
          <p className="text-[10px] text-muted-foreground">1.5 kr/kWh</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
        <TrendingDown size={12} className="text-green-400" />
        <span className="text-[10px] text-muted-foreground">Idag: 12.4 kWh</span>
      </div>
    </div>
  );
}
