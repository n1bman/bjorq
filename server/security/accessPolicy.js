const ROUTINE_CONTROL_DOMAINS = new Set([
  'light',
  'switch',
  'input_boolean',
  'climate',
  'media_player',
  'fan',
  'cover',
  'vacuum',
  'number',
  'input_number',
  'select',
  'input_select',
  'water_heater',
  'humidifier',
  'valve',
  'lawn_mower',
]);

const ADMIN_ONLY_CONTROL_DOMAINS = new Set([
  'lock',
  'alarm_control_panel',
  'siren',
  'scene',
  'script',
  'automation',
  'button',
]);

const EVERYDAY_CONTROL_SUMMARY = [
  'Visa dashboard, 3D-scen och live-status',
  'Styra vanliga hemfunktioner som ljus, klimat, media, fläktar och gardiner',
  'Använda kameravyer och standby-förhandsgranskning',
];

const ADMIN_REQUIRED_SUMMARY = [
  'Home Assistant-anslutning, integrationsinställningar och rå HA-proxy',
  'Projekt, designläge och serverlagrade ändringar',
  'Backup, återställning och datarensning',
  'Asset- och kataloghantering',
  'Säkerhetskänsliga styrningar som lås, larm, sirener, script, automationer och scener',
];

export function getAccessPolicySummary() {
  return {
    routineControlDomains: [...ROUTINE_CONTROL_DOMAINS],
    everydayControlSummary: EVERYDAY_CONTROL_SUMMARY,
    adminRequiredSummary: ADMIN_REQUIRED_SUMMARY,
  };
}

export function getServiceAccessPolicy(domain) {
  const normalized = String(domain || '').trim().toLowerCase();

  if (ROUTINE_CONTROL_DOMAINS.has(normalized)) {
    return {
      requiresAdmin: false,
      reason: null,
    };
  }

  if (ADMIN_ONLY_CONTROL_DOMAINS.has(normalized)) {
    return {
      requiresAdmin: true,
      reason: 'Lås upp adminläge för säkerhetskänslig styrning.',
    };
  }

  return {
    requiresAdmin: true,
    reason: 'Lås upp adminläge för avancerad eller okänd Home Assistant-styrning.',
  };
}
