const FLOOR_TAPER_DEFAULTS = {
  startAge: 85,
  perYear: 0.02,
  minRatio: 0.65,
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getAgeRow(result, age) {
  return result?.years?.find((row) => row.age === age) || null;
}

function getPotAtAge(result, age) {
  const row = getAgeRow(result, age);
  return row ? safeNumber(row.potEnd, 0) : null;
}

function getMinRecurringNetAfterAge(result, age) {
  const rows = (result?.years || []).filter((row) => row.age >= age);
  if (!rows.length) return null;
  return rows.reduce((min, row) => Math.min(min, safeNumber(row.recurringNetIncome, 0)), Number.POSITIVE_INFINITY);
}

function requiredFloorAtAge(baseFloor, age, cfg = FLOOR_TAPER_DEFAULTS) {
  const floor = safeNumber(baseFloor, 0);
  if (floor <= 0) return 0;
  if (age < 70) return floor;
  if (age < cfg.startAge) return floor;
  const yearsOver = age - cfg.startAge;
  const reduction = Math.min(1 - cfg.minRatio, yearsOver * cfg.perYear);
  const ratio = Math.max(cfg.minRatio, 1 - reduction);
  return floor * ratio;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getFloorTaperSettings(state) {
  const startAge = clamp(Math.round(safeNumber(state?.floorTaperStartAge, FLOOR_TAPER_DEFAULTS.startAge)), 70, 110);
  const perYear = Math.max(0, safeNumber(state?.floorTaperRatePct, FLOOR_TAPER_DEFAULTS.perYear * 100) / 100);
  const minRatio = clamp(safeNumber(state?.floorTaperMinPct, FLOOR_TAPER_DEFAULTS.minRatio * 100) / 100, 0, 1);
  return {
    startAge,
    perYear,
    minRatio: minRatio || 0,
  };
}

export function computeFloorRequirement(state, age, overrideFloor = null) {
  const cfg = getFloorTaperSettings(state);
  const floor = overrideFloor === null ? safeNumber(state?.floor70, 0) : safeNumber(overrideFloor, 0);
  return requiredFloorAtAge(floor, age, cfg);
}

function evaluateScenarioResult(state, result, floorAfter70 = null) {
  const cfg = getFloorTaperSettings(state);
  const floor = floorAfter70 === null ? safeNumber(state.floor70, 0) : safeNumber(floorAfter70, 0);
  const validYears = result?.years || [];
  const passPot = validYears.filter((row) => row.age <= state.successAge).every((row) => safeNumber(row.potEnd, 0) > 0);
  const passFloor = validYears
    .filter((row) => row.age >= 70 && safeNumber(row.recurringNetIncome, 0) > 0)
    .every((row) => safeNumber(row.recurringNetIncome, 0) >= requiredFloorAtAge(floor, row.age, cfg));

  const weakYears = validYears
    .filter((row) => row.age >= state.retireAge)
    .filter((row) => {
      const recurring = safeNumber(row.recurringNetIncome, 0);
      const floorNeed = requiredFloorAtAge(floor, row.age, cfg);
      return safeNumber(row.potEnd, 0) <= 0 || recurring < floorNeed;
    })
    .map((row) => row.age);

  return {
    pass: passPot && passFloor,
    passPot,
    passFloor,
    weakYears,
    potAtRet: safeNumber(result?.potAtRet, 0),
    potAt75: getPotAtAge(result, 75),
    runOutAge: result?.runOutAge ?? null,
    minRecurringNetAfter75: getMinRecurringNetAfterAge(result, 75),
    endPot: getPotAtAge(result, state.endAge),
  };
}

function isScenarioEnabled(state, toggleKey) {
  if (!toggleKey) return true;
  if (state[toggleKey] === undefined || state[toggleKey] === null) return true;
  return Number(state[toggleKey]) === 1;
}

function scoreScenarioImpact(baseMetrics, metrics, state) {
  const dropRetPot = Math.max(0, baseMetrics.potAtRet - metrics.potAtRet);
  const dropPot75 = Math.max(0, safeNumber(baseMetrics.potAt75, 0) - safeNumber(metrics.potAt75, 0));
  const dropEndPot = Math.max(0, safeNumber(baseMetrics.endPot, 0) - safeNumber(metrics.endPot, 0));
  const netGap = Math.max(0, safeNumber(state.floor70, 0) - safeNumber(metrics.minRecurringNetAfter75, safeNumber(state.floor70, 0)));

  const damageScore =
    (dropRetPot * 0.2) +
    (dropPot75 * 0.25) +
    (dropEndPot * 0.35) +
    (netGap * 4) +
    (metrics.pass ? 0 : 100000);

  return {
    impact: {
      dropRetPot,
      dropPot75,
      dropEndPot,
      netGap,
    },
    damageScore,
  };
}

function scenarioConfigList(state) {
  const list = [
    {
      key: 'crash-at-retirement',
      toggleKey: 'stressScenarioCrash',
      compoundEligible: true,
      label: `Crash at retirement (-${safeNumber(state.crashPct, 0)}%)`,
      type: 'severe',
      build: (s) => ({
        mode: 'projection',
        state: s,
        opts: { crashAtAge: s.retireAge, crashPct: s.crashPct },
        assumptions: `One-off ${safeNumber(s.crashPct, 0)}% drop at retirement age`,
      }),
    },
    {
      key: 'bad-sequence',
      toggleKey: 'stressScenarioBadSeq',
      compoundEligible: true,
      label: 'Bad sequence after retirement',
      type: 'severe',
      build: (s) => ({
        mode: 'projection',
        state: s,
        opts: { badYears: s.badYears, badPenalty: s.badPenalty },
        assumptions: `${safeNumber(s.badYears, 0)} years with returns reduced by ${safeNumber(s.badPenalty, 0)}%`,
      }),
    },
    {
      key: 'lower-returns',
      toggleKey: 'stressScenarioLowerReturns',
      compoundEligible: true,
      label: 'Lower long-run returns',
      type: 'relevant',
      build: (s) => ({
        mode: 'projection',
        state: { ...s, returnNom: Math.max(0, safeNumber(s.returnNom, 0) - 1.5) },
        opts: {},
        assumptions: 'Nominal return reduced by 1.5% per year',
      }),
    },
    {
      key: 'higher-inflation',
      toggleKey: 'stressScenarioHigherInflation',
      compoundEligible: true,
      label: 'Higher inflation',
      type: 'relevant',
      build: (s) => ({
        mode: 'projection',
        state: { ...s, inflation: safeNumber(s.inflation, 0) + 1.5 },
        opts: {},
        assumptions: 'Inflation increased by 1.5% per year',
      }),
    },
    {
      key: 'earlier-retirement',
      toggleKey: 'stressScenarioEarlierRetire',
      compoundEligible: false,
      label: 'Retire earlier',
      type: 'relevant',
      build: (s) => ({
        mode: 'projection',
        state: { ...s, retireAge: Math.max(s.currentAge, safeNumber(s.retireAge, s.currentAge) - 2) },
        opts: {},
        assumptions: 'Retirement age moved 2 years earlier',
      }),
    },
    {
      key: 'reduced-contributions',
      toggleKey: 'stressScenarioReducedContrib',
      compoundEligible: false,
      label: 'Reduced pension contributions',
      type: 'mild',
      build: (s) => ({
        mode: 'projection',
        state: { ...s, empPct: Math.max(0, safeNumber(s.empPct, 0) - 2), erPct: Math.max(0, safeNumber(s.erPct, 0) - 1) },
        opts: {},
        assumptions: 'Employee -2% and employer -1% contribution rates',
      }),
    },
    {
      key: 'drawdown-pressure',
      toggleKey: 'stressScenarioDrawdownPressure',
      compoundEligible: false,
      label: 'Higher withdrawal pressure',
      type: 'relevant',
      build: (s) => ({
        mode: 'projection',
        state: { ...s, drawdown: safeNumber(s.drawdown, 0) + 1.0 },
        opts: {},
        assumptions: 'Drawdown rate increased by 1.0% of pot per year',
      }),
    },
    {
      key: 'later-life-shortfall',
      toggleKey: 'stressScenarioLaterLifeFloor',
      compoundEligible: false,
      label: 'Higher later-life income floor',
      type: 'mild',
      build: (s) => ({
        mode: 'projection',
        state: s,
        opts: {},
        assumptions: 'Later-life income floor increased by 20%',
        floorAfter70: safeNumber(s.floor70, 0) * 1.2,
      }),
    },
  ];

  if (state.householdMode === 'joint') {
    list.push({
      key: 'household-strain',
      toggleKey: 'stressScenarioHouseholdStrain',
      compoundEligible: false,
      label: 'Household strain (partner downshift)',
      type: 'relevant',
      build: (s) => ({
        mode: 'projection',
        state: {
          ...s,
          spouseSalary: Math.max(0, safeNumber(s.spouseSalary, 0) * 0.8),
          spouseEmpPct: Math.max(0, safeNumber(s.spouseEmpPct, 0) - 1),
          spouseErPct: Math.max(0, safeNumber(s.spouseErPct, 0) - 1),
        },
        opts: {},
        assumptions: 'Partner salary -20%, partner contributions reduced by 1%+1%',
      }),
    });
  }

  return list.filter((item) => isScenarioEnabled(state, item.toggleKey));
}

export function buildStressScenarioResults({ state, base, calcProjection }) {
  const baseMetrics = evaluateScenarioResult(state, base);
  const enabledConfigs = scenarioConfigList(state);
  const scenarios = enabledConfigs.map((config) => {
    const setup = config.build(state);
    const result = calcProjection(setup.state, setup.opts || {});
    const metrics = evaluateScenarioResult(state, result, setup.floorAfter70 ?? null);
    const scored = scoreScenarioImpact(baseMetrics, metrics, state);

    return {
      key: config.key,
      label: config.label,
      type: config.type,
      assumptions: setup.assumptions,
      result,
      metrics,
      impact: scored.impact,
      damageScore: scored.damageScore,
    };
  });

  let compound = null;
  let interactionUplift = 0;
  let interactionPot75 = 0;
  const compoundConfigs = enabledConfigs.filter((config) => config.compoundEligible !== false);
  if (compoundConfigs.length > 1) {
    let compoundState = { ...state };
    let compoundOpts = {};
    let floorAfter70 = null;
    const assumptionParts = [];

    compoundConfigs.forEach((config) => {
      const step = config.build(compoundState);
      compoundState = step.state || compoundState;
      compoundOpts = { ...compoundOpts, ...(step.opts || {}) };
      if (step.floorAfter70 !== undefined && step.floorAfter70 !== null) {
        floorAfter70 = floorAfter70 === null ? safeNumber(step.floorAfter70, 0) : Math.max(floorAfter70, safeNumber(step.floorAfter70, 0));
      }
      assumptionParts.push(config.label);
    });

    const result = calcProjection(compoundState, compoundOpts);
    const metrics = evaluateScenarioResult(state, result, floorAfter70);
    const scored = scoreScenarioImpact(baseMetrics, metrics, state);
    compound = {
      key: 'compound-market-stack',
      label: 'Compound (market stack)',
      assumptions: assumptionParts.join(' + '),
      result,
      metrics,
      impact: scored.impact,
      damageScore: scored.damageScore,
      scenarioCount: compoundConfigs.length,
    };

    const compoundScenarioRows = scenarios
      .filter((item) => compoundConfigs.some((cfg) => cfg.key === item.key))
    const singlesTotal = compoundScenarioRows
      .reduce((sum, item) => sum + safeNumber(item.damageScore, 0), 0);
    const singlesPot75Total = compoundScenarioRows
      .reduce((sum, item) => sum + safeNumber(item.impact?.dropPot75, 0), 0);
    interactionUplift = compound.damageScore - singlesTotal;
    interactionPot75 = safeNumber(compound.impact?.dropPot75, 0) - singlesPot75Total;
  }

  const ranked = scenarios.slice().sort((a, b) => b.damageScore - a.damageScore);
  const worstScenario = ranked[0] || null;
  const mostRelevant = ranked.find((x) => x.type === 'relevant') || ranked[0] || null;
  const mild = ranked.filter((x) => x.type === 'mild').sort((a, b) => b.damageScore - a.damageScore)[0] || null;

  const weakYears = Array.from(new Set(ranked.slice(0, 3).flatMap((x) => x.metrics.weakYears || []))).sort((a, b) => a - b);

  const watchouts = [];
  if (worstScenario && !worstScenario.metrics.pass) {
    watchouts.push({
      severity: 'bad',
      title: `Largest downside: ${worstScenario.label}`,
      detail: `Fails resilience checks. Biggest pressure appears around age ${worstScenario.metrics.weakYears[0] ?? state.retireAge}.`,
    });
  }
  if (mostRelevant && mostRelevant.impact.dropPot75 > 0) {
    watchouts.push({
      severity: mostRelevant.impact.dropPot75 > 75000 ? 'warn' : 'good',
      title: 'Later-life buffer sensitivity',
      detail: `Most relevant scenario reduces pot at age 75 by ${Math.round(mostRelevant.impact.dropPot75).toLocaleString()}.`,
    });
  }
  if (weakYears.length) {
    watchouts.push({
      severity: 'warn',
      title: 'Problem years cluster',
      detail: `Most problematic years concentrate around ages ${weakYears.slice(0, 5).join(', ')}.`,
    });
  }
  if (compound && !compound.metrics.pass) {
    const floorOnly = compound.metrics.passPot && !compound.metrics.passFloor;
    watchouts.push({
      severity: floorOnly ? 'warn' : 'bad',
      title: 'Compound downside (knock-on effect)',
      detail: floorOnly
        ? `Stacked market stress first breaches the income floor around age ${compound.metrics.weakYears[0] ?? state.retireAge}, while pot survival remains intact.`
        : `When linked market scenarios stack together, the plan fails from age ${compound.metrics.weakYears[0] ?? state.retireAge}.`,
    });
  }

  return {
    baseline: { result: base, metrics: baseMetrics },
    scenarios,
    compound,
    interactionUplift,
    interactionPot75,
    ranked,
    worstScenario,
    mostRelevant,
    mild,
    weakYears,
    watchouts,
  };
}

export function classifyMonteConfidence(successProb) {
  const p = safeNumber(successProb, 0);
  if (p >= 0.85) {
    return {
      band: 'strong',
      label: 'Strong confidence',
      severity: 'good',
      detail: 'Plan shows a high probability of avoiding depletion under simulated paths.',
    };
  }
  if (p >= 0.65) {
    return {
      band: 'moderate',
      label: 'Moderate confidence',
      severity: 'warn',
      detail: 'Plan is workable but could be sensitive to weaker return sequences.',
    };
  }
  return {
    band: 'weak',
    label: 'Weak confidence',
    severity: 'bad',
    detail: 'Plan is vulnerable under many simulated paths and needs resilience improvements.',
  };
}

export function buildMonteInterpretation(result, state) {
  const confidence = classifyMonteConfidence(result?.successProb ?? 0);
  const ruinDefText = state.ruinDef === 1
    ? 'success means the pot stays at or above £10k throughout the plan horizon'
    : 'success means the pot does not hit £0 before the end age';

  const p10 = safeNumber(result?.p10Terminal, 0);
  const p50 = safeNumber(result?.p50Terminal, 0);
  const tailRatio = p50 > 0 ? p10 / p50 : 0;
  const growthDependency = tailRatio < 0.2
    ? 'high'
    : tailRatio < 0.4
      ? 'moderate'
      : 'lower';

  const watchouts = [];
  if (confidence.band !== 'strong') {
    watchouts.push({
      severity: confidence.severity,
      title: confidence.label,
      detail: confidence.detail,
    });
  }
  if (growthDependency === 'high') {
    watchouts.push({
      severity: 'warn',
      title: 'High dependence on stronger growth outcomes',
      detail: 'Downside terminal outcomes are much lower than typical outcomes.',
    });
  }

  const suggestions = [];
  if (confidence.band === 'weak') {
    suggestions.push('Reduce target retirement spending and rerun Monte Carlo.');
    suggestions.push('Delay retirement age by 1-2 years to improve robustness.');
    suggestions.push('Increase pension contributions while working.');
    suggestions.push('Review lower-risk strategy options in the Strategy tab.');
  } else if (confidence.band === 'moderate') {
    suggestions.push('Compare your current strategy with a more conservative option.');
    suggestions.push('Test a slightly lower drawdown rate.');
    suggestions.push('Build a larger late-life buffer by raising contributions.');
  } else {
    suggestions.push('Plan appears robust. Keep assumptions realistic and rerun periodically.');
  }

  return {
    confidence,
    successDefinition: ruinDefText,
    growthDependency,
    watchouts,
    suggestions,
  };
}
