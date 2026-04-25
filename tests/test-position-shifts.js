// ── Tests: positionShiftsPlayed + shiftsPlayedPure ───────────────────────────

QUnit.module('positionShiftsPlayed', () => {

  QUnit.test('returns 0 for shift 0 (nothing played yet)', assert => {
    const shifts = [{ 1: 'Striker' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 0), 0);
  });

  QUnit.test('counts one previous Striker shift', assert => {
    const shifts = [{ 1: 'Striker' }, { 1: 'Defense' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 1), 1);
  });

  QUnit.test('only counts the asked-for role', assert => {
    const shifts = [{ 1: 'Defense' }, { 1: 'Striker' }, { 1: 'Defense' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 3), 1, 'only 1 Striker');
    assert.equal(positionShiftsPlayed(shifts, 1, 'Defense', 3), 2, 'two Defense');
  });

  QUnit.test('does not count Bench as any position', assert => {
    const shifts = [{ 1: 'Bench' }, { 1: 'Bench' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Bench', 2), 2, 'Bench counted if queried');
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 2), 0, 'no Striker shifts');
  });

  QUnit.test('returns 0 for player not in any shift', assert => {
    const shifts = [{ 2: 'Striker' }, { 2: 'Striker' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 2), 0);
  });

  QUnit.test('respects beforeShift boundary', assert => {
    const shifts = [{ 1: 'Striker' }, { 1: 'Striker' }, { 1: 'Striker' }];
    assert.equal(positionShiftsPlayed(shifts, 1, 'Striker', 2), 2, 'only looks at first 2');
  });

});

QUnit.module('shiftsPlayedPure', () => {

  QUnit.test('returns 0 at shift 0', assert => {
    const shifts = [{ 1: 'Striker' }];
    assert.equal(shiftsPlayedPure(shifts, 1, 0), 0);
  });

  QUnit.test('counts field shifts but not bench', assert => {
    const shifts = [
      { 1: 'Striker' },
      { 1: 'Bench'   },
      { 1: 'Defense' },
    ];
    assert.equal(shiftsPlayedPure(shifts, 1, 3), 2, 'two field shifts');
  });

  QUnit.test('Bench is never counted', assert => {
    const shifts = [{ 1: 'Bench' }, { 1: 'Bench' }, { 1: 'Bench' }];
    assert.equal(shiftsPlayedPure(shifts, 1, 3), 0);
  });

  QUnit.test('player not present in shifts counts as 0', assert => {
    const shifts = [{ 2: 'Defense' }];
    assert.equal(shiftsPlayedPure(shifts, 1, 1), 0);
  });

});
