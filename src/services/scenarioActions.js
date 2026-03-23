import { loadScenarios, saveScenarios, scenarioId } from './scenarioStore.js';

const AUTO_INPUTS_KEY = 'rp_inputs_autosave_v1';

export function createScenarioActions({ readState, setInputsFromState, renderAll, defaults, toast, document, window, renderReport }) {
  function saveAutoInputs(state = readState()) {
    try {
      window.localStorage.setItem(AUTO_INPUTS_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function clearAutoSavedInputs() {
    try {
      window.localStorage.removeItem(AUTO_INPUTS_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function restoreAutoSavedInputs() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(AUTO_INPUTS_KEY);
      if (!raw) return { restored: false, reason: 'none' };
      const parsed = JSON.parse(raw);
      setInputsFromState({ ...defaults, ...parsed });
      return { restored: true, reason: 'ok' };
    } catch {
      if (raw) {
        clearAutoSavedInputs();
        return { restored: false, reason: 'corrupt' };
      }
      return { restored: false, reason: 'error' };
    }
  }

  function resetInputsToDefaults() {
    if (!window.confirm('Reset all current inputs to defaults?')) return;
    setInputsFromState(defaults);
    saveAutoInputs(defaults);
    renderAll(true);
    toast('warn', 'Inputs reset', 'Defaults restored');
  }

  function saveCurrentScenario(asNew = true) {
    const state = readState();
    const list = loadScenarios();
    const name = window.prompt('Scenario name', asNew ? 'New scenario' : 'Scenario');
    if (!name) return;
    list.unshift({ id: scenarioId(), name, createdAt: Date.now(), updatedAt: Date.now(), inputs: state });
    saveScenarios(list);
    renderAll(false);
    toast('good', 'Scenario saved', name);
  }

  function clearScenarios() {
    if (!window.confirm('Clear all saved scenarios?')) return;
    saveScenarios([]);
    renderAll(false);
    toast('warn', 'Cleared scenarios', '');
  }

  function exportInputs() {
    const blob = new Blob([JSON.stringify(readState(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'retirement-planner-inputs.json';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('good', 'Exported inputs', 'retirement-planner-inputs.json');
  }

  async function importInputs(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = { ...defaults, ...JSON.parse(await file.text()) };
      setInputsFromState(imported);
      saveAutoInputs(imported);
      renderAll(true);
      toast('good', 'Imported inputs', '');
      event.target.value = '';
    } catch {
      toast('bad', 'Could not load JSON', '');
    }
  }

  function exportReport() {
    const computed = renderAll(false);
    renderReport(computed.s, computed);
    toast('good', 'Report ready', 'Print dialog will open');
    window.setTimeout(() => window.print(), 250);
  }

  return {
    saveCurrentScenario,
    clearScenarios,
    exportInputs,
    importInputs,
    exportReport,
    saveAutoInputs,
    clearAutoSavedInputs,
    restoreAutoSavedInputs,
    resetInputsToDefaults,
  };
}
