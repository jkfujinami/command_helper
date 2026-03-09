# cmd-hlp (Command Helper) 設計仕様書

## 1. 概要
`cmd-hlp`は、自然言語によりターミナル上で最適なCLIコマンドを生成し、そのまま実行・コピーできる爆速AIコマンドヘルパーである。
起動のラグを極小化するため、クライアント（CLI）とバックエンド（常駐デーモンサーバー）の分離アーキテクチャを採用する。

## 2. システムアーキテクチャ
本システムはMonorepo構成とし、以下の2つのパッケージで構成される。

*   **Client (`packages/client`)**: ユーザーが操作するCLIツール。ターミナルからの入力、サーバーへのリクエスト送信、対話的UIの表示を担当する。
*   **Server (`packages/server`)**: バックグラウンドで常駐するAPIサーバー。LLM（Antigravity, Ollama等）との通信、プロンプト構築を担当する。

## 3. クライアントコマンド仕様

### 3.1. 基本利用 (コマンドの生成と実行)
```bash
cmd-hlp [options] <prompt>
```
引数として与えられた `<prompt>` からコマンドを生成し、対話型UIを表示する。標準入力（パイプ）からの入力も受け付ける。

**オプション (一時的な設定による上書き):**
*   `--set.useLocal=<boolean>`: 今回の実行において、強制的にローカルLLM（Ollama等）を使用するかどうか。
*   `--set.model=<string>`: 今回の実行で使用するモデル名を指定。
*   `--get.models`: （このフラグが指定された場合）利用可能なモデル一覧をサーバーから取得してターミナルに出力し、終了する。
*   `-c, --copy`: 対話型UIをスキップし、生成されたコマンドを直接クリップボードにコピーして終了する。
*   `-e, --execute`: 対話型UIをスキップし、生成されたコマンドを直接実行する（自己責任）。

### 3.2. 設定の永続化 (config サブコマンド)
`~/.cmd-hlp/config.json` の設定内容を操作する。

```bash
cmd-hlp config set <key> <value> [--default]
```
*   `key`: 変更する設定項目のキー (例: `model`, `useLocal`)
*   `value`: 設定する値
*   `--default`: このフラグを付与することで、一時的ではなく恒久的なデフォルト設定として設定ファイルに保存する。

## 4. API仕様 (サーバー側)

サーバーはデフォルトでローカル（例: `localhost:41234`）で稼働する軽量なHTTPインターフェースを提供する。

### 4.1. コマンド生成 API
*   **エンドポイント**: `POST /api/generate`
*   **概要**: クライアントから渡されたコンテキストとプロンプトを基に、LLMを使用して適切なシェルコマンドを生成する。

**リクエストボディ (JSON):**
```json
{
  "prompt": "tarで解凍したい",
  "context": {
    "cwd": "/Users/user/Documents",
    "shell": "zsh",
    "os": "darwin",
    "stdin": "" // パイプ入力があった場合
  },
  "settings": {
    "useLocal": true, // --set.useLocal で指定された場合
    "model": "llama3:8b" // --set.model で指定された場合
  }
}
```

**レスポンスボディ (JSON):**
```json
{
  "success": true,
  "command": "tar -xvf archive.tar.gz",
  "explanation": "tarコマンドを用いてGZIP圧縮されたアーカイブを展開します。"
}
```

### 4.2. モデル一覧取得 API
*   **エンドポイント**: `GET /api/models`
*   **概要**: 現在利用可能なプロバイダとモデルの一覧を返す。

**レスポンスボディ (JSON):**
```json
{
  "success": true,
  "providers": {
    "antigravity": ["gemini-1.5-pro", "gemini-1.5-flash"],
    "ollama": ["llama3:8b", "codestral:latest"]
  }
}
```

## 5. 設定ファイル仕様

*   **保存場所**: `~/.cmd-hlp/config.json`
*   **概要**: クライアント起動時やサーバー稼働時に参照されるデフォルト設定。`cmd-hlp config set` コマンド等で更新される。

**データ構造例:**
```json
{
  "defaultProvider": "antigravity",
  "defaultModel": "gemini-1.5-pro",
  "providers": {
    "antigravity": {
      "endpoint": "unix:///path/to/socket",
      "model": "gemini-1.5-pro"
    },
    "ollama": {
      "host": "http://localhost:11434",
      "model": "llama3:8b"
    }
  }
}
```

## 6. 詳細機能定義

### 6.1. コンテキスト収集機能 (Client)
クライアント起動時に以下の情報を自動収集し、APIリクエストに含める。
*   **OS・アーキテクチャ**: `process.platform`, `process.arch`
*   **カレントディレクトリ**: `process.cwd()`
*   **現在のシェル**: `process.env.SHELL`
*   **標準入力 (stdin)**: 他のコマンドからのパイプライン入力が存在するか確認し、存在する場合はテキストとして読み込む。

### 6.2. デーモン自動起動機能 (Client/Server)
クライアントがリクエストを送信する際、指定ポートのサーバーに対して事前チェックを行う。
接続に失敗（サーバーがダウンしている）した場合、クライアントは透過的に `packages/server` プロセスをバックグラウンド（detached）で起動し、ポートがリッスンされるまで待機してからリクエストを再送する。これによりユーザーはサーバーの死活を意識する必要がない。

### 6.3. 対話型UI機能 (Client)
サーバーから生成されたコマンドを受け取った後、ターミナル上に以下のメニューを提示する。
1.  **🚀 Execute (実行)**: `child_process.execSync` 等を利用し、ユーザーのシェル上で生成されたコマンドを実行する。標準出力・標準エラー出力は現在のターミナルにそのまま流す。
2.  **📋 Copy (コピー)**: 生成されたコマンド文字列をOSのクリップボードにコピーする。
3.  **❌ Cancel (キャンセル)**: 処理を中断し、終了する。
