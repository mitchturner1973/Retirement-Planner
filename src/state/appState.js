export function createInitialAppState() {
  return {
    lastUpdatedAt: null,
    lastMonteAt: null,
    mc: {running:false, progress:0, total:0, done:0, lastKey:null, result:null, cancel:false},
    comparePicked: [],
    validation: {errors:[], warnings:[], infos:[]},
    strategySelectedId: null,
    strategyPriorityMode: 'balanced',
    projectionViewMode: 'detailed',
    projectionRange: 'all',
    projectionExpandedAge: null,
    projectionPersonView: 'primary',
  };
}
