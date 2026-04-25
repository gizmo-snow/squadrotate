// ── SquadRotate Pure Logic — extracted for testing ───────────────────────────
// Functions here mirror index.html. When a function changes in index.html,
// update the matching copy here. No DOM, no localStorage.

const ROLES     = ['Goalkeeper','Defense','Midfield','Striker','Bench'];
const ROLE_ABBR = { Goalkeeper:'GK', Defense:'DEF', Midfield:'MID', Striker:'STR', Bench:'BN' };
const ROLE_CLASS = { Goalkeeper:'role-gk', Defense:'role-def', Midfield:'role-mid', Striker:'role-str', Bench:'role-bench' };
const FORMATION_DEFAULT = { Goalkeeper:1, Defense:3, Midfield:1, Striker:2 };

// ── Shift count (issue #8) ────────────────────────────────────────────────────
function getNumShifts(session) {
  if (!session) return 6;
  const perHalf = Math.floor(session.halfLength / session.minsPerShift);
  const bonus   = (session.halfLength % session.minsPerShift) > 5 ? 1 : 0;
  return Math.max(2, (perHalf + bonus) * 2); // × 2 for both halves
}

function getShiftRemainder(session) {
  if (!session) return 0;
  return session.halfLength % session.minsPerShift;
}

// ── Formation helpers (issue #12) ─────────────────────────────────────────────
function getFormation(state) {
  return (state && state.formation) ? state.formation : { ...FORMATION_DEFAULT };
}

function validateFormation(formation, teamSize) {
  const total = Object.values(formation).reduce((a, b) => a + b, 0);
  if (total !== teamSize) return `Formation totals ${total} but team size is ${teamSize}. Adjust counts to match.`;
  return null; // valid
}

function applyFormationMigration(loaded) {
  if (!loaded.formation) loaded.formation = { ...FORMATION_DEFAULT };
  if (!loaded.teamSize)  loaded.teamSize  = 7;
  return loaded;
}

// ── Shift diff (issue #15) ────────────────────────────────────────────────────
// sdA = shifts[s-1] map of {playerId: role}, sdB = shifts[s]
// players = array of present (non-absent) player objects
function computeShiftDiff(sdA, sdB, players) {
  const off = [], on = [], moves = [];
  players.forEach(p => {
    const roleA = sdA[p.id] || 'Bench';
    const roleB = sdB[p.id] || 'Bench';
    if (roleA === roleB) return;
    const wasField = roleA !== 'Bench';
    const isField  = roleB !== 'Bench';
    if (wasField && !isField)
      off.push({ name: p.name.split(' ')[0], role: ROLE_ABBR[roleA] });
    else if (!wasField && isField)
      on.push({ name: p.name.split(' ')[0], role: ROLE_ABBR[roleB] });
    else if (wasField && isField)
      moves.push({ name: p.name.split(' ')[0], from: ROLE_ABBR[roleA], to: ROLE_ABBR[roleB] });
  });
  return { off, on, moves };
}

// ── Fatigue warnings (issue #9) ───────────────────────────────────────────────
// Returns a Set of "${playerId}_${shiftIndex}" for consecutive STR/MID shifts
function computeFatigueWarnings(shifts) {
  const attacking = new Set(['Striker', 'Midfield']);
  const warnings  = new Set();
  for (let s = 1; s < shifts.length; s++) {
    const prev = shifts[s - 1] || {};
    const curr = shifts[s]     || {};
    for (const [pid, role] of Object.entries(curr)) {
      if (!attacking.has(role)) continue;
      const prevRole = prev[pid];
      if (prevRole && attacking.has(prevRole)) {
        warnings.add(`${pid}_${s}`);
      }
    }
  }
  return warnings;
}

// ── Swap candidate ranking (issue #10) ────────────────────────────────────────
// Returns sorted candidates for swapping with targetPlayerId when they move to newRole
// Each candidate: { player, currentRole, score }
function rankSwapCandidates(shiftData, targetPlayerId, newRole, players, session) {
  if (session && session.locked) return [];
  const candidates = [];
  players.forEach(p => {
    if (p.id === targetPlayerId) return;
    const currentRole = shiftData[p.id] || 'Bench';
    // Score: prefer players whose position preference matches the target's old role
    // and who have fewer total field shifts
    let score = 0;
    if (p.positions && p.positions.includes(newRole)) score += 10;
    // Bench players are always swap candidates
    candidates.push({ player: p, currentRole, score });
  });
  return candidates.sort((a, b) => b.score - a.score);
}

// ── positionShiftsPlayed / shiftsPlayedPure ───────────────────────────────────
// Pure helpers used by autoAssignPure (mirrors index.html implementation)
function positionShiftsPlayed(shifts, playerId, role, beforeShift) {
  let n = 0;
  for (let s = 0; s < beforeShift; s++) {
    if ((shifts[s] || {})[playerId] === role) n++;
  }
  return n;
}

function shiftsPlayedPure(shifts, playerId, beforeShift) {
  let n = 0;
  for (let s = 0; s < beforeShift; s++) {
    const r = shifts[s] && shifts[s][playerId];
    if (r && r !== 'Bench') n++;
  }
  return n;
}

// ── Auto-assign (core algorithm) ──────────────────────────────────────────────
// Pure version matching index.html autoAssign exactly (deterministic — no Math.random)
function autoAssignPure(state, session) {
  const numShifts = getNumShifts(session);
  const formation = getFormation(state);
  const present   = state.players.filter(p => !state.absent.includes(p.id));
  if (!present.length) return state.shifts;

  const shifts = Array.from({ length: numShifts }, () => ({}));
  const goalieCount = {};
  present.forEach(p => { goalieCount[p.id] = 0; });

  for (let s = 0; s < numShifts; s++) {
    const assigned = {};
    const pool = [...present];
    const quota = { ...formation };

    // Step 1 — Goalkeeper: rotate, fewest GK shifts first
    const gkOk = pool.filter(p => p.positions.includes('Goalkeeper'));
    if (gkOk.length) {
      gkOk.sort((a, b) => goalieCount[a.id] - goalieCount[b.id]);
      const gk = gkOk[0];
      assigned[gk.id] = 'Goalkeeper';
      goalieCount[gk.id]++;
      pool.splice(pool.indexOf(gk), 1);
      quota.Goalkeeper--;
    }

    // Step 2 — Fill DEF/MID/STR by preference: fewest position-shifts first, then total, then power
    for (const role of ['Defense', 'Midfield', 'Striker']) {
      let slots = quota[role];
      const cands = pool.filter(p => !assigned[p.id] && p.positions.includes(role));
      cands.sort((a, b) =>
        positionShiftsPlayed(shifts, a.id, role, s) - positionShiftsPlayed(shifts, b.id, role, s) ||
        shiftsPlayedPure(shifts, a.id, s) - shiftsPlayedPure(shifts, b.id, s) ||
        b.power - a.power
      );
      for (let i = 0; i < cands.length && slots > 0; i++) {
        const p = cands[i];
        assigned[p.id] = role;
        pool.splice(pool.indexOf(p), 1);
        slots--;
      }
      quota[role] = slots;
    }

    // Step 3 — Fill leftover slots with remaining players
    const openRoles = Object.entries(quota).filter(([, c]) => c > 0);
    for (const p of [...pool]) {
      if (openRoles.length > 0) {
        assigned[p.id] = openRoles[0][0];
        openRoles[0][1]--;
        if (openRoles[0][1] <= 0) openRoles.shift();
      } else {
        assigned[p.id] = 'Bench';
      }
    }

    // Ensure all present players have a role
    present.forEach(p => { if (!assigned[p.id]) assigned[p.id] = 'Bench'; });
    shifts[s] = assigned;
  }

  return shifts;
}

// ── Adjusted practice plan (issue #28) ───────────────────────────────────────
// week    = { stations: [{ coach, drill }] }
// avail   = { [coachName]: boolean }  (false = absent, missing/true = present)
// Returns null if no one is absent, [] if everyone is absent,
// or an array of { coach, drills: [{text, from}] } for present coaches.
function buildAdjustedPlan(week, avail) {
  const present = week.stations.filter(st => avail[st.coach] !== false);
  const absent  = week.stations.filter(st => avail[st.coach] === false);
  if (!absent.length) return null;
  if (!present.length) return [];
  const plan = present.map(st => ({
    coach: st.coach,
    drills: st.drill ? [{ text: st.drill, from: null }] : []
  }));
  absent.forEach((st, i) => {
    if (!st.drill) return;
    plan[i % plan.length].drills.push({ text: st.drill, from: st.coach });
  });
  return plan;
}

// ── State migration (pure) ────────────────────────────────────────────────────
// Mirrors the migration logic in getTeamState from index.html.
// Takes a raw parsed state object and the team definition; returns a migrated copy.
const DEFAULT_DAILY_ROUTINE = [
  { time:'00–10m', activity:'Warm-up & Footwork',  focus:'Dynamic running + Training ladder for agility.' },
  { time:'10–20m', activity:'Strategy Session',    focus:'Magnet board talk: Position names and daily goal.' },
  { time:'20–50m', activity:'Technical Drills',    focus:'Small group rotations (Coaches lead specific stations).' },
  { time:'50–90m', activity:'Game Play',           focus:'Scrimmage with "Freeze-Frame" coaching moments.' },
];
const DEFAULT_COACHES_TEMPLATE = [ {id:1, name:'Head Coach', role:'Head Coach'} ];

function migrateTeamState(parsed, def) {
  const p = { ...parsed };
  if (!p.weeklyAgenda) p.weeklyAgenda = JSON.parse(JSON.stringify(def.weeklyAgenda || []));
  if (!p.formation)    p.formation    = { ...FORMATION_DEFAULT };
  if (!p.teamSize)     p.teamSize     = 7;
  if (!p.nextId) {
    p.nextId = Array.isArray(p.players) ? Math.max(...p.players.map(x => x.id || 0), 0) + 1 : 1;
  }
  if (!Array.isArray(p.players)) p.players = JSON.parse(JSON.stringify(def.defaultPlayers || []));
  if (!Array.isArray(p.shifts))  p.shifts  = [];
  if (!Array.isArray(p.absent))  p.absent  = [];
  p.players.forEach(pl => { if (!Array.isArray(pl.positions)) pl.positions = []; });
  if (!p.dailyRoutine) p.dailyRoutine = JSON.parse(JSON.stringify(DEFAULT_DAILY_ROUTINE));
  if (!p.coaches)      p.coaches      = JSON.parse(JSON.stringify(def.coaches || DEFAULT_COACHES_TEMPLATE));
  if (!p.nextCoachId)  p.nextCoachId  = (p.coaches ? Math.max(...p.coaches.map(c => c.id||0), 0) + 1 : 1);
  return p;
}

// ── Session store helpers (pure) ──────────────────────────────────────────────
function makeSessionsStore(session) {
  return { activeSessionId: session.id, sessions: [session] };
}

function getActiveSessionPure(store) {
  if (!store || !store.sessions.length) return null;
  return store.sessions.find(s => s.id === store.activeSessionId) || store.sessions[0];
}

function switchSessionPure(sessStore, newSessionId) {
  return { ...sessStore, activeSessionId: newSessionId };
}

// ── Player management (pure) ──────────────────────────────────────────────────
function addPlayerPure(players, nextId, { name, power, positions, kit='', notes='' }) {
  const expMap = {1:'Little experience', 2:'Some experience', 3:'Very experienced'};
  return {
    players: [...players, { id: nextId, name, power, kit, notes, positions, experience: expMap[power] }],
    nextId: nextId + 1
  };
}

function editPlayerPure(players, id, updates) {
  return players.map(p => p.id === id ? { ...p, ...updates } : p);
}

function deletePlayerPure(players, id) {
  return players.filter(p => p.id !== id);
}

// ── computeShiftDiff (existing, kept in sync) ────────────────────────────────
// Already defined above — no changes needed.
