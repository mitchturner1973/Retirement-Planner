import { clamp } from './math.js';

export function parseIsoDate(str){
  if(!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y,m,d]=str.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) return null;
  return dt;
}

export function daysBetween(a,b){ return (b-a)/(1000*60*60*24); }

export function deriveAgeInputs(dobStr, valuationStr){
  const dob=parseIsoDate(dobStr), val=parseIsoDate(valuationStr);
  if(!dob || !val) return null;
  let age = val.getUTCFullYear() - dob.getUTCFullYear();
  const thisYearBirthday = new Date(Date.UTC(val.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
  if(val < thisYearBirthday) age -= 1;
  let nextBirthdayYear = val.getUTCFullYear();
  if(val >= thisYearBirthday) nextBirthdayYear += 1;
  const nextBirthday = new Date(Date.UTC(nextBirthdayYear, dob.getUTCMonth(), dob.getUTCDate()));
  let monthsToNext = daysBetween(val, nextBirthday) / (365.2425/12);
  if(monthsToNext < 0.05) monthsToNext = 12;
  monthsToNext = clamp(monthsToNext, 0.1, 12);
  return { currentAge: age, firstYearMonths: Number(monthsToNext.toFixed(1)), nextBirthdayIso: nextBirthday.toISOString().slice(0,10) };
}

export function syncDerivedAgeInputs(getEl, kind='main'){
  const map = (kind==='spouse')
    ? {dob:'in_spouseDob', valuation:'in_spouseValuationDate', age:'in_spouseCurrentAge', months:'in_spouseFirstYearMonths'}
    : {dob:'in_dob', valuation:'in_valuationDate', age:'in_currentAge', months:'in_firstYearMonths'};
  const dobEl = getEl(map.dob);
  const valEl = getEl(map.valuation);
  const ageEl = getEl(map.age);
  const monthsEl = getEl(map.months);
  if(!dobEl || !valEl || !ageEl || !monthsEl) return;
  const derived = deriveAgeInputs(dobEl.value, valEl.value);
  if(derived){
    ageEl.value = derived.currentAge;
    monthsEl.value = derived.firstYearMonths;
    ageEl.readOnly = true;
    monthsEl.readOnly = true;
    ageEl.title = `Derived from date of birth and values as at date. Next birthday: ${derived.nextBirthdayIso}`;
    monthsEl.title = `Months until next birthday: ${derived.firstYearMonths}`;
  } else {
    ageEl.readOnly = false;
    monthsEl.readOnly = false;
    ageEl.title = '';
    monthsEl.title = '';
  }
}
