export function validateState(s){
  const errors=[], warnings=[], infos=[];
  const push=(arr,field,msg)=>arr.push({field,msg});
  if(s.retireAge <= s.currentAge) push(errors,'in_retireAge','Retirement age must be after current age.');
  if(!s.dob) push(infos,'in_dob','Add date of birth to auto-align the age rows to birthdays.');
  if((s.firstYearMonths||0)<=0 || (s.firstYearMonths||0)>12) push(errors,'in_firstYearMonths','First projection period must be between 0.1 and 12 months.');
  if((s.spouseFirstYearMonths||0)<=0 || (s.spouseFirstYearMonths||0)>12) push(errors,'in_spouseFirstYearMonths','Partner first projection period must be between 0.1 and 12 months.');
  if(s.endAge <= s.retireAge) push(errors,'in_endAge','Projection end age must be after retirement age.');
  if(s.stateAge < s.currentAge) push(errors,'in_stateAge','State Pension age cannot be before current age.');
  if(s.earlyAge!=='' && s.earlyAge < s.currentAge) push(errors,'in_earlyAge','Early retirement age cannot be before current age.');
  if(s.earlyAge!=='' && s.earlyAge > s.bridgeEndAge) push(errors,'br_endAge','Bridge end age must be at or after early retirement age.');
  if(s.bridgeEndAge > s.endAge) push(errors,'br_endAge','Bridge end age cannot be after projection end age.');
  if(s.tflsPct < 0 || s.tflsPct > 25) push(warnings,'in_tflsPct','TFLS is usually between 0% and 25%.');
  if(s.returnNom < -10 || s.returnNom > 12) push(warnings,'in_return','Investment return assumption looks unusual.');
  if(s.drawdown > 6) push(warnings,'in_draw','Drawdown above 6% is often fragile over long retirements.');
  if(s.feePct > 1.5) push(warnings,'in_feePct','Fees above 1.5% can materially weaken outcomes.');
  if(s.vol < 3 && s.returnNom > 5) push(warnings,'in_vol','Low volatility combined with strong return may understate risk.');
  if(Number(s.dbEarlyReductionPct||0) < 0 || Number(s.dbEarlyReductionPct||0) > 15) push(warnings,'in_dbEarlyReductionPct','DB early reduction is usually between 0% and 15% per year.');
  if(Number(s.dbDeferralIncreasePct||0) < 0 || Number(s.dbDeferralIncreasePct||0) > 15) push(warnings,'in_dbDeferralIncreasePct','DB deferral increase is usually between 0% and 15% per year.');
  (s.dcPensions||[]).forEach((p,i)=>{
    if(Number(p.feePct||0)<0) push(errors,'btnAddDc',`DC pension ${i+1} has a negative fee.`);
    if(Number(p.currentValue||0)<0) push(errors,'btnAddDc',`DC pension ${i+1} has a negative value.`);
  });
  (s.dbPensions||[]).forEach((p,i)=>{
    if(Number(p.annualIncome||0)<0) push(errors,'btnAddDb',`DB pension ${i+1} has a negative annual income.`);
    if(Number(p.npaAge||p.startAge||67) < 40 || Number(p.npaAge||p.startAge||67) > 100) push(errors,'btnAddDb',`DB pension ${i+1} has an invalid Normal Pension Age.`);
  });
  (s.contribEvents||[]).forEach((c,i)=>{
    if(Number(c.amount||0)<0) push(errors,'btnAddContrib',`Contribution ${i+1} has a negative amount.`);
    if(c.endAge!=null && Number(c.endAge)<Number(c.startAge||0)) push(errors,'btnAddContrib',`Contribution ${i+1} ends before it starts.`);
  });
  (s.lumpSumEvents||[]).forEach((e,i)=>{
    if(Number(e.amount||0)<0) push(errors,'btnAddLumpSum',`Lump sum event ${i+1} has a negative amount.`);
    if(Number(e.age||0) < Number(s.currentAge||0)) push(warnings,'btnAddLumpSum',`Lump sum event ${i+1} is before the current age row and will never be used.`);
  });
  if(s.householdMode==='joint'){
    if(s.spouseRetireAge <= s.spouseCurrentAge) push(errors,'in_spouseRetireAge','Partner retirement age must be after partner current age.');
    if(!s.spouseDob) push(infos,'in_spouseDob','Add partner date of birth to auto-align partner age rows to birthdays.');
    if(s.spouseStateAge < s.spouseCurrentAge) push(errors,'in_spouseStateAge','Partner State Pension age cannot be before partner current age.');
    if(s.spouseCurrentAge < 18) push(errors,'in_spouseCurrentAge','Partner current age must be realistic.');
    (s.partnerDcPensions||[]).forEach((p,i)=>{
      if(Number(p.feePct||0)<0) push(errors,'btnAddDc',`Partner DC pension ${i+1} has a negative fee.`);
      if(Number(p.currentValue||0)<0) push(errors,'btnAddDc',`Partner DC pension ${i+1} has a negative value.`);
    });
    (s.partnerDbPensions||[]).forEach((p,i)=>{
      if(Number(p.annualIncome||0)<0) push(errors,'btnAddDb',`Partner DB pension ${i+1} has a negative annual income.`);
      if(Number(p.npaAge||p.startAge||67) < 40 || Number(p.npaAge||p.startAge||67) > 100) push(errors,'btnAddDb',`Partner DB pension ${i+1} has an invalid Normal Pension Age.`);
    });
    (s.partnerContribEvents||[]).forEach((c,i)=>{
      if(Number(c.amount||0)<0) push(errors,'btnAddContrib',`Partner contribution ${i+1} has a negative amount.`);
      if(c.endAge!=null && Number(c.endAge)<Number(c.startAge||0)) push(errors,'btnAddContrib',`Partner contribution ${i+1} ends before it starts.`);
    });
    (s.partnerLumpSumEvents||[]).forEach((e,i)=>{
      if(Number(e.amount||0)<0) push(errors,'btnAddLumpSum',`Partner lump sum event ${i+1} has a negative amount.`);
      if(Number(e.age||0) < Number(s.spouseCurrentAge||0)) push(warnings,'btnAddLumpSum',`Partner lump sum event ${i+1} is before partner current age and will never be used.`);
    });
    infos.push({field:'in_householdMode', msg:'Household mode projects each person separately, then combines net income and remaining pots.'});
  }
  return {errors,warnings,infos};
}
