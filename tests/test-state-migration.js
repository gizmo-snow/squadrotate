// ── Tests: state migration (migrateTeamState) ─────────────────────────────────

const MINIMAL_DEF = { weeklyAgenda: [], defaultPlayers: [], coaches: [], label: 'Test' };

QUnit.module('migrateTeamState', () => {

  QUnit.test('empty saved state gets all defaults added', assert => {
    const raw = { players: [makePlayer({ id:1 })], shifts: [], absent: [] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.ok(out.formation,       'formation added');
    assert.equal(out.teamSize, 7,  'teamSize added');
    assert.ok(out.nextId,          'nextId added');
    assert.ok(Array.isArray(out.dailyRoutine), 'dailyRoutine added');
    assert.ok(Array.isArray(out.coaches),      'coaches added');
    assert.ok(out.nextCoachId >= 1,            'nextCoachId added');
  });

  QUnit.test('existing formation is preserved', assert => {
    const raw = { players: [], shifts: [], absent: [],
                  formation: { Goalkeeper:1, Defense:2, Midfield:2, Striker:2 }, teamSize:7 };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.equal(out.formation.Defense, 2, 'custom formation not overwritten');
  });

  QUnit.test('nextId calculated from player ids', assert => {
    const raw = { players: [makePlayer({id:5}), makePlayer({id:12})], shifts:[], absent:[] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.equal(out.nextId, 13, 'nextId = max(id) + 1');
  });

  QUnit.test('nextId = 1 when no players', assert => {
    const raw = { players: [], shifts: [], absent: [] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.equal(out.nextId, 1);
  });

  QUnit.test('players with missing positions array get empty array', assert => {
    const raw = { players: [{ id:1, name:'Test', power:2 }], shifts:[], absent:[] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.ok(Array.isArray(out.players[0].positions), 'positions array added');
    assert.equal(out.players[0].positions.length, 0,  'starts empty');
  });

  QUnit.test('missing shifts array gets default empty array', assert => {
    const raw = { players: [], absent: [] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.ok(Array.isArray(out.shifts), 'shifts array added');
  });

  QUnit.test('missing absent array gets default empty array', assert => {
    const raw = { players: [], shifts: [] };
    const out = migrateTeamState(raw, MINIMAL_DEF);
    assert.ok(Array.isArray(out.absent), 'absent array added');
  });

  QUnit.test('missing weeklyAgenda is copied from def', assert => {
    const def = { weeklyAgenda: [{ dates:'TBD', strategy:'s', stations:[] }],
                  defaultPlayers: [], coaches: [], label: 'X' };
    const raw = { players:[], shifts:[], absent:[] };
    const out = migrateTeamState(raw, def);
    assert.equal(out.weeklyAgenda.length, 1, 'agenda copied from def');
    assert.notEqual(out.weeklyAgenda, def.weeklyAgenda, 'deep copy — not the same reference');
  });

  QUnit.test('existing weeklyAgenda not overwritten', assert => {
    const def = { weeklyAgenda: [{ dates:'TBD', strategy:'def-strategy', stations:[] }],
                  defaultPlayers: [], coaches: [], label: 'X' };
    const raw = { players:[], shifts:[], absent:[],
                  weeklyAgenda: [{ dates:'custom', strategy:'custom-strategy', stations:[] }] };
    const out = migrateTeamState(raw, def);
    assert.equal(out.weeklyAgenda[0].strategy, 'custom-strategy', 'custom agenda preserved');
  });

  QUnit.test('coaches migrated from def when missing', assert => {
    const def = { weeklyAgenda:[], defaultPlayers:[],
                  coaches:[{id:1, name:'TestCoach', role:'Head Coach'}], label:'X' };
    const raw = { players:[], shifts:[], absent:[] };
    const out = migrateTeamState(raw, def);
    assert.equal(out.coaches[0].name, 'TestCoach', 'coaches from def');
    assert.equal(out.nextCoachId, 2, 'nextCoachId = max(coachId) + 1');
  });

  QUnit.test('existing coaches not overwritten', assert => {
    const def = { weeklyAgenda:[], defaultPlayers:[],
                  coaches:[{id:1, name:'DefCoach', role:'Head Coach'}], label:'X' };
    const raw = { players:[], shifts:[], absent:[],
                  coaches:[{id:1, name:'SavedCoach', role:'Head Coach'}] };
    const out = migrateTeamState(raw, def);
    assert.equal(out.coaches[0].name, 'SavedCoach', 'saved coaches preserved');
  });

});
