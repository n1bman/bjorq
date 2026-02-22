import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { WeatherCondition } from '@/store/types';

// Map WMO weather codes to our conditions
function wmoToCondition(code: number): WeatherCondition {
  if (code <= 3) return code <= 1 ? 'clear' : 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return 'cloudy';
}

async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const cw = data.current_weather;
  // Get current hour's humidity
  const nowHour = new Date().getHours();
  const humidity = data.hourly?.relative_humidity_2m?.[nowHour] ?? undefined;
  return {
    condition: wmoToCondition(cw.weathercode as number),
    temperature: Math.round(cw.temperature as number),
    windSpeed: cw.windspeed as number,
    humidity: humidity as number | undefined,
  };
}

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useWeatherSync() {
  const source = useAppStore((s) => s.environment.source);
  const lat = useAppStore((s) => s.environment.location.lat);
  const lon = useAppStore((s) => s.environment.location.lon);
  const setWeather = useAppStore((s) => s.setWeather);
  const setWeatherData = useAppStore((s) => s.setWeatherData);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (source !== 'auto') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const doFetch = async () => {
      try {
        const data = await fetchWeather(lat, lon);
        setWeatherData(data);
      } catch (e) {
        console.warn('Weather sync failed:', e);
      }
    };

    doFetch();
    intervalRef.current = setInterval(doFetch, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [source, lat, lon, setWeather, setWeatherData]);
}
