const assert = require('node:assert/strict');
const test = require('node:test');
const knex = require('knex');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const { migrate } = require('../server/migrate.ts');
const { localStorage } = require('../server/storage.ts');
const { saveDraft, approvePost, getPost, settings, saveSettings, revokePost, rows } = require('../lib/marketing/repository.ts');
const { dispatchDue, validateApproval, reconcile } = require('../lib/marketing/publishing.ts');
const { sealTokens, selectLinkedinTarget, startOauth, finishOauth } = require('../lib/marketing/accounts.ts');
const { linkedinScopes } = require('../lib/marketing/linkedin-contract.ts');

const url = process.env.MARKETING_TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test')) throw new Error('A disposable *_test database is required.');
test('real PostgreSQL + LinkedIn: both targets, approval invalidation, one claim across workers, upload revocation, persisted IDs, unknown delivery and denied OAuth', {skip: !url}, async () => {
  const env = {...process.env}, originalFetch = global.fetch;
  const db = knex({client:'pg',connection:url,pool:{min:0,max:12}});
  const directory = await mkdtemp(join(tmpdir(),'smartwerk-linkedin-'));
  Object.assign(process.env, {
    MARKETING_PUBLIC_URL:'https://admin.example.test', MARKETING_MEDIA_DIR:directory,
    MARKETING_CREDENTIALS_KEY:Buffer.alloc(32,7).toString('base64'),
    MARKETING_LINKEDIN_CLIENT_ID:'fixture-app', MARKETING_LINKEDIN_CLIENT_SECRET:'fixture-secret',
    MARKETING_LINKEDIN_API_VERSION:'202608', MARKETING_LINKEDIN_AUTHOR_TYPE:'both',
    MARKETING_PUBLISH_ENABLED:'true',
  });
  const person = 'urn:li:person:member', organization = 'urn:li:organization:123';
  const tokens = {access_token:'fixture-token',expires_at:new Date(Date.now()+86400000).toISOString(),refresh_expires_at:null,issued_at:new Date().toISOString(),scopes:linkedinScopes()};
  const json = value => new Response(JSON.stringify(value));
  const postedAuthors = [];
  let activeOwner = organization;
  let posts = 0, uploadHook = async () => {}, mode = 'success';
  const mockFetch = async (raw, init = {}) => {
    const path = String(raw);
    if (path.endsWith('/userinfo')) return json({sub:'member',name:'Smartwerk Team'});
    if (path.includes('organizationAcls')) return json({elements:[{roleAssignee:person,organization,role:'ADMINISTRATOR',state:'APPROVED'}]});
    if (path.includes('initializeUpload')) { activeOwner = JSON.parse(init.body).initializeUploadRequest.owner; return json({value:{image:'urn:li:image:ABC',uploadUrl:'https://www.linkedin.com/dms-uploads/abc'}}); }
    if (init.method === 'PUT') { await uploadHook(); return new Response(null,{status:201}); }
    if (path.includes('/rest/images/')) return json({owner:activeOwner,status:'AVAILABLE'});
    if (path.endsWith('/rest/posts')) {
      posts++; postedAuthors.push(JSON.parse(init.body).author);
      if (mode === 'timeout') throw new Error('connection lost after delivery');
      return new Response(null,{status:201,headers:{'x-restli-id':`urn:li:share:${12345+posts}`}});
    }
    throw new Error('Unexpected provider operation');
  };
  global.fetch = mockFetch;
  try {
    await migrate(db);
    await migrate(db);
    const bytes = await sharp({create:{width:1200,height:630,channels:3,background:'#f97316'}}).jpeg().toBuffer();
    const storage = localStorage(directory,process.env.MARKETING_PUBLIC_URL);
    const file = await storage.put(bytes,'jpeg');
    const media = {id:'m1',name:'Motiv',url:file.url,file_id:file.id,mime_type:'image/jpeg',width:1200,height:630,size:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),tags:[],product_ids:[],generated:false,provenance:'',source:'upload'};
    await db.raw('insert into marketing_media(id,value) values (?,?::jsonb)',['m1',JSON.stringify(media)]);
    await db.raw('insert into marketing_account(id,value,encrypted) values (?,?,?)',['linkedin',JSON.stringify({state:'connected',source:'oauth',account_id:person,target_id:person,expires_at:tokens.expires_at}),sealTokens('linkedin',tokens)]);
    const host = {db,storage,logger:{error(){}}};
    const create = async (target_id = null) => {
      const post = await saveDraft(db,{content:{topic:'LinkedIn',versions:[{channel:'linkedin',target_id,text:'Euer Team',alt:'Motiv',media_id:'m1'}]},scheduled_at:'2020-01-01T12:00:00Z'},'user:admin');
      await approvePost(db,post.id,1,'user:admin',(p,c,tx) => validateApproval(host,p,c,tx));
      return post;
    };
    const waiting = await create();
    assert.ok((await getPost(db,waiting.id)).approved.targets.linkedin.includes(person));
    await selectLinkedinTarget(db,1,organization,'user:admin',mockFetch);
    assert.equal((await getPost(db,waiting.id)).approved,null);
    const cfg = await settings(db);
    await saveSettings(db,{...cfg.value,paused:false},cfg.revision,'user:admin');
    const due = await create();
    await Promise.all([dispatchDue(host),dispatchDue(host)]);
    assert.equal(posts,1);
    const [published] = await rows(db,'select * from marketing_publication where post_id=?',[due.id]);
    assert.equal(published.state,'published');
    assert.equal(published.value.container_id,'urn:li:image:ABC');
    assert.match(published.value.remote_id,/^urn:li:share:/);
    const revoked = await create();
    uploadHook = () => revokePost(db,revoked.id,1,'user:admin');
    await dispatchDue(host);
    assert.equal(posts,1);
    assert.equal((await rows(db,'select state from marketing_publication where post_id=?',[revoked.id]))[0].state,'failed');
    uploadHook = async () => {};
    const uncertain = await create(); mode = 'timeout';
    await dispatchDue(host); await dispatchDue(host);
    assert.equal(posts,2);
    const [unknown] = await rows(db,'select * from marketing_publication where post_id=?',[uncertain.id]);
    assert.equal(unknown.state,'unknown');
    await assert.rejects(reconcile(db,unknown.id,'user:admin',{action:'retry',note:'Manueller Wiederholungsversuch'}),/Unklarer Versand/);
    const flow = await startOauth(db,'linkedin','user:admin');
    const state = new URL(flow.url).searchParams.get('state');
    await assert.rejects(finishOauth(db,'linkedin','user:admin',{state,nonce:flow.nonce,denied:true}), error => error.code === 'OAUTH_DENIED');
    await assert.rejects(finishOauth(db,'linkedin','user:admin',{state,nonce:flow.nonce,code:'fake'},mockFetch), error => error.code === 'OAUTH_STATE_INVALID');
    const personTarget = await selectLinkedinTarget(db,2,person,'user:admin',mockFetch);
    assert.equal(personTarget.target_id,person);
    mode = 'person';
    const personal = await create();
    await dispatchDue(host);
    assert.equal((await rows(db,'select state from marketing_publication where post_id=?',[personal.id]))[0].state,'published');
    assert.equal(posts,3);
    const personalQueued = await create(person);
    const companyQueued = await create(organization);
    const snapshot = await getPost(db,companyQueued.id);
    assert.ok(snapshot.approved.targets.linkedin.endsWith(organization));
    await dispatchDue(host);
    assert.deepEqual(postedAuthors.slice(-2).sort(),[person,organization].sort());
    assert.equal((await rows(db,'select state from marketing_publication where post_id=?',[personalQueued.id]))[0].state,'published');
    assert.equal((await rows(db,'select state from marketing_publication where post_id=?',[companyQueued.id]))[0].state,'published');
  } finally {
    global.fetch = originalFetch;
    for (const table of ['marketing_oauth_state','marketing_account','marketing_audit','marketing_publication','marketing_settings','marketing_media','marketing_post','marketing_session','smartwerk_marketing_migration']) await db.raw(`drop table if exists ${table}`);
    await db.destroy(); await rm(directory,{recursive:true,force:true});
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]; Object.assign(process.env,env);
  }
});
