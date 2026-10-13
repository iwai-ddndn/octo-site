// Build a local-only copy using the production CMS normalizer and templates.
// Input is editorial JSON (no API key or draftKey). No network/API request or deploy.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = join(repo, '.github/fixtures/work-details');
const input = resolve(process.argv[2] || join(fixtures, 'works.json'));
const json = JSON.parse(readFileSync(input, 'utf8'));
const contents = Array.isArray(json.contents) ? json.contents : [json];
if (!contents.length || contents.some(w => w.sample !== true || !/ダミー|dummy/i.test(w.title || '') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(w.id || '') || (w.slug != null && w.slug !== w.id))) {
  throw new Error('Preview input must contain explicitly labelled sample records with safe IDs.');
}
if (new Set(contents.map(w => w.id)).size !== contents.length) throw new Error('Duplicate preview IDs.');
const dir = mkdtempSync(join(tmpdir(), 'octo-detail-preview-'));
const source = join(dir, '_site-source');
mkdirSync(join(source, 'public'), {recursive: true});
cpSync(join(repo, '_site-source/src'), join(source, 'src'), {recursive: true});
cpSync(join(repo, '_site-source/build.mjs'), join(source, 'build.mjs'));
cpSync(join(repo, '_site-source/public/assets'), join(source, 'public/assets'), {recursive: true});
cpSync(join(fixtures, 'assets'), join(source, 'public/assets/cms-preview'), {recursive: true});
const mock = join(dir, 'cms-input');
mkdirSync(mock);
writeFileSync(join(mock, 'works.json'), JSON.stringify({contents, totalCount: contents.length}));
const run = spawnSync(process.execPath, [join(source, 'build.mjs')], {
  encoding: 'utf8', env: {PATH: process.env.PATH, MICROCMS_MOCK: mock, CMS_PREVIEW: 'true'},
});
if (run.status !== 0) { console.error('Local preview build failed.'); process.exitCode = 1; }
else {
  rmSync(join(source, 'public/CNAME'));
  console.log(JSON.stringify({previewDirectory: join(source, 'public'), input, pages: contents.map(w => `/works/${w.id}/`), deployable: false}, null, 2));
}
