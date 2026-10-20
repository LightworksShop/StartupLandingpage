import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import knex from 'knex';

function testDatabase() {
  const url = process.env.MARKETING_TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('A disposable *_test database is required.');
  return knex({ client: 'pg', connection: url });
}

test('public website stays available and server files remain private', async ({ request }) => {
  expect((await request.get('/')).status()).toBe(200);
  expect((await request.get('/api/marketing/posts')).status()).toBe(401);
  for (const file of ['/server.js', '/package.json', '/.env', '/tmp/README.md', '/marketing/server/index.ts', '/marketing/migrations/001-marketing.sql']) {
    const response = await request.get(file);
    expect(response.status(), file).toBe(404);
  }
  expect((await request.post('/api/marketing/login', { data: {user:'test-admin', password:'local-test-password-only'} })).status()).toBe(403);
  expect((await request.post('/api/marketing-agent/approve', { data: {} })).status()).toBe(401);
});

test('human login, LinkedIn draft/revision, real media, designer, settings and logout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/marketing');
  await page.getByLabel('Benutzername').fill('test-admin');
  await page.getByLabel('Passwort').fill('local-test-password-only');
  await page.getByRole('button', {name:'Anmelden', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Kalender', exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Neuer Beitrag', exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('LinkedIn', {exact:true}).first()).toBeVisible();
  await page.getByLabel('Thema', {exact:true}).fill('Smartwerk Browserprüfung');
  await page.getByRole('button', {name:'Entwurf speichern', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Beitrag bearbeiten', exact:true})).toBeVisible();
  await expect(page.getByRole('status').filter({hasText:'Beitrag gespeichert.'})).toBeVisible();
  await page.getByRole('button', {name:'Dialog schließen',exact:true}).click();
  // Exercise the real API with the browser session and CSRF token.
  const saved = await page.evaluate(async () => {
    const session = await (await fetch('/api/marketing/session')).json();
    const response = await fetch('/api/marketing/posts', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf}, body:JSON.stringify({content:{topic:'Browser API',versions:[{channel:'linkedin',text:'Hallo Smartwerk',alt:'Team'}]},scheduled_at:null})});
    return {status:response.status, body:await response.json()};
  });
  expect(saved.status).toBe(200);
  expect(saved.body.post.content.versions[0].channel).toBe('linkedin');
  const uploaded = await sharp({create:{width:1200,height:630,channels:3,background:'#f97316'}}).png().toBuffer();
  const media = await page.evaluate(async content => {
    const session = await (await fetch('/api/marketing/session')).json();
    const response = await fetch('/api/marketing/media', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({labels:{name:'Testmotiv',generated:false},mime_type:'image/png',content})});
    return {status:response.status, body:await response.json()};
  }, uploaded.toString('base64'));
  expect(media.status).toBe(200);
  expect((await page.request.get(media.body.media.url)).status()).toBe(200);
  await page.goto('/marketing/library');
  await expect(page.getByText('Testmotiv', {exact:true})).toBeVisible();
  await page.getByRole('link', {name:'Gestalter', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Bildgestaltung', exact:true})).toBeVisible();
  await expect(page.getByText('Lade Marketing …', {exact:true})).toHaveCount(0);
  await page.screenshot({path:'marketing/var/designer-desktop.png',fullPage:true});
  await page.getByRole('link', {name:'Anbindungen', exact:true}).click();
  await expect(page.getByRole('heading', {name:'LinkedIn', exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'Mit Konto anmelden', exact:true})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('heading', {name:'LinkedIn', exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({path:'marketing/var/connections-mobile.png',fullPage:true});
  await page.getByRole('button', {name:'Abmelden', exact:true}).click();
  await expect(page.getByLabel('Benutzername')).toBeVisible();
  expect((await page.request.get('/api/marketing/posts')).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('legacy and outdated credential sessions lose API and OAuth access and can log in again', async ({ request }) => {
  const db = testDatabase();
  try {
    for (const staleVersion of [null, 'previous-credentials']) {
      const anonymous = await (await request.get('/api/marketing/session')).json();
      const response = await request.post('/api/marketing/login', {
        headers: { 'X-CSRF-Token': anonymous.csrf },
        data: { user: 'test-admin', password: 'local-test-password-only' },
      });
      expect(response.status()).toBe(200);
      const logged = await response.json();
      expect((await request.get('/api/marketing/posts')).status()).toBe(200);
      const sessions = db('marketing_session').whereRaw("sess->>'csrf'=?", [logged.csrf]);
      expect(await sessions.update({
        sess: staleVersion === null
          ? db.raw("(sess::jsonb - 'credentialVersion')::json")
          : db.raw("(sess::jsonb || ?::jsonb)::json", [JSON.stringify({ credentialVersion: staleVersion })]),
      })).toBe(1);
      expect((await request.get('/api/marketing/posts')).status()).toBe(401);
      expect((await request.get('/custom/marketing-oauth/linkedin?state=invalid')).status()).toBe(401);
      const invalidated = await (await request.get('/api/marketing/session')).json();
      expect(invalidated.user).toBeNull();
      expect(invalidated.csrf).not.toBe(logged.csrf);
    }
  } finally { await db.destroy(); }
});

test('partial publication permits reapproval in the editor but unknown delivery stays blocked', async ({ page }) => {
  const db = testDatabase();
  try {
    const session = await (await page.request.get('/api/marketing/session')).json();
    const login = await page.request.post('/api/marketing/login', {
      headers: { 'X-CSRF-Token': session.csrf },
      data: { user: 'test-admin', password: 'local-test-password-only' },
    });
    expect(login.status()).toBe(200);
    const logged = await login.json();
    const response = await page.request.post('/api/marketing/posts', {
      headers: { 'X-CSRF-Token': logged.csrf },
      data: { content: { topic: 'Teilweise veröffentlicht – Regression', versions: [{ channel: 'linkedin' }, { channel: 'pinterest' }] }, scheduled_at: null },
    });
    expect(response.status()).toBe(200);
    const { post } = await response.json();
    await db('marketing_publication').insert([
      { id: `${post.id}_linkedin`, post_id: post.id, channel: 'linkedin', state: 'published', value: '{}' },
      { id: `${post.id}_pinterest`, post_id: post.id, channel: 'pinterest', state: 'failed', value: '{}' },
    ]);
    const open = async () => {
      await page.goto('/marketing/calendar?view=list');
      await page.getByRole('button', { name: /Teilweise veröffentlicht – Regression/ }).click();
      await expect(page.getByRole('dialog', { name: 'Beitrag bearbeiten' })).toBeVisible();
    };
    await open();
    await expect(page.getByRole('button', { name: 'Gespeicherten Beitrag ausdrücklich freigeben' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Entwurf speichern', exact: true })).toBeDisabled();
    await db('marketing_publication').where({ id: `${post.id}_linkedin` }).update({ state: 'unknown' });
    await open();
    await expect(page.getByRole('button', { name: 'Gespeicherten Beitrag ausdrücklich freigeben' })).toBeDisabled();
  } finally { await db.destroy(); }
});
