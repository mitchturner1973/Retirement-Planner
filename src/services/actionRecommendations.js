import { computeFloorRequirement } from './riskResilienceService.js';

export function createActionRecommendationService({ readState, setInputsFromState, renderAll, calcBridge, calcProjection, fmtGBP }) {
  function applyPatch(patch) {
    setInputsFromState({ ...readState(), ...patch });
    renderAll(true);
  }

  function scenarioPasses(state, result) {
    return result.years.filter((row) => row.age <= state.successAge).every((row) => row.potEnd > 0)
      && result.years.filter((row) => row.age >= 70 && row.netIncome > 0).every((row) => row.netIncome >= computeFloorRequirement(state, row.age));
  }

  return function suggestLevers(state, status, riskSummary = null) {
    const recs = [];

    const worstStress = riskSummary?.stress?.worstScenario;
    if (worstStress && !worstStress.metrics?.pass) {
      if (worstStress.key === 'earlier-retirement' || worstStress.key === 'drawdown-pressure') {
        recs.push({
          title: 'Review retirement timing or drawdown level',
          detail: `"${worstStress.label}" is the largest downside. A later retirement age or lower drawdown can materially improve resilience.`,
          reason: `"${worstStress.label}" is the weakest stress scenario, so addressing timing or spending has the biggest impact on plan robustness.`,
          confidence: 'high',
          effort: 'low',
          whyHelps: 'Each year of delayed retirement adds contributions, growth, and reduces the number of withdrawal years — a triple benefit.',
          risk: 'Delaying retirement requires continued employment, which may not be guaranteed. Health or employer changes could override this lever.',
          apply: () => applyPatch({ retireAge: state.retireAge + 1 }),
        });
      }
      if (worstStress.key === 'reduced-contributions' || worstStress.key === 'lower-returns') {
        recs.push({
          title: 'Increase pension contribution buffer',
          detail: `"${worstStress.label}" shows contribution sensitivity. Increasing employee contribution by 1% adds resilience.`,
          reason: `Contribution sensitivity is the dominant risk factor, so increasing the savings rate directly strengthens the weakest link.`,
          confidence: 'high',
          effort: 'medium',
          whyHelps: 'Higher contributions compound over the remaining working years, building a larger pot that better absorbs market shocks.',
          risk: 'Increased contributions reduce take-home pay now. Ensure the higher rate is sustainable in your current budget.',
          apply: () => applyPatch({ empPct: Number((state.empPct + 1).toFixed(1)) }),
        });
      }
    }

    const monteBand = riskSummary?.monte?.confidence?.band;
    if (monteBand === 'weak') {
      recs.push({
        title: 'Improve Monte confidence by reducing withdrawals',
        detail: 'Lower annual drawdown by 0.5% and rerun Monte Carlo to test a more resilient path.',
        reason: 'Monte Carlo success probability is low, so reducing the withdrawal rate is the most direct way to improve survival odds across thousands of simulated paths.',
        confidence: 'medium',
        effort: 'low',
        whyHelps: 'A smaller drawdown rate means each simulated market path has more room to recover — even poor sequences of returns become survivable.',
        risk: 'Lower withdrawals mean less income in retirement. Verify the reduced amount still meets your essential spending needs.',
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
          reason: 'The lifestyle bridge path currently runs out before State Pension, so trimming early-retirement spending is the most direct fix.',
          confidence: 'high',
          effort: 'medium',
          whyHelps: 'Lower bridge withdrawals preserve more pot for the post-State-Pension years when the lifestyle target still needs funding.',
          risk: 'Reduced bridge income may not cover essential spending in early retirement. Check the amount against your actual budget.',
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
          reason: 'The plan currently fails one or more stress tests, so higher contributions build the buffer needed to pass them.',
          confidence: 'high',
          effort: 'medium',
          whyHelps: 'Extra contributions compound over working years, creating headroom that absorbs market crashes and bad return sequences.',
          risk: 'Higher contributions reduce take-home pay. The increase should be affordable within your current budget.',
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
          reason: 'The bridge baseline fails before State Pension, so each year of delayed early retirement removes a full year of withdrawals.',
          confidence: 'high',
          effort: 'low',
          whyHelps: 'Fewer bridge years means the pot faces less drawdown pressure and arrives at State Pension age in better shape.',
          risk: 'Delaying early retirement means more working years. Ensure continued employment is realistic for your situation.',
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
          reason: 'Stress tests still show vulnerability, so a later retirement age is the strongest single lever to improve resilience.',
          confidence: 'medium',
          effort: 'high',
          whyHelps: 'Later retirement adds contribution years and reduces withdrawal years — both compound to strengthen the plan under stress.',
          risk: 'Retirement age changes are significant life decisions. Consider whether health, motivation, and employer allow the extension.',
          apply: () => applyPatch({ retireAge: found }),
        });
      }
    }

    return recs.slice(0, 3);
  };
}
