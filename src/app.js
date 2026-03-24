import { loadScenarios, saveScenarios } from './services/scenarioStore.js';
import { calcProjection, calcBridge } from './projection.js';
import { defaults } from './state/defaults.js';
import { createInitialAppState } from './state/appState.js';
import { validateState } from './validation/inputValidation.js';
import { renderValidationSummary } from './ui/validation.js';
import { $, fmtGBP, fmtNum, fmtPct, numVal, escapeHtml, escapeHtmlAttr, newId, nowTime } from './ui/dom.js';
import { drawLineChart, drawBands } from './ui/charts.js';
import { createEditorHelpers } from './ui/editors/index.js';
import { calcHouseholdProjection } from './engines/householdEngine.js';
import { renderOverviewDashboard } from './ui/overview.js';
import { renderProjectionTable } from './ui/projectionTable.js';
import { evaluateStrategies } from './engines/strategyEngine.js';
import { scoreStrategies } from './engines/strategyScorer.js';
import { buildDecisionTimeline } from './services/decisionTimelineService.js';
import { renderStrategyTab } from './ui/decisionTimeline.js';
import { renderHouseholdSummary, renderHouseholdTab } from './ui/household.js';
import { createRenderOrchestrator } from './services/renderOrchestrator.js';
import { createNavigationController } from './ui/navigation.js';
import { bindAppEvents } from './controllers/appEvents.js';
import { createBridgeRenderer } from './ui/bridge.js';
import { createStressRenderer } from './ui/stress.js';
import { createStatusPanelRenderer } from './ui/statusPanels.js';
import { createScenariosRenderer } from './ui/scenarios.js';
import { createMonteRenderer } from './ui/monte.js';
import { createReportRenderer } from './ui/report.js';
import { badge, createToast } from './ui/feedback.js';
import { buildModelSignature } from './services/modelSignature.js';
import { runMonteCarloAsync } from './services/monteCarloService.js';
import { statusFromScore, computeStressStatus, computeBridgeStatus, computeOverall } from './services/statusService.js';
import { createInputStateManager } from './services/inputState.js';
import { createActionRecommendationService } from './services/actionRecommendations.js';
import { createScenarioActions } from './services/scenarioActions.js';
import { buildProjectionViewModel } from './services/projectionViewModel.js';
import { buildOverviewViewModel } from './services/overviewViewModel.js';
import { buildStressScenarioResults, buildMonteInterpretation } from './services/riskResilienceService.js';

(function bootstrap() {
  const app = createInitialAppState();
  window.__RP_APP = app;
  const toast = createToast({ getEl: $, window });

  const editors = createEditorHelpers({
    getEl: $, readState: () => inputState.readState(), numVal, escapeHtml, escapeHtmlAttr, newId,
  });

  const inputState = createInputStateManager({
    getEl: $, defaults, renderRepeaters: editors.renderRepeaters,
    editorReaders: {
      readDcPensionsEditor: editors.readDcPensionsEditor,
      readDbPensionsEditor: editors.readDbPensionsEditor,
      readContribEventsEditor: editors.readContribEventsEditor,
      readLumpSumEventsEditor: editors.readLumpSumEventsEditor,
      getEditorCollections: editors.getEditorCollections,
    },
  });

  const navigation = createNavigationController({ getEl: $, document, window, onOpenMonte: () => renderAll(false) });
  const renderBridge = createBridgeRenderer({ getEl: $, calcBridge, drawLineChart, fmtGBP });
  const renderStress = createStressRenderer({ getEl: $, calcProjection, computeStressStatus, badge, drawLineChart, fmtGBP });

  const suggestLevers = createActionRecommendationService({
    readState: inputState.readState,
    setInputsFromState: inputState.setInputsFromState,
    renderAll: (...args) => renderAll(...args),
    calcBridge,
    calcProjection,
    fmtGBP,
  });

  const { updateFreshness, renderOverallAndActions } = createStatusPanelRenderer({
    app,
    getEl: $,
    nowTime,
    computeOverall,
    badge,
    suggestLevers,
    getRiskSummary: () => app.riskSummary || null,
    document,
    toast,
  });

  const { renderMonte } = createMonteRenderer({
    document,
    app,
    getEl: $,
    fmtNum,
    fmtPct,
    fmtGBP,
    runMonteCarloAsync: (state, onProgress, onDone) => runMonteCarloAsync(app, state, onProgress, onDone),
    statusFromScore,
    drawBands,
    toast,
    updateFreshness,
    badge,
    buildMonteInterpretation,
  });

  const renderReport = createReportRenderer({ getEl: $, fmtGBP, badge, app });

  const renderAll = createRenderOrchestrator({
    getState: inputState.readState,
    defaults,
    loadScenarios,
    toggleSpouseFields: inputState.toggleSpouseFields,
    validateState,
    app,
    renderValidationSummary: (validation) => renderValidationSummary($, validation),
    getEl: $,
    calcProjection,
    buildHouseholdProjection: calcHouseholdProjection,
    buildOverviewViewModel,
    renderOverviewDashboard: (model) => renderOverviewDashboard({ getEl: $, fmtGBP }, model),
    renderHouseholdSummary: (state, household) => renderHouseholdSummary({ getEl: $, fmtGBP }, state, household),
    renderHouseholdTab: (state, household) => renderHouseholdTab({ getEl: $, fmtGBP, drawLineChart }, state, household),
    drawLineChart,
    buildProjectionViewModel,
    renderProjectionTable: (base) => renderProjectionTable({ getEl: $, fmtGBP, app, rerender: () => renderAll(false) }, base),
    evaluateStrategies,
    scoreStrategies,
    buildDecisionTimeline,
    renderStrategyTab: (bundle) => renderStrategyTab({ getEl: $, fmtGBP, badge }, bundle),
    renderStress,
    buildStressScenarioResults,
    buildMonteInterpretation,
    renderBridge,
    computeBridgeStatus,
    statusFromScore,
    buildModelSignature,
    computeOverall,
    renderOverallAndActions,
    updateFreshness,
    renderScenariosUI: (...args) => scenariosRenderer.renderScenariosUI(...args),
    renderMonte,
    fmtGBP,
    badge,
  });

  const scenariosRenderer = createScenariosRenderer({
    app,
    getEl: $,
    defaults,
    loadScenarios,
    saveScenarios,
    readState: inputState.readState,
    setInputsFromState: inputState.setInputsFromState,
    renderAll: (...args) => renderAll(...args),
    toast,
    calcProjection,
    calcBridge,
    computeStressStatus,
    computeBridgeStatus,
    statusFromScore,
    computeOverall,
    fmtGBP,
    badge,
    buildModelSignature,
    appMc: app.mc,
  });

  const scenarioActions = createScenarioActions({
    readState: inputState.readState,
    setInputsFromState: inputState.setInputsFromState,
    renderAll: (...args) => renderAll(...args),
    defaults,
    toast,
    document,
    window,
    renderReport,
  });

  const autoRestore = scenarioActions.restoreAutoSavedInputs();

  bindAppEvents({
    getEl: $,
    document,
    window,
    setView: navigation.setView,
    bindNavigation: navigation.bindNavigation,
    renderAll,
    syncDerivedAgeInputs: inputState.syncDerivedAgeInputs,
    setInputsFromState: inputState.setInputsFromState,
    readState: inputState.readState,
    defaults,
    readDcPensionsEditor: editors.readDcPensionsEditor,
    readDbPensionsEditor: editors.readDbPensionsEditor,
    readContribEventsEditor: editors.readContribEventsEditor,
    readLumpSumEventsEditor: editors.readLumpSumEventsEditor,
    renderDcPensionsEditor: editors.renderDcPensionsEditor,
    renderDbPensionsEditor: editors.renderDbPensionsEditor,
    renderContribEventsEditor: editors.renderContribEventsEditor,
    renderLumpSumEventsEditor: editors.renderLumpSumEventsEditor,
    newId,
    toast,
    nowTime,
    saveCurrentScenario: scenarioActions.saveCurrentScenario,
    clearScenarios: scenarioActions.clearScenarios,
    exportInputs: scenarioActions.exportInputs,
    importInputs: scenarioActions.importInputs,
    exportReport: scenarioActions.exportReport,
    saveAutoInputs: scenarioActions.saveAutoInputs,
    resetInputsToDefaults: scenarioActions.resetInputsToDefaults,
  });

  if (!autoRestore.restored) {
    inputState.setInputsFromState(defaults);
  }
  inputState.syncDerivedAgeInputs($, 'main');
  inputState.syncDerivedAgeInputs($, 'spouse');
  renderAll(false);
  if (autoRestore.reason === 'corrupt') {
    toast('warn', 'Ready', 'Saved inputs were corrupted and were reset safely');
  } else {
    toast('good', 'Ready', autoRestore.restored ? 'Restored your last inputs automatically' : 'Update inputs, then Recalculate');
  }
}());
