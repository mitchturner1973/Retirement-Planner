/**
 * Chat service – three-layer architecture:
 *
 * Layer 1: Local Q&A engine – answers data questions instantly from app state
 *          (no API call, no data leaves the browser).
 * Layer 2: LLM – used only for explanations, "what-if" analysis, and
 *          rewording. Pension context is sent (anonymised by default).
 * Layer 3: API key protection – keys are encrypted in localStorage using
 *          Web Crypto; a "session only" mode keeps the key in memory only.
 */

import { tryLocalAnswer } from './localQA.js';

const STORAGE_KEY = 'rp_chat_api_key';
const MODEL_KEY = 'rp_chat_model';
const PROVIDER_KEY = 'rp_chat_provider';
const PRIVACY_KEY = 'rp_chat_anonymise';

const PROVIDERS = {
  google: { label: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
};

const SYSTEM_PROMPT = `You are a friendly, knowledgeable UK retirement planning assistant embedded inside a Retirement Planner web app.

Your role:
- Answer questions about the user's retirement situation based on any pension data they share.
- Explain pension concepts (PCLS, drawdown, UFPLS, state pension, DB/DC pensions, tax-free lump sums, bridging strategies, etc.) in plain English.
- Provide general guidance and education — NOT regulated financial advice.
- When relevant, refer the user to a qualified financial adviser for personalised advice.
- Keep answers concise and practical. Use bullet points where helpful.
- All monetary values are in GBP (£).

Important disclaimers to follow:
- You are NOT a regulated financial adviser. Always make this clear when giving guidance.
- Never guarantee investment returns or outcomes.
- Encourage the user to seek professional advice for major decisions.`;

/* ── Anonymisation helpers ── */

/** Round to nearest £1,000 */
function roundK(n) {
  if (n == null || n === '' || isNaN(n)) return 0;
  return Math.round(Number(n) / 1000) * 1000;
}

/** Mask pension label – keep first letter + type hint only */
function maskLabel(label) {
  if (!label) return 'Pension';
  return label.charAt(0).toUpperCase() + '*** pension';
}

function summariseState(state, anonymise, projectionFn, strategyFn) {
  if (!state) return 'No pension data is currently loaded.';
  const v = anonymise ? (n) => `£${fmtNum(roundK(n))}` : (n) => `£${fmtNum(n)}`;
  const pct = (n) => `${n}%`;

  const lines = [];

  /* ── Section 1: User retirement profile ── */
  lines.push('=== USER RETIREMENT PROFILE ===');
  lines.push(`Current age: ${state.currentAge}`);
  lines.push(`Planned retirement age: ${state.retireAge}`);
  if (state.earlyAge) lines.push(`Early retirement age: ${state.earlyAge}`);
  lines.push(`Salary: ${v(state.salary)}/yr`);
  lines.push(`Employee contribution: ${pct(state.empPct)}`);
  lines.push(`Employer contribution: ${pct(state.erPct)}`);
  lines.push(`DC pension pot: ${v(state.pot)}`);
  lines.push(`State pension age: ${state.stateAge}`);
  lines.push(`State pension: ${v(state.statePension)}/yr`);
  lines.push(`Inflation (CPI): ${pct(state.inflation)}`);
  lines.push(`Nominal return: ${pct(state.returnNom)}`);

  // Household / partner
  lines.push(`Household mode: ${state.householdMode || 'single'}`);
  if (state.householdMode === 'joint') {
    lines.push(`Partner age: ${state.spouseCurrentAge}`);
    lines.push(`Partner salary: ${v(state.spouseSalary)}/yr`);
    lines.push(`Partner pot: ${v(state.spousePot)}`);
    lines.push(`Partner state pension: ${v(state.spouseStatePension)}/yr`);
    if (state.spouseRetireAge) lines.push(`Partner retirement age: ${state.spouseRetireAge}`);
  }

  // Strategy targets
  if (state.targetRetirementNetIncome) lines.push(`Target net retirement income: ${v(state.targetRetirementNetIncome)}/yr`);
  if (state.minimumDesiredNetIncome) lines.push(`Minimum desired net income: ${v(state.minimumDesiredNetIncome)}/yr`);

  // DC pensions detail
  if (state.dcPensions?.length) {
    lines.push(`\nDC Pensions (${state.dcPensions.length}):`);
    state.dcPensions.forEach((p, i) => {
      const lbl = anonymise ? maskLabel(p.label) : (p.label || 'Unnamed');
      lines.push(`  ${i + 1}. ${lbl}: ${v(p.value)} (growth ${p.growth ?? state.returnNom}%)${p.isWorkplace ? ' [workplace]' : ''}`);
    });
  }

  // DB pensions detail
  if (state.dbPensions?.length) {
    lines.push(`\nDB Pensions (${state.dbPensions.length}):`);
    state.dbPensions.forEach((p, i) => {
      const lbl = anonymise ? maskLabel(p.label) : (p.label || 'Unnamed');
      lines.push(`  ${i + 1}. ${lbl}: ${v(p.annualPension)}/yr from age ${p.payableAge}, increase ${p.increaseType} ${p.increaseRate ?? ''}%`);
    });
  }

  // Lump sums
  if (state.lumpSumEvents?.length) {
    lines.push(`\nPlanned lump sums:`);
    state.lumpSumEvents.forEach((e, i) => {
      lines.push(`  ${i + 1}. ${v(e.amount)} at age ${e.age} (${e.type})`);
    });
  }

  // Bridge
  if (state.bridgeAmount) {
    lines.push(`\nBridge strategy: ${v(state.bridgeAmount)}/yr (${state.bridgeMode}) until age ${state.bridgeEndAge}`);
  }

  // Assumptions
  lines.push(`\nAssumptions:`);
  lines.push(`  Fees: ${pct(state.feePct)}`);
  lines.push(`  Volatility: ${pct(state.vol)}`);
  if (state.salaryGrowth) lines.push(`  Salary growth: ${pct(state.salaryGrowth)}`);

  /* ── Section 2: Projected figures ── */
  if (projectionFn) {
    try {
      const proj = projectionFn(state);
      lines.push(`\n=== PROJECTED FIGURES (based on ${pct(state.returnNom)} nominal return, ${pct(state.inflation)} inflation) ===`);
      lines.push(`Projected pot at retirement (age ${state.retireAge}): ${v(proj.potAtRet)}`);
      if (state.earlyAge && !isNaN(proj.potAtEarly)) {
        lines.push(`Projected pot at early retirement (age ${state.earlyAge}): ${v(proj.potAtEarly)}`);
      }
      lines.push(`Projected net income at retirement: ${v(proj.netAtRet)}/yr`);
      lines.push(`  — Private pension (DC drawdown): ${v(proj.privateAtRet)}/yr`);
      lines.push(`  — State pension: ${v(proj.stateAtRet)}/yr`);
      if (proj.dbAtRet) lines.push(`  — DB pension: ${v(proj.dbAtRet)}/yr`);
      if (proj.otherAtRet) lines.push(`  — Other income: ${v(proj.otherAtRet)}/yr`);
      lines.push(`  — Estimated tax: ${v(proj.taxAtRet)}/yr`);
      if (proj.runOutAge) {
        lines.push(`⚠ WARNING: Pension pot projected to run out at age ${proj.runOutAge}`);
      } else {
        lines.push(`Pension pot is projected to last beyond age ${state.endAge}`);
      }

      // Key milestones from yearly data
      if (proj.years?.length) {
        const milestones = [];
        const ages = [state.currentAge, 50, 55, 60, 65, 67, 70, 75, 80, 85, state.endAge];
        const seen = new Set();
        for (const targetAge of ages) {
          if (targetAge < state.currentAge || targetAge > state.endAge || seen.has(targetAge)) continue;
          seen.add(targetAge);
          const row = proj.years.find(r => r.age === targetAge);
          if (row) {
            const phase = row.phase === 'work' ? 'working' : (row.phase === 'bridge' ? 'bridging' : 'retired');
            milestones.push(`  Age ${row.age} (${phase}): pot ${v(row.potEnd)}, net income ${v(row.totalCashReceived || row.recurringNetIncome || row.netIncome || 0)}/yr`);
          }
        }
        if (milestones.length) {
          lines.push(`\nProjection milestones:`);
          lines.push(...milestones);
        }
      }
    } catch (projErr) {
      console.warn('[Chat] Projection failed:', projErr);
      lines.push('\n(Could not compute projection figures — check inputs are complete.)');
    }
  }

  /* ── Section 3: Strategy evaluation ── */
  if (strategyFn) {
    try {
      const results = strategyFn(state);
      if (results?.length) {
        lines.push(`\n=== STRATEGY ANALYSIS (${results.length} strategies evaluated) ===`);
        const top = results.slice(0, 5);
        top.forEach((r, i) => {
          const s = r.strategy || r;
          const m = r.metrics || r.summary || {};
          lines.push(`  ${i + 1}. ${s.name || s.id}`);
          if (s.summary) lines.push(`     ${s.summary}`);
          if (m.potAtRet != null) lines.push(`     Pot at retirement: ${v(m.potAtRet)}`);
          if (m.netAtRet != null) lines.push(`     Net income at retirement: ${v(m.netAtRet)}/yr`);
          if (m.totalTax != null) lines.push(`     Lifetime tax: ${v(m.totalTax)}`);
          if (m.potAt75 != null) lines.push(`     Pot at 75: ${v(m.potAt75)}`);
          if (r.score != null) lines.push(`     Score: ${r.score}/100`);
          if (s.labBadges?.length) lines.push(`     Tags: ${s.labBadges.join(', ')}`);
        });
        if (results.length > 5) lines.push(`  ... and ${results.length - 5} more strategies evaluated.`);
      }
    } catch (stratErr) {
      console.warn('[Chat] Strategy evaluation failed:', stratErr);
    }
  }

  /* ── Section 4: Expenses & budget ── */
  try {
    const expenses = state.expenses ? (typeof state.expenses === 'string' ? JSON.parse(state.expenses) : state.expenses) : [];
    const oneoffs = state.oneoffs ? (typeof state.oneoffs === 'string' ? JSON.parse(state.oneoffs) : state.oneoffs) : [];
    const savings = state.savingsItems ? (typeof state.savingsItems === 'string' ? JSON.parse(state.savingsItems) : state.savingsItems) : [];
    const subs = state.subscriptions ? (typeof state.subscriptions === 'string' ? JSON.parse(state.subscriptions) : state.subscriptions) : [];

    const toMonthly = (amt, freq) => {
      if (freq === 'weekly') return amt * 52 / 12;
      if (freq === 'annual') return amt / 12;
      return amt;
    };

    if (expenses.length || oneoffs.length || savings.length || subs.length) {
      lines.push(`\n=== MONTHLY BUDGET & EXPENSES ===`);
      if (expenses.length) {
        const monthlyBills = expenses.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
        lines.push(`Monthly bills (${expenses.length} items): ${v(Math.round(monthlyBills))}/mo = ${v(Math.round(monthlyBills * 12))}/yr`);
        const essential = expenses.filter(e => e.essential !== false);
        const discretionary = expenses.filter(e => e.essential === false);
        if (essential.length) {
          lines.push(`  Essential: ${v(Math.round(essential.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0)))}/mo`);
        }
        if (discretionary.length) {
          lines.push(`  Discretionary: ${v(Math.round(discretionary.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0)))}/mo`);
        }
      }
      if (subs.length) {
        const monthlySubs = subs.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
        lines.push(`Subscriptions (${subs.length}): ${v(Math.round(monthlySubs))}/mo`);
      }
      if (savings.length) {
        const monthlySavings = savings.reduce((s, e) => s + toMonthly(Number(e.amount || 0), e.freq), 0);
        lines.push(`Savings contributions (${savings.length}): ${v(Math.round(monthlySavings))}/mo`);
      }
      if (oneoffs.length) {
        const totalOneoffs = oneoffs.reduce((s, e) => s + Number(e.amount || 0), 0);
        lines.push(`Planned one-offs (${oneoffs.length}): ${v(totalOneoffs)} total`);
        oneoffs.forEach(e => {
          lines.push(`  • ${anonymise ? 'One-off' : (e.name || 'Item')}: ${v(e.amount)}${e.age ? ` at age ${e.age}` : ''}`);
        });
      }
    }
  } catch (expErr) {
    console.warn('[Chat] Expenses read failed:', expErr);
  }

  if (anonymise) lines.push('\n(Values rounded to nearest £1,000 for privacy.)');

  return lines.join('\n');
}

function fmtNum(n) {
  if (n == null || n === '') return '0';
  return Number(n).toLocaleString('en-GB');
}

/* ── API key encryption helpers ── */

const CRYPTO_SALT = 'RetirementPlanner-v1';

async function deriveKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(CRYPTO_SALT + location.origin),
    'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(CRYPTO_SALT), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt'],
  );
}

async function encryptKey(plaintext) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // Store as base64: iv + ciphertext
  const buf = new Uint8Array(iv.length + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...buf));
}

async function decryptKey(stored) {
  try {
    const buf = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const iv = buf.slice(0, 12);
    const ct = buf.slice(12);
    const key = await deriveKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    // If decryption fails (e.g. old plaintext key), return as-is
    return stored;
  }
}

export function createChatService({ readState, calcProjection, evaluateStrategies }) {
  let conversationHistory = [];
  let sessionOnlyKey = null; // in-memory only, never persisted

  const SESSION_KEY = 'rp_chat_session_only';

  /* ── API Key: encrypted in localStorage, or session-only in memory ── */
  function getSessionOnly() { return localStorage.getItem(SESSION_KEY) === 'true'; }
  function setSessionOnly(v) { localStorage.setItem(SESSION_KEY, v ? 'true' : 'false'); }

  async function getApiKey() {
    if (sessionOnlyKey) return sessionOnlyKey;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return '';
    // Try to decrypt; if it fails, it was a plain-text legacy key – re-encrypt it
    const plain = await decryptKey(stored);
    if (plain === stored && stored.length < 60) {
      // Looks like a raw key – migrate to encrypted
      const encrypted = await encryptKey(stored);
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
    return plain;
  }
  async function setApiKey(key) {
    const trimmed = key.trim();
    if (getSessionOnly()) {
      sessionOnlyKey = trimmed;
      localStorage.removeItem(STORAGE_KEY);
    } else {
      sessionOnlyKey = null;
      const encrypted = await encryptKey(trimmed);
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
  }
  /** Synchronous getter for UI (shows masked version) */
  function getApiKeySync() {
    if (sessionOnlyKey) return sessionOnlyKey;
    return localStorage.getItem(STORAGE_KEY) ? '••••••••' : '';
  }
  function hasApiKey() { return !!(sessionOnlyKey || localStorage.getItem(STORAGE_KEY)); }

  function getModel() { return localStorage.getItem(MODEL_KEY) || ''; }
  function setModel(model) { localStorage.setItem(MODEL_KEY, model.trim()); }
  function getProvider() { return localStorage.getItem(PROVIDER_KEY) || 'google'; }
  function setProvider(p) {
    localStorage.setItem(PROVIDER_KEY, p);
    localStorage.removeItem(MODEL_KEY);
  }
  function getAnonymise() { return localStorage.getItem(PRIVACY_KEY) !== 'false'; } // default ON
  function setAnonymise(v) { localStorage.setItem(PRIVACY_KEY, v ? 'true' : 'false'); }

  function getEffectiveModel() {
    const saved = getModel();
    const provider = getProvider();
    if (saved) {
      const isGeminiModel = saved.startsWith('gemini');
      const isOpenAIModel = saved.startsWith('gpt') || saved.startsWith('o1') || saved.startsWith('o3');
      if ((provider === 'google' && isOpenAIModel) || (provider === 'openai' && isGeminiModel)) {
        localStorage.removeItem(MODEL_KEY);
        return PROVIDERS[provider]?.defaultModel || 'gemini-2.0-flash';
      }
      return saved;
    }
    return PROVIDERS[provider]?.defaultModel || 'gemini-2.0-flash';
  }

  function clearHistory() { conversationHistory = []; }

  /* ── Build context string (public, so UI can show preview) ── */
  function buildContextPreview() {
    try {
      const state = readState();
      return summariseState(state, getAnonymise(), calcProjection, evaluateStrategies);
    } catch (e) {
      return '(Could not read pension data)';
    }
  }

  /* ── List available models from provider ── */
  async function listModels() {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const provider = getProvider();
    if (provider === 'google') {
      return listGeminiModels(apiKey);
    } else {
      return listOpenAIModels(apiKey);
    }
  }

  async function listGeminiModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 400 || res.status === 403) throw new Error('INVALID_API_KEY');
      throw new Error(`Failed to list models (${res.status})`);
    }
    const data = await res.json();
    // Filter to models that support generateContent
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        label: m.displayName || m.name.replace('models/', ''),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async function listOpenAIModels(apiKey) {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error(`Failed to list models (${res.status})`);
    }
    const data = await res.json();
    return (data.data || [])
      .filter(m => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('o4'))
      .map(m => ({ id: m.id, label: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /* ── Google Gemini API ── */
  async function sendGemini(apiKey, model, contextBlock, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Build contents array from history + new message.
    // Always embed pension context in the user turn so the model can
    // reference the latest data on every question.
    const contents = [];
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Always prepend the pension context to the user message
    const enrichedMessage = `Here is my current pension situation:\n\n${contextBlock}\n\n---\n\nMy question: ${userMessage}`;
    contents.push({ role: 'user', parts: [{ text: enrichedMessage }] });

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    console.log('[Chat] Gemini request model:', model, 'contents length:', contents.length);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[Chat] Gemini HTTP error:', res.status, errBody);
      if (res.status === 400 && errBody.includes('API_KEY_INVALID')) throw new Error('INVALID_API_KEY');
      if (res.status === 403) throw new Error('INVALID_API_KEY');
      throw new Error(`Gemini API error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    console.log('[Chat] Gemini raw response:', JSON.stringify(data).slice(0, 500));

    // Check prompt-level blocking
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Response blocked by safety filter (${data.promptFeedback.blockReason}). Try rephrasing your question.`);
    }
    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('[Chat] Gemini returned no candidates. Full response:', JSON.stringify(data));
      throw new Error('No response from Gemini. This may be a safety filter issue — try rephrasing your question.');
    }
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filter. Try rephrasing your question.');
    }

    const text = candidate.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
    if (!text) {
      console.error('[Chat] Gemini returned empty text. Candidate:', JSON.stringify(candidate));
      throw new Error('Gemini returned an empty response. Check the browser console (F12) for details.');
    }
    return text;
  }

  /* ── OpenAI API ── */
  async function sendOpenAI(apiKey, model, contextBlock, userMessage) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Here is the user's current pension data:\n\n${contextBlock}` },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096, temperature: 0.7 }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (res.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Sorry, I didn\'t get a response.';
  }

  async function sendMessage(userMessage) {
    /* ── Layer 1: Try local Q&A first (instant, no data leaves browser) ── */
    const local = tryLocalAnswer(userMessage, readState, calcProjection, evaluateStrategies);
    if (local.answered) {
      const reply = local.text + '\n\n_Answered locally — no data was sent externally._';
      conversationHistory.push({ role: 'user', content: userMessage });
      conversationHistory.push({ role: 'assistant', content: reply });
      return { text: reply, source: 'local' };
    }

    /* ── Layer 2: LLM for explanations, what-if, and complex questions ── */
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const anonymise = getAnonymise();
    let contextBlock;
    try {
      const state = readState();
      contextBlock = summariseState(state, anonymise, calcProjection, evaluateStrategies);
      console.log('[Chat] Context built OK, anonymised:', anonymise, '— length:', contextBlock.length);
    } catch (stateErr) {
      console.warn('[Chat] Failed to read pension state:', stateErr);
      contextBlock = 'Could not read the current pension data from the form. The user may not have entered data yet.';
    }

    const provider = getProvider();
    const model = getEffectiveModel();

    let reply;
    if (provider === 'google') {
      reply = await sendGemini(apiKey, model, contextBlock, userMessage);
    } else {
      reply = await sendOpenAI(apiKey, model, contextBlock, userMessage);
    }

    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: reply });
    return { text: reply, source: 'llm' };
  }

  return {
    sendMessage, clearHistory, buildContextPreview,
    getApiKey, setApiKey, getApiKeySync, hasApiKey,
    getModel, setModel,
    getProvider, setProvider, getEffectiveModel,
    getAnonymise, setAnonymise,
    getSessionOnly, setSessionOnly,
    listModels, PROVIDERS,
  };
}
