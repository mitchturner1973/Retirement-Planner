# Manual regression test cases

## 1. Drawdown at retirement
- Pot at retirement: £772,614
- Drawdown: 5%
- Expected gross DC withdrawal: about £38,631

## 2. State Pension starts at 67
- State Pension: £12,000
- Check projection and overview stay aligned
- Total net income should be higher than DC net income

## 3. Fixed lump sum at 60
- DC lump sum type: PCLS
- Amount type: Fixed £
- Amount: £30,000
- Expected one-off lump sum on age 60 row: £30,000

## 4. Remaining TFLS / LSA
- Trigger one or more DC lump sums
- Check remaining TFLS / LSA reduces in the correct year

## 5. CPI-linked DB pension
- Add a DB pension with increase type: CPI-linked
- Check DB income stays broadly level in today's-money terms

## 6. DB pension with custom Normal Pension Age (NPA)
- Add a DB pension with start age 60
- Set NPA field to 62
- Generate strategies
- Check that strategy comparison includes timing variants (early/at NPA/deferred)
- Verify timing is relative to NPA=62, not start age 60

## 7. DB Early Reduction factors
- Add a DB pension
- Set DB Early Reduction % to 5%
- Adjust minium desired income to force early drawdown strategy
- Check that strategy income is reduced correctly (compounded 5% per year before NPA)
- Confirm early strategies rank lower than on-time or deferred

## 8. DB Deferral Increase factors
- Add a DB pension with start age 62
- Set DB Deferral Increase % to 6%
- Force a deferred strategy by setting targets appropriately
- Check that deferred income is increased correctly (compounded 6% per year after NPA)
- Confirm deferred strategies show higher income in strategy comparison

## 9. DB Timing column in strategy comparison
- Add one or more DB pensions
- Review Strategy tab > strategy comparison table
- Verify new DB Timing column appears and displays:
  - Age taken
  - Reduction context (e.g., early, at NPA, deferred+years)
- Column should be readable without excessive text wrapping
- Should not dominate horizontal space

