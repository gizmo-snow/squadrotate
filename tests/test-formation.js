// ── Tests: formation helpers (issue #12) ─────────────────────────────────────

QUnit.module('getFormation', () => {

  QUnit.test('returns state.formation when present', assert => {
    const state = makeState({ formation: { Goalkeeper:1, Defense:2, Midfield:2, Striker:2 } });
    const f = getFormation(state);
    assert.equal(f.Defense, 2, 'Defense count from state');
    assert.equal(f.Midfield, 2, 'Midfield count from state');
  });

  QUnit.test('returns default formation when state has none', assert => {
    const state = makeState();
    delete state.formation;
    const f = getFormation(state);
    assert.equal(f.Goalkeeper, 1, 'default GK');
    assert.equal(f.Defense,    3, 'default DEF');
    assert.equal(f.Midfield,   1, 'default MID');
    assert.equal(f.Striker,    2, 'default STR');
  });

  QUnit.test('returns default when state is null', assert => {
    const f = getFormation(null);
    assert.equal(f.Goalkeeper, 1);
    assert.equal(f.Striker,    2);
  });

});

QUnit.module('validateFormation', () => {

  QUnit.test('valid 3-1-2 formation with teamSize 7', assert => {
    const err = validateFormation({ Goalkeeper:1, Defense:3, Midfield:1, Striker:2 }, 7);
    assert.equal(err, null, 'no error for valid formation');
  });

  QUnit.test('invalid: total 6 with teamSize 7 → error', assert => {
    const err = validateFormation({ Goalkeeper:1, Defense:2, Midfield:1, Striker:2 }, 7);
    assert.ok(err, 'error returned');
    assert.ok(err.includes('6'), 'mentions actual total');
    assert.ok(err.includes('7'), 'mentions team size');
  });

  QUnit.test('invalid: total 8 with teamSize 7 → error', assert => {
    const err = validateFormation({ Goalkeeper:1, Defense:3, Midfield:2, Striker:2 }, 7);
    assert.ok(err, 'error returned');
  });

  QUnit.test('valid 2-2-1 formation with teamSize 6', assert => {
    const err = validateFormation({ Goalkeeper:1, Defense:2, Midfield:2, Striker:1 }, 6);
    assert.equal(err, null, 'no error for 6v6 formation');
  });

});

QUnit.module('applyFormationMigration', () => {

  QUnit.test('adds formation and teamSize when missing', assert => {
    const loaded = { players:[], shifts:[], absent:[], nextId:1 };
    const migrated = applyFormationMigration(loaded);
    assert.ok(migrated.formation, 'formation added');
    assert.equal(migrated.formation.Goalkeeper, 1, 'default GK');
    assert.equal(migrated.teamSize, 7, 'teamSize added');
  });

  QUnit.test('does not overwrite existing formation', assert => {
    const loaded = {
      players:[], shifts:[], absent:[], nextId:1,
      formation: { Goalkeeper:1, Defense:2, Midfield:2, Striker:2 },
      teamSize: 7
    };
    const migrated = applyFormationMigration(loaded);
    assert.equal(migrated.formation.Defense, 2, 'custom formation preserved');
  });

});
