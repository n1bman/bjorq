

## Plan: Fix Release Build — Lockfile Sync + Fallback

### Root Cause
The `package-lock.json` gets out of sync in Lovable's environment because dependency edits don't always regenerate it properly. `npm ci` is strict and fails on any mismatch.

### Fix: Use `npm install` as safe fallback in workflow

Since we cannot reliably regenerate `package-lock.json` from Lovable's environment, the pragmatic fix is to switch the workflow to `npm install --ignore-scripts` temporarily. This still installs exact versions from the lockfile when possible but tolerates minor mismatches. Once we see a green release, we can switch back to `npm ci`.

### Changes

**`.github/workflows/release.yml`** (1 line change)
- Line 23: Change `npm ci` to `npm install`
- This is the only blocker — the rest of the workflow (build, zip, upload) is correct

**`package.json`** (1 line change)  
- Bump version to `"0.1.2"` so we have a fresh tag to use

### Files modified (2)
- `.github/workflows/release.yml` — `npm install` instead of `npm ci`
- `package.json` — version bump to 0.1.2

### README and start scripts
Already updated in previous iteration — no changes needed.

### Release Checklist (for you after merge)
1. Push changes to `main`
2. Create tag: `git tag v0.1.2 && git push origin v0.1.2`
3. Go to Actions tab — verify workflow passes
4. Go to Releases — verify both zip files appear under Assets
5. Download a zip, extract, run `start.bat` or `./start.sh`
6. Open `http://localhost:3000`

Once green, we switch back to `npm ci` in a follow-up commit.

