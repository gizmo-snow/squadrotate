import { test, expect } from '@playwright/test';

const SB_PROJECT = 'spkxzwbijgwdlzbhecwu';
const SB_STORAGE_KEY = `sb-${SB_PROJECT}-auth-token`;

const FAKE_USER = { id: 'e2e-user', email: 'e2e@test.local', role: 'authenticated' };
const FAKE_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlMmUtdXNlciIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.fake',
  refresh_token: 'fake-refresh', expires_in: 3600, expires_at: 9999999999,
  token_type: 'bearer', user: FAKE_USER,
};

async function loginAndGo(page) {
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
  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: SB_STORAGE_KEY, session: FAKE_SESSION });
  await page.reload();
  await page.waitForSelector('#auth-screen', { state: 'detached', timeout: 8000 });
}

test.describe('Roster management', () => {

  test('Team Info tab is active on load', async ({ page }) => {
    await loginAndGo(page);
    const activeBtn = page.locator('nav button.active');
    await expect(activeBtn).toHaveText('Team Info');
    await expect(page.locator('#view-roster')).toBeVisible();
  });

  test('team name input is visible and editable', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('#teamNameInput')).toBeVisible();
    await page.fill('#teamNameInput', 'My Test Team');
    const val = await page.inputValue('#teamNameInput');
    expect(val).toBe('My Test Team');
  });

  test('Add Player button opens modal', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    await expect(page.locator('#addPlayerModal')).toHaveClass(/open/);
    await expect(page.locator('#modalTitle')).toHaveText('Add Player');
  });

  test('add player form: submit without name shows toast', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    // Check at least one position so only name is missing
    await page.check('input[value="Defense"]');
    await page.click('button[onclick="savePlayer()"]');
    await expect(page.locator('#toast')).toHaveClass(/show/);
    const toastText = await page.locator('#toast').textContent();
    expect(toastText).toContain('name');
  });

  test('add player form: submit without positions shows toast', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    await page.fill('#mpName', 'Test Player');
    await page.click('button[onclick="savePlayer()"]');
    await expect(page.locator('#toast')).toHaveClass(/show/);
    const toastText = await page.locator('#toast').textContent();
    expect(toastText.toLowerCase()).toContain('position');
  });

  test('add player: valid form adds player to roster grid', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    await page.fill('#mpName', 'Alice Test');
    await page.selectOption('#mpPower', '2');
    await page.check('input[value="Defense"]');
    await page.click('button[onclick="savePlayer()"]');

    await expect(page.locator('#toast')).toHaveClass(/show/);
    const grid = page.locator('#rosterGrid');
    await expect(grid).toContainText('Alice Test');
  });

  test('click player card opens edit modal', async ({ page }) => {
    await loginAndGo(page);
    // Add a player first
    await page.click('.add-player-btn');
    await page.fill('#mpName', 'Bob Edit');
    await page.check('input[value="Striker"]');
    await page.click('button[onclick="savePlayer()"]');
    // Wait for modal .open class to be removed (modal has display:none when not open)
    await page.waitForFunction(() =>
      !document.getElementById('addPlayerModal').classList.contains('open')
    );

    // Click the player card (class is player-card, not roster-card)
    await page.click('.player-card', { timeout: 3000 });
    await expect(page.locator('#addPlayerModal')).toHaveClass(/open/);
    await expect(page.locator('#modalTitle')).toHaveText('Edit Player');
    const nameVal = await page.inputValue('#mpName');
    expect(nameVal).toBe('Bob Edit');
  });

  test('delete button appears in edit mode', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    await page.fill('#mpName', 'Charlie Delete');
    await page.check('input[value="Midfield"]');
    await page.click('button[onclick="savePlayer()"]');
    await page.waitForFunction(() =>
      !document.getElementById('addPlayerModal').classList.contains('open')
    );

    await page.click('.player-card');
    await expect(page.locator('#modalDeleteBtn')).toBeVisible();
  });

  test('clicking modal backdrop closes it', async ({ page }) => {
    await loginAndGo(page);
    await page.click('.add-player-btn');
    // Click outside the modal card (on the overlay)
    await page.mouse.click(5, 5);
    await expect(page.locator('#addPlayerModal')).not.toHaveClass(/open/);
  });

  test('team switcher shows both teams', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('.team-switcher')).toBeVisible();
    await expect(page.locator('#btnU78')).toBeVisible();
    await expect(page.locator('#btnU912')).toBeVisible();
  });

  test('switching teams changes active button', async ({ page }) => {
    await loginAndGo(page);
    await page.click('#btnU912');
    await expect(page.locator('#btnU912')).toHaveClass(/active-u912/);
    await expect(page.locator('#btnU78')).not.toHaveClass(/active-u78/);
  });

  test('formation panel is visible', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('#formationPanel')).toBeVisible();
  });

});
