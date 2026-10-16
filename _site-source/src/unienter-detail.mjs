// UniEnter's authored case study. CMS still controls publication, listing and cover.
// Keep editorial content here until the CMS schema supports video and captions.
export function unienterDetail(work) {
  if (work.slug !== 'unienter') return work;
  return {
    ...work,
    subtitle: 'Enterでのうっかり送信を防ぐ',
    url: 'https://unienter.oc-to.com/',
    lead: 'Enterで改行し、⌘Enterで送信する。UniEnterは、対象のチャットアプリでキー操作を揃え、書き終えてから送れる体験をつくるMacアプリです。',
    sections: [
      { h: '操作を、そのままビジュアルに', p: '公式サイトは、入力・改行・送信を試せるチャットデモを中心に設計。大きなタイポグラフィとキーの動きで使い方を伝え、導入前後の違いから、プライバシー、設定、価格へと読み進める構成にしました。' },
      { h: '日々の入力に寄り添う', p: 'アプリ版とWeb版の対象を個別に選択でき、日本語の変換中と判断したEnterは書き換えない設計です。Swift・AppKitとSwiftUIで実装し、入力した文章は記録・保存・送信しません。macOS 13以降、14日間無料、1,480円の買い切り。最新の対応範囲と公開情報は公式サイトへ。' },
    ],
    gallery: [],
  };
}
export const unienterMedia = `
<section class="unienter-media" aria-label="UniEnterの公式サイトと紹介動画">
  <div class="unienter-media-head"><p class="label mono">( Website design )</p><h2>入力の体験を、画面で伝える。</h2></div>
  <div class="unienter-screens">
  <figure>
    <a href="../../assets/works/unienter/web-01-hero.png" target="_blank" rel="noopener" aria-label="大きな見出しとチャットデモを配置したUniEnter公式サイトのファーストビューを拡大"><img src="../../assets/works/unienter/web-01-hero.png" alt="大きな見出しとチャットデモを配置したUniEnter公式サイトのファーストビュー" width="2880" height="2000" loading="lazy" decoding="async"></a>
    <figcaption>01 / First view</figcaption>
  </figure>
  <figure>
    <a href="../../assets/works/unienter/web-02-experience.png" target="_blank" rel="noopener" aria-label="Enterの操作による送信体験の違いを見せる公式サイトのデモ画面を拡大"><img src="../../assets/works/unienter/web-02-experience.png" alt="Enterの操作による送信体験の違いを見せる公式サイトのデモ画面" width="2880" height="2000" loading="lazy" decoding="async"></a>
    <figcaption>02 / Before & after</figcaption>
  </figure>
  <figure>
    <a href="../../assets/works/unienter/web-03-privacy.png" target="_blank" rel="noopener" aria-label="Mac内で入力を処理することを図解したプライバシーセクションを拡大"><img src="../../assets/works/unienter/web-03-privacy.png" alt="Mac内で入力を処理することを図解したプライバシーセクション" width="2880" height="2020" loading="lazy" decoding="async"></a>
    <figcaption>03 / Privacy</figcaption>
  </figure>
  <figure>
    <a href="../../assets/works/unienter/web-04-install.png" target="_blank" rel="noopener" aria-label="導入手順と実際のアプリ設定画面を組み合わせたセクションを拡大"><img src="../../assets/works/unienter/web-04-install.png" alt="導入手順と実際のアプリ設定画面を組み合わせたセクション" width="2880" height="2610" loading="lazy" decoding="async"></a>
    <figcaption>04 / Getting started</figcaption>
  </figure>
  <figure>
    <a href="../../assets/works/unienter/web-05-pricing.png" target="_blank" rel="noopener" aria-label="無料トライアルと買い切り価格を整理した料金セクションを拡大"><img src="../../assets/works/unienter/web-05-pricing.png" alt="無料トライアルと買い切り価格を整理した料金セクション" width="2880" height="1736" loading="lazy" decoding="async"></a>
    <figcaption>05 / Pricing</figcaption>
  </figure>
  </div>
  <p class="unienter-capture-note">公式サイトの実画面 / 2026.10.16 — 画像を選択すると拡大できます。</p>
  <div class="unienter-media-head"><p class="label mono">( Film )</p><h2>うっかり送信から、書き終えて送信へ。</h2></div>
  <figure>
    <video controls playsinline preload="metadata" width="1920" height="1080" poster="../../assets/works/unienter/teaser-poster.png" aria-label="UniEnter紹介ティザー（約20秒、音声付き）">
      <source src="../../assets/works/unienter/teaser-16x9.mp4" type="video/mp4">
      <a href="../../assets/works/unienter/teaser-16x9.mp4">紹介動画を開く</a>
    </video>
    <figcaption>紹介ティザー / 約20秒・音声付き。再生ボタンで視聴できます。</figcaption>
  </figure>
  <a class="unienter-site-link" href="https://unienter.oc-to.com/" target="_blank" rel="noopener">UniEnterの公式サイトを見る <span aria-hidden="true">↗</span></a>
</section>`;
