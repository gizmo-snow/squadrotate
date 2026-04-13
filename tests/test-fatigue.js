// ── Tests: computeFatigueWarnings (issue #9) ─────────────────────────────────

QUnit.module('computeFatigueWarnings', () => {

  QUnit.test('no warnings when no consecutive attacking shifts', assert => {
    const shifts = [
      { 1:'Striker',  2:'Defense'  },
      { 1:'Defense',  2:'Striker'  },
      { 1:'Striker',  2:'Defense'  },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.equal(warnings.size, 0, 'no warnings');
  });

  QUnit.test('consecutive STR shifts flag the second shift', assert => {
    const shifts = [
      { 1:'Striker' },
      { 1:'Striker' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'player 1 warned in shift index 1');
    assert.equal(warnings.size, 1, 'only one warning');
  });

  QUnit.test('consecutive MID shifts flag the second shift', assert => {
    const shifts = [
      { 1:'Midfield' },
      { 1:'Midfield' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'player 1 warned');
  });

  QUnit.test('STR then MID is also flagged', assert => {
    const shifts = [
      { 1:'Striker'  },
      { 1:'Midfield' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'STR→MID consecutive flagged');
  });

  QUnit.test('MID then STR is also flagged', assert => {
    const shifts = [
      { 1:'Midfield' },
      { 1:'Striker'  },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'MID→STR consecutive flagged');
  });

  QUnit.test('bench between attacking shifts breaks the chain', assert => {
    const shifts = [
      { 1:'Striker' },
      { 1:'Bench'   },
      { 1:'Striker' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.notOk(warnings.has('1_2'), 'no warning after bench break');
    assert.equal(warnings.size, 0, 'no warnings at all');
  });

  QUnit.test('defense between attacking shifts breaks the chain', assert => {
    const shifts = [
      { 1:'Striker'  },
      { 1:'Defense'  },
      { 1:'Striker'  },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.equal(warnings.size, 0, 'no warnings — DEF broke the chain');
  });

  QUnit.test('three consecutive attacking shifts produce two warnings', assert => {
    const shifts = [
      { 1:'Striker' },
      { 1:'Striker' },
      { 1:'Striker' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'warning at shift index 1');
    assert.ok(warnings.has('1_2'), 'warning at shift index 2');
    assert.equal(warnings.size, 2);
  });

  QUnit.test('multiple players each get independent warnings', assert => {
    const shifts = [
      { 1:'Striker',  2:'Midfield' },
      { 1:'Striker',  2:'Midfield' },
    ];
    const warnings = computeFatigueWarnings(shifts);
    assert.ok(warnings.has('1_1'), 'player 1 warned');
    assert.ok(warnings.has('2_1'), 'player 2 warned');
    assert.equal(warnings.size, 2);
  });

});
