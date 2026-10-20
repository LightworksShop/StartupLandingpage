const { randomBytes, scryptSync } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const knex = require('knex');
const { migrate } = require('../server/migrate.ts');
const url = process.env.MARKETING_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('A disposable *_test database is required.');
const salt = randomBytes(16).toString('hex');
const mediaDir = mkdtempSync(join(tmpdir(), 'smartwerk-ui-'));
process.once('exit', () => rmSync(mediaDir, {recursive:true,force:true}));
Object.assign(process.env, {
  PORT: '4319', HOST: '127.0.0.1', NODE_ENV: 'test',
  MARKETING_PUBLIC_URL: 'http://127.0.0.1:4319',
  MARKETING_DATABASE_URL: url,
  MARKETING_SESSION_SECRET: randomBytes(32).toString('hex'),
  MARKETING_ADMIN_USER: 'test-admin',
  MARKETING_ADMIN_PASSWORD_HASH: `scrypt:${salt}:${scryptSync('local-test-password-only', salt, 64).toString('hex')}`,
  MARKETING_MEDIA_DIR: mediaDir,
  MARKETING_CREDENTIALS_KEY: randomBytes(32).toString('base64'),
  MARKETING_PUBLISH_ENABLED: 'false', MARKETING_FEEDS_ENABLED: 'false',
});
const db = knex({client:'pg', connection:url});
migrate(db).then(async () => {
  await db.raw('truncate marketing_post, marketing_media, marketing_publication, marketing_audit, marketing_account, marketing_oauth_state, marketing_session cascade');
  await db.raw("update marketing_settings set revision=1,value=?::jsonb where id='global'", [JSON.stringify({paused:true,timezone:'Europe/Berlin',slots:[],seasons:[],repeat_days:21,preferences:{}})]);
}).then(() => db.destroy()).then(() => require('../../server.js'));
