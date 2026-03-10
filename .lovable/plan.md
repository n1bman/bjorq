

# Fix: backups.js crashes server — missing package.json in Docker

## Problem

In the last update, `backups.js` was changed to dynamically read the version from `../../package.json` using `import.meta.url`. This resolves to `/app/package.json` inside the Docker container. But the Dockerfile only copies `dist/` and `server/` — **not** `package.json`. The server crashes on startup because the import fails at module load time.

## Solution

Hardcode the version string in `backups.js` instead of reading from `package.json`. This is the simplest and most reliable fix — no file path issues in any environment (Docker, HA Add-on, local dev).

### `server/api/backups.js`

Remove the `readFileSync` + `import.meta.url` approach. Replace with:

```javascript
const APP_VERSION = '1.0.0';
```

And use `APP_VERSION` in the backup metadata instead of `pkg.version`.

Alternatively, we could copy `package.json` into the Docker image, but that's unnecessary bloat for a single version string.

### Files changed

| File | Change |
|------|--------|
| `server/api/backups.js` | Replace dynamic `package.json` read with hardcoded version constant |

