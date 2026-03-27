# BJORQ Codex Ops

This folder is the project-specific operating system for future Codex work in BJORQ.

## Purpose

- keep agent work consistent across sessions
- avoid losing architectural context between chats
- keep planning, docs discipline, and delegation reusable

## Structure

- [`HANDOFF.md`](./HANDOFF.md): current live handoff between Codex sessions
- [`agents`](./agents/README.md): reusable briefs for delegated subagent work
- [`skills`](./skills/): local process skills for recurring BJORQ tasks
- [`planning`](./planning/MASTER-PLAN.md): priorities, backlog, issues, future ideas
- [`testing`](./testing/HOSTED-MOCK.md): local hosted verification harnesses and runtime checks
- [`release`](./release/DOCS-SYNC-CHECKLIST.md): release and docs-sync guardrails

## How To Use

1. Read `HANDOFF.md` and the relevant planning file before larger work.
2. If delegating, start from a brief in `agents/`.
3. If the task is documentation-heavy or planning-heavy, use the matching local skill in `skills/`.
4. Keep these files current when the project direction changes.
