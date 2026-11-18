import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { finalizeEvent, generateSecretKey } from 'nostr-tools';

const name = JSON.parse(readFileSync('package.json', 'utf8')).name;
const origin = (process.argv[2] || `https://${name}.vercel.app`).replace(/\/$/, '');
assert.equal(new URL(origin).protocol, 'https:');
const worker = process.argv.includes('--worker');
const runDirectory = worker ? process.argv.at(-1) : resolve('.data/public-checks', new Date().toISOString().replace(/[:.]/g, '-'));
if (process.argv.includes('--detached') && !worker) {
  mkdirSync(runDirectory, {recursive:true,mode:0o700});
  const log = openSync(runDirectory+'/output.log','a',0o600);
  const child = spawn(process.execPath,[fileURLToPath(import.meta.url),origin,'--worker',runDirectory],{cwd:process.cwd(),env:process.env,detached:true,stdio:['ignore',log,log]});
  closeSync(log);child.unref();
  console.log(JSON.stringify({pid:child.pid,directory:runDirectory,origin}));process.exit(0);
}
if (worker) {
  writeFileSync(runDirectory+'/status.json',JSON.stringify({status:'running',origin}),{mode:0o600});
  process.on('exit',code=>{if(code!==0)writeFileSync(runDirectory+'/status.json',JSON.stringify({status:'failed',origin,exitCode:code}),{mode:0o600});});
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const request = path => fetch(origin + path, { signal: AbortSignal.timeout(20000) });
const htmlResponse = await request('/');
assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
const local = readFileSync('dist/index.html', 'utf8');
assert.equal(html.match(/<title>(.*?)<\/title>/)?.[1], local.match(/<title>(.*?)<\/title>/)?.[1]);
for (const [header, expected] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY'], ['referrer-policy', 'no-referrer']]) assert.equal(htmlResponse.headers.get(header), expected);
const csp = htmlResponse.headers.get('content-security-policy') || '';
assert.match(csp, /frame-ancestors 'none'/);
if (name === 'nostrchat') assert.match(csp, /connect-src 'self' wss:/);
const assets = [];
for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
  const path = match[1]; assert(path.startsWith('/assets/'));
  const response = await request(path); assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') || '', /immutable/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(digest(bytes), digest(readFileSync('dist' + path)));
  assets.push({ path, bytes: bytes.length, sha256: digest(bytes) });
}
assert(assets.length >= 2);
const routes = name === 'satsacademy' ? ['/app', '/app/lessons/bitcoin', '/app/wallet', '/app/records', '/app/profile', '/app/guide'] : name === 'nostrchat' ? ['/people', '/activity'] : ['/app'];
for (const path of routes) { const response = await request(path); assert.equal(response.status, 200); assert.equal((await response.text()).match(/<title>(.*?)<\/title>/)?.[1], local.match(/<title>(.*?)<\/title>/)?.[1]); }
assert.equal((await (await request('/api/health')).json()).backend, 'convex');

let sessionChecks = [];
if (name === 'satsacademy') {
  const secret = generateSecretKey();
  try {
    const body = '{}';
    const event = finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[['u',origin+'/api/auth/nostr'],['method','POST'],['payload',digest(body)]]},secret);
    const headers = {'Content-Type':'application/json',Origin:origin,Authorization:'Nostr '+Buffer.from(JSON.stringify(event)).toString('base64')};
    const signed = await fetch(origin+'/api/auth/nostr',{method:'POST',headers,body}); assert.equal(signed.status,200);
    const cookie = signed.headers.get('set-cookie')?.split(';')[0]; assert(cookie);
    assert.equal((await signed.json()).user.pubkey,event.pubkey);
    const replay = await fetch(origin+'/api/auth/nostr',{method:'POST',headers,body}); assert.equal(replay.status,401);
    const profile = await fetch(origin+'/api/academy/profile',{headers:{Cookie:cookie,Origin:origin}}); assert.equal(profile.status,200);
    const progress = await fetch(origin+'/api/academy/progress',{headers:{Cookie:cookie,Origin:origin}}); assert.equal(progress.status,200);
    const wallet = await fetch(origin+'/api/academy/wallet',{headers:{Cookie:cookie,Origin:origin}}); assert.equal(wallet.status,200); assert.equal((await wallet.json()).connected,false);
    const logout = await fetch(origin+'/api/session/logout',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'}); assert.equal(logout.status,200);
    const after = await fetch(origin+'/api/academy/profile',{headers:{Cookie:cookie,Origin:origin}}); assert.equal(after.status,401);
    sessionChecks = ['Fresh generated builder Nostr identity signs into this independent origin','Replay rejected','Owner learning endpoints use Convex','No learning wallet connected','Logout invalidates the session'];
  } finally { secret.fill(0); }
}

const directory = `docs/${name === 'bitcoin-sandbox' ? 'sandbox' : name}/standalone-acceptance/2026-11-18`;
mkdirSync(directory, {recursive:true});
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors = [], screenshots = [];
try {
  for (const width of [1440,1024,390,360]) {
    const page = await browser.newPage({viewport:{width,height:width<500?844:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    for (const path of ['/', ...(name === 'satsacademy' ? ['/app/lessons/bitcoin'] : [])]) {
      await page.goto(origin+path); await page.locator('h1').first().waitFor();
      await page.evaluate(()=>document.fonts.ready);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      const filename = `${width}-${path==='/'?'landing':'lesson'}.png`;
      await page.screenshot({path:directory+'/'+filename,fullPage:true}); screenshots.push(filename);
      if (path==='/') {
        const links = await page.locator('a[href*="github.com"]').evaluateAll(elements=>elements.map(element=>element.href));
        assert(links.every(link=>link.startsWith('https://github.com/greyw0rks/'+name)));
      }
    }
    await page.close();
  }
  assert.equal(errors.length,0);
} finally { await browser.close(); }
const report = {status:'passed',checkedAt:new Date().toISOString(),product:name,origin,assets,routes,sessionChecks,viewports:[1440,1024,390,360],screenshots,pageErrors:errors,classification:'Standalone hosting and generated builder identity verification. No wallet connection, payment, public messages or independent adoption.'};
writeFileSync(directory+'/verification.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('docs/evidence/'+name+'-standalone-release.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'passed',product:name,origin,assets:assets.length,screenshots:screenshots.length,sessionChecks:sessionChecks.length}));
if (worker) writeFileSync(runDirectory+'/status.json',JSON.stringify({status:'passed',origin,exitCode:0}),{mode:0o600});
process.exit(0);
