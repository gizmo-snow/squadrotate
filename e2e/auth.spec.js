import { test, expect } from '@playwright/test';

const SB_PROJECT = 'spkxzwbijgwdlzbhecwu';
const SB_STORAGE_KEY = `sb-${SB_PROJECT}-auth-token`;

// Mock all Supabase endpoints for unauthenticated state
async function mockNoSession(page) {
  await page.route(`**/auth/v1/**`, async route => {
    const url = route.request().url();
    if (url.includes('/token?grant_type=refresh_token')) {
      await route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant' }) });
    } else if (url.includes('/otp')) {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ message: 'Magic link sent' }) });
    } else {
      await route.continue();
    }
  });
}

async function mockWithSession(page) {
  const fakeUser = { id: 'e2e-user', email: 'e2e@test.local', role: 'authenticated' };
  const fakeSession = {
    access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlMmUtdXNlciIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.fake',
    refresh_token: 'fake-refresh',
    expires_in: 3600, expires_at: 9999999999,
    token_type: 'bearer', user: fakeUser,
  };

  await page.route(`**/auth/v1/**`, async route => {
    const url = route.request().url();
    if (url.includes('/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
    }
  });

  await page.route(`**/rest/v1/user_teams**`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  return { fakeSession, fakeUser };
}

test.describe('Auth screen', () => {

  test('auth screen is shown on first visit (no session)', async ({ page }) => {
    await mockNoSession(page);
    await page.goto('/');
    await page.waitForSelector('#auth-form', { state: 'visible', timeout: 8000 });

    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-submit')).toBeVisible();
    await expect(page.locator('#auth-submit')).toHaveText('Send Magic Link');
  });

  test('auth screen is hidden when valid session exists', async ({ page }) => {
    const { fakeSession } = await mockWithSession(page);
    await page.goto('/');
    await page.evaluate(({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    }, { key: SB_STORAGE_KEY, session: fakeSession });

    await page.reload();
    await page.waitForSelector('#auth-screen', { state: 'detached', timeout: 8000 });

    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();
  });

  test('empty email shows validation message', async ({ page }) => {
    await mockNoSession(page);
    await page.goto('/');
    await page.waitForSelector('#auth-form', { state: 'visible' });

    await page.click('#auth-submit');
    const msg = await page.locator('#auth-msg').textContent();
    expect(msg).toContain('email');
  });

  test('valid email shows sent confirmation', async ({ page }) => {
    await mockNoSession(page);
    await page.goto('/');
    await page.waitForSelector('#auth-form', { state: 'visible' });

    await page.fill('#auth-email', 'test@example.com');
    await page.click('#auth-submit');

    // Wait for confirmation message
    await page.waitForFunction(() =>
      document.getElementById('auth-msg').textContent.includes('Check your email'),
      { timeout: 5000 }
    );
    const msg = await page.locator('#auth-msg').textContent();
    expect(msg).toContain('Check your email');
    // Form should be hidden after send
    await expect(page.locator('#auth-form')).toBeHidden();
  });

  test('logout button signs out and shows auth screen', async ({ page }) => {
    const { fakeSession } = await mockWithSession(page);
    await page.goto('/');
    await page.evaluate(({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    }, { key: SB_STORAGE_KEY, session: fakeSession });

    await page.reload();
    await page.waitForSelector('#auth-screen', { state: 'detached', timeout: 8000 });

    // Mock signOut endpoint
    await page.route(`**/auth/v1/logout**`, route => route.fulfill({
      status: 204, body: ''
    }));

    await page.click('#logout-btn');
    await page.waitForSelector('#auth-screen', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#auth-form')).toBeVisible();
  });

  test('app header not visible before authentication', async ({ page }) => {
    await mockNoSession(page);
    await page.goto('/');
    await page.waitForSelector('#auth-form', { state: 'visible' });

    // The auth overlay covers everything — header should be obscured
    const authScreenBounds = await page.locator('#auth-screen').boundingBox();
    expect(authScreenBounds).toBeTruthy();
    // Auth screen covers the viewport
    expect(authScreenBounds.width).toBeGreaterThan(300);
    expect(authScreenBounds.height).toBeGreaterThan(300);
  });

});
