// octo の8本トゲのバースト。
// 原点から8本の線を伸ばし「線の端=頂点、原点=底辺の中央」の三角形を8つ塗り重ねる。
// 毎フレーム面積加重重心を原点へ平行移動して、視覚的中心を固定する。

const TEMPLATE = [248, 230, 214, 202, 192, 184, 178, 172];
const TAU = Math.PI * 2;

const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const easeInOutExpo = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

function randomState(prevRot = 0) {
  const lengths = shuffle(TEMPLATE);
  const rot = prevRot + rand(0, Math.PI / 4);
  return Array.from({ length: 8 }, (_, i) => ({
    a: rot + (i / 8) * TAU + rand(-0.22, 0.22) * (TAU / 8),
    l: lengths[i] + rand(-10, 10),
    w: rand(115, 185),
  }));
}

function lerpAngle(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export class Burst {
  constructor({ period = 1.2, still = false } = {}) {
    this.period = period;
    this.from = randomState();
    this.to = randomState(this.from[0].a);
    this.t0 = performance.now();
    this.still = still;
    this.tris = [];
    this.velocity = 0; // 0..1 easing speed (registration shake 用)
    this.cycle = 0;
    this.update(this.t0);
  }

  next(now = performance.now()) {
    this.from = this.current();
    this.to = randomState(this.from[0].a);
    this.t0 = now;
    this.cycle++;
  }

  current() {
    return this.spikes.map((s) => ({ ...s }));
  }

  update(now) {
    let t = (now - this.t0) / 1000 / this.period;
    if (!this.still && t >= 1) {
      this.from = this.to;
      this.to = randomState(this.from[0].a);
      this.t0 = now;
      this.cycle++;
      t = 0;
    }
    t = Math.min(t, 1);
    const e = easeInOutExpo(t);
    const e2 = easeInOutExpo(Math.min(1, t + 0.01));
    this.velocity = Math.min(1, Math.abs(e2 - e) * 12);
    this.progress = t;

    this.spikes = this.from.map((f, i) => {
      const g = this.to[i];
      return { a: lerpAngle(f.a, g.a, e), l: f.l + (g.l - f.l) * e, w: f.w + (g.w - f.w) * e };
    });

    // 三角形を作り、面積加重重心を原点に合わせる
    let cx = 0, cy = 0, A = 0;
    const tris = this.spikes.map(({ a, l, w }) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      const px = -dy * (w / 2), py = dx * (w / 2);
      const tri = [dx * l, dy * l, px, py, -px, -py];
      const area = (l * w) / 2;
      cx += ((tri[0] + tri[2] + tri[4]) / 3) * area;
      cy += ((tri[1] + tri[3] + tri[5]) / 3) * area;
      A += area;
      return tri;
    });
    cx /= A; cy /= A;
    this.tris = tris.map((t) => t.map((v, k) => v - (k % 2 ? cy : cx)));
    return this.tris;
  }

  // viewBox 640 基準の座標を中心(ox,oy)・倍率sで描画
  trace(ctx, ox, oy, s) {
    ctx.beginPath();
    for (const t of this.tris) {
      ctx.moveTo(ox + t[0] * s, oy + t[1] * s);
      ctx.lineTo(ox + t[2] * s, oy + t[3] * s);
      ctx.lineTo(ox + t[4] * s, oy + t[5] * s);
      ctx.closePath();
    }
  }

  toPath(cx = 320, cy = 320, s = 1) {
    return this.tris
      .map((t) => `M${(cx + t[0] * s).toFixed(1)} ${(cy + t[1] * s).toFixed(1)}L${(cx + t[2] * s).toFixed(1)} ${(cy + t[3] * s).toFixed(1)}L${(cx + t[4] * s).toFixed(1)} ${(cy + t[5] * s).toFixed(1)}Z`)
      .join('');
  }
}
