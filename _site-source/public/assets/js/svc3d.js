// SERVICES の3Dシーン（Three.js）。青いセクションの上に透過キャンバスで直接置く。
//
// 品質の設計:
//  - 形状: 角丸矩形を押し出し＋ベベル（粘土のような柔らかいエッジ）。キーは1粒ずつ、端末はベゼル/ノッチ、紙は厚みと折り
//  - 光: RoomEnvironment の環境光＋キーライト＋青い照り返し。紙=sheen、青=クリアコート（陶器のような艶）
//  - 影: 落ち影を「網点」で刷る専用シェーダー（サイトのハーフトーン言語と接続）
//  - 動き: ホバーで“レイヤー分解図”（Web/アプリ画面が層に分かれて浮く）、クリックで組み直し、傾きはバネ
// 配色ルール: 本体は紙色/白、コバルトは紙色・白の面の上にだけ（青地に青を浮かせると消える）。
import * as THREE from '../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 表現スタイル（比較検討用に ?svc=plain|shade|edge|both で切替）
// 既定 edge = 落ち影はカラーハーフトーン＋中の要素だけ輪郭線、本体は柔らかい3Dのまま。
// shade（立体の陰を網点化）は縁にノイズ状に出て刷りに見えず、立体感も失うため不採用（比較用に残す）
const STYLE = (() => {
  const v = new URLSearchParams(location.search).get('svc') || 'edge';
  return { shade: v === 'shade' || v === 'both', edge: v === 'edge' || v === 'both', cmyShadow: v !== 'plain' };
})();
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));                 // expo out
const back = (t) => (t <= 0 ? 0 : 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)); // 少し行き過ぎて戻る
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- materials */
const MAT = {
  paper: new THREE.MeshPhysicalMaterial({ color: '#f3f0e9', roughness: 0.72, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffffff') }),
  white: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2962ff', roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.45 }),
};
// 画面内のUI・紙面の上の要素（輪郭線を付ける“中の要素”）
MAT.paperIn = MAT.paper.clone();
MAT.whiteIn = MAT.white.clone();
const INNER = new Set([MAT.blue, MAT.paperIn, MAT.whiteIn]);
const INK = { blue: new THREE.Color('#2962ff'), cyan: new THREE.Color('#00b4ff'), navy: new THREE.Color('#0a1e6e') };

/* ---------------------------------------------------------------- geometry kit */
const geoCache = new Map();
function rrShape(w, h, r) {
  r = Math.max(0.0005, Math.min(r, w / 2, h / 2));
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// XY平面に立つ厚み d の角丸板（+Z が表）。ベベルで縁が丸い
function slabGeo(w, h, d, r) {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join();
  if (geoCache.has(k)) return geoCache.get(k);
  const b = Math.min(d * 0.45, 0.05, w / 4, h / 4);
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, r - b), {
    depth: Math.max(d - 2 * b, 0.0005), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 10,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  g.computeVertexNormals();
  geoCache.set(k, g);
  return g;
}
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
const slab = (w, h, d, r, mat) => mesh(slabGeo(w, h, d, r), mat);
const pill = (w, h, d, mat) => slab(w, h, d, h / 2, mat);
// 円板は面を +Z に向けた形でジオメトリ側を回す（put() が rotation を上書きするため）
const disc = (r, d, mat) => { const g = new THREE.CylinderGeometry(r, r, d, 48); g.rotateX(Math.PI / 2); return mesh(g, mat); };
const ball = (r, mat) => mesh(new THREE.SphereGeometry(r, 32, 16), mat);
function extruded(shape, d, mat) {
  const b = Math.min(d * 0.4, 0.02);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3 });
  g.center();
  return mesh(g, mat);
}
function triShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s * 0.58); sh.lineTo(s / 2, -s * 0.29); sh.lineTo(-s / 2, -s * 0.29); sh.closePath();
  return sh;
}
// octo の8本トゲ（ロゴマークとして名刺・ポスターに）
function burstShape(R) {
  const L = [1, 0.9, 0.86, 0.95, 0.88, 0.82, 0.93, 0.85], sh = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU - Math.PI / 2, r = i % 2 ? R * 0.42 : R * L[i / 2];
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  return sh;
}
function sparkleShape(R) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, r = i % 2 ? R * 0.28 : R;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(r, 0);
  }
  sh.closePath();
  return sh;
}
const put = (parent, obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  parent.add(obj);
  return obj;
};
const group = () => new THREE.Group();

/* ---------------------------------------------------------------- scene helpers */
// レイヤー分解: ホバー量 ex に応じて +Z（面の法線方向）へ浮く
function makeLayers() {
  const list = [];
  return {
    add(obj, amt) { list.push({ obj, base: obj.position.z, amt }); return obj; },
    // 0未満にしない: バネの戻りで層が面の内側へ沈むと、面と重なってチラつく（Zファイティング）
    update(ex) { const e = Math.max(0, ex); for (const l of list) l.obj.position.z = l.base + l.amt * e; },
  };
}
// 登場: 下から/遠くから順番に組み上がる
function makeIntro() {
  const list = [];
  return {
    add(obj, delay, off = [0, -1.6, 0]) { list.push({ obj, delay, off, home: obj.position.clone(), seed: Math.random() * TAU }); return obj; },
    update(k, t, float = 1) {
      for (const it of list) {
        const p = back(clamp((k - it.delay) / (1 - it.delay), 0, 1));
        const f = reduced ? 0 : Math.sin(t * 1.1 + it.seed) * 0.03 * float;
        it.obj.position.set(it.home.x + it.off[0] * (1 - p), it.home.y + it.off[1] * (1 - p) + f * p, it.home.z + it.off[2] * (1 - p));
        it.obj.scale.setScalar(Math.max(0.001, Math.min(1, p * 1.15)));
      }
    },
  };
}

/* ================================================================= scenes */

/* 01 Web — ノートPCとスマホ。ホバーでWebページがレイヤーに分解される */
function web() {
  const root = group(), L = makeLayers(), I = makeIntro();

  const laptop = put(root, group(), -0.35, 0, 0);
  put(laptop, slab(3.6, 2.4, 0.13, 0.16, MAT.paper), 0, 0.065, 0, -Math.PI / 2);
  // キーボード（1粒ずつ）
  const keyGeo = new RoundedBoxGeometry(0.19, 0.05, 0.19, 2, 0.035);
  const cols = 14, rows = 5, keys = new THREE.InstancedMesh(keyGeo, MAT.blue, cols * rows + 1);
  keys.castShadow = true; keys.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    m4.makeTranslation(-1.4 + c * 0.215, 0.15, -0.98 + r * 0.215);
    keys.setMatrixAt(n++, m4);
  }
  m4.compose(new THREE.Vector3(0, 0.15, 0.1), new THREE.Quaternion(), new THREE.Vector3(5.2, 1, 1)); // スペースキー
  keys.setMatrixAt(n++, m4);
  laptop.add(keys);
  put(laptop, slab(1.15, 0.72, 0.02, 0.07, MAT.whiteIn), 0, 0.135, 0.72, -Math.PI / 2);
  // 画面（ヒンジから約106°開く）
  const hinge = put(laptop, group(), 0, 0.13, -1.18, -0.29);
  put(hinge, slab(3.6, 2.3, 0.08, 0.16, MAT.paper), 0, 1.15, 0);
  const scr = put(hinge, group(), 0, 1.15, 0.05);
  put(scr, slab(3.32, 2.04, 0.02, 0.08, MAT.white), 0, 0, 0);
  // Webページの層
  const nav = L.add(put(scr, group(), 0, 0.82, 0.03), 0.22);
  put(nav, pill(0.42, 0.09, 0.02, MAT.blue), -1.25, 0, 0);
  [0.55, 0.85, 1.15].forEach((x) => put(nav, pill(0.2, 0.06, 0.02, MAT.blue), x, 0, 0));
  L.add(put(scr, slab(3.0, 0.86, 0.03, 0.06, MAT.blue), 0, 0.26, 0.03), 0.48);
  const heroIn = L.add(put(scr, group(), 0, 0.26, 0.06), 0.82);
  put(heroIn, disc(0.24, 0.03, MAT.white), -1.05, 0, 0);
  put(heroIn, pill(1.2, 0.11, 0.03, MAT.white), 0.25, 0.14, 0);
  put(heroIn, pill(0.8, 0.11, 0.03, MAT.white), 0.05, -0.08, 0);
  put(heroIn, pill(0.42, 0.14, 0.03, MAT.white), 1.05, -0.08, 0);
  [-1.02, 0, 1.02].forEach((x, i) => {
    const c = L.add(put(scr, group(), x, -0.58, 0.03), 0.3 + i * 0.1);
    put(c, slab(0.92, 0.66, 0.03, 0.07, MAT.paperIn), 0, 0, 0);
    put(c, slab(0.78, 0.3, 0.02, 0.05, MAT.blue), 0, 0.1, 0.025);
    put(c, pill(0.6, 0.06, 0.02, MAT.blue), -0.08, -0.17, 0.025);
  });
  I.add(laptop, 0, [0, -1.2, 0]);

  // スマホ（同じサイトのモバイル表示）
  const phone = put(root, group(), 2.45, 0, 0.75, 0, -0.5);
  const body = put(phone, group(), 0, 1.0, 0, -0.07);
  put(body, slab(0.98, 2.0, 0.1, 0.17, MAT.paper), 0, 0, 0);
  const ps = put(body, group(), 0, 0, 0.055);
  put(ps, slab(0.86, 1.86, 0.015, 0.12, MAT.white), 0, 0, 0);
  put(ps, pill(0.24, 0.06, 0.02, MAT.blue), 0, 0.82, 0.015);
  L.add(put(ps, slab(0.74, 0.5, 0.03, 0.05, MAT.blue), 0, 0.42, 0.02), 0.32);
  const pt = L.add(put(ps, group(), 0, 0.42, 0.04), 0.55);
  put(pt, pill(0.44, 0.07, 0.02, MAT.white), -0.05, 0.06, 0);
  put(pt, pill(0.3, 0.07, 0.02, MAT.white), -0.12, -0.08, 0);
  [-0.05, -0.43].forEach((y, i) => {
    const c = L.add(put(ps, group(), 0, y, 0.02), 0.2 + i * 0.1);
    put(c, slab(0.74, 0.32, 0.025, 0.05, MAT.paperIn), 0, 0, 0);
    put(c, slab(0.22, 0.22, 0.02, 0.04, MAT.blue), -0.21, 0, 0.02);
    put(c, pill(0.34, 0.05, 0.02, MAT.blue), 0.12, 0.04, 0.02);
  });
  L.add(put(ps, pill(0.6, 0.13, 0.03, MAT.blue), 0, -0.76, 0.02), 0.28);
  I.add(phone, 0.2, [0.6, -1.4, 0]);

  return { root, update: (t, st) => { I.update(st.intro, t); L.update(st.ex); }, cam: { y: 1.05, dist: 10.4, yaw: -0.22 } };
}

/* 02 UI/UX — ワイヤーフレームから、整ったアプリ画面へ。部品はデザインシステムとして並ぶ */
function uiux() {
  const root = group(), L = makeLayers(), I = makeIntro();
  // ワイヤーフレーム（紙に青い線で描いた骨組み）
  const wire = put(root, group(), -2.15, 0, -0.4, 0, 0.45);
  const sheet = put(wire, group(), 0, 0.92, 0, -0.06);
  put(sheet, slab(1.25, 1.84, 0.025, 0.04, MAT.paper), 0, 0, 0);
  const line = (w, x, y, rz = 0) => put(sheet, pill(w, 0.03, 0.012, MAT.blue), x, y, 0.02, 0, 0, rz);
  // 画像プレースホルダー（枠＋対角線）
  line(0.95, 0, 0.72); line(0.95, 0, 0.2); line(0.55, -0.475, 0.46, Math.PI / 2); line(0.55, 0.475, 0.46, Math.PI / 2);
  line(1.07, 0, 0.46, Math.atan2(0.52, 0.95)); line(1.07, 0, 0.46, -Math.atan2(0.52, 0.95));
  [-0.02, -0.16, -0.3].forEach((y, i) => line([0.9, 0.7, 0.8][i], -[0, 0.1, 0.05][i], y));
  line(0.95, 0, -0.62); line(0.95, 0, -0.78); line(0.16, -0.475, -0.7, Math.PI / 2); line(0.16, 0.475, -0.7, Math.PI / 2);
  I.add(wire, 0, [0, -1.4, 0]);

  // 中央: 完成したアプリ画面（ホバーで層に分解）
  const phone = put(root, group(), 0.05, 0, 0.35, 0, -0.12);
  const body = put(phone, group(), 0, 1.32, 0, -0.06);
  put(body, slab(1.3, 2.64, 0.12, 0.24, MAT.paper), 0, 0, 0);
  const s = put(body, group(), 0, 0, 0.065);
  put(s, slab(1.16, 2.5, 0.015, 0.17, MAT.white), 0, 0, 0);
  put(s, pill(0.3, 0.07, 0.02, MAT.blue), 0, 1.12, 0.015);
  const head = L.add(put(s, group(), 0, 0.86, 0.02), 0.25);
  put(head, pill(0.56, 0.1, 0.02, MAT.blue), -0.22, 0, 0);
  put(head, disc(0.09, 0.02, MAT.blue), 0.4, 0, 0);
  const chart = L.add(put(s, group(), 0, 0.32, 0.02), 0.5);
  put(chart, slab(1.0, 0.78, 0.03, 0.08, MAT.paperIn), 0, 0, 0);
  const barGeo = new RoundedBoxGeometry(0.085, 1, 0.04, 2, 0.02);
  const H = [0.22, 0.38, 0.3, 0.52, 0.44, 0.6, 0.5];
  const bars = H.map((h, i) => put(chart, mesh(barGeo, MAT.blue), -0.36 + i * 0.12, -0.27, 0.035));
  [-0.22, -0.47].forEach((y, i) => {
    const row = L.add(put(s, group(), 0, y, 0.02), 0.3 + i * 0.08);
    put(row, slab(1.0, 0.2, 0.025, 0.06, MAT.paperIn), 0, 0, 0);
    put(row, disc(0.06, 0.02, MAT.blue), -0.37, 0, 0.02);
    put(row, pill(0.5, 0.05, 0.02, MAT.blue), 0.02, 0.03, 0.02);
    put(row, pill(0.3, 0.04, 0.02, MAT.blue), -0.08, -0.04, 0.02);
  });
  L.add(put(s, pill(0.98, 0.2, 0.04, MAT.blue), 0, -0.98, 0.025), 0.42);
  I.add(phone, 0.12, [0, -1.8, 0]);

  // ワイヤー → 画面へ流れる点線（青地の上なので白）
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.55, 1.6, -0.1), new THREE.Vector3(-1.05, 2.05, 0.2), new THREE.Vector3(-0.62, 1.7, 0.4)]);
  const dots = Array.from({ length: 7 }, () => put(root, ball(0.035, MAT.white)));

  // 右: デザインシステムの部品（トグル/スライダー/チェック/アバター）
  const kit = put(root, group(), 1.95, 0, 0.1, 0, -0.35);
  const toggle = put(kit, group(), 0, 2.05, 0);
  put(toggle, pill(0.62, 0.3, 0.12, MAT.whiteIn), 0, 0, 0);
  const knob = put(toggle, ball(0.11, MAT.blue), -0.16, 0, 0.07);
  const slider = put(kit, group(), 0.05, 1.5, 0.15);
  put(slider, pill(0.9, 0.08, 0.06, MAT.whiteIn), 0, 0, 0);
  const fill = put(slider, pill(0.4, 0.08, 0.065, MAT.blue), -0.25, 0, 0.005);
  const sk = put(slider, ball(0.12, MAT.whiteIn), -0.05, 0, 0.04);
  const check = put(kit, group(), -0.22, 0.98, 0.05);
  put(check, slab(0.36, 0.36, 0.1, 0.09, MAT.whiteIn), 0, 0, 0);
  put(check, pill(0.12, 0.05, 0.03, MAT.blue), -0.05, -0.03, 0.06, 0, 0, -0.8);
  put(check, pill(0.22, 0.05, 0.03, MAT.blue), 0.05, 0.0, 0.06, 0, 0, 0.9);
  const avatar = put(kit, group(), 0.3, 0.98, 0.05);
  put(avatar, disc(0.2, 0.1, MAT.whiteIn), 0, 0, 0);
  put(avatar, ball(0.07, MAT.blue), 0, 0.04, 0.06);
  put(avatar, pill(0.18, 0.08, 0.03, MAT.blue), 0, -0.08, 0.05);
  [toggle, slider, check, avatar].forEach((o, i) => I.add(o, 0.3 + i * 0.08, [0.4, -0.5, 0.6]));

  let flow = 0, last = 0;
  return {
    root,
    update: (t, st) => {
      I.update(st.intro, t);
      L.update(st.ex);
      knob.position.x = lerp(-0.16, 0.16, st.hover);
      fill.scale.x = lerp(1, 1.9, st.hover); fill.position.x = lerp(-0.25, -0.07, st.hover);
      sk.position.x = lerp(-0.05, 0.3, st.hover);
      bars.forEach((b, i) => { const h = H[i] * lerp(0.55, 1, st.intro) * (1 + st.hover * (i % 2 ? 0.25 : 0.12)); b.scale.y = h; b.position.y = -0.33 + h / 2; });
      const dt = clamp(t - last, 0, 0.05); last = t;
      flow = (flow + (reduced ? 0 : dt * 0.35)) % 1;
      const p = new THREE.Vector3();
      dots.forEach((d, i) => { const u = (((i / dots.length + flow) % 1) + 1) % 1; curve.getPoint(u, p); d.position.copy(p); d.scale.setScalar(Math.max(0.001, Math.sin(u * Math.PI) * clamp(st.intro * 2 - 1, 0, 1))); });
    },
    cam: { y: 1.25, dist: 10.6, yaw: -0.1 },
  };
}

/* 03 Graphic — ポスター、三つ折り、冊子、名刺。ホバーで三つ折りが開き、名刺が扇に広がる */
function graphic() {
  const root = group(), L = makeLayers(), I = makeIntro();
  // ポスター
  const poster = put(root, group(), -0.45, 0, -0.85, 0, 0.18);
  const pb = put(poster, group(), 0, 1.5, 0, -0.1);
  put(pb, slab(2.1, 2.96, 0.035, 0.03, MAT.paper), 0, 0, 0);
  L.add(put(pb, disc(0.56, 0.04, MAT.blue), -0.38, 0.62, 0.03), 0.3);
  L.add(put(pb, extruded(triShape(1.0), 0.04, MAT.blue), 0.48, 0.58, 0.03), 0.45);
  L.add(put(pb, slab(0.76, 0.76, 0.04, 0.03, MAT.blue), 0.45, -0.3, 0.03), 0.22);
  L.add(put(pb, extruded(triShape(0.9), 0.04, MAT.blue), -0.42, -0.36, 0.03, 0, 0, -Math.PI / 2), 0.36);
  [-0.92, -1.06, -1.2].forEach((y, i) => put(pb, pill([1.3, 1.0, 0.7][i], 0.05, 0.02, MAT.blue), -0.32 - i * 0.15, y, 0.025));
  put(pb, extruded(burstShape(0.12), 0.02, MAT.blue), 0.82, -1.18, 0.025);
  I.add(poster, 0, [0, -2.4, 0]);

  // 三つ折りパンフレット（自立。蝶番でジグザグ）
  const flyer = put(root, group(), 1.25, 0, 0.2, 0, -0.55);
  const panel = (i) => {
    const g = group();
    put(g, slab(0.74, 1.6, 0.022, 0.015, MAT.white), 0.37, 0, 0);
    if (i === 0) { put(g, disc(0.2, 0.02, MAT.blue), 0.37, 0.42, 0.02); put(g, pill(0.5, 0.06, 0.015, MAT.blue), 0.37, 0.08, 0.018); }
    if (i === 1) put(g, slab(0.6, 0.62, 0.02, 0.03, MAT.blue), 0.37, 0.36, 0.02);
    if (i === 2) put(g, extruded(triShape(0.42), 0.02, MAT.blue), 0.37, 0.4, 0.02);
    [-0.18, -0.32, -0.46, -0.6].forEach((y, k) => { const w = [0.52, 0.44, 0.5, 0.36][k]; put(g, pill(w, 0.045, 0.015, MAT.blue), 0.37 - (0.52 - w) / 2, y, 0.018); });
    return g;
  };
  const f0 = put(flyer, panel(0), 0, 0.8, 0);
  const h1 = put(f0, group(), 0.74, 0, 0);
  const f1 = put(h1, panel(1));
  const h2 = put(f1, group(), 0.74, 0, 0);
  put(h2, panel(2));
  I.add(flyer, 0.15, [0, -2, 0]);

  // 冊子（寝かせて置く）
  const booklet = put(root, group(), -1.75, 0, 0.95, 0, 0.38);
  const bk = put(booklet, group(), 0, 0.07, 0, -Math.PI / 2);
  put(bk, slab(1.3, 1.76, 0.12, 0.035, MAT.paper), 0, 0, 0);
  put(bk, disc(0.32, 0.02, MAT.blue), 0, 0.3, 0.065);
  put(bk, extruded(triShape(0.6), 0.02, MAT.blue), 0, -0.3, 0.065, 0, 0, Math.PI);
  put(bk, pill(0.6, 0.05, 0.01, MAT.blue), -0.2, -0.72, 0.065);
  I.add(booklet, 0.3, [0, 2.2, 0]);

  // 名刺の束（一番上にoctoのマーク）
  const cardsG = put(root, group(), 0.35, 0, 1.35);
  const cards = [];
  for (let i = 0; i < 7; i++) {
    const c = put(cardsG, group(), 0, 0.018 + i * 0.026, 0);
    const top = i === 6;
    put(c, slab(0.92, 0.56, 0.022, 0.035, top ? MAT.white : MAT.paper), 0, 0, 0, -Math.PI / 2);
    if (top) {
      put(c, extruded(burstShape(0.11), 0.016, MAT.blue), -0.25, 0.014, 0, -Math.PI / 2);
      put(c, pill(0.36, 0.045, 0.01, MAT.blue), 0.12, 0.014, -0.06, -Math.PI / 2);
      put(c, pill(0.26, 0.035, 0.01, MAT.blue), 0.07, 0.014, 0.06, -Math.PI / 2);
    }
    cards.push(c);
  }
  I.add(cardsG, 0.45, [0, 1.6, 0]);

  return {
    root,
    update: (t, st) => {
      I.update(st.intro, t, 0);
      L.update(st.ex);
      const fold = lerp(1.15, 0.32, st.hover);
      h1.rotation.y = -fold; h2.rotation.y = fold;
      cards.forEach((c, i) => { c.rotation.y = 0.25 + (i - 6) * -0.13 * st.hover; });
    },
    cam: { y: 1.15, dist: 10.6, yaw: -0.18 },
  };
}

/* 04 AI — チャット画面から生成の粒が流れ、成果物（ポスター/Web/SNS）が刷り上がる */
function ai() {
  const root = group(), I = makeIntro();
  // チャット画面
  const chat = put(root, group(), -2.0, 0, -0.1, 0, 0.42);
  const cb = put(chat, group(), 0, 1.15, 0, -0.06);
  put(cb, slab(1.75, 2.3, 0.1, 0.18, MAT.paper), 0, 0, 0);
  const cs = put(cb, group(), 0, 0, 0.055);
  const bubble = (w, h, x, y, mat, ink, rows) => {
    const b = put(cs, group(), x, y, 0.02);
    put(b, slab(w, h, 0.05, Math.min(0.12, h / 2), mat === MAT.white ? MAT.whiteIn : mat), 0, 0, 0);
    rows.forEach((rw, i) => put(b, pill(w * rw, 0.055, 0.02, ink), -(w * (0.8 - rw)) / 2, (rows.length - 1) * 0.06 - i * 0.12, 0.035));
    return b;
  };
  bubble(1.2, 0.42, -0.14, 0.74, MAT.white, MAT.blue, [0.8, 0.55]);
  bubble(1.0, 0.3, 0.24, 0.2, MAT.blue, MAT.white, [0.75]);
  const typing = bubble(0.56, 0.26, -0.42, -0.3, MAT.white, MAT.blue, []);
  const tdots = [-0.13, 0, 0.13].map((x) => put(typing, ball(0.045, MAT.blue), x, 0, 0.04));
  const input = put(cs, group(), 0, -0.88, 0.02);
  put(input, pill(1.45, 0.24, 0.05, MAT.whiteIn), 0, 0, 0);
  put(input, disc(0.08, 0.03, MAT.blue), 0.56, 0, 0.03);
  put(input, pill(0.6, 0.045, 0.02, MAT.blue), -0.25, 0, 0.03);
  I.add(chat, 0, [0, -2, 0]);

  // 生成のきらめき
  const spark = put(root, extruded(sparkleShape(0.26), 0.07, MAT.white), -0.55, 2.55, 0.5);
  const spark2 = put(root, extruded(sparkleShape(0.13), 0.05, MAT.white), -0.15, 2.95, 0.2);

  // 成果物: 3枚のアートボードを扇に
  const outs = put(root, group(), 1.55, 0, 0.1, 0, -0.42);
  const board = (w, h, draw) => { const g = group(); put(g, slab(w, h, 0.05, 0.05, MAT.paper), 0, 0, 0); draw(g); return g; };
  const bPoster = board(1.12, 1.52, (g) => {
    put(g, disc(0.24, 0.03, MAT.blue), -0.2, 0.36, 0.035);
    put(g, extruded(triShape(0.4), 0.03, MAT.blue), 0.22, 0.06, 0.035);
    [-0.4, -0.52].forEach((y, i) => put(g, pill([0.8, 0.5][i], 0.05, 0.02, MAT.blue), -0.1 * i, y, 0.03));
  });
  const bWeb = board(1.6, 1.12, (g) => {
    put(g, pill(1.42, 0.09, 0.02, MAT.blue), 0, 0.42, 0.03);
    put(g, slab(0.66, 0.56, 0.03, 0.04, MAT.blue), -0.36, 0.0, 0.035);
    [0.18, 0.04, -0.1].forEach((y, i) => put(g, pill([0.6, 0.48, 0.54][i], 0.05, 0.02, MAT.blue), 0.36 - i * 0.03, y, 0.03));
    put(g, pill(0.4, 0.12, 0.02, MAT.blue), 0.28, -0.34, 0.03);
  });
  const bSns = board(1.1, 1.1, (g) => { put(g, extruded(burstShape(0.36), 0.04, MAT.blue), 0, 0.05, 0.04); put(g, pill(0.6, 0.05, 0.02, MAT.blue), 0, -0.42, 0.03); });
  const fan = [[bWeb, 0.55, 1.62, -0.55], [bSns, -0.2, 1.05, -0.2], [bPoster, 0.32, 0.8, 0.25]];
  fan.forEach(([b, x, y, z]) => put(outs, b, x, y, z));
  I.add(outs, 0.25, [0.4, -2.2, 0]);

  // 生成の粒（チャット → 成果物）
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 1.55, 0.35), new THREE.Vector3(-0.55, 2.3, 0.75), new THREE.Vector3(0.35, 2.05, 0.9), new THREE.Vector3(1.2, 1.15, 0.7),
  ]);
  const geos = [new RoundedBoxGeometry(0.17, 0.17, 0.17, 2, 0.045), new THREE.SphereGeometry(0.095, 20, 12), new THREE.CapsuleGeometry(0.05, 0.14, 6, 12), new THREE.TetrahedronGeometry(0.12)];
  const bits = Array.from({ length: 30 }, (_, i) => {
    const m = mesh(geos[i % geos.length], i % 3 === 0 ? MAT.paper : MAT.white);
    m.userData = { o: i / 30, j: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.45, (Math.random() - 0.5) * 0.4), r: Math.random() * TAU };
    root.add(m);
    return m;
  });

  let phase = 0, last = 0;
  return {
    root,
    update: (t, st) => {
      I.update(st.intro, t);
      const dt = clamp(t - last, 0, 0.05); last = t;
      phase += reduced ? 0 : dt * (0.09 + st.hover * 0.2);
      const p = new THREE.Vector3(), on = clamp(st.intro * 2 - 0.8, 0, 1);
      bits.forEach((b) => {
        const u = (((b.userData.o + phase) % 1) + 1) % 1;
        curve.getPoint(u, p);
        b.position.copy(p).addScaledVector(b.userData.j, Math.sin(u * Math.PI));
        b.rotation.set(t * 1.2 + b.userData.r, t * 0.8 + b.userData.r * 2, 0);
        b.scale.setScalar(Math.max(0.001, Math.min(1, u * 7, (1 - u) * 5) * on));
      });
      tdots.forEach((d, i) => { d.position.y = reduced ? 0 : Math.max(0, Math.sin(t * 6 - i * 0.7)) * 0.05; });
      spark.rotation.z = t * 0.6; spark2.rotation.z = -t * 0.9;
      spark.scale.setScalar(Math.max(0.001, on * (1 + Math.sin(t * 2) * 0.08)));
      spark2.scale.setScalar(Math.max(0.001, on));
      // ホバーで成果物の扇が開く
      fan.forEach(([b, x, , z], i) => { b.position.x = x + (i - 1) * 0.28 * st.hover; b.rotation.y = (i - 1) * -0.18 * st.hover; b.position.z = z + st.hover * 0.15 * i; });
    },
    cam: { y: 1.35, dist: 10.8, yaw: -0.12 },
  };
}

const BUILDERS = { web, uiux, graphic, ai };

/* ---------------------------------------------------------------- print look */
// 網点1粒の被覆率（スクリーン座標・角度a・セルcell・濃度s）
const HT_GLSL = `
float htDot(vec2 p, float a, float cell, float s) {
  vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  vec2 c = (floor(q / cell) + 0.5) * cell;
  float r = sqrt(clamp(s, 0.0, 1.0)) * cell * 0.7071;
  return smoothstep(r + 0.8, r - 0.8, length(q - c)) * step(0.01, s);
}`;
// 立体の陰を網点で刷る: なめらかな陰影を平らにし、暗い分だけ「青45°＋シアン15°」の2版の網点を重ねる
function printShade(mat, inkA, inkB, cell) {
  const base = mat.color.clone().convertLinearToSRGB();
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uCell: { value: cell }, uBase: { value: new THREE.Vector3(base.r, base.g, base.b) },
      uInkA: { value: new THREE.Vector3(inkA.r, inkA.g, inkA.b) }, uInkB: { value: new THREE.Vector3(inkB.r, inkB.g, inkB.b) },
    });
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform float uCell; uniform vec3 uBase, uInkA, uInkB;\n${HT_GLSL}\nvoid main() {`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          const vec3 W = vec3(0.299, 0.587, 0.114);
          float s = smoothstep(0.03, 0.5, 1.0 - dot(gl_FragColor.rgb, W) / dot(uBase, W)) * 0.75;
          vec3 col = mix(gl_FragColor.rgb, uBase, 0.72);             // 陰影を平らに（少しだけ立体感を残す）
          col *= mix(vec3(1.0), uInkA, htDot(gl_FragCoord.xy, 0.7854, uCell, s));
          col *= mix(vec3(1.0), uInkB, htDot(gl_FragCoord.xy + vec2(2.4, -1.6), 0.2618, uCell, s * 0.6)); // 版ずれ
          gl_FragColor.rgb = col;
        }`);
  };
  mat.needsUpdate = true;
}
// 中の要素の輪郭線（法線方向に膨らませた裏面ハル＝スミ版のキーライン）
function outlineMaterial(t) {
  const m = new THREE.MeshBasicMaterial({ color: INK.navy, side: THREE.BackSide, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: t };
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'uniform float uT;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uT;');
  };
  return m;
}
function addOutlines(root, t) {
  const mat = outlineMaterial(t), targets = [];
  root.traverse((o) => { if (o.isMesh && INNER.has(o.material)) targets.push(o); });
  for (const o of targets) {
    const h = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, mat, o.count) : new THREE.Mesh(o.geometry, mat);
    if (o.isInstancedMesh) h.instanceMatrix.copy(o.instanceMatrix);
    h.castShadow = false; h.receiveShadow = false;
    o.add(h);
  }
}

/* ---------------------------------------------------------------- halftone shadow */
// 落ち影を網点で刷る（45°スクリーン、影の濃さ＝点の大きさ）
function halftoneShadowMaterial(cell) {
  const m = new THREE.ShadowMaterial({ color: '#08196e', opacity: 0.85 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCell = { value: cell };
    sh.uniforms.uCyan = { value: new THREE.Vector3(INK.cyan.r, INK.cyan.g, INK.cyan.b) };
    sh.uniforms.uCmy = { value: STYLE.cmyShadow ? 1 : 0 };
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform float uCell, uCmy; uniform vec3 uCyan;\n${HT_GLSL}\nvoid main() {`)
      .replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );', `
        float s = clamp(1.0 - getShadowMask(), 0.0, 1.0);
        float a = htDot(gl_FragCoord.xy, 0.7854, uCell, s * 0.45);
        float b = uCmy > 0.5 ? htDot(gl_FragCoord.xy + vec2(3.0, -2.0), 0.2618, uCell, s * 0.42) : 0.0;
        // 濃紺の版の下にシアンの版がずれて覗く
        gl_FragColor = vec4( mix(uCyan, color, a), max(a * opacity, b * 0.85) );`);
  };
  return m;
}

/* ---------------------------------------------------------------- stage */
class Spring {
  constructor(k = 90, c = 14) { this.k = k; this.c = c; this.x = 0; this.v = 0; this.t = 0; }
  step(dt) { const a = this.k * (this.t - this.x) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; }
}

class Mini {
  constructor(el, kind) {
    this.el = el;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    r.setPixelRatio(this.dpr);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping; // ACESはコバルトの彩度が落ちる
    r.toneMappingExposure = 1.0;
    r.domElement.className = 'svc-3d-canvas';
    el.appendChild(r.domElement);
    this.r = r;

    const s = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.55;
    s.add(new THREE.HemisphereLight('#ffffff', '#2f62ff', 0.7)); // 下からの照り返しは青
    const key = new THREE.DirectionalLight('#fff8ee', 2.3);
    key.position.set(-4.5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    s.add(key);
    const rim = new THREE.DirectionalLight('#cfe0ff', 0.9);
    rim.position.set(5, 3, -6);
    s.add(rim);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), halftoneShadowMaterial(9 * this.dpr));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);
    this.scene = s;

    this.built = BUILDERS[kind]();
    if (STYLE.edge) addOutlines(this.built.root, 0.011);
    this.pivot = new THREE.Group();
    this.pivot.add(this.built.root);
    s.add(this.pivot);
    this.cam = new THREE.PerspectiveCamera(20, 1.5, 0.1, 100);
    // 完成状態（登場後・ホバーなし）で外接箱を測り、カメラを自動フレーミングする
    // ホバーで開いた状態も含めて収まるよう、閉/開の外接箱を合成する
    this.pivot.rotation.y = this.built.cam.yaw;
    this.box = new THREE.Box3();
    for (const hv of [1, 0]) {
      this.built.update(0, { intro: 1, hover: hv, ex: hv });
      this.pivot.updateMatrixWorld(true);
      this.box.union(new THREE.Box3().setFromObject(this.pivot));
    }

    this.st = { intro: 0, hover: 0, ex: 0 };
    this.sx = new Spring(60, 12); this.sy = new Spring(60, 12); this.sh = new Spring(110, 16); this.se = new Spring(70, 9);
    this.inView = false;
    this.started = 0;
    this.last = performance.now();
    // 駆動: スクロール（担当サービス行が画面中央を通る間に開いて閉じる）＋セクション全体でのカーソル傾き
    this.row = document.getElementById(`svc-${kind}`);
    this.staged = el.classList.contains('svc-3d-stage'); // PCのステージ（アクティブな1つだけ描く）
    this.active = !this.staged;
    this.pointerOn = false;
    const section = el.closest('.services') || el;
    section.addEventListener('pointermove', (e) => {
      const b = el.getBoundingClientRect();
      this.sx.t = clamp(((e.clientX - b.left) / b.width) * 2 - 1, -1.2, 1.2);
      this.sy.t = clamp(((e.clientY - b.top) / b.height) * 2 - 1, -1.2, 1.2);
    });
    section.addEventListener('pointerleave', () => { this.sx.t = 0; this.sy.t = 0; });
    el.addEventListener('pointerenter', () => (this.pointerOn = true));
    el.addEventListener('pointerleave', () => (this.pointerOn = false));
    // クリックで層がポンと飛び出して戻る（沈ませる方向には弾ませない）
    el.addEventListener('pointerdown', () => { this.se.v += 7; });
    new ResizeObserver(() => this.resize()).observe(el);
    new IntersectionObserver(([e]) => { this.inView = e.isIntersecting; }, { threshold: [0, 0.2] }).observe(el);
    this.resize();
  }
  // ステージで担当になった瞬間に組み上げ直す
  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    this.el.classList.toggle('is-active', on);
    if (on) { this.started = performance.now(); this.last = this.started; this.se.x = this.sh.x = 0; }
  }
  // 担当行の通過度合い 0→1→0（行の中央が画面中央に来たとき最大）
  scrollOpen() {
    if (!this.row) return 0;
    const r = this.row.getBoundingClientRect();
    const p = clamp((innerHeight * 0.5 - r.top) / Math.max(1, r.height), 0, 1);
    return clamp(Math.sin(p * Math.PI) * 1.7 - 0.25, 0, 1);
  }
  resize() {
    const cw = this.r.domElement.clientWidth, ch = this.r.domElement.clientHeight;
    if (!cw || !ch) return;
    this.r.setSize(cw, ch, false);
    this.cam.aspect = cw / ch;
    const size = this.box.getSize(new THREE.Vector3()), ctr = this.box.getCenter(new THREE.Vector3());
    const tan = Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2));
    const need = Math.max(size.y * 1.08 / tan, size.x / (tan * this.cam.aspect)) / 2;
    const d = need * 1.12 + size.z / 2; // 余白12%＋奥行き分
    const elev = 0.34;                  // 見下ろし角
    this.cam.position.set(ctr.x, ctr.y + d * elev, ctr.z + d);
    this.cam.lookAt(ctr.x, ctr.y - size.y * 0.02, ctr.z);
    // 深度範囲をシーンに合わせて狭め、近接した面の深度精度を確保する
    const rad = size.length() / 2;
    this.cam.near = Math.max(0.1, d - rad * 2.5);
    this.cam.far = d + rad * 3;
    this.cam.updateProjectionMatrix();
  }
  tick(now) {
    if (!this.inView || !this.active) { this.last = now; return; }
    if (!this.started) this.started = now;
    const dt = Math.min(1 / 30, (now - this.last) / 1000);
    this.last = now;
    const t = now / 1000, st = this.st;
    st.intro = reduced ? 1 : ease(clamp((now - this.started) / 2000, 0, 1));
    // 組み上がってから開く（イントロ中は閉じたまま）
    const open = Math.max(this.scrollOpen(), this.pointerOn ? 1 : 0) * clamp(st.intro * 1.6 - 0.6, 0, 1);
    this.sh.t = open; this.se.t = open;
    const px = this.sx.step(dt), py = this.sy.step(dt);
    st.hover = clamp(this.sh.step(dt), 0, 1);
    st.ex = reduced ? this.se.t : Math.max(0, this.se.step(dt));
    this.pivot.rotation.y = this.built.cam.yaw + px * 0.3 + (reduced ? 0 : Math.sin(t * 0.35) * 0.045);
    this.pivot.rotation.x = py * 0.07;
    this.built.update(t, st);
    this.r.render(this.scene, this.cam);
  }
}

let shaded = false;
export function init(els) {
  const minis = [];
  // マテリアルは全シーン共有なので網点の陰は一度だけ仕込む（セルは画面px基準）
  if (STYLE.shade && !shaded) {
    shaded = true;
    const cell = 7.5 * Math.min(devicePixelRatio || 1, 2);
    [MAT.paper, MAT.paperIn, MAT.white, MAT.whiteIn].forEach((m) => printShade(m, INK.blue, INK.cyan, cell));
    printShade(MAT.blue, INK.navy, INK.cyan, cell);
  }
  for (const el of els) {
    try {
      minis.push(new Mini(el, el.dataset.scene));
      el.classList.add('is-3d');
    } catch (e) {
      console.warn('[svc3d]', e);
      el.classList.add('is-fallback');
    }
  }
  // PCのステージ: 画面中央にあるサービス行を担当にし、キャプションと進捗を更新
  const staged = minis.filter((m) => m.staged);
  const rows = [...document.querySelectorAll('.svc-list .svc')];
  const capNo = document.querySelector('[data-svc-no]'), capName = document.querySelector('[data-svc-name]'), bar = document.querySelector('[data-svc-bar]');
  if (staged.length) document.querySelector('.svc-wrap')?.classList.add('is-staged');
  let current = -1;
  const pick = () => {
    if (!staged.length || !rows.length) return;
    const mid = innerHeight * 0.5;
    let idx = 0;
    rows.forEach((r, i) => { if (r.getBoundingClientRect().top <= mid) idx = i; });
    if (idx === current) return;
    current = idx;
    const key = rows[idx].dataset.key;
    staged.forEach((m) => m.setActive(m.el.dataset.scene === key));
    rows.forEach((r, i) => r.classList.toggle('is-active', i === idx));
    if (capNo) capNo.textContent = String(idx + 1).padStart(2, '0');
    if (capName) capName.textContent = rows[idx].querySelector('.svc-title')?.textContent || '';
    if (bar) bar.style.transform = `scaleX(${(idx + 1) / rows.length})`;
  };
  const loop = (now) => { pick(); minis.forEach((m) => m.tick(now)); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__svc3d = minis; // 検証用
  return minis;
}
