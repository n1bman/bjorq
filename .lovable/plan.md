

# Plan: Restore Missing Config Files to Fix Build

## Root Cause

The `vite.config.ts` and `tsconfig.json`/`tsconfig.app.json` files are missing from the project. Without these, the `@/` path alias used throughout the codebase (e.g., `@/components/ui/toaster`) cannot be resolved by Vite, causing the build failure.

## Changes

### 1. Create `vite.config.ts`
Standard Vite config with:
- `@vitejs/plugin-react-swc` plugin
- Path alias: `@` → `./src`
- `lovable-tagger` componentTagger plugin (already a devDependency)

### 2. Create `tsconfig.json`
Root tsconfig that references `tsconfig.app.json` and `tsconfig.node.json`.

### 3. Create `tsconfig.app.json`
TypeScript config for the app with:
- `baseUrl: "."`
- `paths: { "@/*": ["./src/*"] }`
- Standard React/Vite compiler options

### 4. Create `tsconfig.node.json`
Minimal config for Vite config file itself.

These are standard Lovable project scaffolding files that were accidentally deleted.

