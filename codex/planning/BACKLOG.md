# BJORQ Backlog

Last updated: 2026-03-27

## Need To Have

- Fix `HOSTED` persistence for Home free device widgets (`homeScreenDevices`)
- Add safe migration/merge behavior for older `homeView` payloads after `1.10.x`
- End-to-end verification of HA live sync in DEV and HOSTED
- Harden DEV vs HOSTED parity for robot command success/error handling
- Harden vacuum room cleaning and segment mapping lifecycle
- Make Build mode room modeling and vacuum segment-id mapping an explicit first-class workflow instead of an implicit project-data detail
- Add a verification/debug flow for matching HA `roborock.get_maps` segment ids to BJORQ rooms when the robot only exposes segment names/ids through map reads
- Hosted persistence audit across Home, Dashboard, Build, import, save, restore
- Docs sync discipline tied to real code changes and releases
- Reduce drag-time sync pressure from the Home layout editor in `HOSTED`
- Verify that free device/scenes widgets persist, render correctly, and behave well on tablet and phone breakpoints
- Verify Home widget/device card placement against real viewport size, not only anchor clamping
- Verify scene icon consistency across all scene surfaces after the `1.10.1` fixes
- Verify light marker hide/show and color consistency after the recent marker fixes
- Review vacuum state merging so UI/3D-only fields survive HA live updates where intended
- Remove single-vacuum assumptions from current-room sync and segment-map usage
- Investigate sequential room-clean commands where sending the robot to room B after finishing room A causes failed calls or sync drift

## Should Have

- Better agent workflow for recurring BJORQ tasks
- Stronger release hardening checklist before tags and patchnotes
- Cleaner workspace conventions around handoffs, logs, and labs
- Better mobile and tablet verification flow for the 3D-first UI
- Define a future integration strategy note for optional non-HA backends such as IKEA hub, without coupling current delivery to that work
- Decide what part of Asset Wizard should be treated as contract-critical versus optional enrichment
- Align per-device widget config with the newer free Home card model, or remove dead configuration paths
- Add an explicit project-management routine for roadmap, ideas, errors, fixes, and future integrations
- Design richer robot room-clean controls in the control panel, including per-room repeat count and multi-room run sequencing where HA/Roborock supports it

## Nice To Have

- Evaluate optional direct integration paths beyond Home Assistant, including IKEA hub ideas
- Create more BJORQ-specific agent briefs if recurring work patterns stabilize
- Separate future platform strategy notes for web, tablet, and phone
