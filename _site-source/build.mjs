// node build.mjs → public/ に index.html / works/index.html / works/<slug>/index.html / 404.html を生成する
// コンテンツは src/content.mjs が「ローカル / microCMS / モック」から読み込む（CMS.md 参照）
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { loadContent, assertPublishable } from './src/content.mjs';

const content = await loadContent();
// Check before any output writes. Local design previews remain available.
if (process.env.MICROCMS_SERVICE_DOMAIN || process.env.CMS_PUBLISH === 'true') assertPublishable(content);
const { site, services, profile, works: allWorks, categories, copy, source } = content;
const works = allWorks;
const featured = allWorks.filter((w) => w.featured);
const DIMS = JSON.parse(readFileSync(new URL('./src/dims.json', import.meta.url)));

const OUT = new URL('./public/', import.meta.url).pathname;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
// コピー用: 改行→<br>、[[語]]→網点マーカー
const txt = (s) => esc(s).replace(/\n/g, '<br>').replace(/\[\[(.+?)\]\]/g, '<span class="hl">$1</span>');
const asset = (path) => ({ src: path, w: DIMS[path]?.[0], h: DIMS[path]?.[1], remote: false });

const WORDMARK = `<svg class="wordmark" viewBox="0 0 657.664 231.35" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M576.464 231.35C550.33 231.35 530.264 223.533 516.264 207.9C502.264 192.033 495.264 169.4 495.264 140C495.264 110.6 502.264 88.0833 516.264 72.45C530.264 56.8167 550.33 49 576.464 49C593.964 49 608.664 52.5 620.564 59.5C632.697 66.5 641.914 76.7667 648.214 90.3C654.514 103.833 657.664 120.4 657.664 140C657.664 169.4 650.664 192.033 636.664 207.9C622.664 223.533 602.597 231.35 576.464 231.35ZM576.464 213.5C596.064 213.5 611.114 207.2 621.614 194.6C632.347 182 637.714 163.8 637.714 140C637.714 116.2 632.347 98.1167 621.614 85.75C611.114 73.15 596.064 66.85 576.464 66.85C556.864 66.85 541.697 73.15 530.964 85.75C520.464 98.1167 515.214 116.2 515.214 140C515.214 163.8 520.464 182 530.964 194.6C541.697 207.2 556.864 213.5 576.464 213.5Z"/><path d="M469.221 70H425.822V210.35H467.471V227.85H445.072C430.838 227.85 420.688 225.517 414.621 220.85C408.788 216.183 405.871 206.733 405.871 192.5V70H374.721V52.5H405.871V0H425.822V52.5H469.221V70Z"/><path d="M280.142 231.35C252.609 231.35 232.076 223.533 218.542 207.9C205.009 192.033 198.242 169.4 198.242 140C198.242 110.6 205.242 88.0833 219.242 72.45C233.242 56.8167 253.309 49 279.442 49C292.509 49 303.826 51.1 313.392 55.3C323.192 59.5 331.126 65.45 337.192 73.15C343.259 80.85 347.342 90.0667 349.442 100.8H328.442C326.109 90.5333 321.326 82.3667 314.092 76.3C307.092 70 295.659 66.85 279.792 66.85C259.959 66.85 244.676 73.15 233.942 85.75C223.442 98.1167 218.192 116.2 218.192 140C218.192 163.8 223.442 182 233.942 194.6C244.676 207.2 259.959 213.5 279.792 213.5C294.959 213.5 306.275 211.05 313.742 206.15C321.209 201.017 326.109 192.85 328.442 181.65H349.792C347.926 191.45 344.076 200.083 338.242 207.55C332.642 215.017 324.942 220.85 315.142 225.05C305.576 229.25 293.909 231.35 280.142 231.35Z"/><path d="M81.2 231.35C55.0667 231.35 35 223.533 21 207.9C7 192.033 0 169.4 0 140C0 110.6 7 88.0833 21 72.45C35 56.8167 55.0667 49 81.2 49C98.7 49 113.4 52.5 125.3 59.5C137.433 66.5 146.65 76.7667 152.95 90.3C159.25 103.833 162.4 120.4 162.4 140C162.4 169.4 155.4 192.033 141.4 207.9C127.4 223.533 107.333 231.35 81.2 231.35ZM81.2 213.5C100.8 213.5 115.85 207.2 126.35 194.6C137.083 182 142.45 163.8 142.45 140C142.45 116.2 137.083 98.1167 126.35 85.75C115.85 73.15 100.8 66.85 81.2 66.85C61.6 66.85 46.4333 73.15 35.7 85.75C25.2 98.1167 19.95 116.2 19.95 140C19.95 163.8 25.2 182 35.7 194.6C46.4333 207.2 61.6 213.5 81.2 213.5Z"/></svg>`;

const ARROW = `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5L13.59 6.41L18.17 11H2V13H18.17L13.58 17.59L15 19L22 12L15 5Z" fill="currentColor"/></svg>`;
const STAR = `<svg class="star" viewBox="-1 -1 2 2" aria-hidden="true"><path d="M0-1L.18-.43.71-.71.43-.18 1 0 .43.18.71.71.18.43 0 1-.18.43-.71.71-.43.18-1 0-.43-.18-.71-.71-.18-.43Z" fill="currentColor"/></svg>`;

// 見出しは1文字ずつspan化して出現アニメーション（スクリーンリーダー用に aria-label を残す）
const split = (text) => {
  let i = 0;
  const words = text.split(' ').map(
    (w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join('')}</span>`
  );
  return `<span class="split" aria-label="${esc(text)}"><span aria-hidden="true">${words.join(' ')}</span></span>`;
};

const marks = `<i class="reg tl"></i><i class="reg tr"></i><i class="reg bl"></i><i class="reg br"></i>`;

function layout({ base, title, desc, path, og, body, page }) {
  const url = site.url + '/' + path;
  return `<!doctype html>
<html lang="ja" data-page="${page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#f7f6f2">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${/^https?:/.test(og) ? og : `${site.url}/${og}`}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/css/site.css?v=covers-1">
<script>
  // 遷移ワイプ/ローダーの初期状態をペイント前に決める（白フラッシュ防止）
  (function(){var d=document.documentElement;try{
    if(sessionStorage.getItem('octo:wipe')){d.classList.add('wipe-in');}
    else if(!sessionStorage.getItem('octo:seen')&&d.dataset.page==='home'){d.classList.add('is-loading');}
  }catch(e){} d.classList.add('js');})();
</script>
<script type="module" src="${base}assets/js/main.js?v=covers-1"></script>
</head>
<body>
<a class="skip" href="#main">本文へスキップ</a>
${header(base)}
<main id="main">
${body}
</main>
${footer(base)}
${contactPanel()}
<div id="wipe" aria-hidden="true"><canvas></canvas>
  <div class="loader">
    <p class="loader-pct mono"><span>000</span></p>
    <p class="loader-word mono">octo — multi design studio</p>
  </div>
</div>
<div id="cursor" aria-hidden="true"><span class="cursor-label mono">View</span></div>
</body>
</html>
`;
}

function header(base) {
  return `<header class="hd" id="hd">
  <a class="hd-logo" href="${base}" aria-label="octo トップへ">${WORDMARK}</a>
  <p class="hd-tag mono">multi design studio</p>
  <nav class="hd-nav mono" aria-label="メイン">
    <a href="${base}works/"><span>Works</span><sup>${pad(works.length)}</sup></a>
    <a href="${base}#services"><span>Services</span></a>
    <a href="${base}#about"><span>About</span></a>
  </nav>
  <button class="hd-contact mono js-contact" type="button"><span>Contact</span>${STAR}</button>
  <button class="hd-menu mono" type="button" aria-expanded="false" aria-controls="menu"><span>Menu</span></button>
</header>
<div class="menu" id="menu" data-theme="blue" hidden>
  <nav aria-label="モバイル">
    <a href="${base}"><small class="mono">00</small>Home</a>
    <a href="${base}works/"><small class="mono">01</small>Works</a>
    <a href="${base}#services"><small class="mono">02</small>Services</a>
    <a href="${base}#about"><small class="mono">03</small>About</a>
    <button class="js-contact" type="button"><small class="mono">04</small>Contact</button>
  </nav>
  <p class="mono">${site.email}</p>
</div>`;
}

function footer(base) {
  return `<footer class="ft" data-theme="blue">
  <section class="cta" id="contact">
    <canvas class="stage" data-stage="cta"></canvas>
    ${marks}
    <div class="cta-inner">
      <p class="label mono">( Contact )</p>
      <h2 class="cta-title">${split(copy.ctaLine1)}<br>${split(copy.ctaLine2)}</h2>
      <p class="cta-jp">${txt(copy.ctaLead)}</p>
      <div class="cta-actions">
        <button class="btn btn-invert js-contact" type="button"><span>Start a project</span>${ARROW}</button>
        <a class="cta-mail mono" href="mailto:${site.email}">${site.email}</a>
      </div>
    </div>
  </section>
  <div class="ft-bottom">
    <div class="ft-cols mono">
      <div><p class="label">Studio</p><p>octo — multi design studio<br>by ${profile.name}</p></div>
      <div><p class="label">Index</p><p><a href="${base}works/">Works</a><br><a href="${base}#services">Services</a><br><a href="${base}#about">About</a></p></div>
      <div><p class="label">Contact</p><p><a href="mailto:${site.email}">${site.email}</a></p></div>
      <div class="ft-top"><button class="js-top" type="button">Back to top ↑</button></div>
    </div>
    <a class="ft-mark" href="${base}" aria-label="octo" data-cursor="Top">${media(asset('img/wordmark-print.svg'), 'octo', { base, preset: 'lineInverse', cls: 'ft-mark-ht', ratio: '669.664/243.35' })}</a>
    <p class="ft-copy mono"><span>&copy; ${new Date().getFullYear()} octo All Rights Reserved.</span><span>oc-to.com</span></p>
  </div>
</footer>`;
}

function contactPanel() {
  return `<div class="contact" id="contact-panel" data-theme="blue" role="dialog" aria-modal="true" aria-labelledby="contact-title" hidden>
  <button class="contact-close mono" type="button" aria-label="閉じる"><span>Close</span><i></i></button>
  <div class="contact-grid">
    <div class="contact-head">
      <p class="label mono">( Contact )</p>
      <h2 id="contact-title" class="contact-title">${txt(copy.contactTitle)}</h2>
      <p class="contact-lead">${txt(copy.contactLead)}</p>
      <p class="mono contact-mail"><a href="mailto:${site.email}">${site.email}</a></p>
    </div>
    <form class="contact-form" id="contact-form" data-endpoint="${site.formEndpoint}" novalidate>
      <input type="hidden" name="_subject" value="【oc-to.com】お問い合わせ">
      <input type="hidden" name="_template" value="table">
      <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <fieldset class="topics">
        <legend class="mono">01 / ご相談の領域（複数可）</legend>
        ${services.map((s) => `<label><input type="checkbox" name="ご相談の領域" value="${s.title}"><span>${s.title}</span></label>`).join('')}
        <label><input type="checkbox" name="ご相談の領域" value="その他"><span>Other</span></label>
      </fieldset>
      ${[
        ['cf-name', 'お名前', 'text', '例）岩井 宗一郎', 'name', true, '02'],
        ['cf-company', '貴社名', 'text', '例）octo', 'organization', true, '03'],
        ['cf-department', 'ご所属', 'text', '例）デザイン部', 'organization-title', false, '04'],
        ['cf-email', 'メールアドレス', 'email', '例）info@oc-to.com', 'email', true, '05'],
      ]
        .map(
          ([id, label, type, ph, ac, req, no]) => `<div class="field">
        <label for="${id}"><span class="mono">${no}</span>${label}${req ? ' <em>*</em>' : ''}</label>
        <input id="${id}" name="${label}" type="${type}" placeholder="${ph}" autocomplete="${ac}"${req ? ' required' : ''}>
      </div>`
        )
        .join('\n      ')}
      <div class="field">
        <label for="cf-message"><span class="mono">06</span>ご依頼内容 <em>*</em></label>
        <textarea id="cf-message" name="ご依頼内容" rows="5" placeholder="ご入力ください。" required></textarea>
      </div>
      <p class="form-error" role="alert"></p>
      <button class="btn btn-invert contact-send" type="submit"><span>Send</span>${ARROW}</button>
    </form>
    <div class="contact-thanks" hidden>
      <p class="label mono">( Sent )</p>
      <h2 class="contact-title">Thank you.</h2>
      <p class="contact-lead">お問い合わせありがとうございます。2〜3営業日以内に、ご入力いただいたメールアドレス宛にご連絡いたします。連絡が届かない場合は、お手数ですがもう一度お送りください。</p>
      <button class="btn btn-invert contact-done" type="button"><span>Close</span>${ARROW}</button>
    </div>
  </div>
</div>`;
}

// img: { src, w, h, remote }（content.mjs で正規化済み）。ローカルは assets/ からの相対
const media = (img, alt, { base = '', preset = 'photo', cls = '', ratio, eager = false, focus, style = '', fx } = {}) => {
  if (!img) return cls === 'card-media' ? '<div class="card-media" style="background:var(--paper-2)" aria-hidden="true"></div>' : '';
  const src = img.remote ? img.src : `${base}assets/${img.src}`;
  const st = [ratio ? `--ratio:${ratio}` : '', style].filter(Boolean).join(';');
  return `<figure class="ht ${cls}" data-preset="${preset}"${['card-media', 'work-cover', 'next-media'].includes(cls) ? ' data-fit="contain"' : ''}${fx ? ` data-fx="${fx}"` : ''}${focus ? ` data-focus="${focus}"` : ''}${st ? ` style="${st}"` : ''}>
    <img src="${esc(src)}" alt="${esc(alt)}"${img.w ? ` width="${img.w}" height="${img.h}"` : ''}${img.remote ? ' crossorigin="anonymous"' : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  </figure>`;
};

const workCard = (w, i, base, variant = '', style = '') => `<article class="card ${variant}" data-cat="${w.category}"${style ? ` style="${style}"` : ''}>
  <a href="${base}works/${w.slug}/" class="card-link" data-cursor="View">
    ${media(w.cover, `${w.title} — ${w.subtitle}`, { base, cls: 'card-media' })}
    <div class="card-meta">
      <span class="card-no mono">${pad(i + 1)}</span>
      <h3 class="card-title"><span>${esc(w.title)}</span></h3>
      <p class="card-sub">${esc(w.subtitle)}</p>
      <p class="card-tags mono"><span>${categories[w.category]}</span><span>${w.year}</span></p>
    </div>
  </a>
</article>`;

// ---------- Home ----------
// 横スクロールのカードの縦横比（幅 = 高さ × r）。リズムを作るため交互に変える
const HS_RATIOS = [0.8, 1.5, 1, 0.8, 1.25, 1.5];
function home() {
  const base = '';
  const body = `
<section class="hero" data-theme="paper">
  <canvas class="stage" data-stage="hero"></canvas>
  ${marks}
  <h1 class="sr-only">octo — multi design studio / ${esc(profile.name)}</h1>
  <div class="hero-grid">
    <p class="hero-idx mono"><span>( octo )</span><span>Web / UI&#8202;UX / Graphic / AI</span></p>
    <p class="hero-title" aria-hidden="true">
      <span class="line">${split(copy.heroLine1)}</span>
      <span class="line">${split(copy.heroLine2)}</span>
    </p>
    <p class="hero-jp reveal">${txt(copy.heroLead)}</p>
    <ol class="hero-svc mono">
      ${services.map((s) => `<li><a href="#svc-${s.key}"><span>${s.no}</span>${s.title}</a></li>`).join('')}
    </ol>
    <p class="hero-readout mono" aria-hidden="true">
      <span>Screen 45° / 15°</span><span>Cell <b data-lpi>—</b></span><span>Frame <b data-frame>0000</b></span>
    </p>
    <p class="hero-cue mono" aria-hidden="true"><span>Scroll</span><i></i></p>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-track">
  ${Array.from({ length: 2 }, () => services.map((s) => `<span>${s.title}</span>${STAR}`).join('')).join('')}
</div></div>

<section class="statement" data-theme="paper">
  <p class="label mono">( Studio )</p>
  <p class="statement-text reveal-lines">${txt(copy.statement)}</p>
  <p class="statement-en mono reveal">${txt(copy.statementEn)}</p>
</section>

<section class="works hs" id="works" data-theme="paper">
  <div class="hs-pin">
    <div class="hs-head">
      <p class="label mono">( Selected Works )</p>
      <h2 class="hs-title">${split('Works')}<sup class="mono">${pad(featured.length)}</sup></h2>
      <p class="hs-hint mono" aria-hidden="true"><span>${esc(copy.worksLead)}</span><i></i></p>
    </div>
    <div class="hs-track">
      ${featured.map((w, i) => workCard(w, i, base, `hs-card ${i % 2 ? 'is-low' : 'is-high'}`, `--r:${HS_RATIOS[i % HS_RATIOS.length]}`)).join('\n      ')}
      <a class="hs-end" href="works/" data-cursor="Index">
        <span class="hs-end-label mono">( Index )</span>
        <span class="hs-end-title">All<br>works</span>
        <span class="hs-end-foot mono"><span>${pad(works.length)} projects</span>${ARROW}</span>
      </a>
    </div>
    <div class="hs-ui mono" aria-hidden="true">
      <span class="hs-count"><b data-hs-cur>01</b> / ${pad(featured.length)}</span>
      <span class="hs-bar"><i data-hs-bar></i></span>
      <span class="hs-cat" data-hs-cat>${categories[featured[0]?.category] || ''}</span>
    </div>
  </div>
</section>

<section class="services" id="services" data-theme="blue">
  ${marks}
  <div class="sec-head">
    <p class="label mono">( Services )</p>
    <h2 class="sec-title">${split('Services')}<sup class="mono">04</sup></h2>
  </div>
  <div class="svc-wrap">
    <ol class="svc-list">
      ${services
        .map(
          (s) => `<li class="svc" id="svc-${s.key}" data-key="${s.key}">
        <p class="svc-no mono">${s.no}</p>
        <div class="svc-text">
          <h3 class="svc-title">${esc(s.title)}</h3>
          <p class="svc-body">${esc(s.body)}</p>
        </div>
        <div class="svc-3d svc-3d-inline" data-scene="${s.key}">${media(asset(`img/${s.img}`), s.title, { base, cls: 'svc-media', ratio: '3/2' })}</div>
      </li>`
        )
        .join('\n      ')}
    </ol>
    <div class="svc-stage" aria-hidden="true">
      ${services.map((s, i) => `<div class="svc-3d svc-3d-stage${i ? '' : ' is-active'}" data-scene="${s.key}">${media(asset(`img/${s.img}`), '', { base, cls: 'svc-media', ratio: '3/2' })}</div>`).join('')}
      <p class="svc-stage-cap mono"><b data-svc-no>01</b><span>/ ${pad(services.length)}</span><span class="svc-stage-name" data-svc-name>${esc(services[0].title)}</span></p>
      <p class="svc-stage-bar"><i data-svc-bar></i></p>
    </div>
  </div>
</section>

<section class="about" id="about" data-theme="paper">
  <div class="sec-head">
    <p class="label mono">( About )</p>
    <h2 class="sec-title">${split('About')}</h2>
  </div>
  <div class="about-grid">
    ${media(asset(`img/${profile.img}`), profile.name, { base, cls: 'about-media', ratio: '4/5', focus: '0.5,0.35' })}
    <div class="about-body">
      <p class="about-role mono">${esc(profile.role)}</p>
      <h3 class="about-name">${esc(profile.name)}<small>${esc(profile.nameJa)}</small></h3>
      <p class="about-bio reveal">${esc(profile.bio)}</p>
      <ol class="timeline mono">
        ${profile.timeline.map((t, i) => `<li><span>${pad(i + 1)}</span><span>${esc(t.what)}</span></li>`).join('')}
      </ol>
    </div>
  </div>
</section>`;
  return layout({
    base, page: 'home', path: '', og: 'assets/img/og.png',
    title: 'octo — multi design studio',
    desc: copy.description,
    body,
  });
}

// ---------- Works index ----------
function worksIndex() {
  const base = '../';
  const counts = Object.fromEntries(Object.keys(categories).map((k) => [k, works.filter((w) => w.category === k).length]));
  const body = `
<section class="page-head" data-theme="paper">
  ${marks}
  <p class="label mono">( Index )</p>
  <h1 class="page-title">${split('Works')}<sup class="mono">${pad(works.length)}</sup></h1>
  <div class="filters mono" role="group" aria-label="カテゴリで絞り込み">
    <button type="button" class="is-active" data-filter="all">All<sup>${pad(works.length)}</sup></button>
    ${Object.entries(categories)
      .map(([k, v]) => `<button type="button" data-filter="${k}"${counts[k] ? '' : ' disabled'}>${v}<sup>${pad(counts[k])}</sup></button>`)
      .join('')}
  </div>
</section>
<section class="works-index" data-theme="paper">
  <div class="index-grid">
    ${works.map((w, i) => workCard(w, i, base)).join('\n    ')}
  </div>
</section>`;
  return layout({
    base, page: 'works', path: 'works/', og: 'assets/img/og.png',
    title: 'Works — octo', desc: 'octoの制作実績一覧。Webデザイン、UI/UXデザイン、グラフィックデザイン、AIクリエイティブ。', body,
  });
}

// ---------- Work detail ----------
function workPage(w, i) {
  const base = '../../';
  const next = works[(i + 1) % works.length];
  const [first, ...rest] = w.gallery;
  const body = `
<article class="work" data-theme="paper">
  <header class="work-head">
    ${marks}
    <p class="work-crumb mono"><a href="${base}works/">Works</a><span>/</span><span>${pad(i + 1)} — ${pad(works.length)}</span>${w.sample ? '<span class="sample">Sample project</span>' : ''}</p>
    <h1 class="work-title">${split(w.title)}</h1>
    ${w.subtitle ? `<p class="work-sub">${esc(w.subtitle)}</p>` : ''}
    <dl class="work-meta mono">
      ${w.client ? `<div><dt>Client</dt><dd>${esc(w.client)}</dd></div>` : ''}
      ${w.year ? `<div><dt>Year</dt><dd>${esc(w.year)}</dd></div>` : ''}
      <div><dt>Service</dt><dd>${categories[w.category]}</dd></div>
      ${w.role.length ? `<div><dt>Role</dt><dd>${w.role.map(esc).join('<br>')}</dd></div>` : ''}${w.url ? `\n      <div><dt>Link</dt><dd><a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.url.replace(/^https?:\/\//, ''))} ↗</a></dd></div>` : ''}
    </dl>
  </header>
  ${media(w.cover, `${w.title} cover`, { base, cls: 'work-cover', eager: true, fx: 'soft' })}
  ${w.lead || w.sections.length ? `<div class="work-body">
    <p class="label mono">( Overview )</p>
    <p class="work-lead reveal-lines">${esc(w.lead)}</p>
    ${w.sections
      .map((s, k) => `<section class="work-sec">
      <h2 class="mono"><span>${pad(k + 1)}</span>${esc(s.h)}</h2>
      <p class="reveal">${esc(s.p)}</p>
    </section>`)
      .join('\n    ')}
  </div>` : ''}
  <div class="work-gallery">
    ${first ? media(first, `${w.title} image 1`, { base, cls: 'g-wide', fx: 'soft' }) : ''}
    ${rest.map((g, k) => media(g, `${w.title} image ${k + 2}`, { base, cls: 'g-narrow', fx: 'soft' })).join('')}
  </div>
</article>
<a class="next" href="${base}works/${next.slug}/" data-theme="blue" data-cursor="Next"${next.cover ? '' : ' style="background:var(--blue)"'}>
  ${media(next.cover, '', { base, cls: 'next-media', preset: 'photoInverse' })}
  <span class="next-label mono">( Next project )</span>
  <span class="next-title">${split(next.title)}</span>
  <span class="next-sub mono">${esc(next.subtitle)} ${ARROW}</span>
</a>`;
  return layout({
    base, page: 'work', path: `works/${w.slug}/`, og: w.cover ? (w.cover.remote ? w.cover.src : `assets/${w.cover.src}`) : 'assets/img/og.png',
    title: `${w.title}${w.subtitle ? ` — ${w.subtitle}` : ''} | octo`, desc: w.lead || copy.description, body,
  });
}

// ---------- 404 ----------
// GitHub Pages はどの階層でも /404.html を返すため、アセットはルート絶対パスで参照する
function notFound() {
  const body = `
<section class="hero nf" data-theme="paper">
  <canvas class="stage" data-stage="hero"></canvas>
  ${marks}
  <div class="hero-grid">
    <p class="hero-idx mono"><span>( 404 )</span><span>Page not found</span></p>
    <h1 class="hero-title"><span class="line">${split('Lost in')}</span><span class="line">${split('the dots.')}</span></h1>
    <p class="hero-jp reveal">お探しのページは見つかりませんでした。<br><a href="/" style="text-decoration:underline;text-underline-offset:4px">トップへ戻る →</a></p>
  </div>
</section>`;
  return layout({ base: '/', page: '404', path: '404.html', og: 'assets/img/og.png', title: '404 — octo', desc: 'ページが見つかりません。', body });
}

const write = (p, html) => {
  mkdirSync(OUT + p.replace(/[^/]*$/, ''), { recursive: true });
  writeFileSync(OUT + p, html);
};
write('index.html', home());
write('works/index.html', worksIndex());
works.forEach((w, i) => write(`works/${w.slug}/index.html`, workPage(w, i)));
write('404.html', notFound());
write('CNAME', 'oc-to.com\n');
console.log(`built from ${source}: home (${featured.length} featured), works index, ${works.length} work pages, 404`);
