// ── Tests: session store pure logic ───────────────────────────────────────────

QUnit.module('makeSessionsStore', () => {

  QUnit.test('creates store with single session as active', assert => {
    const sess = makeSession();
    const store = makeSessionsStore(sess);
    assert.equal(store.activeSessionId, sess.id, 'activeSessionId set');
    assert.equal(store.sessions.length, 1,        'one session in store');
    assert.equal(store.sessions[0].id, sess.id,   'session present');
  });

});

QUnit.module('getActiveSessionPure', () => {

  QUnit.test('returns session matching activeSessionId', assert => {
    const s1 = makeSession({ id:'s1', opponent:'Alpha' });
    const s2 = makeSession({ id:'s2', opponent:'Beta' });
    const store = { activeSessionId: 's2', sessions: [s1, s2] };
    const active = getActiveSessionPure(store);
    assert.equal(active.id, 's2', 'returns second session');
    assert.equal(active.opponent, 'Beta');
  });

  QUnit.test('falls back to first session when activeSessionId not found', assert => {
    const s1 = makeSession({ id:'s1', opponent:'Alpha' });
    const store = { activeSessionId: 'missing', sessions: [s1] };
    const active = getActiveSessionPure(store);
    assert.equal(active.id, 's1', 'falls back to first');
  });

  QUnit.test('returns null for null store', assert => {
    assert.equal(getActiveSessionPure(null), null);
  });

  QUnit.test('returns null for empty sessions array', assert => {
    const store = { activeSessionId: 'x', sessions: [] };
    assert.equal(getActiveSessionPure(store), null);
  });

});

QUnit.module('switchSessionPure', () => {

  QUnit.test('updates activeSessionId without mutating original', assert => {
    const store = { activeSessionId: 's1', sessions: [makeSession({id:'s1'}), makeSession({id:'s2'})] };
    const updated = switchSessionPure(store, 's2');
    assert.equal(updated.activeSessionId, 's2', 'updated to s2');
    assert.equal(store.activeSessionId, 's1', 'original not mutated');
  });

  QUnit.test('sessions array is preserved', assert => {
    const sessions = [makeSession({id:'s1'}), makeSession({id:'s2'})];
    const store = { activeSessionId: 's1', sessions };
    const updated = switchSessionPure(store, 's2');
    assert.equal(updated.sessions.length, 2, 'sessions unchanged');
  });

});

QUnit.module('player CRUD — pure', () => {

  QUnit.test('addPlayerPure: adds player with correct id and experience', assert => {
    const { players, nextId } = addPlayerPure([], 1, {
      name: 'Test Player', power: 3, positions: ['Defense'], kit: '5'
    });
    assert.equal(players.length, 1, 'one player added');
    assert.equal(players[0].id, 1, 'id is 1');
    assert.equal(players[0].experience, 'Very experienced', 'power→experience mapping');
    assert.equal(players[0].kit, '5');
    assert.equal(nextId, 2, 'nextId incremented');
  });

  QUnit.test('addPlayerPure: increments ids correctly', assert => {
    let players = [];
    let nextId = 1;
    ({ players, nextId } = addPlayerPure(players, nextId, { name:'A', power:2, positions:['Defense'] }));
    ({ players, nextId } = addPlayerPure(players, nextId, { name:'B', power:1, positions:['Striker'] }));
    assert.equal(players.length, 2);
    assert.equal(players[0].id, 1);
    assert.equal(players[1].id, 2);
    assert.equal(nextId, 3);
  });

  QUnit.test('addPlayerPure: power 1 → "Little experience"', assert => {
    const { players } = addPlayerPure([], 1, { name:'X', power:1, positions:['Striker'] });
    assert.equal(players[0].experience, 'Little experience');
  });

  QUnit.test('addPlayerPure: power 2 → "Some experience"', assert => {
    const { players } = addPlayerPure([], 1, { name:'X', power:2, positions:['Defense'] });
    assert.equal(players[0].experience, 'Some experience');
  });

  QUnit.test('editPlayerPure: updates correct player by id', assert => {
    const original = [
      makePlayer({ id:1, name:'Alice' }),
      makePlayer({ id:2, name:'Bob' }),
    ];
    const updated = editPlayerPure(original, 1, { name:'Alicia', power:3 });
    assert.equal(updated[0].name, 'Alicia', 'name updated');
    assert.equal(updated[0].power, 3,       'power updated');
    assert.equal(updated[1].name, 'Bob',    'other player unchanged');
    assert.equal(updated.length, 2,         'player count unchanged');
  });

  QUnit.test('editPlayerPure: returns same array length', assert => {
    const players = [makePlayer({ id:1 }), makePlayer({ id:2 }), makePlayer({ id:3 })];
    const updated = editPlayerPure(players, 2, { name:'Changed' });
    assert.equal(updated.length, 3);
  });

  QUnit.test('editPlayerPure: nonexistent id leaves all players unchanged', assert => {
    const players = [makePlayer({ id:1, name:'Alice' })];
    const updated = editPlayerPure(players, 99, { name:'Ghost' });
    assert.equal(updated[0].name, 'Alice', 'no change');
  });

  QUnit.test('deletePlayerPure: removes correct player', assert => {
    const players = [makePlayer({ id:1 }), makePlayer({ id:2 }), makePlayer({ id:3 })];
    const result = deletePlayerPure(players, 2);
    assert.equal(result.length, 2, 'one fewer player');
    assert.notOk(result.find(p => p.id === 2), 'id 2 gone');
  });

  QUnit.test('deletePlayerPure: does not mutate original array', assert => {
    const players = [makePlayer({ id:1 }), makePlayer({ id:2 })];
    deletePlayerPure(players, 1);
    assert.equal(players.length, 2, 'original unchanged');
  });

  QUnit.test('deletePlayerPure: nonexistent id returns same set', assert => {
    const players = [makePlayer({ id:1 }), makePlayer({ id:2 })];
    const result = deletePlayerPure(players, 99);
    assert.equal(result.length, 2, 'unchanged');
  });

});
