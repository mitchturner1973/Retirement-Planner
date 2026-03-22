export function normaliseSourceData(state) {
  const dc = [{
    id: 'current-workplace',
    name: 'Current workplace pension',
    provider: 'Current scheme',
    currentValue: Number(state.pot || 0),
    feePct: Number(state.feePct || 0),
    returnOverride: null,
    priority: 100,
    salaryLinked: true,
  }]
    .concat((state.dcPensions || []).map((pension, index) => ({
      id: pension.id || `dc_${index}`,
      name: pension.name || `DC pension ${index + 1}`,
      provider: pension.provider || '',
      currentValue: Number(pension.currentValue || 0),
      feePct: Number(pension.feePct || 0),
      returnOverride: (pension.returnOverride == null || pension.returnOverride === '')
        ? null
        : Number(pension.returnOverride),
      priority: Number(pension.priority || 50),
      salaryLinked: false,
    })))
    .filter((pension) => pension.currentValue > 0 || pension.salaryLinked);

  const db = (state.dbPensions || []).map((pension, index) => ({
    id: pension.id || `db_${index}`,
    name: pension.name || `DB pension ${index + 1}`,
    provider: pension.provider || '',
    annualIncome: Number(pension.annualIncome || 0),
    startAge: Number(pension.startAge || state.stateAge),
    increaseType: String(pension.increaseType || 'fixed'),
    escalationPct: Number(pension.escalationPct || 0),
    cpiCapPct: (pension.cpiCapPct == null || pension.cpiCapPct === '') ? null : Number(pension.cpiCapPct),
  })).filter((pension) => pension.annualIncome > 0);

  const contributionEvents = (state.contribEvents || []).map((event, index) => ({
    id: event.id || `ce_${index}`,
    name: event.name || `Contribution ${index + 1}`,
    type: String(event.type || 'oneOff'),
    amount: Number(event.amount || 0),
    targetId: String(event.targetId || 'current-workplace'),
    startAge: Number(event.startAge || state.currentAge),
    endAge: (event.endAge == null || event.endAge === '') ? null : Number(event.endAge),
  })).filter((event) => event.amount > 0);

  const lumpSumEvents = (state.lumpSumEvents || []).map((event, index) => ({
    id: event.id || `ls_${index}`,
    name: event.name || `Lump sum ${index + 1}`,
    type: String(event.type || 'pcls'),
    amountType: String(event.amountType || 'fixed'),
    amount: Number(event.amount || 0),
    targetId: String(event.targetId || 'any-dc'),
    age: Number(event.age || state.retireAge),
  })).filter((event) => event.amount > 0);

  return { dc, db, events: contributionEvents, lumpSums: lumpSumEvents };
}
