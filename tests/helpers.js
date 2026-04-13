// ── Test Helpers ──────────────────────────────────────────────────────────────
// Shared fixtures for SquadRotate unit tests.

function makePlayer(overrides) {
  return Object.assign({
    id: Math.floor(Math.random() * 10000),
    name: 'Player One',
    power: 2,
    experience: 'mid',
    positions: ['Defense'],
    kit: '',
    notes: ''
  }, overrides);
}

function makeSession(overrides) {
  return Object.assign({
    id: 'test-session',
    date: '2026-04-13',
    opponent: 'Blue FC',
    halfLength: 25,
    minsPerShift: 8,
    locked: false,
    label: 'vs Blue FC 4/13'
  }, overrides);
}

function makeState(overrides) {
  return Object.assign({
    players: [],
    shifts: [{},{},{},{},{},{}],
    absent: [],
    gameLabel: '',
    teamName: 'Test Team',
    weeklyAgenda: [],
    nextId: 1,
    formation: { Goalkeeper:1, Defense:3, Midfield:1, Striker:2 },
    teamSize: 7
  }, overrides);
}

// Build a realistic 9-player roster
function makeRoster() {
  return [
    makePlayer({ id:1, name:'Alex Smith',   power:3, positions:['Goalkeeper','Defense'] }),
    makePlayer({ id:2, name:'Blake Jones',  power:2, positions:['Defense','Midfield'] }),
    makePlayer({ id:3, name:'Casey Lee',    power:2, positions:['Defense'] }),
    makePlayer({ id:4, name:'Dana Kim',     power:1, positions:['Defense','Striker'] }),
    makePlayer({ id:5, name:'Evan Park',    power:3, positions:['Midfield','Striker'] }),
    makePlayer({ id:6, name:'Faye Cruz',    power:2, positions:['Striker'] }),
    makePlayer({ id:7, name:'Gray Hall',    power:1, positions:['Goalkeeper','Defense'] }),
    makePlayer({ id:8, name:'Hana Mori',    power:2, positions:['Defense','Midfield'] }),
    makePlayer({ id:9, name:'Ira Patel',    power:3, positions:['Striker','Midfield'] }),
  ];
}
