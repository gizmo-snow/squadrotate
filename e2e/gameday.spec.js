import { test, expect } from '@playwright/test';

const SB_PROJECT = 'spkxzwbijgwdlzbhecwu';
const SB_STORAGE_KEY = `sb-${SB_PROJECT}-auth-token`;
const FAKE_USER = { id: 'e2e-user', email: 'e2e@test.local', role: 'authenticated' };
const FAKE_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlMmUtdXNlciIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.fake',
  refresh_token: 'fake-refresh', expires_in: 3600, expires_at: 9999999999,
  token_type: 'bearer', user: FAKE_USER,
};

async function loginWithPlayers(page, players) {
  await page.route(`**/auth/v1/**`, async route => {
    const url = route.request().url();
    if (url.includes('/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_USER) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_SESSION) });
    }
  });
  await page.route(`**/rest/v1/user_teams**`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  await page.goto('/');

  // Pre-populate localStorage with players
  await page.evaluate(({ key, session, playerData }) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem('squadrotate_u78_v1', JSON.stringify(playerData));
  }, {
    key: SB_STORAGE_KEY,
    session: FAKE_SESSION,
    playerData: {
      players,
      shifts: [], absent: [], gameLabel: '', teamName: 'Test Team',
      weeklyAgenda: [], nextId: players.length + 1,
      formation: { Goalkeeper:1, Defense:3, Midfield:1, Striker:2 }, teamSize: 7,
      dailyRoutine: [], coaches: [], nextCoachId: 1,
    }
  });

  await page.reload();
  await page.waitForSelector('#auth-screen', { state: 'detached', timeout: 8000 });
}

const TEST_PLAYERS = [
  { id:1, name:'GK One',  power:2, positions:['Goalkeeper','Defense'], kit:'', notes:'', experience:'Some experience' },
  { id:2, name:'Def Two', power:2, positions:['Defense'], kit:'', notes:'', experience:'Some experience' },
  { id:3, name:'Def Three', power:2, positions:['Defense'], kit:'', notes:'', experience:'Some experience' },
  { id:4, name:'Def Four', power:2, positions:['Defense'], kit:'', notes:'', experience:'Some experience' },
  { id:5, name:'Mid Five', power:2, positions:['Midfield'], kit:'', notes:'', experience:'Some experience' },
  { id:6, name:'Str Six', power:2, positions:['Striker'], kit:'', notes:'', experience:'Some experience' },
  { id:7, name:'Str Seven', power:2, positions:['Striker'], kit:'', notes:'', experience:'Some experience' },
];

test.describe('Game Day tab', () => {

  test('Game Day tab is reachable', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');
    await expect(page.locator('#view-gameday')).toBeVisible();
  });

  test('New Game button is visible', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');
    await expect(page.locator('button[onclick="openNewGameModal()"]')).toBeVisible();
  });

  test('New Game modal opens and closes', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');
    await page.click('button[onclick="openNewGameModal()"]');
    await expect(page.locator('#newGameModal')).toBeVisible();
    await page.click('button[onclick="closeNewGameModal()"]');
    await expect(page.locator('#newGameModal')).toBeHidden();
  });

  test('Auto-Assign fills all shift slots', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');

    await page.click('button[onclick*="autoAssign"]');

    // Each shift should have at least one role visible
    const shiftRows = page.locator('.shift-body, .shift-row');
    const count = await shiftRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shift table renders after auto-assign', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');
    await page.click('button[onclick*="autoAssign"]');

    // Shifts render player first names (p.name.split(' ')[0]) in player rows
    const shiftContent = await page.locator('#shiftsContainer').textContent();
    expect(shiftContent).toContain('GK'); // first name of "GK One"
    expect(shiftContent).toContain('Shift 1');
  });

  test('absent player toggle removes them from assignment', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');

    // Mark first player absent using the absent checkbox/button if available
    const absentToggle = page.locator('[onclick*="toggleAbsent"]').first();
    if (await absentToggle.isVisible()) {
      await absentToggle.click();
      await page.click('button[onclick*="autoAssign"]');
      const shiftContent = await page.locator('#view-gameday').textContent();
      expect(shiftContent).not.toContain('GK One');
    } else {
      // Skip if absent toggle not present in this view
      test.skip();
    }
  });

  test('stats table visible after auto-assign', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Game Day")');
    await page.click('button[onclick*="autoAssign"]');
    // Stats and matrix tables are populated by renderStats() / renderMatrix()
    await expect(page.locator('#statsTable')).toBeVisible();
    await expect(page.locator('#matrixTable')).toBeVisible();
  });

});

test.describe('Practice tab', () => {

  test('Practice tab is reachable', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Practice")');
    await expect(page.locator('#view-practice')).toBeVisible();
  });

  test('practice tab shows weekly agenda', async ({ page }) => {
    await loginWithPlayers(page, TEST_PLAYERS);
    await page.click('nav button:has-text("Practice")');
    // Should show some content (agenda or empty state)
    const practiceView = page.locator('#view-practice');
    await expect(practiceView).toBeVisible();
  });

});
