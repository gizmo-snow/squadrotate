// ── Tests: getNumShifts / getShiftRemainder (issue #8) ───────────────────────

QUnit.module('getNumShifts', () => {

  QUnit.test('25 min halves / 8 min shifts → 3', assert => {
    assert.equal(getNumShifts({ halfLength:25, minsPerShift:8 }), 3);
  });

  QUnit.test('24 min halves / 8 min shifts → 3 (exact)', assert => {
    assert.equal(getNumShifts({ halfLength:24, minsPerShift:8 }), 3);
  });

  QUnit.test('25 min halves / 6 min shifts → 4', assert => {
    assert.equal(getNumShifts({ halfLength:25, minsPerShift:6 }), 4);
  });

  QUnit.test('16 min halves / 8 min shifts → 2', assert => {
    assert.equal(getNumShifts({ halfLength:16, minsPerShift:8 }), 2);
  });

  QUnit.test('null session → fallback 6', assert => {
    assert.equal(getNumShifts(null), 6);
  });

  QUnit.test('undefined session → fallback 6', assert => {
    assert.equal(getNumShifts(undefined), 6);
  });

  QUnit.test('minsPerShift greater than halfLength → minimum 1', assert => {
    assert.equal(getNumShifts({ halfLength:5, minsPerShift:10 }), 1);
  });

  QUnit.test('exact division produces no remainder', assert => {
    assert.equal(getNumShifts({ halfLength:24, minsPerShift:6 }), 4);
    assert.equal(getShiftRemainder({ halfLength:24, minsPerShift:6 }), 0);
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
