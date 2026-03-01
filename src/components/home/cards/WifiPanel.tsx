import { useState, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Wifi, Eye, EyeOff, QrCode, Copy, Check } from 'lucide-react';

/** Generate a WiFi QR code string (WIFI:T:WPA;S:<ssid>;P:<password>;;) */
function wifiQrString(ssid: string, password: string): string {
  const escape = (s: string) => s.replace(/[\\;,:"]/g, (c) => `\\${c}`);
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(password)};;`;
}

/** Render QR code as SVG using a simple matrix implementation */
function QrCodeSvg({ data, size = 200 }: { data: string; size?: number }) {
  // Simple text-based QR placeholder — in production you'd use a library
  // For now we render the QR string as a visual indicator
  const encoded = encodeURIComponent(data);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=transparent&color=ffffff&format=svg`;

  return (
    <div className="flex items-center justify-center p-4 bg-white rounded-xl">
      <img
        src={qrApiUrl}
        alt="WiFi QR Code"
        width={size}
        height={size}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export default function WifiPanel() {
  const wifi = useAppStore((s) => s.wifi);
  const setWifi = useAppStore((s) => s.setWifi);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrData = useMemo(() => {
    if (!wifi.ssid) return null;
    return wifiQrString(wifi.ssid, wifi.password);
  }, [wifi.ssid, wifi.password]);

  const handleCopy = () => {
    navigator.clipboard.writeText(wifi.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Wifi size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">WiFi-delning</h3>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nätverksnamn (SSID)</label>
          <Input
            value={wifi.ssid}
            onChange={(e) => setWifi({ ssid: e.target.value })}
            placeholder="MittHemNätverk"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Lösenord</label>
          <div className="relative">
            <Input
              value={wifi.password}
              onChange={(e) => setWifi({ password: e.target.value })}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="h-8 text-sm pr-16"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={handleCopy}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* QR visibility toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Visa QR-kod</span>
          </div>
          <Switch
            checked={wifi.visible}
            onCheckedChange={(v) => setWifi({ visible: v })}
          />
        </div>
      </div>

      {/* QR code display */}
      {wifi.visible && wifi.ssid && qrData && (
        <div className="space-y-2">
          <QrCodeSvg data={qrData} size={180} />
          <p className="text-[10px] text-muted-foreground text-center">
            Skanna för att ansluta till <span className="font-semibold text-foreground">{wifi.ssid}</span>
          </p>
        </div>
      )}

      {!wifi.ssid && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          Fyll i SSID och lösenord för att generera en QR-kod som gäster kan skanna.
        </p>
      )}
    </div>
  );
}
