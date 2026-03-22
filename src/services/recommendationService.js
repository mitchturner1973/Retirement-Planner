/**
 * Placeholder layer for future strategy comparison / AI explanation.
 * Keep recommendation logic separate from deterministic engines.
 */
export function summariseScenario(result) {
  return {
    potAtRetirement: result.potAtRet,
    recurringNetIncomeAtRetirement: result.netAtRet,
    statePensionAtRetirement: result.stateAtRet,
    dbIncomeAtRetirement: result.dbAtRet,
    remainingLsaAtRetirement: result.remainingLsaAtRet,
  };
}
