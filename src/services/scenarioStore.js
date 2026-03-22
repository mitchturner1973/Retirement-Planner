const SC_KEY='rp_scenarios_v1';

export function loadScenarios(storage = window.localStorage){
  try { return JSON.parse(storage.getItem(SC_KEY) || '[]'); }
  catch { return []; }
}

export function saveScenarios(list, storage = window.localStorage){
  storage.setItem(SC_KEY, JSON.stringify(list));
}

export function scenarioId(){
  return 'sc_'+Math.random().toString(36).slice(2,10)+'_'+Date.now().toString(36);
}

export { SC_KEY };
