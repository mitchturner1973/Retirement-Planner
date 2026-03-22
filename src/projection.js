/**
 * Compatibility facade.
 *
 * app.js still imports from this file, but the logic now lives under:
 * - src/domain
 * - src/engines
 * - src/services
 * - src/rules
 */
import { realRate } from './core/math.js';
import { normaliseSourceData } from './domain/sourceNormaliser.js';
import { dbIncomeAtAge } from './engines/dbEngine.js';
import {
  extraContribForPotAtAge,
  clonePots,
  totalPot,
  withdrawFromPotsByPriority,
} from './engines/dcEngine.js';
import { taxAndNetFromGrossPension } from './engines/taxEngine.js';
import { calcProjection, calcBridge } from './engines/projectionEngine.js';

export {
  normaliseSourceData,
  dbIncomeAtAge,
  extraContribForPotAtAge,
  clonePots,
  totalPot,
  withdrawFromPotsByPriority,
  taxAndNetFromGrossPension,
  calcProjection,
  calcBridge,
  realRate,
};
