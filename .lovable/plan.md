

## Plan: Fix Start Scripts — `npm ci` → `npm install`

### Problem
Both `start.bat` and `start.sh` use `npm ci --omit=dev` to install server dependencies. `npm ci` requires a `package-lock.json` which isn't present in the server folder of release zips, causing immediate failure on Windows.

### Changes (3 files)

**`start.bat`** (line 24)
- Change `call npm ci --omit=dev` → `call npm install --omit=dev`
- Add error check after install: if `%errorlevel% neq 0` echo error + pause + exit
- Use `%PORT%` variable (default 3000) in the URL output, matching start.sh behavior

**`start.sh`** (line 20)
- Change `npm ci --omit=dev` → `npm install --omit=dev`
- Add error check: if install fails, echo error and exit

**No workflow changes needed** — `release.yml` already copies the entire `server/` folder via `cp -r server`. The fix is purely making the scripts tolerant of missing lockfile.

