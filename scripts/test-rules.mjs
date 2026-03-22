import { getRulesPack, applyRulesDefaults } from '../src/services/rulesRegistry.js';

const pack2025 = getRulesPack({ country: 'UK', taxYear: '2025-26' });
const state = applyRulesDefaults({ taxYear: '2025-26' });

console.log('Loaded rules pack:', pack2025.taxYear);
console.log('Default lump sum allowance:', state.tflsCap);
console.log('Default personal allowance:', state.allowance);
