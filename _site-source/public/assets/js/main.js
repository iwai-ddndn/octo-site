import { Burst } from './burst.js';
import { Halftone } from './halftone.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const BLUE = '#2962ff';
const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ ticker */
const subs = new Set();
let last = performance.now();
const scroll = { y: window.scrollY, v: 0, sv: 0 };
function frame(now) {
  const dt = Math.min(64, now - last) / 1000;
  last = now;
  const y = window.scrollY;
  scroll.v = (y - scroll.y) / Math.max(dt, 1 / 240) / 60; // px/frame換算
  scroll.y = y;
  scroll.sv = lerp(scroll.sv, scroll.v, 0.12);
  for (const fn of subs) fn(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ------------------------------------------------------------------ ready gate */
let readyResolve;
const pageReady = new Promise((r) => (readyResolve = r));

/* ------------------------------------------------------------------ wipe（網点の遷移） */
const wipe = (() => {
  const el = $('#wipe');
  const cv = $('canvas', el);
  const ctx = cv.getContext('2d');
  let dpr = 1, W = 0, H = 0;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  size();
  addEventListener('resize', size);

  // 45°に回した正方格子。原点から遠い網点ほど遅れて太る
  function draw(t, ox, oy, color = BLUE) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (t <= 0) return;
    ctx.fillStyle = color;
    if (t >= 1) { ctx.fillRect(0, 0, W, H); return; }
    const G = clamp(Math.min(W, H) / 22, 22, 44);
    const S = 1.5;
    const maxD = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    const rMax = G * 0.56;
    ctx.beginPath();
    for (let j = -1, y = 0; y < H + G; j++) {
      y = j * (G / 2);
      const off = (j & 1) * (G / 2);
      for (let x = -G + off; x < W + G; x += G) {
        const d = Math.hypot(x - ox, y - oy) / maxD;
        const l = clamp(t * (1 + S) - d * S, 0, 1);
        if (l <= 0) continue;
        const r = rMax * (l * l * (3 - 2 * l));
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  function run(from, to, dur, ox, oy) {
    return new Promise((res) => {
      if (reduced) { draw(to, ox, oy); return res(); }
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / dur, 0, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        draw(lerp(from, to, e), ox, oy);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  // ローダー：青地に紙色の網点でバーストを刷る（遷移のワイプと同じ網点言語）
  function star(burst, R) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, s = R / 250;
    const path = new Path2D(burst.toPath(cx, cy, s));
    const G = clamp(Math.min(W, H) / 58, 8, 15);
    const rMax = G * 0.56;
    const ext = Math.min(R * 1.05, Math.hypot(W, H));
    ctx.fillStyle = '#f7f6f2';
    ctx.beginPath();
    const y0 = Math.max(-G, cy - ext), y1 = Math.min(H + G, cy + ext);
    for (let j = Math.floor(y0 / (G / 2)); j * (G / 2) < y1; j++) {
      const y = j * (G / 2);
      const off = (Math.abs(j) & 1) * (G / 2);
      const x0 = Math.max(-G, cx - ext), x1 = Math.min(W + G, cx + ext);
      for (let x = Math.floor(x0 / G) * G + off; x < x1; x += G) {
        if (!ctx.isPointInPath(path, x * dpr, y * dpr)) continue;
        const d = Math.hypot(x - cx, y - cy) / R;
        const r = rMax * clamp(1.08 - d * 0.62, 0.25, 1);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  return {
    el,
    star,
    async cover(x = W / 2, y = H / 2) {
      el.classList.add('is-active');
      await run(0, 1, 760, x, y);
    },
    async reveal(x = W / 2, y = H / 2, dur = 900) {
      draw(1, x, y);
      html.classList.remove('wipe-in');
      el.classList.add('is-active');
      await run(1, 0, dur, x, y);
      el.classList.remove('is-active');
    },
    clear() { draw(0, 0, 0); el.classList.remove('is-active'); html.classList.remove('wipe-in'); },
  };
})();

/* ------------------------------------------------------------------ page navigation */
function isInternal(a) {
  if (!a || a.target || a.hasAttribute('download')) return false;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  const u = new URL(a.href, location.href);
  return u.origin === location.origin;
}
function samePage(u) {
  const norm = (p) => p.replace(/index\.html$/, '');
  return norm(u.pathname) === norm(location.pathname);
}
function scrollToHash(hash, smooth = true) {
  const t = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  if (!t) return false;
  const y = t.getBoundingClientRect().top + scrollY - (t.id.startsWith('svc-') ? 120 : 0);
  window.scrollTo({ top: y, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  return true;
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!isInternal(a)) return;
  const u = new URL(a.href, location.href);
  if (samePage(u)) {
    e.preventDefault();
    closeMenu();
    if (u.hash) { scrollToHash(u.hash); history.replaceState(null, '', u.hash); }
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    return;
  }
  e.preventDefault();
  try { sessionStorage.setItem('octo:wipe', '1'); } catch {}
  wipe.cover(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2).then(() => { location.href = u.href; });
});
addEventListener('pageshow', (e) => { if (e.persisted) wipe.clear(); });

/* ------------------------------------------------------------------ text reveal */
$$('.reveal-lines').forEach((el) => {
  el.innerHTML = el.innerHTML
    .split(/<br\s*\/?>/i)
    .map((l, i) => `<span class="rl"><span style="--i:${i}">${l}</span></span>`)
    .join('');
});
const io = new IntersectionObserver(
  (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
  { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
);
pageReady.then(() => $$('.split, .reveal, .reveal-lines').forEach((el) => io.observe(el)));

/* ------------------------------------------------------------------ halftone media */
let shared = null;
try { shared = new Halftone(document.createElement('canvas'), { preserve: true }); } catch (err) { console.warn(err); }

class Media {
  constructor(fig) {
    this.fig = fig;
    this.img = $('img', fig);
    this.preset = fig.dataset.preset || 'photo';
    this.hold = !!fig.closest('.next');
    // 作品詳細の大きな画像は控えめに: 細かい網点・短い解像・ルーペと揺れなし
    this.soft = fig.dataset.fx === 'soft';
    this.focus = (fig.dataset.focus || '0.5,0.5').split(',').map(Number);
    this.progress = 0;
    this.eff = 0;       // 実際に描く解像度（progress を揺さぶりで下げたもの）
    this.agitate = 0;   // 0..1 横スクロールの速度など、外から網点を荒らす量
    this.shift = null;  // -1..1 外から与える視差（トリミング位置のずらし）
    this.lens = 0; this.lensT = 0;
    this.lx = 0; this.ly = 0; this.slx = 0; this.sly = 0;
    this.started = 0;
    this.visible = false;
    this.ready = false;
    this.cv = document.createElement('canvas');
    this.ctx = this.cv.getContext('2d');
    fig.appendChild(this.cv);
    const onload = () => { this.ready = true; this.dirty = true; };
    if (this.img.complete && this.img.naturalWidth) onload();
    else this.img.addEventListener('load', onload, { once: true });

    const host = fig.closest('a, .about-grid') || fig;
    this.canRest = this.preset === 'photo';
    if (finePointer) {
      host.addEventListener('pointerenter', (e) => {
        this.hover = true; this.move(e);
      });
      host.addEventListener('pointermove', (e) => this.move(e));
      host.addEventListener('pointerleave', () => { this.hover = false; });
    }
  }
  move(e) {
    const r = this.fig.getBoundingClientRect();
    this.lx = e.clientX - r.left; this.ly = e.clientY - r.top;
    if (this.lens < 0.01) { this.slx = this.lx; this.sly = this.ly; }
  }
  start() {
    if (this.started) return;
    this.started = performance.now();
    if (!this.hold) this.target = 1;
  }
  step(now) {
    if (this.dead || !this.ready || !this.visible) return;
    if (!this.started) return;
    // 解像: 網点が細かくなりながら元画像へ
    if (!this.hold) {
      const k = clamp((now - this.started - 120) / (this.soft ? 1000 : 1700), 0, 1);
      this.progress = reduced ? 1 : this.soft ? lerp(0.45, 1, easeOut(k)) : easeOut(k);
      this.lensT = this.hover && k >= 1 && !this.soft ? 1 : 0;
    } else {
      this.progress = lerp(this.progress, this.hover ? 1 : 0, 0.06);
    }
    this.lens = lerp(this.lens, this.lensT, 0.14);
    this.slx = lerp(this.slx, this.lx, 0.22);
    this.sly = lerp(this.sly, this.ly, 0.22);

    // 速く動かされるほど網点に戻り、版がずれる。止まると解像し直す
    const ag = reduced ? 0 : this.agitate;
    this.eff = this.progress * (1 - ag * 0.92);
    if (this.shift != null) {
      const fx = clamp(0.5 + this.shift * 0.4, 0, 1);
      if (Math.abs(fx - this.focus[0]) > 0.0015) {
        this.focus[0] = fx;
        this.img.style.objectPosition = `${(fx * 100).toFixed(2)}% ${this.focus[1] * 100}%`;
        if (!this.canRest) this.dirty = true;
      }
    }

    const settled = !this.hold && this.eff >= 0.999 && this.lens < 0.002;
    const resting = settled && this.canRest;
    this.fig.classList.toggle('is-rest', resting);
    if (settled && !this.canRest && this.drawn && !this.dirty) return;
    const settledHold = this.hold && this.drawn && Math.abs(this.progress - (this.hover ? 1 : 0)) < 0.002 && !this.dirty;
    if ((resting && this.drawn && !this.dirty) || settledHold) return;
    this.render();
  }
  render() {
    const r = { width: this.fig.offsetWidth, height: this.fig.offsetHeight }; // transform前の寸法
    if (r.width < 2 || r.height < 2) return;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (r.width * r.height * dpr * dpr > 2.6e6) dpr = Math.sqrt(2.6e6 / (r.width * r.height));
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    const line = this.preset.startsWith('line');
    const cellCss = this.soft ? clamp(r.width / 200, 3, 7) : clamp(r.width / (line ? 84 : 64), 5, this.hold ? 18 : 15);
    const rad = Math.min(r.width, r.height) * 0.3;
    shared.ensureSize(w, h);
    const ok = shared.render(this.img, w, h, {
      preset: this.preset,
      cell: cellCss * dpr * (1 + (1 - this.eff) * 0.55),
      progress: this.eff,
      focus: this.focus,
      mis: this.soft ? [0, 0] : [(Math.sin(performance.now() / 900) * 0.6 + this.agitate * 7) * dpr, this.agitate * 2 * dpr],
      loupe: [this.slx * dpr, this.sly * dpr, rad * dpr, this.lens],
      mag: 2.4,
      // 次の作品ブロックは青を主役に網点を淡く保ち、ホバーで画像を立ち上げる
      gain: this.hold ? [lerp(0.16, 1, this.progress), lerp(0.12, 0.6, this.progress), 0, 0] : undefined,
    });
    if (!ok) {
      // CORS の無い外部画像などWebGLで読めないものは素の画像で表示する
      if (shared.blocked.has(this.img)) { this.dead = true; this.fig.classList.add('is-fallback', 'is-rest'); }
      return;
    }
    this.ctx.drawImage(shared.canvas, 0, 0, w, h, 0, 0, w, h);
    this.fig.classList.add('is-gl');
    this.drawn = true;
    this.dirty = false;
  }
}

const medias = [];
if (shared) {
  const mio = new IntersectionObserver((es) => es.forEach((e) => {
    const m = e.target._media;
    m.visible = e.isIntersecting;
    if (e.isIntersecting && e.intersectionRatio > 0.12) pageReady.then(() => m.start());
  }), { threshold: [0, 0.12, 0.3], rootMargin: '10% 0px' });
  $$('.ht').forEach((fig) => {
    const m = new Media(fig);
    fig._media = m;
    medias.push(m);
    mio.observe(fig);
  });
  subs.add((now) => medias.forEach((m) => m.step(now)));
  addEventListener('resize', () => medias.forEach((m) => (m.dirty = true)));
} else {
  $$('.ht').forEach((f) => f.classList.add('is-fallback', 'is-rest'));
}

/* ------------------------------------------------------------------ works: 横スクロール */
const hs = $('.hs');
if (hs) {
  const track = $('.hs-track', hs);
  const title = $('.hs-title', hs);
  const cards = $$('.hs-card', hs);
  const cur = $('[data-hs-cur]', hs), bar = $('[data-hs-bar]', hs), cat = $('[data-hs-cat]', hs);
  const labels = cards.map((c) => $('.card-tags span', c)?.textContent || '');
  let dist = 0, xs = 0, agit = 0, lastIdx = -1;
  const measure = () => {
    dist = Math.max(0, track.scrollWidth - innerWidth);
    hs.style.height = `${dist + innerHeight}px`; // 横の移動量ぶんだけ縦に伸ばしてピン留めする
  };
  measure();
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  addEventListener('load', measure);

  subs.add(() => {
    const r = hs.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) { cards.forEach((c) => { const m = c.querySelector('.ht')?._media; if (m) m.agitate = 0; }); return; }
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    const x = p * dist;
    const prev = xs;
    xs = reduced ? x : lerp(xs, x, 0.09);
    if (Math.abs(xs - x) < 0.05) xs = x;
    const v = xs - prev;
    track.style.transform = `translate3d(${(-xs).toFixed(2)}px,0,0)`;
    title.style.transform = `translate3d(${(-xs * 0.14).toFixed(2)}px,0,0)`;
    bar.style.transform = `scaleX(${dist ? (xs / dist).toFixed(4) : 0})`;
    agit = lerp(agit, clamp(Math.abs(v) / 26, 0, 1), 0.18);
    if (agit < 0.004) agit = 0;

    let best = 0, bd = Infinity;
    cards.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const off = ((b.left + b.right) / 2 - innerWidth / 2) / innerWidth;
      if (Math.abs(off) < bd) { bd = Math.abs(off); best = i; }
      const m = c.querySelector('.ht')?._media;
      if (m) { m.agitate = agit; m.shift = clamp(off, -1, 1); }
    });
    if (best !== lastIdx) {
      lastIdx = best;
      cur.textContent = pad(best + 1);
      cat.textContent = labels[best];
    }
  });
}

/* ------------------------------------------------------------------ services: 3Dモデル（近づいたら読み込む） */
// 表示中のレイアウトの3Dだけ起動する（PC=ステージ / タブレット以下=各行の下）
const svc3d = $$('.svc-3d').filter((el) => el.offsetParent !== null);
if (svc3d.length && !shared) svc3d.forEach((el) => el.classList.add('is-fallback'));
if (svc3d.length && shared) {
  const lio = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    lio.disconnect();
    import('./svc3d.js').then((m) => m.init(svc3d)).catch((e) => {
      console.warn('[svc3d] fallback to images', e);
      svc3d.forEach((el) => el.classList.add('is-fallback'));
    });
  }, { rootMargin: '600px 0px' });
  svc3d.forEach((el) => lio.observe(el));
}

/* ------------------------------------------------------------------ burst stages */
class Stage {
  constructor(canvas) {
    this.cv = canvas;
    this.kind = canvas.dataset.stage;
    this.host = canvas.parentElement;
    this.gl = new Halftone(canvas);
    this.src = document.createElement('canvas');
    this.sctx = this.src.getContext('2d');
    this.burst = new Burst({ period: 1.2 });
    this.lag = new Burst({ still: true });
    this.preset = this.kind === 'hero' ? 'brand' : 'brandInverse';
    this.intro = this.kind === 'hero' ? 0 : 1;
    this.introT0 = 0;
    this.kick = 0;
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, on: false, s: 0 };
    this.visible = true;
    this.readout = { lpi: $('[data-lpi]'), frame: $('[data-frame]') };
    this.resize();
    addEventListener('resize', () => this.resize());
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(this.host);
    if (finePointer) {
      this.host.addEventListener('pointermove', (e) => {
        const r = this.cv.getBoundingClientRect();
        this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top;
        if (!this.pointer.on) { this.pointer.sx = this.pointer.x; this.pointer.sy = this.pointer.y; }
        this.pointer.on = !e.target.closest('a, button');
      });
      this.host.addEventListener('pointerleave', () => (this.pointer.on = false));
    }
    this.host.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      this.burst.next(); this.kick = 1;
    });
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.w < 760 ? 2 : 1.5);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    this.ss = 0.25; // ソースは1/4解像度。バイリニアが網点のテーパーになる
    this.src.width = Math.ceil(this.w * this.ss);
    this.src.height = Math.ceil(this.h * this.ss);
    this.cellCss = clamp(Math.min(this.w, this.h * 1.6) * 0.0115, 9, 17);
    if (this.readout.lpi && this.kind === 'hero') this.readout.lpi.textContent = this.cellCss.toFixed(1) + 'px';
  }
  layout() {
    const mobile = this.w < 760;
    if (this.kind === 'hero') {
      return mobile
        ? { cx: 0.5, cy: 0.42, R: Math.min(this.w * 0.62, this.h * 0.36) }
        : { cx: 0.62, cy: 0.43, R: Math.min(this.w * 0.3, this.h * 0.5) };
    }
    return mobile
      ? { cx: 0.62, cy: 0.3, R: Math.min(this.w * 0.62, this.h * 0.32) }
      : { cx: 0.8, cy: 0.28, R: Math.min(this.w * 0.2, this.h * 0.3) };
  }
  draw(now, dt) {
    if (!this.visible) return;
    if (reduced && this.drawnOnce && !this.kick) { this.burst.t0 += dt * 1000; return; }
    const b = this.burst;
    b.update(now);
    Object.assign(this.lag, { from: b.from, to: b.to, t0: b.t0 + 110 });
    this.lag.update(now);

    if (this.introT0) this.intro = easeOutExpo(clamp((now - this.introT0) / 1600, 0, 1));
    const { cx, cy, R } = this.layout();
    // ヒーローを抜けるスクロールで網点にズームインしていく（ルーペで覗き込む感覚）
    const zp = this.kind === 'hero' ? easeOut(clamp(scroll.y / this.h, 0, 1)) : 0;
    const ss = this.ss;
    const ox = this.w * cx * ss, oy = this.h * cy * ss;
    const s = (R / 250) * ss * lerp(0.15, 1, this.intro) * (1 + zp * 0.35);
    const c = this.sctx;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.src.width, this.src.height);
    c.globalCompositeOperation = 'lighter';

    // 版0（青）: 中心ほど濃く、先端に向かって網点が細る
    let g = c.createRadialGradient(ox, oy, 0, ox, oy, 250 * s);
    g.addColorStop(0, 'rgb(255,0,0)');
    g.addColorStop(0.45, 'rgb(230,0,0)');
    g.addColorStop(1, 'rgb(105,0,0)');
    c.fillStyle = g;
    b.trace(c, ox, oy, s);
    c.fill();

    // 版1（シアン）: 110ms遅れて追従する残像。先端ほど濃い
    g = c.createRadialGradient(ox, oy, 0, ox, oy, 250 * s);
    g.addColorStop(0, 'rgb(0,30,0)');
    g.addColorStop(0.6, 'rgb(0,120,0)');
    g.addColorStop(1, 'rgb(0,200,0)');
    c.fillStyle = g;
    this.lag.trace(c, ox, oy, s * 1.03);
    c.fill();

    // 版1のにじみ: バーストの周りにごく薄い網を敷く
    g = c.createRadialGradient(ox, oy, 150 * s, ox, oy, 360 * s);
    g.addColorStop(0, 'rgba(0,16,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, this.src.width, this.src.height);

    // 版ずれ: 形が跳ぶ瞬間・スクロール・クリックで版がずれる
    this.kick = Math.max(0, this.kick - dt * 1.8);
    const misAmt = (b.velocity * 5 + Math.min(Math.abs(scroll.sv) * 0.35, 9) + this.kick * 14 + 0.6) * this.dpr;
    const ang = now / 2400;

    const p = this.pointer;
    p.sx = lerp(p.sx, p.x, 0.16); p.sy = lerp(p.sy, p.y, 0.16);
    p.s = lerp(p.s, p.on ? 1 : 0, 0.08);

    this.gl.render(this.src, this.cv.width, this.cv.height, {
      preset: this.preset, dynamic: true,
      cell: this.cellCss * this.dpr * (1 + zp * 1.4),
      mis: [Math.cos(ang) * misAmt, Math.sin(ang) * misAmt],
      loupe: [p.sx * this.dpr, p.sy * this.dpr, 150 * this.dpr, p.s],
      mag: 2.6,
      progress: 0,
    });
    this.drawnOnce = true;
    if (this.readout.frame && this.kind === 'hero') this.readout.frame.textContent = String(b.cycle).padStart(4, '0');
  }
  enter() { this.introT0 = performance.now(); }
}

const stages = [];
$$('canvas[data-stage]').forEach((cv) => {
  try { stages.push(new Stage(cv)); } catch (err) { console.warn(err); }
});
subs.add((now, dt) => stages.forEach((s) => s.draw(now, dt)));

/* ------------------------------------------------------------------ loader / entry */
async function boot() {
  const hero = stages.find((s) => s.kind === 'hero');
  if (html.classList.contains('is-loading')) {
    const loader = $('.loader');
    const pct = $('.loader-pct span');
    const mini = new Burst({ period: 0.9 });
    const base = Math.min(innerWidth, innerHeight) * 0.2;
    let loaded = 0;
    const fontP = document.fonts ? document.fonts.ready : Promise.resolve();
    fontP.then(() => (loaded += 0.5));
    (document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }))).then(() => (loaded += 0.5));
    setTimeout(() => (loaded = 1), 4000);
    const t0 = performance.now();
    html.classList.remove('is-loading-bg');
    await new Promise((res) => {
      let shown = 0;
      const tick = (now) => {
        mini.update(now);
        wipe.star(mini, base);
        const timeP = clamp((now - t0) / 1500, 0, 1);
        const target = Math.min(timeP, loaded >= 1 ? 1 : 0.96) * 100;
        shown = lerp(shown, target, 0.12);
        if (target >= 100 && shown > 99.4) shown = 100;
        pct.textContent = String(Math.floor(shown)).padStart(3, '0');
        if (shown >= 100) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    loader.classList.add('is-done');
    // 100%: 星が紙色の網点で画面を満たし、そのまま本編の紙へつながる
    mini.still = true;
    await new Promise((res) => {
      const t1 = performance.now();
      const tick = (now) => {
        const k = clamp((now - t1) / 750, 0, 1);
        mini.update(now);
        wipe.star(mini, base * lerp(1, 9, k === 0 ? 0 : Math.pow(2, 10 * k - 10)));
        if (k < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    try { sessionStorage.setItem('octo:seen', '1'); } catch {}
    hero?.enter();
    readyResolve();
    html.classList.remove('is-loading');
    wipe.clear();
  } else {
    try { sessionStorage.setItem('octo:seen', '1'); } catch {}
    if (location.hash) scrollToHash(location.hash, false);
    hero?.enter();
    if (html.classList.contains('wipe-in')) {
      try { sessionStorage.removeItem('octo:wipe'); } catch {}
      readyResolve();
      await wipe.reveal();
    } else readyResolve();
  }
}
boot().catch((e) => { console.error(e); html.classList.remove('is-loading', 'wipe-in'); wipe.clear(); readyResolve(); });

/* ------------------------------------------------------------------ header */
const hd = $('#hd');
const themed = $$('main [data-theme], footer[data-theme]');
let lastY = scrollY;
subs.add(() => {
  const y = scroll.y;
  if (Math.abs(y - lastY) > 6) {
    hd.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6 && !html.classList.contains('menu-open'));
    lastY = y;
  }
  const probe = 36;
  let theme = 'paper';
  for (const el of themed) {
    const r = el.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) theme = el.dataset.theme;
  }
  if (html.classList.contains('menu-open')) theme = 'blue';
  if (hd.dataset.theme !== theme) hd.dataset.theme = theme;
});

/* mobile menu */
const menuBtn = $('.hd-menu');
const menu = $('#menu');
function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  html.classList.remove('menu-open', 'is-locked');
}
menuBtn?.addEventListener('click', () => {
  const open = menu.hidden;
  if (!open) return closeMenu();
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  html.classList.add('menu-open', 'is-locked');
});

/* ticker speed follows scroll */
const tickerAnim = $('.ticker-track')?.getAnimations?.()[0];
if (tickerAnim) subs.add(() => { tickerAnim.playbackRate = 1 + Math.min(Math.abs(scroll.sv) * 0.25, 6); });

$$('.js-top').forEach((b) => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })));

/* ------------------------------------------------------------------ cursor */
if (finePointer) {
  const cur = $('#cursor');
  const label = $('.cursor-label', cur);
  const c = { x: -100, y: -100, sx: -100, sy: -100 };
  addEventListener('pointermove', (e) => {
    c.x = e.clientX; c.y = e.clientY;
    const t = e.target instanceof Element ? e.target : null;
    const lab = t?.closest('[data-cursor]')?.dataset.cursor;
    cur.classList.toggle('is-label', !!lab);
    if (lab) label.textContent = lab;
    const th = t?.closest('[data-theme]')?.dataset.theme;
    cur.classList.toggle('on-blue', th === 'blue' && !lab);
    cur.classList.toggle('is-hidden', !!t?.closest('input, textarea'));
  });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
  subs.add(() => {
    c.sx = lerp(c.sx, c.x, 0.24); c.sy = lerp(c.sy, c.y, 0.24);
    cur.style.transform = `translate3d(${c.sx}px, ${c.sy}px, 0)`;
  });
}

/* ------------------------------------------------------------------ contact */
const panel = $('#contact-panel');
const form = $('#contact-form');
let lastFocus = null;
async function openContact(e) {
  closeMenu();
  lastFocus = document.activeElement;
  await wipe.cover(e?.clientX || innerWidth / 2, e?.clientY || innerHeight / 2);
  panel.hidden = false;
  panel.scrollTop = 0;
  html.classList.add('is-locked');
  await wipe.reveal(e?.clientX || innerWidth / 2, e?.clientY || innerHeight / 2, 760);
  $('input:not([type=hidden]):not(.hp), button', form)?.focus({ preventScroll: true });
}
async function closeContact() {
  if (panel.hidden) return;
  await wipe.cover(innerWidth - 40, 40);
  panel.hidden = true;
  html.classList.remove('is-locked');
  $('.contact-thanks', panel).hidden = true;
  panel.classList.remove('is-sent');
  form.hidden = false;
  await wipe.reveal(innerWidth - 40, 40, 760);
  lastFocus?.focus?.({ preventScroll: true });
}
$$('.js-contact').forEach((b) => b.addEventListener('click', openContact));
$('.contact-close', panel)?.addEventListener('click', closeContact);
$('.contact-done', panel)?.addEventListener('click', closeContact);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!panel.hidden) closeContact(); else closeMenu(); }
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('.form-error', form);
  err.textContent = '';
  let ok = true;
  $$('.field', form).forEach((f) => {
    const input = $('input, textarea', f);
    const bad = !input.checkValidity() || (input.required && !input.value.trim());
    f.classList.toggle('is-invalid', bad);
    if (bad && ok) { input.focus(); ok = false; }
  });
  if (!ok) { err.textContent = '必須項目をご確認ください。'; return; }
  const btn = $('.contact-send', form);
  btn.classList.add('is-sending');
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = data[k] ? `${data[k]}, ${v}` : v; });
  try {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local) await new Promise((r) => setTimeout(r, 700)); // ローカルはFormSubmit未認証のためモック
    else {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || String(j.success) === 'false') throw new Error(j.message || res.status);
    }
    form.reset();
    form.hidden = true;
    panel.classList.add('is-sent');
    panel.scrollTop = 0;
    const thanks = $('.contact-thanks', panel);
    thanks.hidden = false;
    $('.contact-done', thanks).focus({ preventScroll: true });
  } catch (x) {
    console.error(x);
    err.textContent = '送信できませんでした。時間をおいてもう一度お試しください。';
  } finally {
    btn.classList.remove('is-sending');
  }
});

/* ------------------------------------------------------------------ works filter */
const filters = $$('.filters button');
filters.forEach((b) => b.addEventListener('click', () => {
  const f = b.dataset.filter;
  filters.forEach((x) => x.classList.toggle('is-active', x === b));
  const cards = $$('.index-grid .card');
  cards.forEach((c) => c.classList.add('is-out'));
  setTimeout(() => {
    cards.forEach((c) => { c.hidden = !(f === 'all' || c.dataset.cat === f); });
    requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => { if (!c.hidden) c.classList.remove('is-out'); })));
    medias.forEach((m) => (m.dirty = true));
  }, 320);
}));

// デバッグ用（プレビュー検証で網点の途中状態を確認する）
window.__octo = { medias, stages, wipe, shared };
