

# Plan: Restore Missing PostCSS Config

## Root Cause

The project is missing `postcss.config.js`. Tailwind CSS requires PostCSS to process `@tailwind` directives in `index.css`. Without this config file, Vite cannot transform the CSS, resulting in a white screen with no visible errors.

This file was likely lost during earlier edits when config files were accidentally deleted.

## Change

### Create `postcss.config.js`

Standard Lovable/Tailwind PostCSS config:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

This single file should restore the entire app — all other files (vite.config.ts, tsconfig, index.css, App.tsx, store, etc.) are intact and correct.

