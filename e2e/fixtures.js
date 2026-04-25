import { test as base } from '@playwright/test';

// Fake Supabase session that bypasses auth
const FAKE_USER = { id: 'e2e-test-user', email: 'e2e@test.local', role: 'authenticated' };
const FAKE_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmUtdGVzdC11c2VyIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.fake',
  refresh_token: 'e2e-refresh-token',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: FAKE_USER,
};
const SB_PROJECT = 'spkxzwbijgwdlzbhecwu';
const SB_STORAGE_KEY = `sb-${SB_PROJECT}-auth-token`;

export const test = base.extend({
  // Authenticated page: mocks Supabase auth + data endpoints, injects session
  authedPage: async ({ page }, use) => {
    // Intercept Supabase auth endpoints
    await page.route(`**/auth/v1/**`, async route => {
      const url = route.request().url();
      if (url.includes('/token') || url.includes('/otp')) {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(FAKE_SESSION) });
      } else if (url.includes('/user')) {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(FAKE_USER) });
      } else {
        await route.continue();
      }
    });

    // Intercept user_teams data endpoints
    await page.route(`**/rest/v1/user_teams**`, async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await page.goto('/');

    // Inject session into localStorage so Supabase client thinks we're logged in
    await page.evaluate(({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    }, { key: SB_STORAGE_KEY, session: FAKE_SESSION });

    // Reload so the Supabase client picks up the stored session
    await page.reload();

    // Wait for auth screen to disappear (app initialized)
    await page.waitForSelector('#auth-screen', { state: 'detached', timeout: 8000 });

    await use(page);
  },

  // Unauthenticated page: Supabase returns no session
  unauthPage: async ({ page }, use) => {
    await page.route(`**/auth/v1/**`, async route => {
      const url = route.request().url();
      if (url.includes('/token?grant_type=refresh_token')) {
        await route.fulfill({ status: 400, contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token revoked' }) });
      } else if (url.includes('/otp')) {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ message: 'Magic link sent' }) });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    // Wait for auth form to appear
    await page.waitForSelector('#auth-form', { state: 'visible', timeout: 8000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
export { FAKE_USER, FAKE_SESSION, SB_STORAGE_KEY };
