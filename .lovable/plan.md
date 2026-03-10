

# Bump to v1.0.1 — Bugfix release

## Changes

Bump version from `1.0.0` to `1.0.1` in all relevant files and add a CHANGELOG entry for the backups.js crash fix.

### Files to update

| File | Change |
|------|--------|
| `package.json` | `"version": "1.0.1"` |
| `bjorq_dashboard/config.yaml` | `version: "1.0.1"` |
| `server/api/backups.js` | `APP_VERSION = '1.0.1'` |
| `README.md` | Badge `1.0.1` |
| `bjorq_dashboard/README.md` | Badge `1.0.1` |
| `CHANGELOG.md` | New `[1.0.1]` entry above `[1.0.0]` |

### CHANGELOG entry

```markdown
## [1.0.1] - 2026-03-10

### Fixed
- **Server crash in Docker** — `backups.js` attempted to read `package.json` via `import.meta.url`, which doesn't exist in the runtime Docker image. Replaced with hardcoded version constant.
```

