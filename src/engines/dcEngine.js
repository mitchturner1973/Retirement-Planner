import { compoundPeriodRate, realRate } from '../core/math.js';
import { fmtGBP } from '../core/formatters.js';

export function extraContribForPotAtAge(events, targetId, age, yearFrac = 1) {
  return (events || []).reduce((sum, event) => {
    if (event.targetId !== targetId) return sum;
    if (event.type === 'oneOff') return sum + (age === event.startAge ? event.amount : 0);
    const end = event.endAge == null ? age : event.endAge;
    if (age < event.startAge || age > end) return sum;
    if (event.type === 'annual' || event.type === 'bonusFixed') return sum + event.amount * yearFrac;
    if (event.type === 'monthly') return sum + event.amount * 12 * yearFrac;
    return sum;
  }, 0);
}

export function clonePots(dcPensions) {
  return dcPensions.map((pension) => ({ ...pension, value: Number(pension.currentValue || 0), lastFee: 0 }));
}

export function totalPot(pots) {
  return pots.reduce((sum, pot) => sum + Math.max(0, pot.value || 0), 0);
}

export function totalFeesForPots(pots) {
  return pots.reduce((sum, pot) => sum + Math.max(0, pot.lastFee || 0), 0);
}

export function applyGrowthAndFeesToPots(state, pots, baseRealReturn, adjustedRealReturn = null, yearFrac = 1) {
  const effectiveReturn = adjustedRealReturn == null ? baseRealReturn : adjustedRealReturn;
  for (const pot of pots) {
    const annualRealReturn = pot.returnOverride == null
      ? effectiveReturn
      : realRate(Number(pot.returnOverride) / 100, state.inflation / 100);
    const feeRate = ((pot.feePct || 0) / 100) * yearFrac;
    const fee = Math.max(0, pot.value * feeRate);
    pot.lastFee = fee;
    const periodGrowth = compoundPeriodRate(annualRealReturn, yearFrac);
    pot.value = Math.max(0, (pot.value - fee) * (1 + periodGrowth));
  }
}

export function withdrawFromPotsByPriority(pots, grossAmount) {
  return withdrawFromPotsByPriorityDetailed(pots, grossAmount).withdrawn;
}

export function withdrawFromPotsByPriorityDetailed(pots, grossAmount) {
  let remaining = Math.max(0, grossAmount);
  let withdrawn = 0;
  const byPot = {};
  const order = [...pots].sort((a, b) => (a.priority || 50) - (b.priority || 50));
  for (const pot of order) {
    if (remaining <= 0) break;
    const take = Math.min(pot.value, remaining);
    pot.value -= take;
    remaining -= take;
    withdrawn += take;
    if (take > 0) byPot[pot.id] = (byPot[pot.id] || 0) + take;
  }
  return { withdrawn, byPot };
}

export function withdrawFromSpecificOrPriority(pots, grossAmount, targetId = 'any-dc') {
  return withdrawFromSpecificOrPriorityDetailed(pots, grossAmount, targetId).withdrawn;
}

export function withdrawFromSpecificOrPriorityDetailed(pots, grossAmount, targetId = 'any-dc') {
  const need = Math.max(0, grossAmount);
  if (targetId && targetId !== 'any-dc') {
    const pot = pots.find((item) => item.id === targetId);
    if (!pot) return { withdrawn: 0, byPot: {} };
    const take = Math.min(pot.value, need);
    pot.value -= take;
    return { withdrawn: take, byPot: take > 0 ? { [pot.id]: take } : {} };
  }
  return withdrawFromPotsByPriorityDetailed(pots, need);
}

export function targetPotValue(pots, targetId = 'any-dc') {
  if (targetId && targetId !== 'any-dc') {
    const pot = pots.find((item) => item.id === targetId);
    return Math.max(0, pot?.value || 0);
  }
  return totalPot(pots);
}

export function resolveLumpSumRequestedAmount(event, pots, remainingLsa) {
  let amount = Math.max(0, Number(event.amount || 0));
  const amountType = String(event.amountType || 'fixed');
  if (amountType === 'pctPot' || amountType === 'pctRemainingLsa') amount = Math.min(amount, 100);
  if (amountType === 'pctPot') return targetPotValue(pots, event.targetId) * (amount / 100);
  if (amountType === 'pctRemainingLsa') return Math.max(0, remainingLsa) * (amount / 100);
  return amount;
}

export function processLumpSumEventsForAge(state, lumpEvents, pots, age, tflsUsed) {
  const due = (lumpEvents || []).filter((event) => Number(event.age || 0) === Number(age || 0));
  const flows = { pclsGross: 0, ufplsGross: 0, taxableLumpGross: 0 };
  const byPot = {};
  const notes = [];
  let used = Number(tflsUsed || 0);

  for (const event of due) {
    const remainingLsa = Math.max(0, Number(state.tflsCap || 0) - used);
    let requested = resolveLumpSumRequestedAmount(event, pots, remainingLsa);
    if (String(event.type || 'pcls') === 'pcls') requested = Math.min(requested, remainingLsa);
    const takenRes = withdrawFromSpecificOrPriorityDetailed(pots, requested, event.targetId);
    const taken = Number(takenRes.withdrawn || 0);
    if (taken <= 0) continue;
    Object.entries(takenRes.byPot || {}).forEach(([potId, value]) => {
      byPot[potId] = (byPot[potId] || 0) + Number(value || 0);
    });

    const kind = String(event.type || 'pcls');
    if (kind === 'pcls') {
      flows.pclsGross += taken;
      used += taken;
    } else if (kind === 'ufpls') {
      flows.ufplsGross += taken;
      used += Math.min(taken * 0.25, remainingLsa);
    } else {
      flows.taxableLumpGross += taken;
    }

    const label = kind === 'pcls' ? 'PCLS' : (kind === 'ufpls' ? 'UFPLS' : 'Taxable lump sum');
    const sourceText = event.targetId && event.targetId !== 'any-dc' ? ` from ${event.targetId}` : '';
    notes.push(`${label} ${fmtGBP(taken)}${sourceText}`);
  }

  return { flows, byPot, notes, tflsUsedAfterLumps: used };
}
