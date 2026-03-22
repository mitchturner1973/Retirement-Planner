import { fmtPct } from '../ui/dom.js';

export function statusFromScore(probability) {
  if (probability >= 0.85) return { s: 'good', label: 'Green', reason: `Monte Carlo success ${fmtPct(probability)}` };
  if (probability >= 0.65) return { s: 'warn', label: 'Amber', reason: `Monte Carlo success ${fmtPct(probability)}` };
  return { s: 'bad', label: 'Red', reason: `Monte Carlo success ${fmtPct(probability)}` };
}

export function computeStressStatus(passBase, passCrash, passBadSeq) {
  if (passBase && passCrash && passBadSeq) return { s: 'good', text: 'Stress: OK', reason: 'Passes crash + bad sequence' };
  if (passBase && (passCrash || passBadSeq)) return { s: 'warn', text: 'Stress: Watch', reason: 'One stress scenario fails' };
  return { s: 'bad', text: 'Stress: Action', reason: passBase ? 'Both stress scenarios fail' : 'Baseline fails' };
}

export function computeBridgeStatus(runOutBase, runOutLife, endAge, tolerableAge = 75) {
  const baseOk = runOutBase === null;
  const base = baseOk
    ? { s: 'good', text: 'Bridge baseline: OK', reason: `Holds to ${endAge}` }
    : (runOutBase >= tolerableAge
      ? { s: 'warn', text: 'Bridge baseline: Watch', reason: `Runs out at ${runOutBase}` }
      : { s: 'bad', text: 'Bridge baseline: Action', reason: `Runs out at ${runOutBase}` });

  if (runOutLife === undefined) return { base, life: null };

  const lifeOk = runOutLife === null;
  const life = lifeOk
    ? { s: 'good', text: 'Bridge lifestyle: OK', reason: `Holds to ${endAge}` }
    : (runOutLife >= tolerableAge
      ? { s: 'warn', text: 'Bridge lifestyle: Watch', reason: `Runs out at ${runOutLife}` }
      : { s: 'bad', text: 'Bridge lifestyle: Action', reason: `Runs out at ${runOutLife}` });

  return { base, life };
}

export function computeOverall(stress, bridgeBase, bridgeLife, monte) {
  const states = [stress?.s, bridgeBase?.s, bridgeLife?.s, monte?.s].filter((value) => value && value !== 'na');
  if (states.includes('bad')) return { s: 'bad', text: 'Overall: Action needed', reason: 'At least one area is Red' };
  if (states.includes('warn')) return { s: 'warn', text: 'Overall: Watch', reason: 'At least one area is Amber' };
  return { s: 'good', text: 'Overall: OK', reason: 'All key checks are Green' };
}
