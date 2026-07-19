# WriteApt — なぞり書き練習アプリ

半透明のガイド文字の上をなぞって、文字の練習ができる Web アプリです。

## 機能

- 任意のテキストを入力して練習用ガイドを表示
- **画像を読み込んで白黒ガイドとして表示**（なぞり練習に使える）
- 半透明グレーの文字の上をマウス・指・ペンでなぞれる
- **カラーパレット**でペン・塗りの色を選択
- **塗りつぶしツール**でエリアをタップして色を塗れる
- 文字サイズ・行間・ペンの太さ・ガイドの濃さを調整可能
- 描画の消去・ひとつ戻す

## 使い方

1. **テキスト**または**画像**をガイドとして選ぶ
2. テキストの場合は入力して「テキストを反映」、画像の場合は「画像を選ぶ」
3. **ペン**でなぞる、または**塗りつぶし**でタップして色を塗る
4. カラーパレットで色を変更

## デプロイ

`main` ブランチへ push すると GitHub Actions により GitHub Pages へ自動デプロイされます。

公開 URL: https://ishitanikatuya.github.io/writeapt/

### 初回セットアップ（1回だけ）

`main` への push で `gh-pages` ブランチへ自動デプロイされます。公開するには次の設定を行ってください。

1. [リポジトリの Pages 設定](https://github.com/IshitaniKatuya/writeapt/settings/pages) を開く
2. **Build and deployment** → **Source** で **Deploy from a branch** を選択
3. **Branch** を `gh-pages` / `/ (root)` に設定して **Save**

完了後、数分で上記 URL からアプリにアクセスできます。

## ローカルで試す

```bash
python3 -m http.server 8080
```

ブラウザで http://localhost:8080 を開いてください。
