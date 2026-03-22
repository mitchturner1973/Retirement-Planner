import { loadScenarios, saveScenarios } from './services/scenarioStore.js';
import { calcProjection, calcBridge } from './projection.js';
import { defaults } from './state/defaults.js';
import { createInitialAppState } from './state/appState.js';
import { validateState } from './validation/inputValidation.js';
import { renderValidationSummary } from './ui/validation.js';
import { $, fmtGBP, fmtNum, fmtPct, numVal, escapeHtml, escapeHtmlAttr, newId, nowTime } from './ui/dom.js';
import { drawLineChart, drawBarBreakdown, drawBands } from './ui/charts.js';
import { createEditorHelpers } from './ui/editors/index.js';
import { calcHouseholdProjection } from './engines/householdEngine.js';
import { renderOverviewKpis, renderRetirementLumpSumCard } from './ui/overview.js';
import { renderProjectionTable } from './ui/projectionTable.js';
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

(function bootstrap() {
  const app = createInitialAppState();
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
    },
  });

  const navigation = createNavigationController({ getEl: $, document, window, onOpenMonte: () => renderAll(false) });
  const renderBridge = createBridgeRenderer({ getEl: $, calcBridge, drawLineChart, fmtGBP });
  const renderStress = createStressRenderer({ getEl: $, calcProjection, computeStressStatus, badge, drawLineChart });

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
  });

  const renderReport = createReportRenderer({ getEl: $, fmtGBP, badge, app });

  const renderAll = createRenderOrchestrator({
    getState: inputState.readState,
    toggleSpouseFields: inputState.toggleSpouseFields,
    validateState,
    app,
    renderValidationSummary: (validation) => renderValidationSummary($, validation),
    getEl: $,
    calcProjection,
    buildHouseholdProjection: calcHouseholdProjection,
    renderOverviewKpis: (base, state) => renderOverviewKpis({ getEl: $, fmtGBP }, base, state),
    renderHouseholdSummary: (state, household) => renderHouseholdSummary({ getEl: $, fmtGBP }, state, household),
    renderHouseholdTab: (state, household) => renderHouseholdTab({ getEl: $, fmtGBP, drawLineChart }, state, household),
    drawLineChart,
    drawBarBreakdown,
    renderRetirementLumpSumCard: (base) => renderRetirementLumpSumCard({ getEl: $, fmtGBP }, base),
    renderProjectionTable: (base) => renderProjectionTable({ getEl: $, fmtGBP }, base),
    renderStress,
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
  });

  inputState.setInputsFromState(defaults);
  inputState.syncDerivedAgeInputs($, 'main');
  inputState.syncDerivedAgeInputs($, 'spouse');
  renderAll(false);
  toast('good', 'Ready', 'Update inputs, then Recalculate');
}());
