import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Bell, AlertTriangle, AlertCircle, Info, Trash2, Cpu, Settings2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import type { ActivityCategory } from '../../../store/types';

const severityConfig = {
  info: { icon: Info, className: 'text-muted-foreground' },
  warning: { icon: AlertTriangle, className: 'text-yellow-500' },
  error: { icon: AlertCircle, className: 'text-destructive' },
};

const categoryTabs: { key: ActivityCategory | 'all'; label: string; icon: typeof Bell }[] = [
  { key: 'all', label: 'Alla', icon: Bell },
  { key: 'device', label: 'Enheter', icon: Cpu },
  { key: 'system', label: 'System', icon: Settings2 },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Nu';
  if (mins < 60) return `${mins}m sedan`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h sedan`;
  return `${Math.floor(hrs / 24)}d sedan`;
}

export default function ActivityFeed() {
  const log = useAppStore((s) => s.activityLog);
  const clearActivity = useAppStore((s) => s.clearActivity);
  const markActivityRead = useAppStore((s) => s.markActivityRead);
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all');

  const filtered = filter === 'all' ? log : log.filter((e) => e.category === filter);

  if (log.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Ingen aktivitet ännu</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Händelser visas här när enheter ändras</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Category filter tabs */}
      <div className="flex items-center gap-1 mb-1">
        {categoryTabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            className="h-7 text-[10px] gap-1"
            onClick={() => setFilter(key)}
          >
            <Icon size={12} />
            {label}
            {key !== 'all' && (
              <span className="ml-0.5 opacity-60">
                ({log.filter((e) => e.category === key).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{filtered.length} händelser</span>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={clearActivity}>
          <Trash2 size={10} /> Rensa
        </Button>
      </div>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((event) => {
          const sev = severityConfig[event.severity];
          const Icon = sev.icon;
          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg transition-colors cursor-pointer',
                event.read ? 'bg-transparent' : 'bg-primary/5'
              )}
              onClick={() => !event.read && markActivityRead(event.id)}
            >
              <Icon size={16} className={cn('mt-0.5 shrink-0', sev.className)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-foreground">{event.title}</p>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                    event.category === 'device' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
                  )}>
                    {event.category === 'device' ? 'Enhet' : 'System'}
                  </span>
                </div>
                {event.detail && (
                  <p className="text-[11px] text-muted-foreground truncate">{event.detail}</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(event.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
