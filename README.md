# Retirement Planner

Retirement Planner is a browser-based UK retirement modelling tool for exploring drawdown, pension income, lump sums, household outcomes and retirement strategy trade-offs in today's money.

It is designed as a deterministic planning tool with supporting stress tests and Monte Carlo context. It is not regulated financial advice.

## Current capabilities

- deterministic retirement projection engine for DC, DB, State Pension and other taxable income
- support for multiple DC pensions, DB pensions, extra contributions and one-off DC lump sums
- tax-aware handling of PCLS, UFPLS and remaining TFLS / Lump Sum Allowance
- strategy comparison with priority modes, target-aware scoring and risk watchouts
- retirement decision timeline for the selected strategy
- household mode for combined retirement income and pot views
- early-retirement bridge modelling
- stress testing and Monte Carlo scenario analysis
- scenario save/load workflows and PDF-style report export
- versioned UK rules packs by tax year

## Recent highlights

- deterministic logic is now split into dedicated engines instead of being concentrated in one large UI file
- strategy comparison now includes clearer retirement metrics, baseline deltas and better candidate gating
- strategy scoring now uses six dimensions (tax efficiency, sustainability, smoothness, flexibility, guaranteed-income strength, pot efficiency)
- strategy ranking supports user-selected priority modes and target thresholds from the Strategy tab
- selected strategy cards now include a compact "why this ranked" explainer with top weighted drivers and any penalty deductions
- DC ordering logic now applies across all DC pots, including the current workplace pension
- strategy decision timelines avoid duplicate drawdown actions and better reflect actual plan behaviour
- app wiring is now more modular, with controllers, services, UI modules and rules separated cleanly

## Project structure

- `src/core` — maths, date and formatting helpers
- `src/domain` — source normalisation and domain object shaping
- `src/engines` — deterministic DC, DB, tax, strategy, household and projection engines
- `src/rules` — versioned UK rules packs by tax year
- `src/services` — orchestration, rules registry, scenarios, Monte Carlo, status and recommendations
- `src/ui` — browser-facing rendering modules
- `src/controllers` — event wiring between the UI and services
- `src/projection.js` — compatibility facade used by the current app
- `src/app.js` — app bootstrap and coordinator

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a fuller architecture breakdown.

## Run locally

```bash
npm install
npm run serve
```

Then open `http://localhost:8000`.

## Tests

Run the full logic regression suite:

```bash
npm run test:logic
```

Run focused suites when needed:

```bash
npm run test:projection
npm run test:rules
npm run test:household
```

Manual regression notes live in [test-cases.md](test-cases.md).

## Deploying to Cloudflare Pages

Cloudflare Pages expects a dedicated output directory. Generate the static bundle with:

```bash
npm run build:public
```

This copies `index.html`, `styles/`, `src/` and any optional asset folders into `/public`. In the Cloudflare Pages settings, use `npm run build:public` as the build command and `public` as the output directory.

## Notes

- all values are modelled in today's money unless noted otherwise
- tax and pension rules should be updated in the versioned UK rules packs, not hard-coded into UI logic
- strategy scores are relative to the current candidate set, not absolute measures of plan quality
- watchout penalties reduce balanced score when income cliffs, low flexibility buffers, concentrated drawdown or similar risks are detected
- if you want a chronological release history, add a separate `CHANGELOG.md`; the README should stay focused on what the app is and how to use it

## Important note

This is a planning and comparison tool only. It does not provide regulated personal advice, suitability assessments or provider-specific pension instructions.
