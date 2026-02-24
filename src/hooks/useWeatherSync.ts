import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { WeatherCondition, ForecastDay } from '@/store/types';

// Map WMO weather codes to our conditions
function wmoToCondition(code: number): WeatherCondition {
  if (code <= 3) return code <= 1 ? 'clear' : 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return 'cloudy';
}

function wmoToIntensity(code: number): number {
  // Light: 0.3, Moderate: 0.6, Heavy: 1.0
  if ([51, 56, 71, 85, 80].includes(code)) return 0.3;
  if ([53, 57, 73, 61, 81].includes(code)) return 0.6;
  if ([55, 67, 75, 65, 82, 77, 86].includes(code)) return 1.0;
  return 0;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function calculateSunPosition(lat: number, lon: number, date: Date): { azimuth: number; elevation: number } {
  const hour = date.getHours() + date.getMinutes() / 60;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * D2R);
  const hourAngle = (hour - 12) * 15;

  const latRad = lat * D2R;
  const decRad = declination * D2R;
  const haRad = hourAngle * D2R;

  const sinElev = Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) * R2D;

  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinElev) /
    (Math.cos(latRad) * Math.cos(elevation * D2R));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * R2D;
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { azimuth, elevation };
}

const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const cw = data.current_weather;
  const nowHour = new Date().getHours();
  const humidity = data.hourly?.relative_humidity_2m?.[nowHour] ?? undefined;
  const weatherCode = cw.weathercode as number;

  const forecast: ForecastDay[] = (data.daily?.time ?? []).map((dateStr: string, i: number) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      day: dayNames[d.getDay()],
      condition: wmoToCondition(data.daily.weathercode[i]),
      maxTemp: Math.round(data.daily.temperature_2m_max[i]),
      minTemp: Math.round(data.daily.temperature_2m_min[i]),
    };
  });

  return {
    condition: wmoToCondition(weatherCode),
    temperature: Math.round(cw.temperature as number),
    windSpeed: cw.windspeed as number,
    humidity: humidity as number | undefined,
    intensity: wmoToIntensity(weatherCode),
    forecast,
  };
}

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SUN_INTERVAL = 60 * 1000; // 1 minute

export function useWeatherSync() {
  const source = useAppStore((s) => s.environment.source);
  const lat = useAppStore((s) => s.environment.location.lat);
  const lon = useAppStore((s) => s.environment.location.lon);
  const setWeatherData = useAppStore((s) => s.setWeatherData);
  const setSunPosition = useAppStore((s) => s.setSunPosition);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const sunRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (source !== 'auto') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sunRef.current) clearInterval(sunRef.current);
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

    const updateSun = () => {
      const { azimuth, elevation } = calculateSunPosition(lat, lon, new Date());
      setSunPosition(azimuth, elevation);
    };

    doFetch();
    updateSun();
    intervalRef.current = setInterval(doFetch, POLL_INTERVAL);
    sunRef.current = setInterval(updateSun, SUN_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sunRef.current) clearInterval(sunRef.current);
    };
  }, [source, lat, lon, setWeatherData, setSunPosition]);
}
