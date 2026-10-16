// UniEnter's authored case study. CMS still controls publication, listing and cover.
// Keep editorial content here until the CMS schema supports video and captions.
export function unienterDetail(work) {
  if (work.slug !== 'unienter') return work;
  return {
    ...work,
    subtitle: 'Enterでのうっかり送信を防ぐ',
    url: 'https://unienter.oc-to.com/',
    lead: '改行したかっただけなのに、書きかけの言葉を送ってしまう。UniEnterは、そんな小さなつまずきを減らすために生まれたMacアプリです。対象のチャットアプリでEnterを改行、⌘Enterを送信に揃え、伝えたいことを書き終えてから送れる体験をつくりました。',
    sections: [
      { h: '書くことに集中できる操作へ', p: '仕事のチャットからAIへの相談まで、一日の中で複数の入力欄を行き来します。そのたびに送信の操作を意識し直す負担を減らすことが、制作の出発点でした。\n\nUniEnterはメニューバーに常駐し、選択した対象アプリでキーの働きを整えます。文章を途中で区切り、読み返し、必要なことを付け足す。いつもの入力の流れを保ちながら、最後の⌘Enterを送信の合図にします。' },
      { h: '使う場所を、自分で選ぶ', p: '設定画面では、利用するサービスを選んで有効にできます。アプリ版とブラウザ版は別々に設定できるため、日々の使い方に合わせて対象を調整できます。初回の案内からアクセシビリティの許可、対象アプリの選択へと進める構成にしました。\n\nSlack、Microsoft Teams、LINE、ChatGPT、Claudeなどが対象です。サービスによってアプリ版・Web版の対応範囲が異なり、アプリ側の送信設定にも注意が必要です。最新の対応一覧と使い方は公式サイトにまとめています。' },
      { h: '日本語入力と、普段の操作への配慮', p: '実装では、前面のアプリやブラウザのタブを判定し、対象となる場面でキー入力を扱います。日本語の変換を確定するEnterと、文章を改行するEnterを区別することを重視し、変換中と判断した入力は書き換えない設計です。\n\nアプリ本体はSwiftとAppKit、設定や初回案内のUIはSwiftUIで構成。入力した文章を記録・保存・送信することなく、Mac上でキー操作を処理します。' },
      { h: '触って理解できる紹介サイト', p: '公式サイトでは、Enterと⌘Enterの違いをチャット形式のデモで体験できます。機能の説明だけでなく、使う前と使った後の変化が伝わるよう、入力、改行、送信の動きを中心に構成しました。\n\n対応サービス、導入手順、価格へと読み進められる流れを用意し、ティザー動画でも「うっかり送信」から「書き終えて送信」への変化を短いストーリーで紹介しています。' },
      { h: '公開情報', p: 'macOS 13以降に対応。14日間の無料トライアル後は、1,480円の買い切りで利用できます。公開版はv0.3.7（2026年10月16日時点）。最新のバージョン、価格、対応範囲は公式サイトでご確認ください。' },
    ],
    gallery: [],
  };
}
export const unienterMedia = `
<section class="unienter-media" aria-label="UniEnterの公式サイトと紹介動画">
  <div class="unienter-media-head"><p class="label mono">( Website )</p><h2>操作の違いを、サイトで体験する。</h2></div>
  <figure>
    <a href="https://unienter.oc-to.com/" target="_blank" rel="noopener"><img src="../../assets/works/unienter/official-site-20261016.png" alt="UniEnter公式サイト。Enterでのうっかり送信を防ぐという見出しと、入力を試せるチャットデモ" width="1440" height="1000" loading="lazy" decoding="async"></a>
    <figcaption>公式サイトの実画面（2026年10月16日撮影）</figcaption>
  </figure>
  <div class="unienter-media-head"><p class="label mono">( Film )</p><h2>うっかり送信から、書き終えて送信へ。</h2></div>
  <figure>
    <video controls playsinline preload="metadata" width="1920" height="1080" poster="../../assets/works/unienter/teaser-poster.png" aria-label="UniEnter紹介ティザー（約20秒、音声付き）">
      <source src="../../assets/works/unienter/teaser-16x9.mp4" type="video/mp4">
      <a href="../../assets/works/unienter/teaser-16x9.mp4">紹介動画を開く</a>
    </video>
    <figcaption>紹介ティザー / 約20秒・音声付き。再生ボタンで視聴できます。</figcaption>
    <p class="unienter-film-summary">書きかけのメッセージを送ってしまう場面から、Enterで改行し、⌘Enterで送信する場面へ。操作の変化を紹介します。</p>
  </figure>
  <a class="unienter-site-link" href="https://unienter.oc-to.com/" target="_blank" rel="noopener">UniEnterの公式サイトを見る <span aria-hidden="true">↗</span></a>
</section>`;
