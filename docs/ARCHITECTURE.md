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

## Current app entrypoint
`src/app.js` is now a coordinator only. It:
- boots the app state
- creates service instances
- wires the render orchestrator
- binds UI events
- triggers the first render

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
