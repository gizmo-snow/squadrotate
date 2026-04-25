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

test.describe('Navigation', () => {

  test('page title is SquadRotate', async ({ page }) => {
    await loginAndGo(page);
    await expect(page).toHaveTitle(/SquadRotate/);
  });

  test('header logo is visible', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('.logo')).toBeVisible();
    await expect(page.locator('.logo')).toContainText('SquadRotate');
  });

  test('nav has three tabs', async ({ page }) => {
    await loginAndGo(page);
    const navButtons = page.locator('nav button');
    await expect(navButtons).toHaveCount(3);
    await expect(navButtons.nth(0)).toHaveText('Team Info');
    await expect(navButtons.nth(1)).toHaveText('Practice');
    await expect(navButtons.nth(2)).toHaveText('Game Day');
  });

  test('clicking Practice tab shows practice view', async ({ page }) => {
    await loginAndGo(page);
    await page.click('nav button:has-text("Practice")');
    await expect(page.locator('#view-practice')).toBeVisible();
    await expect(page.locator('#view-roster')).not.toBeVisible();
    await expect(page.locator('#view-gameday')).not.toBeVisible();
  });

  test('clicking Game Day tab shows game day view', async ({ page }) => {
    await loginAndGo(page);
    await page.click('nav button:has-text("Game Day")');
    await expect(page.locator('#view-gameday')).toBeVisible();
    await expect(page.locator('#view-roster')).not.toBeVisible();
  });

  test('clicking Team Info returns to roster view', async ({ page }) => {
    await loginAndGo(page);
    await page.click('nav button:has-text("Game Day")');
    await page.click('nav button:has-text("Team Info")');
    await expect(page.locator('#view-roster')).toBeVisible();
  });

  test('active tab gets active class', async ({ page }) => {
    await loginAndGo(page);
    await page.click('nav button:has-text("Practice")');
    const practiceBtn = page.locator('nav button:has-text("Practice")');
    await expect(practiceBtn).toHaveClass(/active/);
    const rosterBtn = page.locator('nav button:has-text("Team Info")');
    await expect(rosterBtn).not.toHaveClass(/active/);
  });

  test('no console errors on initial load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAndGo(page);
    // Filter out known non-critical errors (e.g., favicon, supabase analytics)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('supabase.co/functions')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('help link is present in header', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('a.help-link')).toBeVisible();
    await expect(page.locator('a.help-link')).toHaveText('Help?');
  });

  test('toast is not visible on initial load', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('#toast')).not.toHaveClass(/show/);
  });

});

test.describe('Mobile viewport', () => {

  test.use({ viewport: { width: 375, height: 667 } });

  test('app renders on 375px mobile viewport', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('#view-roster')).toBeVisible();
  });

  test('nav buttons fit on mobile without overflow', async ({ page }) => {
    await loginAndGo(page);
    const nav = await page.locator('nav').boundingBox();
    expect(nav.width).toBeLessThanOrEqual(380);
  });

  test('team switcher visible on mobile', async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator('.team-switcher')).toBeVisible();
  });

  test('auth screen fits mobile viewport', async ({ page }) => {
    await page.route(`**/auth/v1/**`, async route => {
      const url = route.request().url();
      if (url.includes('/token?grant_type=refresh_token')) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' });
      } else {
        await route.continue();
      }
    });
    await page.goto('/');
    await page.waitForSelector('#auth-form', { state: 'visible', timeout: 8000 });

    const emailInput = await page.locator('#auth-email').boundingBox();
    // Input should be visible and not overflow
    expect(emailInput.width).toBeGreaterThan(100);
    expect(emailInput.width).toBeLessThanOrEqual(380);
  });

});
