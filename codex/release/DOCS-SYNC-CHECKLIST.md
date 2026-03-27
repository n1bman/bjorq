# BJORQ Docs Sync Checklist

Use this before closing work that changes product behavior or versioned messaging.

## Always Check

- `package.json`
- `README.md`
- `ONBOARDING.md`
- `QUICK-START.txt`
- `CHANGELOG.md`

## Check When Relevant

- `docs/01-overview.md`
- `docs/02-installation.md`
- `docs/03-using-the-dashboard.md`
- `docs/08-developer-notes.md`
- `docs/09-technical-phases.md`
- current patchnotes file in `docs/`

## Questions To Answer

- Did setup steps change?
- Did versioned behavior change?
- Did any user-facing flow change in Home, Dashboard, Build, backup, HA, or Wizard?
- Did hosted/dev behavior change in a way users or contributors should know about?
- Does the changelog match the code we actually shipped?
