import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Wifi } from 'lucide-react';

function wifiQrString(ssid: string, password: string): string {
  const escape = (s: string) => s.replace(/[\\;,:"]/g, (c) => `\\${c}`);
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(password)};;`;
}

export default function WifiWidget() {
  const wifi = useAppStore((s) => s.wifi);

  const qrData = useMemo(() => wifiQrString(wifi.ssid, wifi.password), [wifi.ssid, wifi.password]);
  const encoded = encodeURIComponent(qrData);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encoded}&bgcolor=transparent&color=ffffff&format=svg`;

  if (!wifi.ssid || !wifi.visible) return null;

  return (
    <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 min-w-[180px]">
      <div className="bg-white rounded-lg p-1.5 shrink-0">
        <img src={qrUrl} alt="WiFi QR" width={56} height={56} style={{ imageRendering: 'pixelated' }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-primary">
          <Wifi size={12} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">WiFi</span>
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{wifi.ssid}</p>
        <p className="text-[10px] text-muted-foreground">Skanna QR</p>
      </div>
    </div>
  );
}
