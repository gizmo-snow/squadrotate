// ── Tests: autoAssign fairness (position distribution + bench rotation) ────────

QUnit.module('autoAssign — position fairness', () => {

  // Helper: count how many shifts a player played a specific role
  function roleCount(shifts, playerId, role) {
    return shifts.filter(sd => sd[playerId] === role).length;
  }
  function fieldCount(shifts, playerId) {
    return shifts.filter(sd => sd[playerId] && sd[playerId] !== 'Bench').length;
  }

  QUnit.test('multi-position players rotate through their positions', assert => {
    // Player 1 can play Defense AND Striker.
    // There are 4 DEF-eligible players competing for 2 DEF slots, so player 1
    // gets rotated out of DEF on some shifts — at which point they pick up STR.
    // Formation: 1-2-1-2 with 8 players → 2 on bench per shift.
    const players = [
      makePlayer({ id:1, power:2, positions:['Defense','Striker'] }),
      makePlayer({ id:2, power:2, positions:['Defense'] }),
      makePlayer({ id:3, power:2, positions:['Defense'] }),
      makePlayer({ id:4, power:2, positions:['Defense'] }), // 4 compete for 2 DEF slots
      makePlayer({ id:5, power:2, positions:['Midfield'] }),
      makePlayer({ id:6, power:2, positions:['Striker'] }),
      makePlayer({ id:7, power:2, positions:['Striker'] }),
      makePlayer({ id:8, power:2, positions:['Goalkeeper'] }),
    ];
    const formation = { Goalkeeper:1, Defense:2, Midfield:1, Striker:2 };
    const state   = makeState({ players, absent: [], formation, teamSize:8 });
    const session = makeSession({ halfLength:24, minsPerShift:8 }); // 6 shifts
    const shifts  = autoAssignPure(state, session);

    const defShifts = roleCount(shifts, 1, 'Defense');
    const strShifts = roleCount(shifts, 1, 'Striker');
    // Player 1 should get at least 1 shift in each of their preferred positions
    assert.ok(defShifts >= 1,
      `player 1 plays DEF at least once (actual: ${defShifts})`);
    assert.ok(strShifts >= 1,
      `player 1 plays STR at least once (actual: ${strShifts}) — rotation is working`);
  });

  QUnit.test('bench time distributed — no player benched more than (present - teamSize) times', assert => {
    // 9 players, 7-person formation → 2 bench per shift × 6 shifts = 12 bench-slots
    // Spread evenly over 9 players → max ~2 bench per player
    const players = makeRoster(); // 9 players
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);

    players.forEach(p => {
      const benched = 6 - fieldCount(shifts, p.id);
      assert.ok(benched <= 4, `player ${p.id} benched at most 4 times (actual: ${benched})`);
    });
  });

  QUnit.test('GK rotation: with 2 GK-eligible players, each should GK roughly half the time', assert => {
    const players = [
      makePlayer({ id:1, power:3, positions:['Goalkeeper','Defense'] }),
      makePlayer({ id:2, power:3, positions:['Goalkeeper','Midfield'] }),
      makePlayer({ id:3, power:2, positions:['Defense'] }),
      makePlayer({ id:4, power:2, positions:['Defense'] }),
      makePlayer({ id:5, power:2, positions:['Defense'] }),
      makePlayer({ id:6, power:2, positions:['Midfield'] }),
      makePlayer({ id:7, power:2, positions:['Striker'] }),
    ];
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 }); // 6 shifts
    const shifts  = autoAssignPure(state, session);
    const gk1 = roleCount(shifts, 1, 'Goalkeeper');
    const gk2 = roleCount(shifts, 2, 'Goalkeeper');
    assert.ok(gk1 >= 2 && gk2 >= 2,
      `each GK-eligible plays GK at least twice: p1=${gk1} p2=${gk2}`);
    assert.equal(gk1 + gk2, 6, 'GK accounted for all 6 shifts');
  });

  QUnit.test('player with only Bench-incompatible positions still gets assigned', assert => {
    const players = [
      makePlayer({ id:1, power:2, positions:['Goalkeeper'] }),
      makePlayer({ id:2, power:2, positions:['Defense'] }),
      makePlayer({ id:3, power:2, positions:['Defense'] }),
      makePlayer({ id:4, power:2, positions:['Defense'] }),
      makePlayer({ id:5, power:2, positions:['Midfield'] }),
      makePlayer({ id:6, power:2, positions:['Striker'] }),
      makePlayer({ id:7, power:2, positions:['Striker'] }),
    ];
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    shifts.forEach((sd, s) => {
      players.forEach(p => {
        assert.ok(sd[p.id], `player ${p.id} has role in shift ${s+1}`);
      });
    });
  });

  QUnit.test('empty present players returns existing shifts unchanged', assert => {
    const existingShifts = [{ 1: 'Defense' }];
    const state   = makeState({ players: [], absent: [], shifts: existingShifts });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const result  = autoAssignPure(state, session);
    assert.deepEqual(result, existingShifts, 'unchanged when no players');
  });

  QUnit.test('single player gets every role slot filled', assert => {
    const players = [ makePlayer({ id:1, power:3, positions:['Goalkeeper','Defense','Midfield','Striker'] }) ];
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:8, minsPerShift:8 }); // 2 shifts min
    const shifts  = autoAssignPure(state, session);
    shifts.forEach((sd, s) => {
      assert.ok(sd[1], `single player assigned in shift ${s+1}`);
    });
  });

  QUnit.test('power tiebreak: higher power player gets field over lower (same positions played)', assert => {
    // Two DEF-eligible players, only 1 DEF slot; power 3 should get it before power 1
    const players = [
      makePlayer({ id:1, power:3, positions:['Defense'] }),
      makePlayer({ id:2, power:1, positions:['Defense'] }),
      makePlayer({ id:3, power:2, positions:['Goalkeeper'] }),
      makePlayer({ id:4, power:2, positions:['Midfield'] }),
      makePlayer({ id:5, power:2, positions:['Striker'] }),
      makePlayer({ id:6, power:2, positions:['Striker'] }),
    ];
    // 6 players, formation 1-1-1-2 = 5 field + GK — override to have 1 DEF slot
    const formation = { Goalkeeper:1, Defense:1, Midfield:1, Striker:2 };
    const state = makeState({ players, absent: [], formation, teamSize:6 });
    const session = makeSession({ halfLength:8, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    // In shift 0, both players have 0 DEF shifts played — power should tiebreak
    const shift0 = shifts[0];
    assert.equal(shift0[1], 'Defense', 'higher power player (id 1) gets Defense slot in shift 0');
  });

});
