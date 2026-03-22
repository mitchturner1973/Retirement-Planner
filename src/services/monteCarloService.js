import { normaliseSourceData, clonePots, totalPot, extraContribForPotAtAge, withdrawFromPotsByPriority, taxAndNetFromGrossPension, dbIncomeAtAge, realRate } from '../projection.js';
import { yearFracForAge, compoundPeriodRate } from '../core/math.js';

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

export function runMonteCarloAsync(app, state, onProgress, onDone) {
  const n = state.sims;
  const seed = (state.seed !== '' ? Number(state.seed) : Math.floor(Math.random() * 1e9));
  const rng = mulberry32(seed);
  const inflation = state.inflation / 100;
  const mean = realRate(state.returnNom / 100, inflation);
  const vol = state.vol / 100;
  const salaryGrowth = state.salaryGrowth / 100;
  const ages = Array.from({ length: state.endAge - state.currentAge + 1 }, (_, i) => state.currentAge + i);
  const byAge = Array.from({ length: ages.length }, () => []);
  const terminalWealth = [];
  const depletionAges = [];
  let i = 0;
  const batchSize = 50;

  function step() {
    if (app.mc.cancel) {
      app.mc.running = false;
      onDone({ cancelled: true });
      return;
    }

    const end = Math.min(n, i + batchSize);
    for (; i < end; i += 1) {
      const src = normaliseSourceData(state);
      const pots = clonePots(src.dc);
      let salary = state.salary;
      let tflsUsed = 0;
      let depletedAge = null;
      let pot = totalPot(pots);

      for (let yearIdx = 0; yearIdx < ages.length; yearIdx += 1) {
        const age = ages[yearIdx];
        const yearFrac = yearFracForAge(state, age);
        const annualReturn = mean + vol * randn(rng);
        const periodReturn = compoundPeriodRate(annualReturn, yearFrac);

        if (age < state.retireAge) {
          for (const potItem of pots) {
            let add = 0;
            if (potItem.salaryLinked) add += salary * ((state.empPct + state.erPct) / 100) * yearFrac;
            add += extraContribForPotAtAge(src.events, potItem.id, age, yearFrac);
            potItem.value += add;
            const fee = Math.max(0, potItem.value * ((potItem.feePct || 0) / 100) * yearFrac);
            potItem.value = Math.max(0, (potItem.value - fee) * (1 + periodReturn));
          }
          salary *= (1 + compoundPeriodRate(salaryGrowth, yearFrac));
        } else {
          const stateIncome = age >= state.stateAge ? state.statePension * yearFrac : 0;
          const dbIncome = dbIncomeAtAge(state, src.db, age);
          const gross = withdrawFromPotsByPriority(pots, Math.min(totalPot(pots), totalPot(pots) * (state.drawdown / 100) * yearFrac));
          const taxResult = taxAndNetFromGrossPension(state, gross, stateIncome + dbIncome, state.otherIncome, tflsUsed);
          tflsUsed = taxResult.tflsUsedNew;
          for (const potItem of pots) {
            const fee = Math.max(0, potItem.value * ((potItem.feePct || 0) / 100) * yearFrac);
            potItem.value = Math.max(0, (potItem.value - fee) * (1 + periodReturn));
          }
          pot = totalPot(pots);
          if (depletedAge === null) {
            if (state.ruinDef === 0 && pot <= 0) depletedAge = age;
            if (state.ruinDef === 1 && pot < 10000) depletedAge = age;
          }
        }
        pot = totalPot(pots);
        byAge[yearIdx].push(pot);
      }

      terminalWealth.push(pot);
      depletionAges.push(depletedAge);
    }

    onProgress(i / n);
    if (i < n) {
      setTimeout(step, 0);
      return;
    }

    const bands = ages.map((age, yearIdx) => {
      const values = byAge[yearIdx];
      return {
        age,
        p10: percentile(values, 0.10),
        p25: percentile(values, 0.25),
        p50: percentile(values, 0.50),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.90),
      };
    });

    const ruinedCount = depletionAges.filter((age) => age !== null).length;
    const successProb = 1 - (ruinedCount / n);
    const worstDepletionAge = depletionAges.filter((age) => age !== null).reduce((min, age) => Math.min(min, age), Infinity);

    onDone({
      seed,
      n,
      ruinedCount,
      successProb,
      bands,
      worstDepletionAge: worstDepletionAge === Infinity ? null : worstDepletionAge,
      p10Terminal: percentile(terminalWealth, 0.10),
      p50Terminal: percentile(terminalWealth, 0.50),
      p90Terminal: percentile(terminalWealth, 0.90),
      terminalWealth,
      depletionAges,
    });
  }

  step();
}
