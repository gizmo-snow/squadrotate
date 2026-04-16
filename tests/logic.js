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

// ── Auto-assign (core algorithm) ──────────────────────────────────────────────
// Pure version: takes state + session, returns filled shifts array
function autoAssignPure(state, session) {
  const numShifts = getNumShifts(session);
  const formation = getFormation(state);
  const present   = state.players.filter(p => !state.absent.includes(p.id));
  if (!present.length) return state.shifts;

  const shifts = Array.from({ length: numShifts }, () => ({}));
  const goalieCount = {};
  present.forEach(p => { goalieCount[p.id] = 0; });

  function shiftsPlayed(playerId, beforeShift) {
    let count = 0;
    for (let i = 0; i < beforeShift; i++) {
      if (shifts[i][playerId] && shifts[i][playerId] !== 'Bench') count++;
    }
    return count;
  }

  for (let s = 0; s < numShifts; s++) {
    let pool = [...present];

    // Step 1 — Goalkeeper
    const goalieCandidates = pool
      .filter(p => p.positions.includes('Goalkeeper'))
      .sort((a, b) => goalieCount[a.id] - goalieCount[b.id]);
    if (goalieCandidates.length) {
      const gk = goalieCandidates[0];
      shifts[s][gk.id] = 'Goalkeeper';
      goalieCount[gk.id]++;
      pool = pool.filter(p => p.id !== gk.id);
    }

    // Step 2 — Fill by position preference
    ['Defense', 'Midfield', 'Striker'].forEach(pos => {
      const quota = formation[pos] || 0;
      const candidates = pool
        .filter(p => p.positions.includes(pos))
        .sort((a, b) =>
          (shiftsPlayed(a.id, s) - shiftsPlayed(b.id, s)) ||
          (b.power - a.power)
        );
      const fill = candidates.slice(0, quota);
      fill.forEach(p => {
        shifts[s][p.id] = pos;
        pool = pool.filter(x => x.id !== p.id);
      });
    });

    // Step 3 — Bench remaining
    pool.forEach(p => { shifts[s][p.id] = 'Bench'; });

    // Ensure every present player has a role
    present.forEach(p => {
      if (!shifts[s][p.id]) shifts[s][p.id] = 'Bench';
    });
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
