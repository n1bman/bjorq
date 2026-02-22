import { Zap } from 'lucide-react';

export default function EnergyWidget() {
  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-primary" />
        <div>
          <p className="text-lg font-semibold font-display text-foreground">1 541 W</p>
          <p className="text-[10px] text-muted-foreground">1.5 kr/kWh</p>
        </div>
      </div>
    </div>
  );
}
