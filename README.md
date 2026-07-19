# WriteApt — なぞり書き練習アプリ

半透明のガイド文字の上をなぞって、文字の練習ができる Web アプリです。

## 機能

- 任意のテキストを入力して練習用ガイドを表示
- 半透明グレーの文字の上をマウス・指・ペンでなぞれる
- 文字サイズ・行間・ペンの太さ・ガイドの濃さを調整可能
- なぞりの消去・ひとつ戻す

## 使い方

1. 「練習テキスト」に文字を入力
2. 「テキストを反映」でキャンバスにガイドを表示
3. キャンバス上で文字をなぞって練習

## デプロイ

`main` ブランチへ push すると GitHub Actions により GitHub Pages へ自動デプロイされます。

公開 URL: https://ishitanikatuya.github.io/writeapt/

### 初回セットアップ（1回だけ）

GitHub Pages を有効にするため、リポジトリオーナーが以下を行ってください。

1. [リポジトリの Pages 設定](https://github.com/IshitaniKatuya/writeapt/settings/pages) を開く
2. **Build and deployment** → **Source** で **GitHub Actions** を選択
3. [Actions タブ](https://github.com/IshitaniKatuya/writeapt/actions/workflows/deploy.yml) から「Deploy to GitHub Pages」ワークフローを **Re-run all jobs** で再実行

完了後、数分で上記 URL からアプリにアクセスできます。

## ローカルで試す

```bash
python3 -m http.server 8080
```

ブラウザで http://localhost:8080 を開いてください。
