export function buildDecisionTimeline(strategyResult) {
  if (!strategyResult) return [];
  const timeline = [];
  const byAge = new Map();

  const push = (item) => {
    if (!byAge.has(item.age)) byAge.set(item.age, []);
    byAge.get(item.age).push(item);
  };

  for (const action of strategyResult.actions || []) {
    push({
      age: action.age,
      action: action.action,
      reason: action.detail,
      category: action.type,
    });
  }

  const retRow = strategyResult.years.find((y) => y.age === strategyResult.state.retireAge);
  if (retRow) {
    push({
      age: retRow.age,
      action: `Retirement starts with recurring net income of ${Math.round(retRow.recurringNetIncome).toLocaleString()}`,
      reason: `This combines DC net income, State Pension, DB income and other taxable income where relevant.`,
      category: 'milestone',
    });
  }

  const spRow = strategyResult.years.find((y) => y.age === strategyResult.state.stateAge);
  if (spRow && strategyResult.state.stateAge >= strategyResult.state.currentAge) {
    push({
      age: spRow.age,
      action: `State Pension starts`,
      reason: `Adds approximately ${Math.round(spRow.statePension).toLocaleString()} a year in today's money and usually lets DC withdrawals ease back.`,
      category: 'milestone',
    });
  }

  const dbStartRows = strategyResult.years.filter((row, idx, arr) => row.dbIncome > 0 && (idx === 0 || arr[idx - 1].dbIncome === 0));
  for (const row of dbStartRows) {
    push({
      age: row.age,
      action: `Defined benefit income starts`,
      reason: `Adds approximately ${Math.round(row.dbIncome).toLocaleString()} a year in today's money from your DB pensions.`,
      category: 'milestone',
    });
  }

  [...byAge.keys()].sort((a, b) => a - b).forEach((age) => {
    timeline.push({ age, items: byAge.get(age) });
  });

  return timeline;
}
