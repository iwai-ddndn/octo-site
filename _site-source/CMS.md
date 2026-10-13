# 作品詳細のCMS運用

本番ソースはこの `_site-source/`。デザイン作業用の `logo_generative/redesign/` とは自動同期しません。
現在の公開対象は **UniEnterのみ**。他の既存4件は下書きのままです。

## 既存項目を使う

`works` の必須項目は `title` と `category`。説明や追加画像のためのスキーマ追加は不要です。

| フィールド | microCMSの型 | 表示 |
| --- | --- | --- |
| `lead` | テキストエリア、任意 | 概要と検索・OGP説明。改行・空行を保持 |
| `sections` | 繰り返し、任意 | `fieldId: section` を登録順に表示 |
| `sections[].heading` | テキスト、任意 | 本文ブロックの見出し |
| `sections[].body` | テキストエリア、任意 | 本文。改行・空行を保持 |
| `gallery` | 複数画像、任意 | 登録順。先頭は全幅、以降は既存の幅配置。スマホでは1列 |
| `cover` | 画像、任意 | TOP・一覧・詳細の先頭画像・詳細OGP |

未入力の説明・本文ブロック・ギャラリーは出力しません。見出しだけ、本文だけでも登録できます。
テキストはプレーンテキストとして扱い、HTMLは実行せず文字として表示します。
画像キャプションや本文途中への画像挿入はこのスキーマにはありません。

## ダミーの下書き

ID `cms-detail-dummy`、`sample=true`、`featured=false`、タイトルは「ダミー／詳細ページ表示検証」。
`.github/fixtures/work-details/cms-entry.json` と `assets/` 内の番号付きPNG3枚が入稿見本です。
JSON内の画像URLはローカル用。CMSではPNGを登録し、その画像URLに置き換わります。
顧客名・年・実績・成果・公開URLは作りません。**この検証専用作品は公開しません。**

## ローカルプレビュー

認証情報を読み出さず、CMS形式の入力を本番と同じ `content.mjs`・テンプレートで検証します。

```sh
node --test .github/scripts/cms-release.test.mjs
node .github/scripts/preview-work-details.mjs
# CMS担当から受け取った、本文・画像URL・寸法だけのJSONを使う場合
node .github/scripts/preview-work-details.mjs /absolute/path/to/cms-editorial-export.json
```

入力は1件のレコード、または `{"contents": [...]}`。すべて `sample=true`、タイトルに「ダミー」か「DUMMY」、安全なIDが必要です。
既定では通常の説明＋3画像、任意項目なし、長文＋部分入力の3ケースを生成します。
表示される `previewDirectory` をローカルHTTPサーバーのルートに指定してください。
出力はシステム一時ディレクトリに分離し、`noindex, nofollow` を設定し、CNAMEを付けません。
元の `_site-source/public/` を書き換えず、CMSのAPI呼び出しや公開は行いません。
下書きキー・APIキー・Cookieを入力JSONに含めないでください。

この方法はCMS編集内容と同じ形式のデータの表示検証です。下書きAPIの直接取得テストではありません。
公開済み作品の取得経路は既存のGitHub Actionsを継続使用します。

## 公開

CMS編集とサイト反映は別です。既存の `publish-cms.yml` を `main / publish=true` で実行すると本番配置します。
`publish=false` は成果物作成のみ。検証専用JSONはこのワークフローに渡さず、本番への反映は内容の承認後に実行します。
キーは既存GitHub Repository Secrets内に保持。`site` APIは取得しません。
公開0件・取得失敗・`sample=true`混入・必須の`unienter`欠落時は、出力前に停止します。
