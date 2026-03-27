# BJORQ Agent Guide

## Scope

This file applies to the repo at `01 - BjorQ dashboard/00 - Active repo/bjorq-git`.

## Core Working Rules

- Use Swedish when the user writes Swedish.
- Treat this repo as the canonical product repo for BJORQ.
- Treat `Codex-Frontend` in the workspace root as archived handoff context, not as the live app.
- Treat `02 - bjorq asset wizard/bjorq-asset-wizard` as a separate but tightly coupled side project for 3D optimization and catalog sync into BJORQ.
- Read [`codex/README.md`](./codex/README.md) before larger architecture, planning, review, or documentation tasks.

## Product Guardrails

- BJORQ is a 3D smart home dashboard, not a generic admin panel.
- `Home` stays `3D-first`.
- Keep focus on web first, but do not break the future path for tablet and phone.
- Preserve the DEV vs HOSTED mental model when debugging, refactoring, or reviewing.
- Home Assistant sync, hosted persistence, Wizard integration, and vacuum flows are high-risk areas.

## Agent Workflow

- Main agent keeps ownership of scope, synthesis, and final decisions.
- For delegated work, use the project briefs in [`codex/agents`](./codex/agents/README.md).
- For recurring process tasks, use the local skills in [`codex/skills`](./codex/skills/).

## Documentation Discipline

- If versioned behavior, onboarding, setup, release content, or user-facing flows change, update the relevant docs in the same pass.
- Always check [`codex/release/DOCS-SYNC-CHECKLIST.md`](./codex/release/DOCS-SYNC-CHECKLIST.md) before closing work that changes product behavior.
- Keep `README.md`, `ONBOARDING.md`, `QUICK-START.txt`, `CHANGELOG.md`, and patchnotes aligned with reality.

## Planning Discipline

- Keep active priorities in [`codex/planning/MASTER-PLAN.md`](./codex/planning/MASTER-PLAN.md).
- Put candidate work in [`codex/planning/BACKLOG.md`](./codex/planning/BACKLOG.md).
- Track concrete bugs, risks, and fixes in [`codex/planning/ISSUES-AND-FIXES.md`](./codex/planning/ISSUES-AND-FIXES.md).
