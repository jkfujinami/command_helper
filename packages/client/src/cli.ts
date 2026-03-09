#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "node:fs";

import { getAllConfigPaths, saveConfig } from "./core/config.js";
import { TerminalUI } from "./core/terminal-ui.js";
import { BackendClient } from "./core/backend-client.js";
import { DaemonManager } from "./core/daemon-manager.js";
import { CommandHelperApp } from "./app.js";

const program = new Command();

// 依存関係の注入 (DI)
const ui = new TerminalUI();
const backend = new BackendClient();
const daemon = new DaemonManager();
const app = new CommandHelperApp(ui, backend, daemon);

program
  .name("cmd-hlp")
  .description("AI駆動のCLIコマンドヘルパー (Antigravity-client 搭載)");

program
  .command("config")
  .description("設定（config.json）の操作")
  .addCommand(
    new Command("list")
      .description("現在の設定を一覧表示する")
      .action(async () => {
        await app.listConfig();
      })
  )
  .addCommand(
    new Command("set")
      .description("設定値を更新する")
      .addHelpText("after", `\n利用可能なキー:\n  ${getAllConfigPaths().join("\n  ")}`)
      .argument("<key>", "設定キー")
      .argument("<value>", "セットする値")
      .option("--default", "恒久的に保存する")
      .action(async (key, value, options) => {
        await app.setConfigValue(key, value, !!options.default);
      })
  );

program
  .argument("[prompt...]", "AIへのプロンプト (パイプ入力時や対話モード時は空でも可)")
  .option("--set.useLocal <boolean>", "テスト: 今回はローカルモデルを強制")
  .option("--set.model <string>", "強制利用するモデル名")
  .option("--get.models", "利用可能なモデル一覧を取得して終了")
  .option("-c, --copy", "対話UIをスキップしてクリップボードにコピー")
  .option("-e, --execute", "対話UIをスキップしてそのまま実行")
  .option("--tool <string>", "特定のコマンドのヘルプをコンテキストに追加 (例: ffmpeg)")
  .action(async (promptArr, options) => {
    // 1. モデル一覧取得フラグ
    if (options["get.models"]) {
      await app.showModels();
      process.exit(0);
    }

    // 2. プロンプト生成 (stdin 含む)
    let promptText = promptArr.join(" ");
    let stdinText = "";

    if (!process.stdin.isTTY) {
      stdinText = fs.readFileSync(0, "utf-8").trim();
      // パイプ入力を消費後、clack 用に /dev/tty への入力ストリームを確保する
      ui.restoreTTY();
    }

    // プロンプトも標準入力もなければ、対話的に入力を求める
    if (!promptText && !stdinText) {
      const p = await ui.text({ message: "何をしたいですか？" });
      if (ui.isCancel(p)) {
        ui.outro("キャンセルしました。");
        process.exit(0);
      }
      promptText = p as string;
    }

    // 3. メインアプリの実行
    await app.runGeneration(promptText, stdinText, {
      copy: options.copy,
      execute: options.execute,
      useLocal: options["set.useLocal"],
      model: options["set.model"],
      tool: options.tool,
    });
  });

program.parse(process.argv);
