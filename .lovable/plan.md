

## Fix: arm64 QEMU "Illegal instruction" crash

**Problem:** `node:20-alpine` uses musl libc which triggers illegal instruction errors under QEMU emulation for arm64/armv7. Switching to a glibc-based slim image resolves this.

### Changes

**`bjorq_dashboard/Dockerfile.runtime`**
- Change base image from `node:20-alpine` to `node:20-bookworm-slim`

**`.github/workflows/ha-addon-build.yml`**
- Already has `docker/setup-qemu-action@v3` and `docker/setup-buildx-action@v3` — no changes needed there.

That's it — single line change in the Dockerfile.

