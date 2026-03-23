# Retirement Planner architecture

## Layers

### Core
Pure helpers with no pension-specific knowledge.
- `src/core/math.js`
- `src/core/formatters.js`
- `src/core/dates.js`

### Domain
Shapes raw app state into pension-domain objects.
- `src/domain/sourceNormaliser.js`

### Engines
Deterministic calculations only.
- `src/engines/dcEngine.js`
- `src/engines/dbEngine.js`
- `src/engines/taxEngine.js`
- `src/engines/projectionEngine.js`
- `src/engines/householdEngine.js`
- `src/engines/strategyEngine.js`
- `src/engines/strategyScorer.js`

### Rules
Versioned UK rule packs.
- tax bands
- lump sum allowance defaults
- annual allowance defaults
- state pension assumptions
- regulatory boundary wording

### Services
Application orchestration and non-visual workflows.
- `src/services/rulesRegistry.js`
- `src/services/renderOrchestrator.js`
- `src/services/decisionTimelineService.js`
- `src/services/scenarioStore.js`
- `src/services/modelSignature.js`
- `src/services/statusService.js`
- `src/services/monteCarloService.js`
- `src/services/inputState.js`
- `src/services/actionRecommendations.js`
- `src/services/scenarioActions.js`

### UI
Rendering and browser-facing interaction.
- `src/ui/overview.js`
- `src/ui/projectionTable.js`
- `src/ui/household.js`
- `src/ui/bridge.js`
- `src/ui/stress.js`
- `src/ui/monte.js`
- `src/ui/statusPanels.js`
- `src/ui/scenarios.js`
- `src/ui/report.js`
- `src/ui/navigation.js`
- `src/ui/feedback.js`
- `src/ui/editors/*`

### Controllers
Wiring between UI actions and services.
- `src/controllers/appEvents.js`

## Boundary
- engines calculate
- services orchestrate
- UI renders
- controllers bind user interaction
- future AI layer should explain scenarios, not own the maths

## Strategy flow
Strategy planning is a deterministic pipeline with clear hand-offs:
- `evaluateStrategies` in `strategyEngine` generates candidates and computes raw metrics.
- `scoreStrategies` in `strategyScorer` normalises metrics, applies selected priority-mode weights, applies watchout penalties, and returns ranked results.
- `buildDecisionTimeline` in `decisionTimelineService` converts the selected strategy actions into grouped age-based guidance.
- `renderStrategyTab` in the UI renders:
	- top strategy cards,
	- comparison table,
	- selected strategy watchouts,
	- compact "why this ranked" explainer (top weighted drivers + penalty deductions),
	- age-based timeline.

Current scorer outputs intentionally include explainability payloads (`dimensionScores`, `watchouts`, `penalties`, `rankingExplanation`) so UI can remain presentation-only.

## Current app entrypoint
`src/app.js` is now a coordinator only. It:
- boots the app state
- creates service instances
- wires the render orchestrator
- binds UI events
- triggers the first render

## DB Pension Enhancements (2025-26 rules pack)
Three features enable fine-tuned DB strategy planning:

### 1. Per-pension Normal Pension Age (NPA)
- DB pension editor card now accepts optional `npaAge` field (default: falls back to pension start age)
- If specified, overrides the pension start age used in DB timing strategy variants
- Allows strategies to test drawdown timing relative to multiple NPAs (e.g., final salary NPA 60, career avg NPA 65)
- Stored in app state; read from form via `data-db="npaAge"` attribute

### 2. Configurable DB Reduction & Deferral Factors
- Top Strategy section now includes two inputs:
  - DB Early Reduction %: compounded reduction factor for each year taken before NPA (default: 4%)
  - DB Deferral Increase %: compounded increase factor for each year deferred after NPA (default: 5%)
- Applied via `dbReductionFactor(takeAge, npa, earlyReductionPct, deferralIncreasePct)` in `strategyEngine.js`
- Factors are applied to all candidate DB timing strategies during `evaluateStrategies`
- Validated on input: 0–15% range with warnings outside it

### 3. DB Timing Column in Strategy Comparison
- Decision timeline now includes DB timing column in strategy comparison table
- Displays each DB pension start age with context (early, at NPA, deferred+years)
- Formatted via `formatDbTimingCell(dbPensions)` in `decisionTimelineService.js`
- Column appears between summary and figures for quick strategy timing comparison

### Related Changes to Input State
- `src/state/defaults.js`: Added `dbEarlyReductionPct` and `dbDeferralIncreasePct`
- `src/services/inputState.js`: Reads/writes DB factor inputs from form
- `src/validation/inputValidation.js`: Validates NPA (40–100) and DB factors (0–15%)
- `src/engines/strategyEngine.js`: `getCandidateStrategies` now reads per-pension NPA and applies timing variants with user-configured factors

## UI Density Improvements
Strategy comparison and control area have been visually compacted to optimize screen real estate:

### Strategy Table Compaction
- Summary text now clamped to 3 lines (`-webkit-line-clamp: 3`)  
- Numeric columns use `white-space: nowrap` to prevent wrapping
- DB timing column: fixed width 150px–190px with line-height 1.3

### Strategy Controls Grid Redesign
- Changed from responsive `auto-fit` wrapping to fixed 5-column grid on desktop
- Responsive breakpoints ensure proper wrapping on smaller screens:
  - 1200px and below: 3-column grid
  - 980px and below: 2-column grid
  - 640px and below: 1-column (full width)
- Field heights reduced from 40px to 36px; label font-size from 11px to 10.5px; gaps from 10px to 8px
- Allows Strategy table to occupy more vertical space while keeping all controls accessible

## Latest cleanup step
The remaining bulky logic has been extracted from `app.js` into dedicated modules for:
- model signatures
- Monte Carlo execution
- status scoring
- input read/write and spouse-field visibility
- action recommendations
- scenario save/import/export/report actions
- toast and badge UI feedback

That leaves `app.js` as a thin bootstrap layer instead of a monolith.
