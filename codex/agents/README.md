# BJORQ Agent Briefs

These files are reusable delegation briefs for future Codex runs.

## Recommended Use

- Use the built-in Codex subagent role that best matches the task.
- Copy the relevant BJORQ brief into the delegated prompt so the worker gets project-specific context fast.
- Keep write ownership narrow when delegating implementation.

## Available Briefs

- [`bjorq-doc-sync-agent.md`](./bjorq-doc-sync-agent.md): update versioned and user-facing docs
- [`bjorq-project-planner-agent.md`](./bjorq-project-planner-agent.md): maintain roadmap, backlog, priorities, and decisions
- [`bjorq-system-integrator-agent.md`](./bjorq-system-integrator-agent.md): guard DEV/HOSTED, HA sync, persistence, and Wizard boundaries

## Typical Built-In Role Pairings

- `documentation-engineer` + `bjorq-doc-sync-agent.md`
- `project-manager` or `product-manager` + `bjorq-project-planner-agent.md`
- `backend-developer`, `websocket-engineer`, `iot-engineer`, or `reviewer` + `bjorq-system-integrator-agent.md`
