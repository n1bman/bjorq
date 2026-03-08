import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { WeatherCondition, ForecastDay } from '../store/types';
import { computeEnvironmentProfile, estimateCloudCoverage } from '../lib/environmentEngine';

// Map WMO weather codes to our conditions
function wmoToCondition(code: number): WeatherCondition {
  if (code <= 3) return code <= 1 ? 'clear' : 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return 'cloudy';
}

function wmoToIntensity(code: number): number {
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

/** Recompute and store the environment profile from current state */
function updateProfile() {
  const s = useAppStore.getState();
  const env = s.environment;
  const profile = computeEnvironmentProfile({
    sunAzimuth: env.sunAzimuth,
    sunElevation: env.sunElevation,
    weatherCondition: env.weather.condition,
    cloudCoverage: env.cloudCoverage,
    calibration: env.sunCalibration,
    atmosphere: env.atmosphere,
    precipitationOverride: env.precipitationOverride,
  });
  s.setEnvironmentProfile(profile);
}

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SUN_INTERVAL = 60 * 1000; // 1 minute

export function useWeatherSync() {
  const source = useAppStore((s) => s.environment.source);
  const lat = useAppStore((s) => s.environment.location.lat);
  const lon = useAppStore((s) => s.environment.location.lon);
  const setWeatherData = useAppStore((s) => s.setWeatherData);
  const setSunPosition = useAppStore((s) => s.setSunPosition);
  const setCloudCoverage = useAppStore((s) => s.setCloudCoverage);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const sunRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (source !== 'auto' && source !== 'ha') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sunRef.current) clearInterval(sunRef.current);
      // Still compute profile for manual mode
      updateProfile();
      return;
    }

    // HA weather source: read from liveStates
    if (source === 'ha') {
      const syncFromHA = () => {
        const liveStates = useAppStore.getState().homeAssistant.liveStates;
        const cal = useAppStore.getState().environment.sunCalibration ?? { northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1, indoorBounce: 0 };

        // --- Read sun.sun entity for precise sun position ---
        const sunEntity = liveStates['sun.sun'];
        if (sunEntity) {
          const haAz = sunEntity.attributes.azimuth as number;
          const haEl = sunEntity.attributes.elevation as number;
          if (typeof haAz === 'number' && typeof haEl === 'number') {
            setSunPosition(
              haAz + cal.northOffset + cal.azimuthCorrection,
              haEl + cal.elevationCorrection
            );
          }
        } else {
          // Fallback to calculated sun position
          const { azimuth, elevation } = calculateSunPosition(lat, lon, new Date());
          setSunPosition(
            azimuth + cal.northOffset + cal.azimuthCorrection,
            elevation + cal.elevationCorrection
          );
        }

        // --- Read weather entity ---
        const weatherKey = Object.keys(liveStates).find((k) => k.startsWith('weather.'));
        if (!weatherKey) {
          updateProfile();
          return;
        }
        const ws = liveStates[weatherKey];
        const attrs = ws.attributes;

        const conditionMap: Record<string, WeatherCondition> = {
          sunny: 'clear', 'clear-night': 'clear', partlycloudy: 'cloudy', cloudy: 'cloudy',
          rainy: 'rain', pouring: 'rain', lightning: 'rain', 'lightning-rainy': 'rain',
          snowy: 'snow', 'snowy-rainy': 'snow', hail: 'snow',
          fog: 'cloudy', windy: 'cloudy', 'windy-variant': 'cloudy', exceptional: 'cloudy',
        };
        const condition = conditionMap[ws.state] || 'cloudy';
        const temperature = typeof attrs.temperature === 'number' ? Math.round(attrs.temperature) : 0;
        const windSpeed = typeof attrs.wind_speed === 'number' ? attrs.wind_speed : undefined;
        const humidity = typeof attrs.humidity === 'number' ? attrs.humidity : undefined;
        const intensity = condition === 'rain' ? 0.6 : condition === 'snow' ? 0.5 : 0;

        // --- Read cloud coverage ---
        let cloudCov: number | undefined;
        // Try weather entity attributes first
        if (typeof attrs.cloud_coverage === 'number') {
          cloudCov = attrs.cloud_coverage / 100;
        }
        // Try dedicated sensor
        const cloudSensor = liveStates['sensor.cloud_coverage'];
        if (cloudSensor && typeof cloudSensor.state === 'string') {
          const parsed = parseFloat(cloudSensor.state);
          if (!isNaN(parsed)) cloudCov = parsed / 100;
        }
        // Estimate from condition if unavailable
        if (cloudCov === undefined) {
          cloudCov = estimateCloudCoverage(condition);
        }
        setCloudCoverage(Math.max(0, Math.min(1, cloudCov)));

        // Parse forecast from HA attributes
        let forecast: ForecastDay[] | undefined;
        const haForecast = attrs.forecast as Array<{ datetime: string; condition: string; temperature: number; templow: number }> | undefined;
        if (Array.isArray(haForecast) && haForecast.length > 0) {
          forecast = haForecast.slice(0, 7).map((f) => {
            const d = new Date(f.datetime);
            return {
              day: dayNames[d.getDay()],
              condition: conditionMap[f.condition] || 'cloudy',
              maxTemp: Math.round(f.temperature),
              minTemp: Math.round(f.templow ?? f.temperature - 5),
            };
          });
        }

        setWeatherData({ condition, temperature, windSpeed, humidity, intensity, forecast });

        // Recompute profile after all data is set
        // Use setTimeout(0) to ensure store has updated
        setTimeout(updateProfile, 0);
      };

      syncFromHA();
      intervalRef.current = setInterval(syncFromHA, 30_000);

      // Sun update without HA fallback (HA sync handles sun.sun)
      const updateSun = () => {
        const liveStates = useAppStore.getState().homeAssistant.liveStates;
        const cal = useAppStore.getState().environment.sunCalibration ?? { northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1, indoorBounce: 0 };
        const sunEntity = liveStates['sun.sun'];
        if (!sunEntity) {
          const { azimuth, elevation } = calculateSunPosition(lat, lon, new Date());
          setSunPosition(
            azimuth + cal.northOffset + cal.azimuthCorrection,
            elevation + cal.elevationCorrection
          );
        }
        setTimeout(updateProfile, 0);
      };
      sunRef.current = setInterval(updateSun, SUN_INTERVAL);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (sunRef.current) clearInterval(sunRef.current);
      };
    }

    // Auto source: fetch from Open-Meteo
    const doFetch = async () => {
      try {
        const data = await fetchWeather(lat, lon);
        setWeatherData(data);
        setCloudCoverage(estimateCloudCoverage(data.condition));
        setTimeout(updateProfile, 0);
      } catch (e) {
        console.warn('Weather sync failed:', e);
      }
    };

    const updateSun = () => {
      const cal = useAppStore.getState().environment.sunCalibration ?? { northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1, indoorBounce: 0 };
      const { azimuth, elevation } = calculateSunPosition(lat, lon, new Date());
      setSunPosition(
        azimuth + cal.northOffset + cal.azimuthCorrection,
        elevation + cal.elevationCorrection
      );
      setTimeout(updateProfile, 0);
    };

    doFetch();
    updateSun();
    intervalRef.current = setInterval(doFetch, POLL_INTERVAL);
    sunRef.current = setInterval(updateSun, SUN_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sunRef.current) clearInterval(sunRef.current);
    };
  }, [source, lat, lon, setWeatherData, setSunPosition, setCloudCoverage]);
}
