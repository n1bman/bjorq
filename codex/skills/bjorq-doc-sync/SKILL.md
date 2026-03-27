---
name: bjorq-doc-sync
description: Keep BJORQ documentation, version references, onboarding text, quick-start notes, changelog entries, and patchnotes aligned with the current implementation. Use when code changes affect user-facing behavior, setup, release content, hosted/dev behavior, Home Assistant integration, Wizard integration, or versioned product messaging.
---

# BJORQ Doc Sync

Use the codebase as the source of truth.

## Update Flow

1. Read `package.json` for the current version.
2. Read the changed code paths before editing docs.
3. Update only the docs touched by the behavior change.
4. Check `codex/release/DOCS-SYNC-CHECKLIST.md` before finishing.

## Priority Files

- `README.md`
- `ONBOARDING.md`
- `QUICK-START.txt`
- `CHANGELOG.md`
- `docs/01-overview.md`
- `docs/08-developer-notes.md`
- `docs/10-release-and-patchnotes.md`
- current patchnotes file in `docs/`

## Rules

- Do not claim a feature is shipped unless the code supports it.
- Keep setup steps short and concrete.
- If a change is internal only, avoid noisy doc edits.
- If release behavior changed, update both changelog and patchnotes.
