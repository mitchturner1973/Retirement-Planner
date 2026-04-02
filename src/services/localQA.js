/**
 * Local Q&A engine – answers common pension data questions
 * directly from the app state + projection without any API call.
 *
 * Returns { answered: true, text: '...' } if it handled the question,
 * or { answered: false } to let the LLM layer handle it.
 */

const fmt = n => {
  if (n == null || isNaN(n)) return '£0';
  return '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
};

const pct = n => `${Number(n).toFixed(1)}%`;

const toMonthly = (amt, freq) => {
  if (freq === 'weekly') return amt * 52 / 12;
  if (freq === 'annual') return amt / 12;
  return amt;
};

function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

/**
 * @param {string} question – user's raw question text
 * @param {Function} readState – returns current form state
 * @param {Function} calcProjection – runs the projection engine
 * @param {Function} [evaluateStrategies] – runs strategy evaluation
 * @returns {{ answered: boolean, text?: string }}
 */
export function tryLocalAnswer(question, readState, calcProjection, evaluateStrategies) {
  let state, proj;
  try {
    state = readState();
  } catch {
    return { answered: false };
  }

  // Normalise for matching
  const q = question.toLowerCase().replace(/['']/g, "'").trim();

  // Helper: run projection lazily
  const getProj = () => {
    if (!proj) {
      try { proj = calcProjection(state); } catch { proj = null; }
    }
    return proj;
  };

  // Helper: find a row at a specific age
  const rowAt = (age) => getProj()?.years?.find(r => r.age === age);

  // ── Pattern: current pot value ──
  if (matches(q, ['how much', 'what is', "what's", 'current'], ['pot', 'pension pot', 'dc pot', 'pension fund', 'fund value'])) {
    const total = state.pot || 0;
    const dc = state.dcPensions || [];
    let text = `Your current total DC pension pot is **${fmt(total)}**.`;
    if (dc.length > 1) {
      text += '\n\nBroken down:\n' + dc.map((p, i) =>
        `• ${p.label || `Pension ${i + 1}`}: ${fmt(p.value)}`
      ).join('\n');
    }
    if (state.householdMode === 'joint' && state.spousePot) {
      text += `\n\nYour partner's pot is ${fmt(state.spousePot)}.`;
      text += `\nHousehold total: ${fmt(total + state.spousePot)}.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: pot at a specific age ──
  const potAtAgeMatch = q.match(/(?:pot|fund|pension|worth|have)\b.*?\b(?:at|by|when i'm|when i am|age)\s*(\d{2})/);
  if (potAtAgeMatch) {
    const age = Number(potAtAgeMatch[1]);
    const row = rowAt(age);
    if (row) {
      const phase = row.phase === 'work' ? 'still working' : (row.phase === 'bridge' ? 'in your bridge period' : 'retired');
      return {
        answered: true,
        text: `At age **${age}** (${phase}), your projected pension pot is **${fmt(row.potEnd)}**.\n\nThis assumes ${pct(state.returnNom)} nominal growth and ${pct(state.inflation)} inflation.`
            + (row.recurringNetIncome > 0 ? `\nProjected net income at that age: ${fmt(row.recurringNetIncome)}/yr.` : ''),
      };
    }
    return { answered: true, text: `Age ${age} is outside your projection range (${state.currentAge}–${state.endAge}).` };
  }

  // ── Pattern: income at a specific age ──
  const incomeAtAgeMatch = q.match(/(?:income|earn|receive|get)\b.*?\b(?:at|by|when i'm|when i am|age)\s*(\d{2})/);
  if (incomeAtAgeMatch) {
    const age = Number(incomeAtAgeMatch[1]);
    const row = rowAt(age);
    if (row) {
      const phase = row.phase === 'work' ? 'still working' : (row.phase === 'bridge' ? 'bridging' : 'retired');
      let text = `At age **${age}** (${phase}):`;
      text += `\n• Net income: **${fmt(row.recurringNetIncome || row.netIncome || 0)}/yr**`;
      if (row.statePension > 0) text += `\n• State pension: ${fmt(row.statePension)}/yr`;
      if (row.dbIncome > 0) text += `\n• DB pension: ${fmt(row.dbIncome)}/yr`;
      if (row.potEnd != null) text += `\n• Remaining pot: ${fmt(row.potEnd)}`;
      return { answered: true, text };
    }
    return { answered: true, text: `Age ${age} is outside your projection range (${state.currentAge}–${state.endAge}).` };
  }

  // ── Pattern: salary ──
  if (matches(q, ['what is', "what's", 'how much', 'my', 'current'], ['salary', 'income', 'earn', 'earning'])) {
    if (q.includes('retire') || q.includes('pension') || q.includes('projected')) return { answered: false };
    let text = `Your current salary is **${fmt(state.salary)}**/yr.`;
    if (state.householdMode === 'joint' && state.spouseSalary) {
      text += `\nYour partner's salary is ${fmt(state.spouseSalary)}/yr.`;
      text += `\nHousehold total: ${fmt(state.salary + state.spouseSalary)}/yr.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: contributions ──
  if (matches(q, ['what', 'how much', 'my'], ['contribution', 'contributing', 'contribute'])) {
    const empAmt = state.salary * (state.empPct / 100);
    const erAmt = state.salary * (state.erPct / 100);
    let text = `**Your contributions:**\n• Employee: ${pct(state.empPct)} = ${fmt(empAmt)}/yr\n• Employer: ${pct(state.erPct)} = ${fmt(erAmt)}/yr\n• **Total: ${fmt(empAmt + erAmt)}/yr**`;
    if (state.householdMode === 'joint' && state.spouseSalary) {
      const spEmp = state.spouseSalary * (state.spouseEmpPct / 100);
      const spEr = state.spouseSalary * (state.spouseErPct / 100);
      text += `\n\n**Partner contributions:**\n• Employee: ${pct(state.spouseEmpPct)} = ${fmt(spEmp)}/yr\n• Employer: ${pct(state.spouseErPct)} = ${fmt(spEr)}/yr`;
    }
    return { answered: true, text };
  }

  // ── Pattern: state pension ──
  if (matches(q, ['state pension', 'state pen'])) {
    let text = `Your **state pension** is ${fmt(state.statePension)}/yr, starting at age **${state.stateAge}**.`;
    if (state.householdMode === 'joint') {
      text += `\nPartner's state pension: ${fmt(state.spouseStatePension)}/yr from age ${state.spouseStateAge}.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: retirement age ──
  if (matches(q, ['when', 'what age', 'retirement age']) && matches(q, ['retire', 'retirement', 'stop work'])) {
    if (q.includes('what if') || q.includes('should') || q.includes('can i')) return { answered: false };
    let text = `Your planned retirement age is **${state.retireAge}**.`;
    if (state.earlyAge && state.earlyAge < state.retireAge) {
      text += `\nYou've also set an early retirement age of **${state.earlyAge}**.`;
    }
    if (state.householdMode === 'joint' && state.spouseRetireAge) {
      text += `\nPartner's planned retirement age: **${state.spouseRetireAge}**.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: on track / enough / shortfall ──
  if (matches(q, ['on track', 'enough', 'sufficient', 'afford', 'shortfall', 'gap', 'am i ok'])) {
    const p = getProj();
    if (!p) return { answered: false };
    const target = state.targetRetirementNetIncome || 0;
    const actual = p.netAtRet || 0;
    const potAtRet = p.potAtRet || 0;
    let text = `**Retirement readiness summary:**\n`;
    text += `• Projected pot at retirement (age ${state.retireAge}): ${fmt(potAtRet)}\n`;
    text += `• Projected net income at retirement: ${fmt(actual)}/yr\n`;
    if (target) {
      const gap = actual - target;
      text += `• Your target net income: ${fmt(target)}/yr\n`;
      if (gap >= 0) {
        text += `• ✅ You're projected to **exceed** your target by ${fmt(gap)}/yr.\n`;
      } else {
        text += `• ⚠️ You're projected to fall **short** by ${fmt(Math.abs(gap))}/yr.\n`;
      }
    }
    if (p.runOutAge) {
      text += `• ⚠️ Your pot is projected to **run out at age ${p.runOutAge}**.`;
    } else {
      text += `• ✅ Your pot is projected to last beyond age ${state.endAge}.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: projected income at retirement ──
  if (matches(q, ['projected', 'expected', 'estimated', 'what will'], ['income', 'net income']) && matches(q, ['retire', 'retirement'])) {
    const p = getProj();
    if (!p) return { answered: false };
    let text = `**Projected income at retirement (age ${state.retireAge}):**\n`;
    text += `• DC pension income: ${fmt(p.privateAtRet)}/yr\n`;
    text += `• State pension: ${fmt(p.stateAtRet)}/yr\n`;
    if (p.dbAtRet) text += `• DB pension: ${fmt(p.dbAtRet)}/yr\n`;
    if (p.otherAtRet) text += `• Other income: ${fmt(p.otherAtRet)}/yr\n`;
    text += `• Estimated tax: ${fmt(p.taxAtRet)}/yr\n`;
    text += `• **Net income: ${fmt(p.netAtRet)}/yr**`;
    return { answered: true, text };
  }

  // ── Pattern: when will pot run out / depletion ──
  if (matches(q, ['run out', 'deplete', 'empty', 'last', 'how long'])) {
    const p = getProj();
    if (!p) return { answered: false };
    if (p.runOutAge) {
      return { answered: true, text: `⚠️ Your pension pot is projected to **run out at age ${p.runOutAge}**.\n\nThis is based on ${pct(state.returnNom)} nominal return and ${pct(state.drawdown)} drawdown rate.` };
    }
    return { answered: true, text: `✅ Your pension pot is projected to **last beyond age ${state.endAge}** — it does not run out in the projection.` };
  }

  // ── Pattern: DB pensions ──
  if (matches(q, ['db pension', 'defined benefit', 'final salary'])) {
    const db = state.dbPensions || [];
    if (!db.length) return { answered: true, text: 'You have no DB (defined benefit) pensions set up in the planner.' };
    let text = `**Your DB pensions (${db.length}):**\n`;
    db.forEach((p, i) => {
      text += `• ${p.label || `DB ${i + 1}`}: ${fmt(p.annualPension)}/yr from age ${p.payableAge} (${p.increaseType} increase${p.increaseRate ? ` at ${p.increaseRate}%` : ''})\n`;
    });
    return { answered: true, text };
  }

  // ── Pattern: DC pensions detail ──
  if (matches(q, ['dc pension', 'defined contribution', 'pension details', 'pension breakdown', 'my pensions', 'list pension'])) {
    const dc = state.dcPensions || [];
    if (!dc.length) return { answered: true, text: 'You have no DC pensions configured — just a single pot value.' };
    let text = `**Your DC pensions (${dc.length}):**\n`;
    dc.forEach((p, i) => {
      text += `• ${p.label || `DC ${i + 1}`}: ${fmt(p.value)}${p.isWorkplace ? ' [workplace]' : ''} (growth ${p.growth ?? state.returnNom}%)\n`;
    });
    text += `\n**Total: ${fmt(state.pot)}**`;
    return { answered: true, text };
  }

  // ── Pattern: target income ──
  if (matches(q, ['target', 'need', 'require'], ['income', 'need in retirement'])) {
    if (q.includes('what if') || q.includes('should')) return { answered: false };
    let text = `**Your retirement income targets:**\n`;
    text += `• Target net income: ${fmt(state.targetRetirementNetIncome)}/yr\n`;
    text += `• Minimum desired income: ${fmt(state.minimumDesiredNetIncome)}/yr`;
    return { answered: true, text };
  }

  // ── Pattern: assumptions ──
  if (matches(q, ['assumption', 'growth rate', 'return rate', 'inflation rate', 'fees', 'what rate'])) {
    let text = `**Your assumptions:**\n`;
    text += `• Nominal return: ${pct(state.returnNom)}\n`;
    text += `• Inflation (CPI): ${pct(state.inflation)}\n`;
    text += `• Real return: ${pct(state.returnNom - state.inflation)}\n`;
    text += `• Platform fees: ${pct(state.feePct)}\n`;
    text += `• Salary growth: ${pct(state.salaryGrowth)}\n`;
    text += `• Drawdown rate: ${pct(state.drawdown)}`;
    return { answered: true, text };
  }

  // ── Pattern: tax / tax bands / tax position ──
  if (matches(q, ['tax', 'tax band', 'tax rate', 'how much tax', 'tax position', 'tax free', 'personal allowance'])) {
    if (q.includes('what is') && !q.includes('my')) return { answered: false }; // let LLM explain concepts
    const p = getProj();
    let text = `**Your tax assumptions:**\n`;
    text += `• Personal allowance: ${fmt(state.allowance)}\n`;
    text += `• Basic rate: ${pct(state.basicTax)} (up to ${fmt(state.higherThreshold)})\n`;
    text += `• Higher rate: ${pct(state.higherTax)}\n`;
    text += `• Tax-free lump sum (TFLS): ${pct(state.tflsPct)} of pot\n`;
    text += `• TFLS cap: ${fmt(state.tflsCap)}`;
    if (p) {
      text += `\n\n**Projected tax at retirement (age ${state.retireAge}):**\n`;
      text += `• Estimated annual tax: ${fmt(p.taxAtRet)}/yr`;
      if (p.years) {
        const retYears = p.years.filter(r => r.age >= state.retireAge);
        const totalTax = retYears.reduce((s, r) => s + (r.tax || 0), 0);
        const higherYrs = retYears.filter(r => (r.tax || 0) > (state.higherThreshold - state.allowance) * state.basicTax / 100).length;
        text += `\n• Estimated total retirement tax: ${fmt(totalTax)} over ${retYears.length} years`;
        if (higherYrs > 0) text += `\n• ⚠️ ${higherYrs} year(s) with income entering the higher-rate band`;
      }
    }
    return { answered: true, text };
  }

  // ── Pattern: strategies / best strategy ──
  if (matches(q, ['strateg', 'best approach', 'which strategy', 'recommend', 'what should i do', 'best option', 'optimis'])) {
    if (q.includes('what is') && !q.includes('my') && !q.includes('best')) return { answered: false };
    if (!evaluateStrategies) return { answered: false };
    try {
      const results = evaluateStrategies(state);
      if (!results?.length) return { answered: true, text: 'No strategies could be evaluated. Check your inputs are complete.' };
      let text = `**Strategy analysis (${results.length} evaluated):**\n\n`;
      const top = results.slice(0, 5);
      top.forEach((r, i) => {
        const s = r.strategy || r;
        const m = r.metrics || r.summary || {};
        text += `**${i + 1}. ${s.name || s.id}**\n`;
        if (s.summary) text += `${s.summary}\n`;
        if (m.potAtRet != null) text += `• Pot at retirement: ${fmt(m.potAtRet)}\n`;
        if (m.netAtRet != null) text += `• Net income: ${fmt(m.netAtRet)}/yr\n`;
        if (m.totalTax != null) text += `• Lifetime tax: ${fmt(m.totalTax)}\n`;
        if (r.score != null) text += `• Score: ${r.score}/100\n`;
        if (s.labBadges?.length) text += `• Tags: ${s.labBadges.join(', ')}\n`;
        text += '\n';
      });
      if (results[0]?.strategy?.name) {
        text += `**Top recommendation: ${results[0].strategy.name}**`;
      }
      return { answered: true, text };
    } catch (e) {
      console.warn('[LocalQA] Strategy evaluation failed:', e);
      return { answered: false };
    }
  }

  // ── Pattern: expenses / bills / budget / spending ──
  if (matches(q, ['expense', 'bill', 'budget', 'spend', 'outgoing', 'cost of living', 'monthly cost'])) {
    const expenses = parseJson(state.expenses);
    const oneoffs = parseJson(state.oneoffs);
    const savings = parseJson(state.savingsItems);
    const subs = parseJson(state.subscriptions);
    if (!expenses.length && !oneoffs.length && !savings.length && !subs.length) {
      return { answered: true, text: 'No expenses have been entered yet. Go to the **Expenses** tab to add your monthly bills, subscriptions, and one-offs.' };
    }
    const monthlyBills = expenses.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
    const monthlySubs = subs.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
    const monthlySavings = savings.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
    const totalMonthly = monthlyBills + monthlySubs;
    const annualSpend = totalMonthly * 12;

    let text = `**Your monthly budget:**\n`;
    text += `• Monthly bills: ${fmt(Math.round(monthlyBills))}/mo (${expenses.length} items)\n`;
    if (subs.length) text += `• Subscriptions: ${fmt(Math.round(monthlySubs))}/mo (${subs.length} items)\n`;
    if (savings.length) text += `• Savings: ${fmt(Math.round(monthlySavings))}/mo (${savings.length} items)\n`;
    text += `• **Total spending: ${fmt(Math.round(totalMonthly))}/mo = ${fmt(Math.round(annualSpend))}/yr**\n`;

    // Compare with projected retirement income
    const p = getProj();
    if (p && p.netAtRet) {
      const surplus = p.netAtRet - annualSpend;
      text += `\n**vs. projected retirement income:**\n`;
      text += `• Retirement income: ${fmt(p.netAtRet)}/yr\n`;
      text += `• Annual expenses: ${fmt(Math.round(annualSpend))}/yr\n`;
      if (surplus >= 0) {
        text += `• ✅ Surplus of ${fmt(Math.round(surplus))}/yr`;
      } else {
        text += `• ⚠️ Shortfall of ${fmt(Math.round(Math.abs(surplus)))}/yr — expenses exceed projected income`;
      }
    }

    if (oneoffs.length) {
      text += `\n\n**Planned one-offs (${oneoffs.length}):**\n`;
      oneoffs.forEach(e => {
        text += `• ${e.name || 'Item'}: ${fmt(e.amount)}${e.age ? ` at age ${e.age}` : ''}\n`;
      });
    }
    return { answered: true, text };
  }

  // ── Pattern: savings / ISA / emergency fund ──
  if (matches(q, ['saving', 'isa', 'emergency fund', 'premium bond', 'sipp'])) {
    if (q.includes('what is') && !q.includes('my')) return { answered: false };
    const savings = parseJson(state.savingsItems);
    if (!savings.length) return { answered: true, text: 'No savings contributions entered. You can add them in the **Expenses** tab under Savings & Goals.' };
    const monthlySavings = savings.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
    let text = `**Your savings & goals (${savings.length}):**\n`;
    savings.forEach(e => {
      text += `• ${e.name || e.cat || 'Savings'}: ${fmt(e.amount)}/${e.freq || 'monthly'}\n`;
    });
    text += `\n**Total: ${fmt(Math.round(monthlySavings))}/mo = ${fmt(Math.round(monthlySavings * 12))}/yr**`;
    return { answered: true, text };
  }

  // ── Pattern: lump sums ──
  if (matches(q, ['lump sum', 'pcls', 'tax.?free cash', 'tax.?free lump'])) {
    if (q.includes('what is') && !q.includes('my')) return { answered: false };
    const events = state.lumpSumEvents || [];
    let text = `**Tax-free lump sum allowance:**\n`;
    text += `• TFLS rate: ${pct(state.tflsPct)} of pot\n`;
    text += `• Lifetime LSA cap: ${fmt(state.tflsCap)}\n`;
    text += `• Current pot: ${fmt(state.pot)} → max PCLS: ${fmt(Math.min(state.pot * state.tflsPct / 100, state.tflsCap))}`;
    if (events.length) {
      text += `\n\n**Planned lump sum events (${events.length}):**\n`;
      events.forEach((e, i) => {
        text += `• ${e.label || `Lump sum ${i + 1}`}: ${fmt(e.amount)} at age ${e.age} (${e.type || 'PCLS'})\n`;
      });
    }
    return { answered: true, text };
  }

  // ── Pattern: household / partner / joint ──
  if (matches(q, ['partner', 'spouse', 'household', 'joint', 'couple'])) {
    if (q.includes('what is') || q.includes('explain')) return { answered: false };
    if (state.householdMode !== 'joint') {
      return { answered: true, text: 'Your household mode is **single**. Switch to **joint** in the Household section to add a partner.' };
    }
    let text = `**Household summary (joint):**\n\n`;
    text += `**You:**\n• Age: ${state.currentAge}, retiring at ${state.retireAge}\n• Salary: ${fmt(state.salary)}\n• Pot: ${fmt(state.pot)}\n• State pension: ${fmt(state.statePension)}/yr from age ${state.stateAge}\n\n`;
    text += `**Partner:**\n• Age: ${state.spouseCurrentAge}, retiring at ${state.spouseRetireAge}\n• Salary: ${fmt(state.spouseSalary)}\n• Pot: ${fmt(state.spousePot)}\n• State pension: ${fmt(state.spouseStatePension)}/yr from age ${state.spouseStateAge}\n\n`;
    text += `**Combined:**\n• Total pots: ${fmt((state.pot || 0) + (state.spousePot || 0))}\n• Total salary: ${fmt((state.salary || 0) + (state.spouseSalary || 0))}`;
    return { answered: true, text };
  }

  // ── Pattern: drawdown rate ──
  if (matches(q, ['drawdown', 'withdrawal rate', 'draw down'])) {
    if (q.includes('what is') && !q.includes('my')) return { answered: false };
    let text = `Your drawdown rate is **${pct(state.drawdown)}** of your pension pot per year.`;
    const p = getProj();
    if (p && state.pot) {
      text += `\n\nWith a projected pot of ${fmt(p.potAtRet)} at retirement, that's approximately ${fmt(Math.round(p.potAtRet * state.drawdown / 100))}/yr in gross withdrawals.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: quick summary ──
  if (matches(q, ['summary', 'summarise', 'summarize', 'overview', 'snapshot', 'quick look', 'tell me about my'])) {
    const p = getProj();
    let text = `**Your retirement snapshot:**\n`;
    text += `• Age: ${state.currentAge}, retiring at ${state.retireAge}`;
    if (state.earlyAge) text += ` (early: ${state.earlyAge})`;
    text += `\n• Salary: ${fmt(state.salary)}/yr`;
    text += `\n• DC pot: ${fmt(state.pot)}`;
    text += `\n• Contributions: ${pct(state.empPct)} + ${pct(state.erPct)} employer`;
    text += `\n• State pension: ${fmt(state.statePension)}/yr from age ${state.stateAge}`;
    if (p) {
      text += `\n\n**Projections:**`;
      text += `\n• Pot at retirement: ${fmt(p.potAtRet)}`;
      if (state.earlyAge) text += `\n• Pot at early retirement (${state.earlyAge}): ${fmt(p.potAtEarly)}`;
      text += `\n• Net income at retirement: ${fmt(p.netAtRet)}/yr`;
      if (p.runOutAge) text += `\n• ⚠️ Pot runs out at age ${p.runOutAge}`;
      else text += `\n• ✅ Pot lasts beyond age ${state.endAge}`;
    }
    if (state.householdMode === 'joint') {
      text += `\n\n**Partner:** age ${state.spouseCurrentAge}, salary ${fmt(state.spouseSalary)}, pot ${fmt(state.spousePot)}`;
    }

    // Add expenses context
    const expenses = parseJson(state.expenses);
    const subs = parseJson(state.subscriptions);
    if (expenses.length || subs.length) {
      const monthlyBills = expenses.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
      const monthlySubs = subs.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
      text += `\n\n**Monthly spending:** ${fmt(Math.round(monthlyBills + monthlySubs))}/mo (${expenses.length} bills, ${subs.length} subs)`;
    }
    return { answered: true, text };
  }

  // ── Pattern: bridge ──
  if (matches(q, ['bridge', 'bridging'])) {
    if (q.includes('what is') || q.includes('explain')) return { answered: false }; // let LLM explain
    if (!state.bridgeAmount) return { answered: true, text: 'You don\'t currently have a bridging strategy configured.' };
    return {
      answered: true,
      text: `**Your bridge strategy:**\n• Bridge amount: ${fmt(state.bridgeAmount)}/yr (${state.bridgeMode})\n• From age ${state.earlyAge || state.retireAge} to ${state.bridgeEndAge}\n• Post-bridge drawdown: ${pct(state.bridgePostDraw)}`,
    };
  }

  // ── Pattern: milestones / year by year ──
  if (matches(q, ['milestone', 'year by year', 'age by age', 'timeline', 'projection table'])) {
    const p = getProj();
    if (!p?.years?.length) return { answered: false };
    const ages = [state.currentAge, 50, 55, 60, 65, 67, 70, 75, 80, 85, 90, state.endAge];
    const seen = new Set();
    let text = '**Projection milestones:**\n';
    for (const age of ages) {
      if (age < state.currentAge || age > state.endAge || seen.has(age)) continue;
      seen.add(age);
      const row = p.years.find(r => r.age === age);
      if (row) {
        const phase = row.phase === 'work' ? 'working' : (row.phase === 'bridge' ? 'bridge' : 'retired');
        text += `• Age ${age} (${phase}): pot ${fmt(row.potEnd)}, net income ${fmt(row.recurringNetIncome || row.netIncome || 0)}/yr\n`;
      }
    }
    return { answered: true, text };
  }

  // ── Pattern: years to retirement ──
  if (matches(q, ['how many years', 'how long until', 'years until', 'years to go', 'years left'])) {
    const yearsToRetire = state.retireAge - state.currentAge;
    let text = `You have **${yearsToRetire} years** until your planned retirement at age ${state.retireAge}.`;
    if (state.earlyAge && state.earlyAge < state.retireAge) {
      text += `\nOr **${state.earlyAge - state.currentAge} years** until your early retirement at age ${state.earlyAge}.`;
    }
    return { answered: true, text };
  }

  // ── Pattern: what can I ask / help ──
  if (matches(q, ['help', 'what can i ask', 'what can you', 'what do you know', 'commands', 'topics'])) {
    return {
      answered: true,
      text: `**I can answer questions about your data locally (instant, private):**\n\n` +
        `📊 **Your data:** pot, salary, contributions, state pension, DB/DC pensions, drawdown\n` +
        `📈 **Projections:** pot at any age, income at any age, milestones, run-out age\n` +
        `🎯 **Targets:** on track?, shortfall, retirement readiness\n` +
        `💼 **Strategies:** best strategy, strategy comparison, recommendations\n` +
        `💰 **Budget:** expenses, bills, savings, subscriptions, one-offs\n` +
        `👥 **Household:** partner details, combined view\n` +
        `🏦 **Tax:** tax bands, estimated tax in retirement, TFLS/PCLS\n` +
        `🔄 **Bridge:** bridging strategy details\n` +
        `📋 **Summary:** overview, snapshot, milestones\n\n` +
        `For **explanations** and **"what-if" questions** (e.g. "What is PCLS?", "Should I retire early?"), I'll use the AI — which requires an API key.`,
    };
  }

  // Not matched – let LLM handle it
  return { answered: false };
}

/**
 * Flexible matcher: checks if the query contains at least one term
 * from each provided group (AND across groups, OR within each group).
 */
function matches(q, ...groups) {
  return groups.every(terms =>
    terms.some(t => q.includes(t))
  );
}
