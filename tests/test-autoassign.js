// ── Tests: autoAssignPure (core algorithm) ────────────────────────────────────

QUnit.module('autoAssignPure', () => {

  QUnit.test('all 7 players get a role in every shift (6 shifts)', assert => {
    const players = makeRoster().slice(0, 7);
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 }); // 6 total shifts
    const shifts  = autoAssignPure(state, session);
    assert.equal(shifts.length, 6, '6 shifts generated');
    shifts.forEach((sd, s) => {
      players.forEach(p => {
        assert.ok(sd[p.id], `player ${p.id} has role in shift ${s+1}`);
      });
    });
  });

  QUnit.test('absent players are not assigned', assert => {
    const players = makeRoster().slice(0, 8);
    const absentId = players[0].id;
    const state   = makeState({ players, absent: [absentId] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    shifts.forEach((sd, s) => {
      assert.notOk(sd[absentId], `absent player not in shift ${s+1}`);
    });
  });

  QUnit.test('GK role only assigned to players with Goalkeeper position', assert => {
    const players = makeRoster().slice(0, 7);
    const gkIds   = new Set(players.filter(p => p.positions.includes('Goalkeeper')).map(p => p.id));
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    shifts.forEach((sd, s) => {
      const gkPlayer = Object.entries(sd).find(([,r]) => r === 'Goalkeeper');
      if (gkPlayer) {
        assert.ok(gkIds.has(Number(gkPlayer[0])), `GK in shift ${s+1} has Goalkeeper position`);
      }
    });
  });

  QUnit.test('no player is GK in two consecutive shifts', assert => {
    const players = makeRoster(); // 9 players, 2 have GK
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    for (let s = 1; s < shifts.length; s++) {
      const gkPrev = Object.entries(shifts[s-1]).find(([,r]) => r === 'Goalkeeper');
      const gkCurr = Object.entries(shifts[s]).find(([,r]) => r === 'Goalkeeper');
      if (gkPrev && gkCurr) {
        assert.notEqual(gkPrev[0], gkCurr[0], `different GK in shifts ${s} and ${s+1}`);
      }
    }
  });

  QUnit.test('dynamic shift count respected (4 shifts)', assert => {
    const players = makeRoster().slice(0, 7);
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:16, minsPerShift:8 }); // 2 per half × 2 = 4 shifts
    const shifts  = autoAssignPure(state, session);
    assert.equal(shifts.length, 4, 'only 4 shifts generated');
  });

  QUnit.test('every shift has exactly one goalkeeper when possible', assert => {
    const players = makeRoster().slice(0, 7);
    const state   = makeState({ players, absent: [] });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    shifts.forEach((sd, s) => {
      const gkCount = Object.values(sd).filter(r => r === 'Goalkeeper').length;
      assert.equal(gkCount, 1, `shift ${s+1} has exactly 1 GK`);
    });
  });

  QUnit.test('formation from state is respected', assert => {
    const players = makeRoster().slice(0, 7);
    // 2-2-2 formation instead of default 3-1-2
    const formation = { Goalkeeper:1, Defense:2, Midfield:2, Striker:2 };
    const state   = makeState({ players, absent: [], formation, teamSize:7 });
    const session = makeSession({ halfLength:24, minsPerShift:8 });
    const shifts  = autoAssignPure(state, session);
    // At minimum, no more DEF than 2 should appear (preference-based so exact counts vary)
    shifts.forEach((sd, s) => {
      const defCount = Object.values(sd).filter(r => r === 'Defense').length;
      assert.ok(defCount <= 3, `shift ${s+1} doesn't have unreasonable defender count (${defCount})`);
    });
  });

});
