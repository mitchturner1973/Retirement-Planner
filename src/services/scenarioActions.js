import { loadScenarios, saveScenarios, scenarioId } from './scenarioStore.js';

export function createScenarioActions({ readState, setInputsFromState, renderAll, defaults, toast, document, window, renderReport }) {
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
      setInputsFromState({ ...defaults, ...JSON.parse(await file.text()) });
      renderAll(true);
      toast('good', 'Imported inputs', '');
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

  return { saveCurrentScenario, clearScenarios, exportInputs, importInputs, exportReport };
}
