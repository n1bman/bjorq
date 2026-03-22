# Release and Patchnotes

This document defines how BJORQ should document releases from now on.

The goal is simple:
- every version should be traceable
- every release should explain what changed
- patchnotes should be useful during Home Assistant add-on testing, not just after release

## Source of truth

Use both of these files on every release:

- `CHANGELOG.md`
- `docs/patchnotes-vX.Y.Z.md`

They have different jobs:

- `CHANGELOG.md` is short, cumulative, and structured for the repository.
- `patchnotes-vX.Y.Z.md` is the human-friendly release note for that specific version.

## Release workflow

For each new version:

1. Bump the version in:
   - `package.json`
   - `server/package.json`
   - `bjorq_dashboard/config.yaml`
   - lockfiles if needed
2. Add a new entry at the top of `CHANGELOG.md`.
3. Create a new file named `docs/patchnotes-vX.Y.Z.md`.
4. Fill the patchnotes from the template in `docs/patchnotes-template.md`.
5. List what was actually verified in the real target environment.
6. If anything is intentionally not verified yet, write that explicitly under known gaps or follow-up testing.

## Writing rules

Patchnotes should answer five things clearly:

1. What is this release trying to improve?
2. What changed for the user?
3. What changed technically?
4. What was actually tested?
5. What should still be tested after release?

Keep them:
- specific
- honest
- versioned
- easy to scan

Avoid:
- vague marketing text
- repeating the same sentence in changelog and patchnotes
- listing ideas that were never implemented
- hiding incomplete verification

## Recommended patchnotes structure

Use this order:

1. Summary
2. User-visible changes
3. Technical changes
4. Verified
5. Recommended follow-up testing

If relevant, add:
- Known limitations
- Upgrade notes

## Changelog rules

`CHANGELOG.md` should stay short and repository-focused.

Good changelog entries:
- mention the version and date
- group changes under `Added`, `Changed`, `Fixed`, `Verified`, or `Preserved`
- keep descriptions shorter than the dedicated patchnotes file

## Testing notes

When a release is mainly for Home Assistant add-on testing:
- say so directly
- prefer add-on verification over desktop assumptions
- still note if the implementation is meant to apply equally to Windows and Linux hosted mode

## Practical rule for BJORQ

If a change affects:
- auth
- hosted sync
- backup/import
- settings structure
- camera/standby behavior

then the patchnotes should always include a short `Verified` or `Still to test` section for that area.
