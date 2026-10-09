import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../../',import.meta.url));
const required = ['unienter','studio-holiday','graphic','hikari-wo-okuru','pool-to-jukou'];
const works = required.map(id => ({id,title:id,category:['web']}));
function build(contents, status=200, options={}) {
  const dir = mkdtempSync(join(tmpdir(),'octo-cms-release-'));
  try {
    cpSync(join(repo,'_site-source'),join(dir,'_site-source'),{recursive:true});
    mkdirSync(join(dir,'.github/scripts'),{recursive:true});
    cpSync(join(repo,'.github/scripts/build-cms-release.mjs'),join(dir,'.github/scripts/build-cms-release.mjs'));
    // Existing public files are sentinels: failures must stop before any output write.
    const homepage = join(dir,'_site-source/public/index.html');
    writeFileSync(homepage,'EXISTING SITE');
    const preload = `globalThis.fetch = async (url, opts) => {\n`+
      `if (!url.startsWith('https://oc-to.microcms.io/api/v1/works?') || opts.redirect !== 'error') throw new Error('unexpected request');\n`+
      (options.networkError ? `throw new Error('private network detail');` : `return new Response(${JSON.stringify(JSON.stringify({contents,totalCount:contents.length}))}, {status:${status},headers:{'Content-Type':'application/json'}});`)+'\n};';
    writeFileSync(join(dir,'fake-api.mjs'),preload);
    const result=spawnSync(process.execPath,['--import',join(dir,'fake-api.mjs'),join(dir,'.github/scripts/build-cms-release.mjs')],{
      encoding:'utf8',env:{PATH:process.env.PATH,MICROCMS_SERVICE_DOMAIN:'oc-to',MICROCMS_API_KEY:options.missingKey?'':'synthetic-test-only',CMS_REQUIRED_IDS:required.join(',')}
    });
    return {status:result.status,stdout:result.stdout,stderr:result.stderr,home:readFileSync(homepage,'utf8'),details:required.map(id=>{
      const p=join(dir,'_site-source/public/works',id,'index.html');return existsSync(p)?readFileSync(p,'utf8'):null;
    })};
  } finally {rmSync(dir,{recursive:true,force:true});}
}
test('zero published works preserves existing output',()=>{
  const r=build([]);assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');
});
test('HTTP/auth/network failures preserve existing output and hide error content',()=>{
  for(const status of [401,403,404,500]) {const r=build([],status);assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');}
  const r=build([],200,{networkError:true});assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');assert.doesNotMatch(r.stderr,/private network/);
});
test('missing credentials never falls back to sample data',()=>{
  const r=build(works,200,{missingKey:true});assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');
});
test('partial publication and sample contamination preserve existing output',()=>{
  for(const data of [works.slice(0,4),works.map((w,i)=>i? w:{...w,sample:true})]){
    const r=build(data);assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');
  }
});
test('all five title/category-only works render without invented images or descriptions',()=>{
  const r=build(works);assert.equal(r.status,0,r.stderr);assert.notEqual(r.home,'EXISTING SITE');
  for(const html of r.details){
    assert.ok(html);assert.doesNotMatch(html,/Sample project|undefined|src="null|\( Overview \)|<dt>Client<\/dt>/);
    assert.match(html,/assets\/img\/og.png/);assert.match(html,/style="background:var\(--blue\)"/);
    assert.doesNotMatch(html,/class="ht work-cover"/);
  }
});
test('covered works retain existing media rendering',()=>{
  const r=build(works.map(w=>({...w,cover:{url:'https://images.microcms-assets.io/assets/test.jpg',width:1200,height:800},lead:'Test overview'})));
  assert.equal(r.status,0,r.stderr);assert.match(r.details[0],/class="ht work-cover"/);assert.match(r.details[0],/Test overview/);
});
test('invalid URL slugs cannot write unexpected paths',()=>{
  const r=build([...works,{...works[0],id:'../unsafe'}]);assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');
});
