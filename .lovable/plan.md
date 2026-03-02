

## Analysis: armv7 Build Failure

The error from GitHub Actions is:
```
buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

**Root cause:** The `npm run build` (Vite build) runs during the Docker image build stage. On armv7 (32-bit ARM), this runs under QEMU emulation which is extremely slow and memory-constrained. The Vite/esbuild/SWC toolchain commonly fails on emulated armv7 due to:
1. Memory limits (OOM during bundling)
2. Missing native binaries for armv7 in esbuild/SWC

**The fix:** Since the frontend build output (`dist/`) is pure static HTML/JS/CSS and is architecture-independent, we should build it only once on amd64 and then copy the result into all arch-specific runtime images. This is both faster and avoids the emulation problem entirely.

### Plan: Split workflow into two jobs

**`.github/workflows/ha-addon-build.yml`** — restructure:

1. **Job 1: `build-frontend`** (runs on ubuntu-latest, native amd64)
   - Checkout, `npm install`, `npm run build`
   - Upload `dist/` as a workflow artifact

2. **Job 2: `package`** (matrix: amd64, aarch64, armv7, depends on `build-frontend`)
   - Download the `dist/` artifact
   - Use a simplified Dockerfile that skips the frontend build stage — just copies pre-built `dist/` + `server/` into the runtime image
   - Build + push to GHCR per arch

**`bjorq_dashboard/Dockerfile.runtime`** (new, minimal — no build stage):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY dist/ ./dist/
COPY server/ ./server/
RUN cd server && npm install --omit=dev
ENV PORT=3000
ENV BJORQ_DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server/server.js"]
```

The existing `bjorq_dashboard/Dockerfile` stays for local builds. The workflow uses the new runtime-only Dockerfile.

### Files changed

| File | Action |
|------|--------|
| `.github/workflows/ha-addon-build.yml` | Rewrite: 2-job pipeline |
| `bjorq_dashboard/Dockerfile.runtime` | Create: runtime-only image |

No version bump needed — this is a CI-only fix. Re-run the tag or use `workflow_dispatch` to test.

