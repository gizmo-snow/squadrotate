// ── Tests: buildAdjustedPlan (issue #28) ─────────────────────────────────────

QUnit.module('buildAdjustedPlan', () => {

  // Helper: build a week fixture with named stations
  function makeWeek(stations) {
    return { stations };
  }

  QUnit.test('returns null when no coaches are absent', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Passing drill' },
      { coach: 'Coach B', drill: 'Shooting drill' },
    ]);
    const avail = { 'Coach A': true, 'Coach B': true };
    assert.equal(buildAdjustedPlan(week, avail), null, 'null when everyone present');
  });

  QUnit.test('returns empty array when all coaches are absent', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Passing drill' },
      { coach: 'Coach B', drill: 'Shooting drill' },
    ]);
    const avail = { 'Coach A': false, 'Coach B': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.deepEqual(plan, [], 'empty array when all absent');
  });

  QUnit.test('present coaches keep their own drill', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Passing drill' },
      { coach: 'Coach B', drill: 'Shooting drill' },
    ]);
    const avail = { 'Coach B': false }; // Coach A present (key missing = present)
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan.length, 1, 'one coach in plan');
    assert.equal(plan[0].coach, 'Coach A', 'Coach A present');
    assert.equal(plan[0].drills[0].text, 'Passing drill', 'own drill retained');
    assert.equal(plan[0].drills[0].from, null, 'own drill has from: null');
  });

  QUnit.test("absent coach's drill is distributed to present coach", assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Passing drill' },
      { coach: 'Coach B', drill: 'Shooting drill' },
    ]);
    const avail = { 'Coach B': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan[0].drills.length, 2, 'Coach A gets 2 drills');
    assert.equal(plan[0].drills[1].text, 'Shooting drill', 'absent drill text');
    assert.equal(plan[0].drills[1].from, 'Coach B', 'attributed to absent coach');
  });

  QUnit.test('multiple absent drills distributed round-robin', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Drill A' },
      { coach: 'Coach B', drill: 'Drill B' },
      { coach: 'Coach C', drill: 'Drill C' },
    ]);
    // Coach A present, B + C absent
    const avail = { 'Coach B': false, 'Coach C': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan.length, 1, 'one present coach');
    // Both absent drills should end up on Coach A (round-robin with 1 present coach)
    assert.equal(plan[0].drills.length, 3, 'own drill + 2 redistributed');
    assert.equal(plan[0].drills[1].from, 'Coach B');
    assert.equal(plan[0].drills[2].from, 'Coach C');
  });

  QUnit.test('round-robin spreads across multiple present coaches', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Drill A' },
      { coach: 'Coach B', drill: 'Drill B' },
      { coach: 'Coach C', drill: 'Drill C' },
      { coach: 'Coach D', drill: 'Drill D' },
    ]);
    // A + B present, C + D absent
    const avail = { 'Coach C': false, 'Coach D': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan.length, 2, 'two present coaches');
    // C (absent index 0) → plan[0] (Coach A); D (absent index 1) → plan[1] (Coach B)
    assert.equal(plan[0].drills.length, 2, 'Coach A has own + 1 redistributed');
    assert.equal(plan[1].drills.length, 2, 'Coach B has own + 1 redistributed');
    assert.equal(plan[0].drills[1].from, 'Coach C');
    assert.equal(plan[1].drills[1].from, 'Coach D');
  });

  QUnit.test('absent coach with no drill does not add to plan', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: 'Drill A' },
      { coach: 'Coach B', drill: '' }, // no drill
    ]);
    const avail = { 'Coach B': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan[0].drills.length, 1, 'only own drill — nothing added for empty absent drill');
  });

  QUnit.test('present coach with no drill starts with empty drills array', assert => {
    const week = makeWeek([
      { coach: 'Coach A', drill: '' }, // no drill
      { coach: 'Coach B', drill: 'Drill B' },
    ]);
    const avail = { 'Coach B': false };
    const plan = buildAdjustedPlan(week, avail);
    assert.equal(plan[0].drills.length, 1, 'receives only the absent drill');
    assert.equal(plan[0].drills[0].from, 'Coach B');
  });

});
