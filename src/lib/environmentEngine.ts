/**
 * Environment Engine — Pure interpretation layer
 * 
 * Converts raw weather/sun data + calibration into a structured
 * EnvironmentProfile that the renderer consumes directly.
 * 
 * No React, no Three.js — pure TypeScript.
 */

import type { WeatherCondition, SunCalibration, AtmosphereSettings, PrecipitationOverride } from '../store/types';

// ─── Output Profile ───

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface EnvironmentProfile {
  // Time phase
  phase: DayPhase;
  phaseFactor: number;            // 0-1 blend within phase

  // Sun
  sunIntensity: number;           // directional light intensity (0-2)
  sunColor: [number, number, number]; // RGB normalized 0-1
  shadowEnabled: boolean;
  shadowSoftness: number;         // 0-1 (0=sharp, 1=very soft)

  // Ambient / Fill
  ambientIntensity: number;
  ambientColor: [number, number, number];
  hemisphereIntensity: number;
  hemisphereSkyColor: [number, number, number];
  hemisphereGroundColor: [number, number, number];

  // Indoor fill (applied to hemisphere boost)
  indoorFillIntensity: number;

  // Atmosphere
  fogEnabled: boolean;
  fogNear: number;
  fogFar: number;
  fogColor: [number, number, number];

  // Weather effects
  precipitationType: 'none' | 'rain' | 'snow';
  precipitationIntensity: number; // 0-1
}

// ─── Input ───

export interface EnvironmentInput {
  sunAzimuth: number;
  sunElevation: number;
  weatherCondition: WeatherCondition;
  cloudCoverage: number;          // 0-1 (0=clear sky, 1=overcast)
  calibration: SunCalibration;
  atmosphere: AtmosphereSettings;
  precipitationOverride: PrecipitationOverride;
}

// ─── Helpers ───

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t));
  return [lerp(a[0], b[0], ct), lerp(a[1], b[1], ct), lerp(a[2], b[2], ct)];
}

// ─── Day Phase Detection ───

function computePhase(elevation: number): { phase: DayPhase; factor: number } {
  if (elevation < -6) return { phase: 'night', factor: 1 };
  if (elevation < 0) {
    // Civil twilight: -6 to 0
    const t = (elevation + 6) / 6; // 0 at -6°, 1 at 0°
    return { phase: elevation < -3 ? 'dawn' : 'dawn', factor: t };
  }
  if (elevation < 15) {
    // Dawn/dusk transition: 0° to 15°
    const t = elevation / 15;
    return { phase: 'dawn', factor: t };
  }
  return { phase: 'day', factor: 1 };
}

// ─── Weather Base Profiles ───

interface WeatherProfile {
  sunIntensity: number;
  ambientIntensity: number;
  hemisphereIntensity: number;
  shadowEnabled: boolean;
  shadowSoftness: number;
  sunColor: [number, number, number];
  ambientColor: [number, number, number];
}

const CLEAR: WeatherProfile = {
  sunIntensity: 1.1,
  ambientIntensity: 0.40,
  hemisphereIntensity: 0.45,
  shadowEnabled: true,
  shadowSoftness: 0.15,
  sunColor: [1.0, 0.88, 0.65],        // warm golden — slightly softer
  ambientColor: [0.75, 0.78, 0.82],   // warmer sky fill
};

const PARTLY_CLOUDY: WeatherProfile = {
  sunIntensity: 0.65,
  ambientIntensity: 0.52,
  hemisphereIntensity: 0.55,
  shadowEnabled: true,
  shadowSoftness: 0.5,
  sunColor: [0.95, 0.90, 0.72],
  ambientColor: [0.76, 0.79, 0.82],
};

const CLOUDY: WeatherProfile = {
  sunIntensity: 0.25,
  ambientIntensity: 0.65,
  hemisphereIntensity: 0.7,
  shadowEnabled: false,
  shadowSoftness: 1.0,
  sunColor: [0.85, 0.85, 0.82],
  ambientColor: [0.78, 0.80, 0.84],
};

const RAIN: WeatherProfile = {
  sunIntensity: 0.15,
  ambientIntensity: 0.5,
  hemisphereIntensity: 0.55,
  shadowEnabled: false,
  shadowSoftness: 1.0,
  sunColor: [0.7, 0.72, 0.75],        // cool desaturated
  ambientColor: [0.65, 0.68, 0.75],
};

const SNOW: WeatherProfile = {
  sunIntensity: 0.3,
  ambientIntensity: 0.6,
  hemisphereIntensity: 0.5,
  shadowEnabled: true,
  shadowSoftness: 0.6,
  sunColor: [0.9, 0.92, 0.95],        // cold white
  ambientColor: [0.82, 0.85, 0.9],
};

const NIGHT: WeatherProfile = {
  sunIntensity: 0,
  ambientIntensity: 0.10,
  hemisphereIntensity: 0.06,
  shadowEnabled: false,
  shadowSoftness: 1.0,
  sunColor: [0.18, 0.18, 0.30],
  ambientColor: [0.12, 0.12, 0.22],  // slightly warmer night
};

function getWeatherProfile(condition: WeatherCondition): WeatherProfile {
  switch (condition) {
    case 'clear': return CLEAR;
    case 'cloudy': return CLOUDY;
    case 'rain': return RAIN;
    case 'snow': return SNOW;
    default: return CLEAR;
  }
}

// ─── Cloud interpolation ───
// When cloudCoverage is between 0-1 and cloudinessAffectsLight is on,
// we interpolate between the clear and condition-based profile

function blendProfiles(a: WeatherProfile, b: WeatherProfile, t: number): WeatherProfile {
  const ct = Math.max(0, Math.min(1, t));
  return {
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, ct),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, ct),
    hemisphereIntensity: lerp(a.hemisphereIntensity, b.hemisphereIntensity, ct),
    shadowEnabled: ct < 0.7 ? a.shadowEnabled : b.shadowEnabled,
    shadowSoftness: lerp(a.shadowSoftness, b.shadowSoftness, ct),
    sunColor: lerpColor(a.sunColor, b.sunColor, ct),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor, ct),
  };
}

// ─── Main Engine ───

export function computeEnvironmentProfile(input: EnvironmentInput): EnvironmentProfile {
  const { sunElevation, weatherCondition, cloudCoverage, calibration, atmosphere, precipitationOverride } = input;

  // 1. Determine day phase
  const { phase, factor: phaseFactor } = computePhase(sunElevation);

  // 2. Get weather-based profile
  let weatherProfile = getWeatherProfile(weatherCondition);

  // 3. Apply cloud coverage interpolation (always blend based on cloudCoverage)
  if (atmosphere.cloudinessAffectsLight && cloudCoverage > 0) {
    const baseProfile = getWeatherProfile(weatherCondition);
    if (cloudCoverage <= 0.5) {
      weatherProfile = blendProfiles(CLEAR, blendProfiles(PARTLY_CLOUDY, baseProfile, 0.5), cloudCoverage * 2);
    } else {
      weatherProfile = blendProfiles(blendProfiles(PARTLY_CLOUDY, baseProfile, 0.5), CLOUDY, (cloudCoverage - 0.5) * 2);
    }
  }

  // 4. Apply night/twilight blending
  let finalProfile = weatherProfile;
  if (phase === 'night') {
    finalProfile = NIGHT;
  } else if (phase === 'dawn' && phaseFactor < 1) {
    // Blend between night and weather profile based on dawn factor
    finalProfile = blendProfiles(NIGHT, weatherProfile, phaseFactor);
  }

  // 5. Apply calibration multipliers
  const sunIntensity = finalProfile.sunIntensity * calibration.intensityMultiplier;

  // 6. Indoor fill — based on hemisphere + indoorBounce calibration
  const indoorBounce = Math.max(calibration.indoorBounce, 0.35); // minimum 0.35 for warmer indoor fill
  const hemisphereIntensity = finalProfile.hemisphereIntensity * indoorBounce;
  const indoorFillIntensity = hemisphereIntensity;

  // 7. Atmosphere
  const fogEnabled = atmosphere.fogEnabled;
  const fogDensity = atmosphere.fogDensity;
  const fogNear = 20;
  const fogFar = 60 - fogDensity * 40;

  // Fog color — desaturated version of ambient, influenced by atmosphere intensity
  const atmoMul = atmosphere.atmosphereIntensity;
  const fogColor: [number, number, number] = [
    lerp(0.78, finalProfile.ambientColor[0], atmoMul),
    lerp(0.80, finalProfile.ambientColor[1], atmoMul),
    lerp(0.82, finalProfile.ambientColor[2], atmoMul),
  ];

  // 8. Precipitation
  let precipitationType: 'none' | 'rain' | 'snow' = 'none';
  let precipitationIntensity = 0;

  if (precipitationOverride === 'off') {
    precipitationType = 'none';
  } else if (precipitationOverride === 'rain') {
    precipitationType = 'rain';
    precipitationIntensity = 0.6;
  } else if (precipitationOverride === 'snow') {
    precipitationType = 'snow';
    precipitationIntensity = 0.5;
  } else {
    // auto — from weather condition + intensity
    if (weatherCondition === 'rain') {
      precipitationType = 'rain';
      precipitationIntensity = cloudCoverage > 0.7 ? 0.8 : 0.5;
    } else if (weatherCondition === 'snow') {
      precipitationType = 'snow';
      precipitationIntensity = 0.5;
    }
  }

  // 9. Hemisphere sky/ground colors
  const hemisphereSkyColor: [number, number, number] = phase === 'night'
    ? [0.05, 0.05, 0.12]
    : [1.0, 0.96, 0.88]; // warm sky bounce
  const hemisphereGroundColor: [number, number, number] = [0.28, 0.35, 0.14]; // warmer ground bounce

  return {
    phase,
    phaseFactor,
    sunIntensity,
    sunColor: finalProfile.sunColor,
    shadowEnabled: finalProfile.shadowEnabled,
    shadowSoftness: finalProfile.shadowSoftness,
    ambientIntensity: finalProfile.ambientIntensity * atmoMul,
    ambientColor: finalProfile.ambientColor,
    hemisphereIntensity,
    hemisphereSkyColor,
    hemisphereGroundColor,
    indoorFillIntensity,
    fogEnabled,
    fogNear,
    fogFar,
    fogColor,
    precipitationType,
    precipitationIntensity,
  };
}

// ─── Default Profile (used before first sync) ───

export const DEFAULT_ENVIRONMENT_PROFILE: EnvironmentProfile = {
  phase: 'day',
  phaseFactor: 1,
  sunIntensity: 1.2,
  sunColor: [1.0, 0.85, 0.6],
  shadowEnabled: true,
  shadowSoftness: 0.1,
  ambientIntensity: 0.35,
  ambientColor: [0.72, 0.77, 0.83],
  hemisphereIntensity: 0.4,
  hemisphereSkyColor: [1.0, 0.96, 0.88],
  hemisphereGroundColor: [0.28, 0.35, 0.14],
  indoorFillIntensity: 0.4,
  fogEnabled: false,
  fogNear: 20,
  fogFar: 48,
  fogColor: [0.78, 0.80, 0.82],
  precipitationType: 'none',
  precipitationIntensity: 0,
};

// ─── Cloud coverage estimation from weather condition ───

export function estimateCloudCoverage(condition: WeatherCondition): number {
  switch (condition) {
    case 'clear': return 0;
    case 'cloudy': return 0.8;
    case 'rain': return 0.9;
    case 'snow': return 0.7;
    default: return 0;
  }
}
