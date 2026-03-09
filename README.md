# 🚀 Command Helper (cmd-hlp)

AI駆動のCLIコマンド生成・実行アシスタント。
「やりたいこと」を自然言語で伝えるだけで、あなたの環境（OS/Shell）に最適なコマンドを生成し、その場で実行やコピーができます。

## ✨ 主な特徴

- **☁️ クラウド AI (Antigravity)**: 最新の Gemini や Claude を使用した高精度なコマンド生成。
- **🏠 ローカル AI (Ollama)**: 完全オフライン・プライバシー重視のローカル LLM 対応。
- **🔍 コンテキスト解析**: 実行中の OS、Shell、カレントディレクトリ、さらには**標準入力（パイプ）**の内容を考慮。
- **📖 ツールヘルプ注入**: `--tool ffmpeg` のように指定することで、手元のマニュアル (`man`) を AI に読み込ませて、オプションの正確な指定が可能。

## 📦 インストール

プロジェクトのルートディレクトリで以下を実行してください：

```bash
# ビルドとグローバルインストール
npm run build --prefix packages/client
npm install -g ./packages/client
```

これで `cmd-hlp` が使用可能になります。

## 🚀 使い方

### 1. 基本的な使用方法
やりたいことを引数として渡します。

```bash
cmd-hlp "3日以内に更新された.logファイルを全部消したい"
```

### 2. パイプからの入力を利用
他のコマンドの結果をコンテキストとして渡せます。

```bash
docker ps | cmd-hlp "起動から24時間以上経ってるコンテナだけstopするコマンド"
```

### 3. 特定のツールのマニュアルを参照
AI に `man` ページの内容を渡して、より正確なオプションを提案させます。

```bash
cmd-hlp --tool=ffmpeg "mp4をgifに変換して。サイズは半分、フレームレートは10で。"
```

### 4. 利用可能なモデルの確認
クラウド・ローカル両方の利用可能なモデルをリストアップします。

```bash
cmd-hlp --get.models
```

## ⚙️ 設定 (Config)

`cmd-hlp config` コマンドで設定を管理できます。

- **設定一覧を表示**:
  ```bash
  cmd-hlp config list
  ```
- **デフォルトモデルを変更**:
  ```bash
  cmd-hlp config set defaultModel gemini-3-flash --default
  ```
- **Ollama のホストを変更**:
  ```bash
  cmd-hlp config set providers.ollama.host http://192.168.1.10:11434 --default
  ```

## 🏗️ アーキテクチャ

このツールは **Client-Server モデル**を採用しています。
- **Client**: クライアント。ユーザーの入力を受け取り、マニュアル情報を収集してサーバーへ送信。
- **Server**: バックグラウンド。AI プロバイダー（Antigravity / Ollama）との通信を抽象化し、プロンプトを構築。
- **Daemon**: クライアント実行時にサーバーが動いていなければ、裏側で自動的にプロセスを立ち上げます。

## 📄 ライセンス

MIT
