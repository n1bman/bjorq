# Control Panel Architecture

This document defines the next control-panel structure for BJORQ after the hosted persistence fixes.

The goal is to make the dashboard feel more like a real product and less like a technical settings surface, while keeping add-on validation as the primary target.

## Core Principles

- First launch should not require Home Assistant connection.
- `Profil` should own identity, access, integrations, and user-facing data management.
- `Inställningar` should own how the system behaves and looks.
- `Grafik & Miljö` should stop being a top-level destination and instead live under `Inställningar`.
- Project persistence must behave the same no matter if changes come from Home view, Control Panel, or Design mode.

## First Launch Flow

Target flow:

1. Open BJORQ for the first time.
2. Create a profile.
3. Set a password or admin PIN.
4. Enter the dashboard immediately.
5. Optionally continue with:
   - create a home
   - draw a floor plan
   - import a 3D model
   - connect Home Assistant
   - load a demo project

Important product rule:

- Home Assistant connection is optional during onboarding.
- BJORQ should be explorable before integrations are configured.

## Proposed Left Navigation

Main navigation:

- `Hem`
- `Väder`
- `Kalender`
- `Enheter`
- `Energi`
- `Klimat`
- `Automation`
- `Scener`
- `Övervakning`
- `Robot`
- `Aktivitet`
- `Widgets`
- `Inställningar`
- `Profil`

Supporting shortcuts:

- `Hemvy`
- `Design`

Future option:

- merge `Automation` and `Scener` into a shared product area later, but keep the technical split in Home Assistant logic.

## Profile Area

`Profil` should become the main surface for everything about the user and the installation identity.

Sections:

### Konto
- profile name
- avatar or simple identity block
- product version and hosted mode label

### Säkerhet
- admin unlock status
- create/change PIN or password
- logout
- future session and device trust controls

### Kopplingar
- Home Assistant
- Wizard
- Spotify
- e-post / kalender
- future integrations

### Data
- save project
- export project
- import project
- backup export
- backup restore
- reset data

## Settings Area

`Inställningar` should own behavior, presentation, and device/display runtime.

Sections:

### Utseende
- theme
- accent color
- visual profile

### Grafik & Miljö
- 3D preview
- rendering options
- sun and weather
- environment and atmosphere

### Skärm & Standby
- browser fullscreen
- app mode
- kiosk options
- standby timing
- vio mode
- standby camera preview
- save current camera view

### Prestanda
- quality
- shadows
- antialiasing
- hardware-adaptive options

### System
- system status
- hosted mode info
- sync status
- transport status
- server info

## Current Card Migration

Move current cards like this:

### To `Profil`
- `ProfilePanel`
- `HAConnectionPanel`
- `WizardConnectionPanel`
- `ProjectManagerPanel`
- `DataBackupCard`

### To `Inställningar`
- `ThemeCard`
- `DisplaySettings`
- `GraphicsSettings`
- `SunWeatherPanel`
- `EnvironmentPanel`
- `SystemStatusCard`
- `LocationSettings`
- `WifiPanel`

## Persistence Rules

Before the control-panel restructure is considered complete, project data must follow the same persistence rules across all surfaces.

Required rules:

- autosave should work regardless of whether the change happens in Home, Control Panel, or Design mode
- explicit `Spara projekt` should always use the same hosted save path
- project import should always persist explicitly in hosted mode
- floor plan import should persist explicitly in hosted mode
- 3D building import should persist explicitly in hosted mode
- the active project loaded on bootstrap must match the project being saved

## Implementation Order

### Step 1 - Persistence baseline
- finish unifying hosted save behavior across imports and project actions
- add targeted diagnostics for active project id and bootstrap project loading if needed

### Step 2 - Navigation model
- add `Profil` as a real top-level destination
- remove `Grafik & Miljö` from the left navigation
- move graphics sections into `Inställningar`

### Step 3 - Panel migration
- move existing cards without redesigning them first
- keep all current features working during the move

### Step 4 - First launch flow
- create onboarding for first-run profile creation
- make Home Assistant connection optional in onboarding

### Step 5 - UX polish
- refine labels, section hierarchy, and empty states
- reduce remaining duplication between profile and system surfaces

## Definition of Done

The control panel is considered restructured when:

- `Profil` exists as a first-class navigation area
- `Grafik & Miljö` no longer exists as a top-level nav item
- `Inställningar` contains graphics, display, performance, and system behavior
- `Profil` contains identity, security, integrations, and data
- the first-launch flow works without Home Assistant
- save/import/restore behavior is consistent across Home view, Control Panel, and Design mode
