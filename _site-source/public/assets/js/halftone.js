// カラーハーフトーン描画エンジン（WebGL1）。
// 版(plate)ごとに角度の違う網点スクリーンを作り、インクを重ね刷りする。
//   src = 0: RGB画像 → CMYK分解（写真用）
//   src = 1: ソースのR/G/Bをそのまま版0/1/2の濃度として使う（ブランドのバースト用）
//   src = 2: 輝度を反転して版0の濃度にする（線画の白抜き用）
//   comp = 0: 乗算（紙にインク） / 1: 上塗り（色地に白インクなど）
// progress 0→1 で網点から元画像へ解像し、loupe（ルーペ）の内側は網点に戻して拡大表示する。

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;        // 描画領域(px)
uniform float uCanvasH;   // 実キャンバス高(px) viewportを上詰めで使うため
uniform vec4 uFit;        // uv = p/uRes * uFit.xy + uFit.zw
uniform float uCell;      // 網点セル(px)
uniform float uProgress;  // 0=網点 1=元画像
uniform vec2 uMis;        // 版ずれ(px)
uniform vec4 uLoupe;      // x, y, 半径(px), 強さ0..1
uniform float uMag;       // ルーペ倍率
uniform int uSrc;
uniform int uComp;
uniform vec3 uPaper;
uniform vec3 uInk0;
uniform vec3 uInk1;
uniform vec3 uInk2;
uniform vec3 uInk3;
uniform vec4 uAng;
uniform vec4 uGain;
uniform float uPlates;

vec3 srcAt(vec2 p){
  vec2 uv = clamp(p / uRes, 0.0, 1.0) * uFit.xy + uFit.zw;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(1.0);
  return texture2D(uTex, uv).rgb;
}

vec4 plates(vec3 c){
  if (uSrc == 0) {
    // スケルトンブラック：中間調はCMYの3色で刷り、Kは暗部だけ
    vec3 cmy = 1.0 - c;
    float k = smoothstep(0.45, 1.0, min(min(cmy.r, cmy.g), cmy.b));
    cmy = clamp((cmy - k * 0.6) / (1.0 - k * 0.6), 0.0, 1.0);
    // ハイライトを締める（紙白に近い中間調の網点を間引き、刷りの品を上げる）
    return pow(vec4(cmy * 0.94, k), vec4(1.45));
  }
  if (uSrc == 2) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    return vec4(1.0 - l, 0.0, 0.0, 0.0);
  }
  if (uSrc == 3) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    return vec4(smoothstep(0.12, 0.92, l), smoothstep(0.35, 1.0, l) * 0.8, 0.0, 0.0);
  }
  return vec4(c, 0.0);
}

float pick(vec4 v, int i){
  if (i == 0) return v.x;
  if (i == 1) return v.y;
  if (i == 2) return v.z;
  return v.w;
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// 版iの被覆率。隣接2x2セルを見て大きな網点のつながりも描く
float screenDot(int i, vec2 p, float cell, float ang, vec2 off, float aa){
  mat2 R = rot(ang);
  mat2 Ri = rot(-ang);
  vec2 q = R * (p + off);
  vec2 b = floor(q / cell - 0.5);
  float cov = 0.0;
  for (int dy = 0; dy < 2; dy++) {
    for (int dx = 0; dx < 2; dx++) {
      vec2 cq = (b + vec2(float(dx), float(dy)) + 0.5) * cell;
      vec2 sp = Ri * cq - off;
      float v = clamp(pick(plates(srcAt(sp)), i) * pick(uGain, i), 0.0, 1.0);
      float r = sqrt(v) * cell * 0.7071;
      float d = length(q - cq);
      cov = max(cov, smoothstep(r + aa, r - aa, d) * step(0.002, v));
    }
  }
  return cov;
}

vec3 inkOf(int i){
  if (i == 0) return uInk0;
  if (i == 1) return uInk1;
  if (i == 2) return uInk2;
  return uInk3;
}

vec3 lay(vec3 base, vec3 ink, float a){
  if (uComp == 0) return base * mix(vec3(1.0), ink, a);
  return mix(base, ink, a);
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y);

  vec2 imageUV = p / uRes * uFit.xy + uFit.zw;
  if (any(lessThan(imageUV, vec2(0.0))) || any(greaterThan(imageUV, vec2(1.0)))) {
    gl_FragColor = vec4(uPaper, 1.0);
    return;
  }

  // ルーペ：中心からの距離で倍率を変え、内側ほど網点を拡大して見せる
  float dist = length(p - uLoupe.xy);
  float lens = (1.0 - smoothstep(uLoupe.z * 0.55, uLoupe.z, dist)) * uLoupe.w;
  float m = 1.0 + (uMag - 1.0) * lens;
  vec2 pw = uLoupe.xy + (p - uLoupe.xy) / m;

  float prog = uProgress * (1.0 - lens);
  float pe = prog * prog;
  float cell = mix(uCell, max(uCell * 0.12, 1.5), pe);
  float aa = 0.85 / m;

  vec3 col = uPaper;
  for (int n = 0; n < 4; n++) {
    if (float(n) >= uPlates) break;
    // 上塗り合成では版0（主版）を最後に刷って最前面にする
    int i = uComp == 1 ? int(uPlates) - 1 - n : n;
    vec2 off = uMis * (i == 0 ? 0.0 : (mod(float(i), 2.0) == 1.0 ? 1.0 : -1.0)) * (1.0 + float(i) * 0.25);
    float a = screenDot(i, pw, cell, pick(uAng, i), off, aa);
    col = lay(col, inkOf(i), a);
  }

  // 解像した最終状態（元画像 / 連続階調）
  vec3 s = srcAt(pw);
  vec3 fin;
  if (uSrc == 0) {
    fin = s;
  } else {
    vec4 v = plates(s);
    fin = uPaper;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uPlates) break;
      fin = lay(fin, inkOf(i), clamp(pick(v, i) * pick(uGain, i), 0.0, 1.0));
    }
  }
  col = mix(col, fin, smoothstep(0.55, 1.0, prog));
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const INKS = {
  paper: '#f7f6f2',
  blue: '#2962ff',
  cyan: '#00b4ff',
  magenta: '#ff2d8a',
  yellow: '#ffe600',
  black: '#14161f',
  navy: '#101a5c',
  white: '#ffffff',
};

export const PRESETS = {
  // 写真：CMYKのカラーハーフトーン
  photo: {
    src: 0, comp: 0, plates: 4,
    paper: INKS.paper, inks: [INKS.cyan, INKS.magenta, INKS.yellow, INKS.navy],
    angles: [15, 75, 0, 45], gain: [1, 1, 1, 1],
  },
  // ブランド：青+シアンの2色刷り（紙）
  brand: {
    src: 1, comp: 0, plates: 2,
    paper: INKS.paper, inks: [INKS.blue, INKS.cyan, INKS.magenta, INKS.black],
    angles: [45, 15, 75, 0], gain: [1, 1, 1, 1],
  },
  // 青地に白インク（反転セクション）
  brandInverse: {
    src: 1, comp: 1, plates: 2,
    paper: INKS.blue, inks: ['#ffffff', '#00c2ff', INKS.white, INKS.white],
    angles: [45, 15, 75, 0], gain: [1, 1, 1, 1],
  },
  // 写真：青地に白インクのデュオトーン
  photoInverse: {
    src: 3, comp: 1, plates: 2,
    paper: INKS.blue, inks: ['#ffffff', '#00c2ff', INKS.white, INKS.white],
    angles: [45, 15, 0, 0], gain: [1, 1, 0, 0],
  },
  // 線画：紙に青インク
  line: {
    src: 2, comp: 0, plates: 1,
    paper: INKS.paper, inks: [INKS.blue, INKS.white, INKS.white, INKS.white],
    angles: [45, 0, 0, 0], gain: [1.3, 0, 0, 0],
  },
  // 線画：青地に白抜き
  lineInverse: {
    src: 2, comp: 1, plates: 1,
    paper: INKS.blue, inks: ['#ffffff', INKS.white, INKS.white, INKS.white],
    angles: [45, 0, 0, 0], gain: [1.25, 0, 0, 0],
  },
};

export class Halftone {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      antialias: false, alpha: false, premultipliedAlpha: false,
      preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('webgl unavailable');
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      this.u[info.name] = gl.getUniformLocation(prog, info.name);
    }
    gl.uniform1i(this.u.uTex, 0);
    this.textures = new WeakMap();
    this.blocked = new WeakSet(); // CORS 無しで読めなかったソース
  }

  texture(source, dynamic = false) {
    const gl = this.gl;
    let tex = this.textures.get(source);
    const sw = source.naturalWidth ?? source.width;
    if (!tex && !sw) return null; // 未デコードの画像を空テクスチャとしてキャッシュしない
    if (this.blocked.has(source)) return null;
    if (!tex) {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      } catch (e) {
        gl.deleteTexture(tex);
        this.blocked.add(source);
        return null;
      }
      this.textures.set(source, tex);
      return tex;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (dynamic) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    return tex;
  }

  ensureSize(w, h) {
    const c = this.canvas;
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, w);
      c.height = Math.max(c.height, h);
    }
  }

  // w,h: 描画px。fit: 'cover' のトリミングを計算するためのソース寸法
  render(source, w, h, p) {
    const gl = this.gl, u = this.u;
    if (!this.texture(source, p.dynamic)) return false;
    const ch = this.canvas.height;
    gl.viewport(0, ch - h, w, h);

    const sw = source.naturalWidth || source.width, shh = source.naturalHeight || source.height;
    const ra = w / h, rs = sw / shh;
    let sx = 1, sy = 1;
    if (p.fit === 'contain') {
      if (ra > rs) sx = ra / rs; else sy = rs / ra;
    } else {
      if (ra > rs) sy = rs / ra; else sx = ra / rs;
    }
    const fx = p.focus ? p.focus[0] : 0.5, fy = p.focus ? p.focus[1] : 0.5;

    const pr = PRESETS[p.preset] || p.preset;
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uCanvasH, ch);
    gl.uniform4f(u.uFit, sx, sy, (1 - sx) * fx, (1 - sy) * fy);
    gl.uniform1f(u.uCell, p.cell);
    gl.uniform1f(u.uProgress, p.progress ?? 0);
    gl.uniform2f(u.uMis, p.mis?.[0] ?? 0, p.mis?.[1] ?? 0);
    const L = p.loupe || [0, 0, 1, 0];
    gl.uniform4f(u.uLoupe, L[0], L[1], L[2], L[3]);
    gl.uniform1f(u.uMag, p.mag ?? 2.2);
    gl.uniform1i(u.uSrc, pr.src);
    gl.uniform1i(u.uComp, pr.comp);
    gl.uniform1f(u.uPlates, pr.plates);
    gl.uniform3fv(u.uPaper, hex(p.paper || pr.paper));
    pr.inks.forEach((c, i) => gl.uniform3fv(u['uInk' + i], hex(c)));
    const ang = pr.angles.map((d) => (d * Math.PI) / 180);
    gl.uniform4f(u.uAng, ang[0], ang[1], ang[2], ang[3]);
    const g = p.gain || pr.gain;
    gl.uniform4f(u.uGain, g[0], g[1], g[2], g[3]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
}
