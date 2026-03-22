# BJORQ Dashboard v1.8.3

Release date: 2026-03-22

## Focus

This release improves Home Assistant coverage in the dashboard menus and makes entity linking more useful during design and setup.

## What's new

### Home Assistant menus
- Energy now separates discovered HA power sensors from energy sensors and supports linking both live watt and cumulative kWh sources per placed device.
- Climate now shows discovered HA climate devices, climate-adjacent devices, and sensor sources alongside the existing comfort-rule system.
- Automations, Scenes, Surveillance, and Robot now include direct HA-backed sections so entities can be seen even before they are fully placed in 3D.

### Entity matching
- The HA entity picker now prioritizes suggested matches based on the current device name, making design-time linking more relevant than pure domain filtering.

## Verification
- `npm test`
- `npm run lint`
- `npm run build`

## Still worth testing in Home Assistant
- Real HA installs with more climate and energy entities than the current local environment.
- Surveillance behavior with multiple unlinked cameras.
- Robot behavior for both vacuum and lawn mower entities.
- Whether suggested entity matches feel right for the most common device names in Design mode.
