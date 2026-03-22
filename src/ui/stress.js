export function createStressRenderer(deps){
  const {getEl, calcProjection, computeStressStatus, badge, drawLineChart} = deps;
  return function renderStress(s, base){
    const crash = calcProjection(s, {crashAtAge: s.retireAge, crashPct: s.crashPct});
    const badseq = calcProjection(s, {badYears: s.badYears, badPenalty: s.badPenalty});

    const survives = (res)=>{
      const okPot = res.years.filter(y=>y.age<=s.successAge).every(y=>y.potEnd>0);
      const okFloor = res.years.filter(y=>y.age>=70 && y.netIncome>0).every(y=>y.netIncome>=s.floor70);
      return okPot && okFloor;
    };

    const passBase=survives(base), passCrash=survives(crash), passBad=survives(badseq);
    const st = computeStressStatus(passBase, passCrash, passBad);
    getEl('stressBadge').innerHTML = badge(st.s, st.text, st.reason);
    getEl('stressBaseline').innerHTML = badge(passBase?'good':'bad', `Baseline: ${passBase?'Pass':'Fail'}`, '');
    getEl('stressCrash').innerHTML = badge(passCrash?'good':'bad', `Crash: ${passCrash?'Pass':'Fail'}`, '');
    getEl('stressBadSeq').innerHTML = badge(passBad?'good':'bad', `Bad seq: ${passBad?'Pass':'Fail'}`, '');

    drawLineChart(getEl('chartStress'), [
      {name:'Baseline', color:'rgba(110,231,255,.95)', data: base.years.map(y=>({x:y.age,y:y.potEnd}))},
      {name:`Crash (-${s.crashPct}%)`, color:'rgba(251,113,133,.90)', data: crash.years.map(y=>({x:y.age,y:y.potEnd}))},
      {name:`Bad sequence`, color:'rgba(251,191,36,.90)', data: badseq.years.map(y=>({x:y.age,y:y.potEnd}))}
    ], [{x:s.retireAge,label:'Retire',color:'rgba(255,255,255,.22)'}]);

    return {survives, crash, badseq, passBase, passCrash, passBad, status:st};
  };
}
