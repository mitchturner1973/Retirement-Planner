export function createActionRecommendationService({ readState, setInputsFromState, renderAll, calcBridge, calcProjection, fmtGBP }) {
  function applyPatch(patch) {
    setInputsFromState({ ...readState(), ...patch });
    renderAll(true);
  }

  function scenarioPasses(state, result) {
    return result.years.filter((row) => row.age <= state.successAge).every((row) => row.potEnd > 0)
      && result.years.filter((row) => row.age >= 70 && row.netIncome > 0).every((row) => row.netIncome >= state.floor70);
  }

  return function suggestLevers(state, status, riskSummary = null) {
    const recs = [];

    const worstStress = riskSummary?.stress?.worstScenario;
    if (worstStress && !worstStress.metrics?.pass) {
      if (worstStress.key === 'earlier-retirement' || worstStress.key === 'drawdown-pressure') {
        recs.push({
          title: 'Review retirement timing or drawdown level',
          detail: `"${worstStress.label}" is the largest downside. A later retirement age or lower drawdown can materially improve resilience.`,
          apply: () => applyPatch({ retireAge: state.retireAge + 1 }),
        });
      }
      if (worstStress.key === 'reduced-contributions' || worstStress.key === 'lower-returns') {
        recs.push({
          title: 'Increase pension contribution buffer',
          detail: `"${worstStress.label}" shows contribution sensitivity. Increasing employee contribution by 1% adds resilience.`,
          apply: () => applyPatch({ empPct: Number((state.empPct + 1).toFixed(1)) }),
        });
      }
    }

    const monteBand = riskSummary?.monte?.confidence?.band;
    if (monteBand === 'weak') {
      recs.push({
        title: 'Improve Monte confidence by reducing withdrawals',
        detail: 'Lower annual drawdown by 0.5% and rerun Monte Carlo to test a more resilient path.',
        apply: () => applyPatch({ drawdown: Math.max(1, Number((state.drawdown - 0.5).toFixed(1)) ) }),
      });
    }

    if (status.bridgeLife && status.bridgeLife.s === 'bad') {
      let lo = 0;
      let hi = state.bridgeAmount;
      let best = null;
      for (let i = 0; i < 16; i += 1) {
        const mid = (lo + hi) / 2;
        const bridge = calcBridge({ ...state, bridgeAmount: mid, bridgeKeepLifestyle: 1 }, { crashAtEarly: false, crashAtState: false, badSeqFromEarly: false });
        if (bridge.error) break;
        if (bridge.runOut_life === null) {
          best = mid;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      if (best !== null) {
        const rounded = Math.round(best / 100) * 100;
        recs.push({
          title: `Reduce bridge spend to ~${fmtGBP(rounded)}/yr`,
          detail: `Aims to make the lifestyle path hold to age ${state.endAge}.`,
          apply: () => applyPatch({ bridgeAmount: rounded }),
        });
      }
    }

    if (status.overall.s !== 'good') {
      const start = state.empPct;
      let found = null;
      for (let delta = 0.5; delta <= 10; delta += 0.5) {
        const nextState = { ...state, empPct: start + delta };
        const base = calcProjection(nextState);
        const crash = calcProjection(nextState, { crashAtAge: nextState.retireAge, crashPct: nextState.crashPct });
        const bad = calcProjection(nextState, { badYears: nextState.badYears, badPenalty: nextState.badPenalty });
        if (scenarioPasses(nextState, base) && scenarioPasses(nextState, crash) && scenarioPasses(nextState, bad)) {
          found = start + delta;
          break;
        }
      }
      if (found !== null) {
        recs.push({
          title: `Increase employee pension to ${found.toFixed(1)}%`,
          detail: 'Improves robustness (stress tests).',
          apply: () => applyPatch({ empPct: Number(found.toFixed(1)) }),
        });
      }
    }

    if (status.bridgeBase && status.bridgeBase.s === 'bad' && state.earlyAge !== '') {
      let found = null;
      for (let age = state.earlyAge + 1; age <= state.earlyAge + 8; age += 1) {
        const bridge = calcBridge({ ...state, earlyAge: age }, { crashAtEarly: false, crashAtState: false, badSeqFromEarly: false });
        if (!bridge.error && bridge.runOut_base === null) {
          found = age;
          break;
        }
      }
      if (found !== null) {
        recs.push({
          title: `Delay early retirement age to ${found}`,
          detail: 'Helps the bridge hold to State Pension age.',
          apply: () => applyPatch({ earlyAge: found }),
        });
      }
    }

    if (recs.length < 3 && status.stress.s !== 'good') {
      let found = null;
      for (let retireAge = state.retireAge + 1; retireAge <= state.retireAge + 5; retireAge += 1) {
        const nextState = { ...state, retireAge };
        const base = calcProjection(nextState);
        const crash = calcProjection(nextState, { crashAtAge: nextState.retireAge, crashPct: nextState.crashPct });
        const bad = calcProjection(nextState, { badYears: nextState.badYears, badPenalty: nextState.badPenalty });
        if (scenarioPasses(nextState, base) && scenarioPasses(nextState, crash) && scenarioPasses(nextState, bad)) {
          found = retireAge;
          break;
        }
      }
      if (found !== null) {
        recs.push({
          title: `Delay retirement age to ${found}`,
          detail: 'Improves stress robustness by reducing withdrawal years.',
          apply: () => applyPatch({ retireAge: found }),
        });
      }
    }

    return recs.slice(0, 3);
  };
}
