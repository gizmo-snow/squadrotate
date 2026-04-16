// ── Tests: getNumShifts / getShiftRemainder (issue #8) ───────────────────────
// Formula: Math.max(2, (Math.floor(halfLength / minsPerShift) + bonus) * 2)
// where bonus = remainder > 5 ? 1 : 0.  Returns total shifts across BOTH halves.

QUnit.module('getNumShifts', () => {

  QUnit.test('25 min halves / 8 min shifts → 6 (3 per half × 2)', assert => {
    assert.equal(getNumShifts({ halfLength:25, minsPerShift:8 }), 6);
  });

  QUnit.test('24 min halves / 8 min shifts → 6 (exact, 3 per half × 2)', assert => {
    assert.equal(getNumShifts({ halfLength:24, minsPerShift:8 }), 6);
  });

  QUnit.test('25 min halves / 6 min shifts → 8 (4 per half × 2)', assert => {
    assert.equal(getNumShifts({ halfLength:25, minsPerShift:6 }), 8);
  });

  QUnit.test('16 min halves / 8 min shifts → 4 (2 per half × 2)', assert => {
    assert.equal(getNumShifts({ halfLength:16, minsPerShift:8 }), 4);
  });

  QUnit.test('null session → fallback 6', assert => {
    assert.equal(getNumShifts(null), 6);
  });

  QUnit.test('undefined session → fallback 6', assert => {
    assert.equal(getNumShifts(undefined), 6);
  });

  QUnit.test('minsPerShift greater than halfLength → minimum 2', assert => {
    assert.equal(getNumShifts({ halfLength:5, minsPerShift:10 }), 2);
  });

  QUnit.test('exact division 24/6 → 8 (4 per half × 2)', assert => {
    assert.equal(getNumShifts({ halfLength:24, minsPerShift:6 }), 8);
    assert.equal(getShiftRemainder({ halfLength:24, minsPerShift:6 }), 0);
  });

  QUnit.test('remainder > 5 adds bonus shift per half (30/8 → 8)', assert => {
    // 30 / 8 = 3 remainder 6; 6 > 5 so bonus = 1; (3+1)*2 = 8
    assert.equal(getNumShifts({ halfLength:30, minsPerShift:8 }), 8);
  });

  QUnit.test('remainder ≤ 5 does not add bonus (29/8 → 6)', assert => {
    // 29 / 8 = 3 remainder 5; 5 is NOT > 5, bonus = 0; 3*2 = 6
    assert.equal(getNumShifts({ halfLength:29, minsPerShift:8 }), 6);
  });

});

QUnit.module('getShiftRemainder', () => {

  QUnit.test('25 / 8 → remainder 1', assert => {
    assert.equal(getShiftRemainder({ halfLength:25, minsPerShift:8 }), 1);
  });

  QUnit.test('25 / 6 → remainder 1', assert => {
    assert.equal(getShiftRemainder({ halfLength:25, minsPerShift:6 }), 1);
  });

  QUnit.test('null session → 0', assert => {
    assert.equal(getShiftRemainder(null), 0);
  });

});
