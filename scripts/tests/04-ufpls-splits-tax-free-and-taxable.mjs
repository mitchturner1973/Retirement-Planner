import { assert, approxEqual, baseState, buildDcTaxResult, logPass } from './_helpers.mjs';

const state = baseState({ allowance: 12570, higherThreshold: 37700, basicTax: 20, higherTax: 40 });
const result = buildDcTaxResult(
  state,
  { drawdownGross: 0, pclsGross: 0, ufplsGross: 40000, taxableLumpGross: 0 },
  0,
  0,
  0,
  0,
);

assert.equal(result.ufplsTf, 10000);
approxEqual(result.tax, 3486, 0.01, 'UFPLS tax');
approxEqual(result.net, 36514, 0.01, 'UFPLS net');
logPass('UFPLS splits into tax-free and taxable parts correctly');
