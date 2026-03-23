const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const startMarker = '        <div class="tabs" role="tablist">';
const endMarker = '          <div id="lumpSumEventsWrap"></div>\n        </div>';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker) + endMarker.length;

if (startIdx === -1 || html.indexOf(endMarker) === -1) {
  console.error('Markers not found!', startIdx, html.indexOf(endMarker));
  process.exit(1);
}

const newTabs = `        <div class="tabs" role="tablist">
          <button class="active" data-tab="you">You</button>
          <button data-tab="partner">Partner</button>
          <button class="tab-global" data-tab="assumptions">Assumptions</button>
        </div>

        <!-- YOU TAB -->
        <div id="tab-you" class="tab">
          <div class="person-section">
            <div class="person-section-title">Personal details</div>
            <div class="form">
              <div class="field"><label>Date of birth</label><input type="date" id="in_dob" /><div class="hint">Used with values as at date to derive your current age row and months until the next birthday automatically.</div></div>
              <div class="field"><label>Values as at date</label><input type="date" id="in_valuationDate" /><div class="hint">Reference date for the balances and income you enter.</div></div>
              <div class="field"><label>Current age (derived)</label><input type="number" id="in_currentAge" min="18" max="90" /><div class="hint">Auto-filled from date of birth. Leave blank to enter manually.</div></div>
              <div class="field"><label>First projection period (months to next birthday)</label><input type="number" id="in_firstYearMonths" min="0.1" max="12" step="0.1" /><div class="hint">Auto-filled from DOB and valuation date. Applied to all pension sources in the first short age-period.</div></div>
              <div class="field"><label>Retirement age</label><input type="number" id="in_retireAge" min="40" max="90" /></div>
              <div class="field"><label>Early retirement age (optional)</label><input type="number" id="in_earlyAge" min="40" max="90" placeholder="Used by Bridge" /></div>
              <div class="field"><label>State Pension age</label><input type="number" id="in_stateAge" min="55" max="90" /></div>
              <div class="field w6"><label>Current workplace DC pension pot (\u00a3)</label><input type="number" id="in_pot" min="0" step="100" /></div>
              <div class="field w6"><label>Other taxable income (\u00a3/yr)</label><input type="number" id="in_otherIncome" min="0" step="100" /></div>
            </div>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">Earnings &amp; contributions</div>
            <div class="form">
              <div class="field w6"><label>Salary (\u00a3/yr)</label><input type="number" id="in_salary" min="0" step="100" /></div>
              <div class="field"><label>Salary growth (%/yr, nominal)</label><input type="number" id="in_salaryGrowth" step="0.1" /><div class="hint">Uses nominal pay growth for salary and contribution projections.</div></div>
              <div class="field"><label>Employee pension (% of salary)</label><input type="number" id="in_empPct" step="0.1" /></div>
              <div class="field"><label>Employer pension (% of salary)</label><input type="number" id="in_erPct" step="0.1" /></div>
            </div>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">Retirement &amp; tax</div>
            <div class="form">
              <div class="field"><label>State Pension (today\u2019s \u00a3/yr)</label><input type="number" id="in_statePension" step="100" /></div>
              <div class="field"><label>Drawdown rate (% of pot/yr)</label><input type="number" id="in_draw" step="0.1" /></div>
              <div class="field w12"><div class="hint">Recurring drawdown is regular annual withdrawals. PCLS / UFPLS / taxable one-off withdrawals should be added in <strong>DC lump sums</strong> below.</div></div>
              <div class="field"><label>Tax\u2011free cash per withdrawal (TFLS %)</label><input type="number" id="in_tflsPct" step="0.1" /></div>
              <div class="field"><label>TFLS cap / Lump Sum Allowance (\u00a3)</label><input type="number" id="in_tflsCap" step="100" /></div>
            </div>
            <details class="helpAcc" style="margin-top:12px">
              <summary><span class="q">Advanced tax controls</span><span class="chev">\u25bc</span></summary>
              <div class="a">
                <div class="form" style="margin-top:8px">
                  <div class="field"><label>Personal Allowance (\u00a3)</label><input type="number" id="in_allow" step="10" /></div>
                  <div class="field"><label>Basic rate tax (%)</label><input type="number" id="in_basicTax" step="0.1" /></div>
                  <div class="field"><label>Higher-rate tax (%)</label><input type="number" id="in_higherTax" step="0.1" /></div>
                  <div class="field"><label>Higher-rate threshold (\u00a3 taxable)</label><input type="number" id="in_higherThreshold" step="100" /></div>
                </div>
              </div>
            </details>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">DC pensions <span class="person-section-subtitle">Extra pots, SIPPs and old workplace pensions beyond the main balance above</span></div>
            <p class="muted small" style="margin:0 0 10px">Each pot can have its own fee and withdrawal priority. The main workplace pot above is already included automatically.</p>
            <div class="row" style="margin-bottom:10px">
              <button class="btn" id="btnAddDc" type="button">+ Add DC pension</button>
            </div>
            <div id="dcPensionsSummary" class="inputs-repeater-summary muted small"></div>
            <div id="dcPensionsWrap"></div>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">DB pensions <span class="person-section-subtitle">Defined benefit / final salary pensions</span></div>
            <p class="muted small" style="margin:0 0 10px">Add final salary or career average pensions as future income streams. They start at a chosen age and lift retirement income automatically.</p>
            <div class="row" style="margin-bottom:10px">
              <button class="btn" id="btnAddDb" type="button">+ Add DB pension</button>
            </div>
            <div id="dbPensionsSummary" class="inputs-repeater-summary muted small"></div>
            <div id="dbPensionsWrap"></div>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">Extra contributions <span class="person-section-subtitle">One-off top-ups, monthly boosts and bonus payments</span></div>
            <p class="muted small" style="margin:0 0 10px">Model one-off top-ups, regular extra monthly/annual payments, and bonus-funded contributions. Earlier contributions have longer to grow.</p>
            <div class="row" style="margin-bottom:10px">
              <button class="btn" id="btnAddContrib" type="button">+ Add contribution</button>
            </div>
            <div id="contribEventsSummary" class="inputs-repeater-summary muted small"></div>
            <div id="contribEventsWrap"></div>
          </div>

          <div class="person-section-divider"></div>

          <div class="person-section">
            <div class="person-section-title">DC lump sums <span class="person-section-subtitle">PCLS, UFPLS and one-off withdrawals at specific ages</span></div>
            <p class="muted small" style="margin:0 0 10px">Add one-off lump sums from any DC pension. These sit separately from regular drawdown so you can model PCLS, UFPLS or taxable lump sums without mixing them into annual income.</p>
            <div class="row" style="margin-bottom:10px">
              <button class="btn" id="btnAddLumpSum" type="button">+ Add DC lump sum</button>
            </div>
            <div id="lumpSumEventsSummary" class="inputs-repeater-summary muted small"></div>
            <div id="lumpSumEventsWrap"></div>
          </div>
        </div>

        <!-- PARTNER TAB -->
        <div id="tab-partner" class="tab" style="display:none">
          <div class="person-section">
            <div class="form">
              <div class="field w6">
                <label>Planner mode</label>
                <select id="in_householdMode">
                  <option value="single" selected>Single person</option>
                  <option value="joint">Joint household</option>
                </select>
              </div>
            </div>
            <div class="callout" style="margin-top:10px">
              <div>\ud83d\udc65</div>
              <div>
                <div style="font-weight:700">Partner profile</div>
                <div class="muted small">Select <strong>Joint household</strong> above to add your partner\u2019s details. Both of you are projected separately, then combined in Household view.</div>
              </div>
            </div>
          </div>

          <div id="spouseFields" style="display:none">
            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner personal details</div>
              <div class="form household-grid">
                <div class="field"><label>Partner date of birth</label><input type="date" id="in_spouseDob" /><div class="hint">Used with partner values-as-at date to derive current age and months to next birthday.</div></div>
                <div class="field"><label>Partner values as at date</label><input type="date" id="in_spouseValuationDate" /><div class="hint">Reference date for partner balances and income inputs.</div></div>
                <div class="field"><label>Partner current age (derived)</label><input type="number" id="in_spouseCurrentAge" min="18" max="90" /></div>
                <div class="field"><label>Partner first projection period (months)</label><input type="number" id="in_spouseFirstYearMonths" min="0.1" max="12" step="0.1" /></div>
                <div class="field"><label>Partner retirement age</label><input type="number" id="in_spouseRetireAge" min="40" max="90" /></div>
                <div class="field"><label>Partner State Pension age</label><input type="number" id="in_spouseStateAge" min="55" max="90" /></div>
              </div>
            </div>

            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner earnings &amp; contributions</div>
              <div class="form household-grid">
                <div class="field"><label>Partner pension pot (\u00a3)</label><input type="number" id="in_spousePot" min="0" step="100" /></div>
                <div class="field"><label>Partner salary (\u00a3/yr)</label><input type="number" id="in_spouseSalary" min="0" step="100" /></div>
                <div class="field"><label>Partner other taxable income (\u00a3/yr)</label><input type="number" id="in_spouseOtherIncome" min="0" step="100" /></div>
                <div class="field"><label>Partner State Pension (\u00a3/yr)</label><input type="number" id="in_spouseStatePension" step="100" /></div>
                <div class="field"><label>Partner employee pension (% of salary)</label><input type="number" id="in_spouseEmpPct" step="0.1" /></div>
                <div class="field"><label>Partner employer pension (% of salary)</label><input type="number" id="in_spouseErPct" step="0.1" /></div>
              </div>
            </div>

            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner DC pensions <span class="person-section-subtitle">Extra pots, SIPPs and old workplace pensions</span></div>
              <p class="muted small" style="margin:0 0 10px">Partner\u2019s extra DC pots. The main partner pension pot above is already included automatically.</p>
              <div class="row" style="margin-bottom:10px">
                <button class="btn" id="btnAddPartnerDc" type="button">+ Add DC pension</button>
              </div>
              <div id="partnerDcPensionsSummary" class="inputs-repeater-summary muted small"></div>
              <div id="partnerDcPensionsWrap"></div>
            </div>

            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner DB pensions <span class="person-section-subtitle">Defined benefit / final salary pensions</span></div>
              <p class="muted small" style="margin:0 0 10px">Partner\u2019s defined benefit or final salary pensions as future income streams.</p>
              <div class="row" style="margin-bottom:10px">
                <button class="btn" id="btnAddPartnerDb" type="button">+ Add DB pension</button>
              </div>
              <div id="partnerDbPensionsSummary" class="inputs-repeater-summary muted small"></div>
              <div id="partnerDbPensionsWrap"></div>
            </div>

            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner extra contributions <span class="person-section-subtitle">One-off top-ups and regular boosts</span></div>
              <p class="muted small" style="margin:0 0 10px">Partner\u2019s one-off top-ups, regular extra monthly or annual payments, and bonus-funded contributions.</p>
              <div class="row" style="margin-bottom:10px">
                <button class="btn" id="btnAddPartnerContrib" type="button">+ Add contribution</button>
              </div>
              <div id="partnerContribEventsSummary" class="inputs-repeater-summary muted small"></div>
              <div id="partnerContribEventsWrap"></div>
            </div>

            <div class="person-section-divider"></div>

            <div class="person-section">
              <div class="person-section-title">Partner DC lump sums <span class="person-section-subtitle">PCLS, UFPLS and one-off withdrawals</span></div>
              <p class="muted small" style="margin:0 0 10px">Partner\u2019s one-off lump sums from DC pensions \u2014 PCLS, UFPLS or taxable withdrawals at specific ages.</p>
              <div class="row" style="margin-bottom:10px">
                <button class="btn" id="btnAddPartnerLumpSum" type="button">+ Add DC lump sum</button>
              </div>
              <div id="partnerLumpSumEventsSummary" class="inputs-repeater-summary muted small"></div>
              <div id="partnerLumpSumEventsWrap"></div>
            </div>
          </div>
        </div>

        <!-- ASSUMPTIONS TAB -->
        <div id="tab-assumptions" class="tab" style="display:none">
          <div class="inputs-tab-intro">
            <strong>Assumptions</strong>
            <span class="muted small">Global inputs shared across both profiles. Leave defaults if unsure.</span>
          </div>
          <div class="form">
            <div class="field"><label>Investment return (nominal %/yr)</label><input type="number" id="in_return" step="0.1" /></div>
            <div class="field"><label>Inflation (%/yr)</label><input type="number" id="in_inflation" step="0.1" /></div>
            <div class="field"><label>Return volatility (%/yr) for Monte Carlo</label><input type="number" id="in_vol" step="0.1" /></div>
            <div class="field"><label>Projection end age</label><input type="number" id="in_endAge" min="70" max="110" /></div>
            <div class="field"><label>Fees &amp; charges (%/yr)</label><input type="number" id="in_feePct" step="0.01" min="0" /></div>
            <div class="field w12"><label>Notes</label><input type="text" id="in_notes" placeholder="Optional: scenario notes" /></div>
          </div>
        </div>`;

html = html.slice(0, startIdx) + newTabs + html.slice(endIdx);
fs.writeFileSync('index.html', html);
console.log('Done. New HTML written successfully.');
