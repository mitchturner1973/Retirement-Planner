# Retirement Planner

This version keeps the v12 UI working while moving the project toward a fuller pension-platform architecture.

## What changed

The app now has a rules-aware structure:

- `src/core` — maths and formatting helpers
- `src/domain` — source normalisation and domain-level object shaping
- `src/engines` — deterministic DC, DB, tax, allowance and projection engines
- `src/rules` — versioned UK rules packs by tax year
- `src/services` — rules registry and future recommendation layer
- `src/projection.js` — compatibility facade used by the UI
- `src/app.js` — current UI/rendering layer

## Current status

- UI remains largely unchanged from v12
- deterministic logic is now split into dedicated modules
- UK rules packs are versioned and can be extended tax-year by tax-year
- architecture now supports the next steps:
  - extracting `app.js` UI modules
  - adding scenario comparison services
  - adding richer UK rules coverage
  - building full household multi-source support

## Run locally

```bash
npm install
npm run serve
```

Then open `http://localhost:8000`.

## Logic-only test

```bash
npm run test:projection
```

## Important note

This is still a planning tool. It is not regulated personal advice. Keep legal/tax rule changes in the versioned rules packs and regression-test calculations when rules are updated.
