import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { MapPin, Navigation, Search } from 'lucide-react';
import { useState } from 'react';

export default function LocationSettings() {
  const lat = useAppStore((s) => s.environment.location.lat);
  const lon = useAppStore((s) => s.environment.location.lon);
  const timezone = useAppStore((s) => s.environment.location.timezone);
  const setLocation = useAppStore((s) => s.setLocation);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundPlace, setFoundPlace] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(
          Math.round(pos.coords.latitude * 100) / 100,
          Math.round(pos.coords.longitude * 100) / 100
        );
        setLocating(false);
        setFoundPlace(null);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const searchPlace = async () => {
    const query = [address, country].filter(Boolean).join(', ');
    if (!query) return;
    setSearching(true);
    setFoundPlace(null);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=sv`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        setLocation(
          Math.round(r.latitude * 100) / 100,
          Math.round(r.longitude * 100) / 100
        );
        setFoundPlace(`${r.name}${r.admin1 ? `, ${r.admin1}` : ''}, ${r.country}`);
      } else {
        setFoundPlace('Ingen plats hittades');
      }
    } catch {
      setFoundPlace('Sökning misslyckades');
    }
    setSearching(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Plats</h4>
      </div>

      {/* Address search */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-medium">Sök efter plats</p>
        <Input
          placeholder="Adress / Stad"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="h-8 text-xs"
        />
        <Input
          placeholder="Land"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
          onClick={searchPlace}
          disabled={searching || (!address && !country)}
        >
          <Search size={12} />
          {searching ? 'Söker...' : 'Sök plats'}
        </Button>
        {foundPlace && (
          <p className="text-[10px] text-primary font-medium">{foundPlace}</p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs gap-1.5"
        onClick={useMyLocation}
        disabled={locating}
      >
        <Navigation size={12} />
        {locating ? 'Hämtar...' : 'Använd min plats'}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Latitud</label>
          <Input
            type="number"
            step="0.01"
            value={lat}
            onChange={(e) => setLocation(parseFloat(e.target.value) || 0, lon)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Longitud</label>
          <Input
            type="number"
            step="0.01"
            value={lon}
            onChange={(e) => setLocation(lat, parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Tidszon: {timezone}
      </p>
    </div>
  );
}
