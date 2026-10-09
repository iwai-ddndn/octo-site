// コンテンツの読み込み口。ビルド時に1回だけ呼ばれる。
//   - 環境変数 MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY があれば microCMS から取得
//   - MICROCMS_MOCK=<dir> なら microCMS 形式のJSON（works.json / site.json）を読む（ローカル検証用）
//   - どちらも無ければ src/data.mjs のローカルデータ
// どの経路でも同じ形（下の normalizeWork の戻り値）に揃えるので、テンプレート側は出どころを意識しない。
import { readFileSync, existsSync } from 'node:fs';
import * as local from './data.mjs';

const DIMS = JSON.parse(readFileSync(new URL('./dims.json', import.meta.url)));
const CATEGORY_KEYS = Object.keys(local.categories);

// 画像参照を { src, w, h, remote } に揃える。src はローカルなら assets/ からの相対パス
function localImage(file, dir = 'works') {
  if (!file) return null;
  const path = `${dir}/${file}`;
  const d = DIMS[path] || [];
  return { src: path, w: d[0], h: d[1], remote: false };
}
function cmsImage(img) {
  if (!img?.url) return null;
  // microCMS の画像は imgix 互換の変換パラメータが使える。WebGLで使うため CORS 付きで読む
  const remote = /^https?:/.test(img.url);
  if (!remote) return { src: img.url.replace(/^\/?assets\//, ''), w: img.width, h: img.height, remote: false };
  return { src: `${img.url}?fm=webp&q=82&w=1800`, w: img.width, h: img.height, remote: true };
}

const lines = (v) => (Array.isArray(v) ? v : String(v || '').split(/\r?\n|,\s*/)).map((s) => s.trim()).filter(Boolean);
const first = (v) => (Array.isArray(v) ? v[0] : v);

function normalizeLocal(w) {
  return {
    ...w,
    cover: localImage(w.cover),
    gallery: (w.gallery || []).map((g) => localImage(g)),
    featured: w.featured !== false,
  };
}

function normalizeCms(c) {
  const category = first(c.category);
  if (!CATEGORY_KEYS.includes(category)) console.warn(`[cms] unknown category "${category}" in ${c.id}`);
  return {
    slug: c.slug || c.id,
    sample: !!c.sample,
    featured: c.featured !== false,
    title: c.title,
    subtitle: c.subtitle || '',
    client: c.client || '',
    year: String(c.year || ''),
    category,
    role: lines(c.role),
    cover: cmsImage(c.cover),
    gallery: (c.gallery || []).map(cmsImage).filter(Boolean),
    lead: c.lead || '',
    sections: (c.sections || []).map((s) => ({ h: s.heading ?? s.h, p: s.body ?? s.p })).filter((s) => s.h || s.p),
    url: c.url || '',
  };
}

async function fetchCms(endpoint, { list = true } = {}) {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  const key = process.env.MICROCMS_API_KEY;
  const get = async (q) => {
    const res = await fetch(`https://${domain}.microcms.io/api/v1/${endpoint}${q}`, { headers: { 'X-MICROCMS-API-KEY': key }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (res.status === 404 && endpoint === 'site') return null;
    if (!res.ok) throw Object.assign(new Error(`[cms] ${endpoint}: HTTP ${res.status}`), { status: res.status });
    const body = await res.json();
    console.log(`[cms] ${endpoint}: HTTP ${res.status}${list ? `; published total=${body.totalCount}` : ''}`);
    return body;
  };
  if (!list) return get('');
  const all = [];
  // 並び順は数値フィールド order（昇順）→ 年（降順）。order 未定義のAPIなら公開日順にフォールバック
  let orders = 'order,-year';
  try { await get(`?limit=1&orders=${orders}`); } catch (error) {
    if (error.status !== 400) throw error;
    orders = '-publishedAt';
  }
  for (let offset = 0; ; offset += 100) {
    const r = await get(`?limit=100&offset=${offset}&orders=${orders}`);
    if (!Array.isArray(r.contents) || !Number.isInteger(r.totalCount) || r.totalCount < 0) throw new Error('[cms] invalid works response');
    if (!r.contents.length && all.length < r.totalCount) throw new Error('[cms] incomplete works pagination');
    all.push(...r.contents);
    if (all.length >= r.totalCount) return all;
  }
}

export async function loadContent() {
  const mock = process.env.MICROCMS_MOCK;
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  const key = process.env.MICROCMS_API_KEY;
  if (!mock && !!domain !== !!key) throw new Error('[cms] both MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY are required');
  const live = domain && key;
  let works, siteObj = null, source = 'local';

  if (mock) {
    const read = (f) => (existsSync(`${mock}/${f}`) ? JSON.parse(readFileSync(`${mock}/${f}`, 'utf8')) : null);
    works = read('works.json')?.contents.map(normalizeCms);
    siteObj = read('site.json');
    source = `mock(${mock})`;
  } else if (live) {
    works = (await fetchCms('works'))?.map(normalizeCms);
    // works-only keys must never request the optional site API.
    if (process.env.MICROCMS_INCLUDE_SITE === 'true') siteObj = await fetchCms('site', { list: false });
    source = `microCMS(${process.env.MICROCMS_SERVICE_DOMAIN})`;
  }
  if (!works) works = local.works.map(normalizeLocal);

  // CMSの site（オブジェクト形式・任意）に入っている項目だけコピーを上書きする
  const copy = { ...local.copy };
  if (siteObj) for (const k of Object.keys(copy)) if (siteObj[k] != null && siteObj[k] !== '') copy[k] = siteObj[k];

  const bad = works.filter((w) => !w.slug || !w.title || !CATEGORY_KEYS.includes(w.category));
  if (bad.length) throw new Error(`[content] slug/title/category が不正な作品があります: ${bad.map((w) => w.slug || w.title).join(', ')}`);

  return { ...local, works, copy, source };
}

// Connectivity and editorial readiness are separate: zero published works is a valid API result.
export function assertPublishable(content) {
  if (!content.works.length) throw new Error('[publish] No published works; keep the current live site unchanged.');
  if (content.works.some((w) => w.sample)) throw new Error('[publish] Sample works present; publication blocked.');
  const required = (process.env.CMS_REQUIRED_IDS || '').split(',').filter(Boolean);
  if (required.some(id => !content.works.some(w => w.slug === id))) throw new Error('[publish] Required published works are missing.');
  if (content.works.some(w => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(w.slug))) throw new Error('[publish] Invalid work URL.');
  if (new Set(content.works.map(w => w.slug)).size !== content.works.length) throw new Error('[publish] Duplicate work URLs.');
}
