// サイトの全コンテンツ。作品を追加するときはここに1件足して `node build.mjs` を実行する。
// images は redesign/public/assets/works/ 以下のファイル名（拡張子込み）。

export const site = {
  name: 'octo',
  tagline: 'multi design studio',
  url: 'https://oc-to.com',
  email: 'info@oc-to.com',
  // FormSubmit の info@oc-to.com エイリアス（アドレス露出回避）
  formEndpoint: 'https://formsubmit.co/ajax/15d40c22b55c094ee042d50d16a74b02',
};

// サイトのコピー。改行は \n、[[ ]] で囲んだ語は網点マーカーで強調される。
// CMS（microCMS の site API）に同じキーがあれば、そちらが優先される。
export const copy = {
  heroLine1: 'Design and AI,',
  heroLine2: 'all the way.',
  heroLead: 'デザインも、AIも、最後まで。\nマルチな領域を横断するデザインスタジオ、octoです。',
  statement: 'Web、UI/UX、グラフィック、AI。\nどの領域も、[[最初の相談]]から\n[[最後の仕上げ]]まで、ひとつの窓口で。',
  statementEn: 'octo is a multi-disciplinary design studio by Soichiro Iwai. Web, UI/UX, graphic and AI — from the first rough idea to the final file, all the way through.',
  worksLead: 'Scroll to browse',
  ctaLine1: 'Start rough,',
  ctaLine2: 'finish strong.',
  ctaLead: 'まだ形になっていない相談からで大丈夫です。\nデザインも、AIも、最後までご一緒します。',
  contactTitle: 'Tell us about\nyour project.',
  contactLead: '具体的な要件が決まっていなくても構いません。プロジェクトの現状や課題感をお聞かせください。2〜3営業日以内にご連絡いたします。連絡が来ない場合は、お手数ですがもう一度お送りください。',
  description: 'octoは、Web・UI/UX・グラフィック・AIクリエイティブを横断するデザインスタジオです。デザインも、AIも、最初の相談から最後の仕上げまで。',
};

export const services = [
  {
    key: 'web', no: '01', title: 'Web Design', img: 'svc-web.webp',
    body: '1枚のLPから複雑なコーポレートサイトまで。STUDIOでの実装も請け負います。',
  },
  {
    key: 'uiux', no: '02', title: 'UI/UX Design', img: 'svc-uiux.webp',
    body: '複雑で曖昧な領域を画面デザインまで落とし込みます。ビジョンやシナリオから、画面デザインとデザインガイドラインまで。0→1の開発も、既存プロダクトの改善も。2B領域が専門ですが、2C領域も受け入れていますのでご相談ください。',
  },
  {
    key: 'graphic', no: '03', title: 'Graphic Design', img: 'svc-graphic.webp',
    body: 'ロゴ、チラシ、冊子、名刺など、必要なデザインを一括で制作します。入稿までサポートしますので、初めての方もご安心ください。',
  },
  {
    key: 'ai', no: '04', title: 'AI Creative', img: 'svc-ai.webp',
    body: 'ChatGPT/Gemini/Claudeを利用したアウトプットの作成・活用サポートを承ります。AIで作成したWeb・アプリ・UI・グラフィックの修正依頼も受け付けております。',
  },
];

export const profile = {
  name: 'Soichiro Iwai',
  nameJa: '岩井 宗一郎',
  role: 'Founder / Designer',
  img: 'profile.jpg',
  bio: '千葉大学デザイン学科卒業。新卒で制作会社に入社。富士通株式会社を経て2023年にフリーランスとして独立。',
  timeline: [
    { when: '—', what: '千葉大学 デザイン学科 卒業' },
    { when: '—', what: '制作会社 入社' },
    { when: '—', what: '富士通株式会社' },
    { when: '2023', what: '2023年 フリーランスとして独立 — octo' },
  ],
};

// ⚠ sample: true の作品はレイアウト確認用のダミー（画像はAI生成のプレースホルダー）。
//   実案件に差し替えるまで本番公開しないこと。
export const works = [
  {
    slug: 'tidewell', sample: true,
    title: 'Tidewell', subtitle: 'Corporate Website Renewal',
    client: 'Tidewell Logistics', year: '2026', category: 'web',
    role: ['Art Direction', 'Web Design', 'STUDIO Development'],
    cover: 'tidewell-cover.webp', gallery: ['tidewell-1.webp', 'tidewell-2.webp'],
    lead: '海運物流企業のコーポレートサイトを全面リニューアル。採用と取引先の二つの入口を、ひとつの情報設計にまとめました。',
    sections: [
      { h: 'Challenge', p: '事業の拡大とともにページが継ぎ足され、採用候補者と取引先が同じ導線で迷う状態でした。更新は外部依存で、担当者が自分で直せないことも課題でした。' },
      { h: 'Approach', p: '訪問者の目的別に入口を分け、共通部分をコンポーネント化。STUDIOで実装し、社内担当者がニュースや求人を自分で更新できる運用まで設計しました。' },
      { h: 'Outcome', p: '主要ページの直帰率が改善し、更新のリードタイムが数日から当日に短縮。採用ページ経由の応募数も増加しました。' },
    ],
  },
  {
    slug: 'kumo-analytics', sample: true,
    title: 'Kumo Analytics', subtitle: 'B2B SaaS Dashboard',
    client: 'Kumo Inc.', year: '2025', category: 'uiux',
    role: ['UX Research', 'UI Design', 'Design System'],
    cover: 'kumo-cover.webp', gallery: ['kumo-1.webp', 'kumo-2.webp'],
    lead: '分析SaaSのダッシュボードを再設計。数字を「見る」画面から、次の打ち手を「決める」画面へ。',
    sections: [
      { h: 'Challenge', p: '機能追加を重ねた結果、主要な指標が埋もれ、ユーザーは毎回CSVを書き出して手元で集計していました。' },
      { h: 'Approach', p: '利用者インタビューから意思決定のシナリオを抽出し、画面を「状況把握→原因特定→アクション」の3層に再構成。デザインガイドラインとコンポーネントを整備しました。' },
      { h: 'Outcome', p: 'CSV書き出しの頻度が大きく下がり、開発チームはガイドラインに沿って新機能の画面を自走して作れるようになりました。' },
    ],
  },
  {
    slug: 'shiori-coffee', sample: true,
    title: 'Shiori Coffee', subtitle: 'Brand Identity & Packaging',
    client: 'Shiori Coffee Stand', year: '2025', category: 'graphic',
    role: ['Logo', 'Packaging', 'Stationery'],
    cover: 'shiori-cover.webp', gallery: ['shiori-1.webp', 'shiori-2.webp'],
    lead: '「本にはさむ栞のように、一日に一杯の区切りを」。小さなコーヒースタンドのブランドを、ロゴから入稿まで一括で。',
    sections: [
      { h: 'Concept', p: '栞のかたちを抽象化したシンボルを中心に、パッケージ・ショップカード・サインまで一貫したトーンで展開しました。' },
      { h: 'Production', p: '紙と特色の選定から入稿データ作成、印刷立ち会いまで対応。初めての印刷発注でも迷わないよう、仕様書を添えて納品しました。' },
    ],
  },
  {
    slug: 'noise-atlas', sample: true,
    title: 'Noise Atlas', subtitle: 'AI Generated Visual Series',
    client: 'Self-initiated', year: '2026', category: 'ai',
    role: ['Concept', 'AI Direction', 'Print'],
    cover: 'noise-cover.webp', gallery: ['noise-1.webp', 'noise-2.webp'],
    lead: '画像生成AIを「筆」として扱う実験シリーズ。プロンプトと手作業のレタッチを往復させ、ノイズから形を彫り出しました。',
    sections: [
      { h: 'Process', p: '生成→選別→レタッチ→再生成のループを1作品あたり数十回。偶然の形を残しつつ、色と構図はデザイナーの判断で決めています。' },
      { h: 'Exhibition', p: '大判プリントとして展示。AIで作ったビジュアルの「最後の10%」を人の手で仕上げる、という制作スタンスの実例です。' },
    ],
  },
  {
    slug: 'genba', sample: true,
    title: 'Genba', subtitle: 'Factory Operations App',
    client: 'Manufacturing Co.', year: '2024', category: 'uiux',
    role: ['Field Research', 'UX Design', 'UI Design'],
    cover: 'genba-cover.webp', gallery: ['genba-1.webp', 'genba-2.webp'],
    lead: '工場の現場で使うタブレットアプリの0→1開発。手袋をしたままでも、騒音の中でも迷わないUIを目指しました。',
    sections: [
      { h: 'Research', p: '3つの工場で作業観察とヒアリングを実施。紙の日報と口頭の引き継ぎに埋もれていた情報の流れを可視化しました。' },
      { h: 'Design', p: '大きなタップ領域、高コントラスト、1画面1タスクを原則に設計。現場でのプロトタイプ検証を繰り返して仕様を固めました。' },
    ],
  },
  {
    slug: 'kasane-festival', sample: true,
    title: 'Kasane Festival', subtitle: 'Poster & Landing Page',
    client: 'Kasane Art Festival', year: '2025', category: 'graphic',
    role: ['Key Visual', 'Poster', 'Landing Page'],
    cover: 'kasane-cover.webp', gallery: ['kasane-1.webp', 'kasane-2.webp'],
    lead: '「かさなる」をテーマにしたアートフェスのキービジュアル。ポスターからLPまで、重なる円のシステムで展開しました。',
    sections: [
      { h: 'Visual System', p: '色と円の重なり方をルール化し、媒体ごとにレイアウトを自動的に組み替えられるシステムとして設計しました。' },
      { h: 'Web', p: 'ポスターの構成をそのままスクロール体験に翻訳したLPを制作。会期中の更新にも耐える構造にしています。' },
    ],
  },
];

export const categories = {
  web: 'Web Design',
  uiux: 'UI/UX Design',
  graphic: 'Graphic Design',
  ai: 'AI Creative',
};
