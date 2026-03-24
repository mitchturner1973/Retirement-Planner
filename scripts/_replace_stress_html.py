"""One-shot script to replace the STRESS section in index.html with the redesigned panel-grid version."""
import re

new_stress = """\
    <!-- STRESS -->
    <section class="view" id="view-stress" style="display:none">
      <div class="card stress-shell">
        <h3>Stress tests (gatekeeper)</h3>
        <div class="tipGrid" data-tips="view-stress"><div class="tipCard"><div class="ticon">🧯</div><div><div class="ttitle">Gatekeeper test</div><div class="ttext">Stress tests ask: "Would I still be OK if the worst timing happens?"</div></div></div><div class="tipCard"><div class="ticon">⚠️</div><div><div class="ttitle">Baseline can mislead</div><div class="ttext">A plan can look fine in baseline but fail under a crash. Treat failures seriously.</div></div></div><div class="tipCard"><div class="ticon">✅</div><div><div class="ttitle">Green means resilient</div><div class="ttext">Passing stress suggests margin for error — the main goal of planning.</div></div></div></div>

        <div class="stress-status-row">
          <span id="stressBadge"></span>
          <span id="stressBaseline"></span>
          <span id="stressCrash"></span>
          <span id="stressBadSeq"></span>
          <span id="stressScenarioMeta"></span>
        </div>

        <div class="stress-grid">

          <!-- Parameters panel -->
          <article class="stress-panel">
            <h4>Parameters</h4>
            <p class="muted small" style="margin:0 0 10px">Inputs for the Core crash and bad-sequence scenarios.</p>
            <div class="form">
              <div class="field"><label>Crash size at retirement (%)</label><input type="number" id="in_crashPct" step="1" /></div>
              <div class="field"><label>Bad-returns years (after retirement)</label><input type="number" id="in_badYears" step="1" /></div>
              <div class="field"><label>Bad-returns penalty (%/yr)</label><input type="number" id="in_badPenalty" step="0.5" /></div>
              <div class="field"><label>Success test age</label><input type="number" id="in_successAge" step="1" /></div>
              <div class="field w12"><label>"Enough" income floor after age 70 (today's £/yr)</label><input type="number" id="in_floor70" step="100" /></div>
            </div>
          </article>

          <!-- Scenarios panel -->
          <article class="stress-panel">
            <h4>Scenarios</h4>
            <div class="stress-presets">
              <button class="stress-preset-btn" data-preset="core">Core only</button>
              <button class="stress-preset-btn" data-preset="balanced">Balanced</button>
              <button class="stress-preset-btn" data-preset="all">All on</button>
              <button class="stress-preset-btn" data-preset="none">Clear all</button>
            </div>
            <div class="stress-chip-groups">
              <div class="stress-chip-group">
                <span class="stress-chip-group-label">Core</span>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioCrash" checked />Crash at retirement</label>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioBadSeq" checked />Bad sequence</label>
              </div>
              <div class="stress-chip-group">
                <span class="stress-chip-group-label">Macro</span>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioLowerReturns" checked />Lower returns</label>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioHigherInflation" checked />Higher inflation</label>
              </div>
              <div class="stress-chip-group">
                <span class="stress-chip-group-label">Behaviour</span>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioEarlierRetire" checked />Earlier retirement</label>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioReducedContrib" checked />Reduced contributions</label>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioDrawdownPressure" checked />Drawdown pressure</label>
              </div>
              <div class="stress-chip-group">
                <span class="stress-chip-group-label">Tail risk</span>
                <label class="stress-chip"><input type="checkbox" id="in_stressScenarioLaterLifeFloor" checked />Later-life shortfall</label>
                <label class="stress-chip" id="stress-chip-household"><input type="checkbox" id="in_stressScenarioHouseholdStrain" checked />Household strain</label>
              </div>
            </div>
          </article>

          <!-- Chart panel (full width) -->
          <article class="stress-panel stress-panel--wide">
            <div class="stress-chart-header">
              <h4 style="margin:0">Pot trajectory under stress (today's £)</h4>
              <div class="stress-chart-mode">
                <button class="stress-chart-mode-btn active" data-mode="top3">Top 3</button>
                <button class="stress-chart-mode-btn" data-mode="all">All enabled</button>
              </div>
            </div>
            <div class="svgwrap"><svg id="chartStress" width="980" height="270" role="img" aria-label="Stress chart"></svg></div>
          </article>

          <!-- Ranking panel -->
          <article class="stress-panel">
            <h4>Scenario impact ranking</h4>
            <div id="stressScenarioSummary"><p class="muted small">Run a calculation to see scenario ranking.</p></div>
          </article>

          <!-- Watchouts panel -->
          <article class="stress-panel">
            <h4>Stress watchouts</h4>
            <div id="stressWatchouts"><p class="muted small">Run a calculation to see stress watchouts.</p></div>
          </article>

        </div>
      </div>
    </section>

"""

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stress_start = None
monte_start = None
for i, line in enumerate(lines):
    if '<!-- STRESS -->' in line and stress_start is None:
        stress_start = i
    if '<!-- MONTE -->' in line and monte_start is None:
        monte_start = i

if stress_start is None or monte_start is None:
    raise RuntimeError(f"Could not find markers: stress={stress_start}, monte={monte_start}")

new_lines = lines[:stress_start] + [new_stress] + lines[monte_start:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"OK: replaced lines {stress_start+1}–{monte_start} -> {len(new_lines)} total lines")
