import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
      encoding:'utf8',env:{PATH:process.env.PATH,MICROCMS_SERVICE_DOMAIN:'oc-to',MICROCMS_API_KEY:options.missingKey?'':'synthetic-test-only',CMS_REQUIRED_IDS:(options.required || required).join(',')}
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

test('UniEnter-only publication generates no other work detail pages',()=>{
  const r=build([works[0]],200,{required:['unienter']});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.home,/works\/unienter\//);
  for(const id of required.slice(1)) assert.ok(!r.home.includes(`works/${id}/`));
  assert.ok(r.details[0]);
  assert.deepEqual(r.details.slice(1),[null,null,null,null]);
});

test('CMS textareas preserve line and paragraph breaks and escape markup',()=>{
  const r=build([{...works[0],lead:'DUMMY overview\r\nsecond line\n\nlast line <script>alert(1)</script>',
    sections:[{fieldId:'section',heading:'DUMMY <heading>',body:'Line one\r\nLine two\n\nLine four & text'}]
  }],200,{required:['unienter']});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.details[0],/DUMMY overview<br>second line<br><br>last line &lt;script&gt;/);
  assert.match(r.details[0],/DUMMY &lt;heading&gt;/);
  assert.match(r.details[0],/Line one<br>Line two<br><br>Line four &amp; text/);
  assert.doesNotMatch(r.details[0],/<script>alert\(1\)/);
});

test('empty optional fields omit sections, lead and gallery without undefined content',()=>{
  const r=build([{...works[0],lead:' \n ',gallery:[],sections:[null,{}, {heading:'  ',body:'\r\n'}]}],200,{required:['unienter']});
  assert.equal(r.status,0,r.stderr);
  assert.doesNotMatch(r.details[0],/class="work-body"|class="work-gallery"|undefined/);
});

test('partial sections allow either heading or body and retain long text',()=>{
  const long='DUMMY_LONG_TEXT_'.repeat(200);
  const r=build([{...works[0],sections:[{fieldId:'section',body:long},{fieldId:'section',heading:'DUMMY heading only'}]}],200,{required:['unienter']});
  assert.equal(r.status,0,r.stderr);
  assert.ok(r.details[0].includes(long));
  assert.match(r.details[0],/DUMMY heading only/);
  assert.doesNotMatch(r.details[0],/undefined|class="work-lead|\( Overview \)/);
  assert.equal((r.details[0].match(/class="work-sec"/g)||[]).length,2);
});

test('multiple CMS gallery images retain order, dimensions and existing layout',()=>{
  const gallery=[{url:'https://images.microcms-assets.io/assets/dummy-01.png',width:1200,height:675},{url:'https://images.microcms-assets.io/assets/dummy-02.png',width:900,height:900},{url:'https://images.microcms-assets.io/assets/dummy-03.png',width:750,height:1000}];
  const r=build([{...works[0],gallery}],200,{required:['unienter']});
  assert.equal(r.status,0,r.stderr);
  const html=r.details[0];
  assert.ok(html.indexOf('dummy-01.png')<html.indexOf('dummy-02.png'));
  assert.ok(html.indexOf('dummy-02.png')<html.indexOf('dummy-03.png'));
  assert.equal((html.match(/class="ht g-wide"/g)||[]).length,1);
  assert.equal((html.match(/class="ht g-narrow"/g)||[]).length,2);
  assert.match(html,/width="750" height="1000"/);
});

test('the reusable dummy fixture is always blocked from the production build',()=>{
  const fixture=JSON.parse(readFileSync(join(repo,'.github/fixtures/work-details/works.json'),'utf8'));
  const r=build([works[0],...fixture.contents],200,{required:['unienter']});
  assert.equal(r.status,1);assert.equal(r.home,'EXISTING SITE');
  assert.match(r.stderr,/Sample works present; publication blocked/);
});

test('isolated preview creates noindex pages without changing production output',()=>{
  const script=join(repo,'.github/scripts/preview-work-details.mjs');
  const output=join(repo,'_site-source/public/index.html');
  const before=existsSync(output)?readFileSync(output,'utf8'):null;
  const run=spawnSync(process.execPath,[script],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(run.status,0,run.stderr);
  const {previewDirectory}=JSON.parse(run.stdout);
  try {
    assert.equal(existsSync(join(previewDirectory,'CNAME')),false);
    for(const id of ['cms-detail-dummy','cms-detail-empty','cms-detail-long']) {
      const html=readFileSync(join(previewDirectory,'works',id,'index.html'),'utf8');
      assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
      assert.match(html,/Sample project/);
    }
    assert.equal(existsSync(output)?readFileSync(output,'utf8'):null,before);
  } finally {rmSync(resolve(previewDirectory,'../..'),{recursive:true,force:true});}
});

test('preview refuses unlabelled records and slug overrides before writing output',()=>{
  const dir=mkdtempSync(join(tmpdir(),'octo-preview-input-test-'));
  try {
    const path=join(dir,'editorial.json');
    for(const input of [works[0],{id:'dummy',title:'DUMMY',sample:true,slug:'../escape'}]) {
      writeFileSync(path,JSON.stringify(input));
      const r=spawnSync(process.execPath,[join(repo,'.github/scripts/preview-work-details.mjs'),path],{encoding:'utf8',env:{PATH:process.env.PATH}});
      assert.equal(r.status,1);assert.equal(r.stdout,'');
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
