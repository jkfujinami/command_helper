import { execSync } from "node:child_process";
import clipboard from "clipboardy";
import { BackendClient } from "./core/backend-client.js";
import { DaemonManager } from "./core/daemon-manager.js";
import { TerminalUI } from "./core/terminal-ui.js";
import { getSystemContext } from "./core/context.js";
import { getValueByPath, loadConfig, updateConfigValue } from "./core/config.js";

export interface AppOptions {
  copy?: boolean;
  execute?: boolean;
  useLocal?: string; // string "true"/"false" from commander
  model?: string;
  tool?: string;
}

/**
 * cmd-hlp アプリケーションのメインクラス
 */
export class CommandHelperApp {
  constructor(
    private ui: TerminalUI,
    private backend: BackendClient,
    private daemon: DaemonManager
  ) {}

  /**
   * 利用可能なモデル一覧を表示して終了する
   */
  async showModels(): Promise<void> {
    try {
      await this.daemon.ensureRunning();
      const json = await this.backend.getModels();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch models");
      }

      this.displayModelList(json.providers);
      console.log("\n💡 使用例: cmd-hlp --set.model=flash \"prompt\"");
    } catch (e: any) {
      this.ui.logError(`サーバーへの接続エラー: ${e.message}`);
    }
  }

  /**
   * コマンド生成のメインフローを実行する
   */
  async runGeneration(promptText: string, stdinText: string, options: AppOptions): Promise<void> {
    this.ui.intro();
    const spinner = this.ui.createSpinner();
    spinner.start("AIに問い合わせ中... (初回はサーバー起動で少し時間がかかります)");

    try {
      await this.daemon.ensureRunning();

      let toolUsage: string | undefined;
      if (options.tool) {
        spinner.message(`ツール (${options.tool}) のヘルプ情報を取得中...`);
        toolUsage = this.getToolUsage(options.tool);
        spinner.message("AIに問い合わせ中...");
      }

      const settings = this.resolveSettings(options);
      const context = this.prepareContext(stdinText, toolUsage);

      const response = await this.backend.generateCommand({
        prompt: promptText,
        context,
        settings,
      });

      if (!response.success || !response.command) {
        spinner.stop("エラーが発生しました。");
        this.ui.logError(response.error || "不明なエラー");
        process.exit(1);
      }

      spinner.stop(`生成完了！`);
      await this.handleGenerationResult(response.command, response.explanation, options);

    } catch (e: any) {
      spinner.stop("エラー終了");
      this.ui.logError(e.message);
      process.exit(1);
    }
  }

  /**
   * 現在の設定を一覧表示する
   */
  async listConfig(): Promise<void> {
    const config = loadConfig();
    this.ui.intro("⚙️  cmd-hlp 設定一覧");

    const formatted = JSON.stringify(config, null, 2);
    this.ui.note(formatted, "~/.cmd-hlp/config.json");

    this.ui.outro("設定の変更は 'config set <key> <value> --default' を使用してください。");
  }

  /**
   * インタラクティブに設定値を更新する
   */
  async setConfigValue(path: string, value: any, isPermanent: boolean): Promise<void> {
    if (!isPermanent) {
      this.ui.logWarn("ヒント: 恒久的に保存する場合は --default フラグをつけてください。");
      return;
    }

    const currentConfig = loadConfig();
    const oldValue = getValueByPath(currentConfig, path);

    this.ui.intro("📝 設定の更新");
    this.ui.logMessage(`項目: ${path}`);
    this.ui.logMessage(`変更: ${oldValue ?? "(未設定)"} → ${value}`);

    const confirm = await this.ui.select({
      message: "この内容で保存してよろしいですか？",
      options: [
        { value: true, label: "✅ はい (Yes)" },
        { value: false, label: "❌ いいえ (No)" },
      ]
    });

    if (confirm !== true) {
      this.ui.outro("キャンセルしました。");
      return;
    }

    try {
      updateConfigValue(path, value);
      this.ui.outro("✅ 設定を保存しました。");
    } catch (e: any) {
      this.ui.logError(`保存に失敗しました: ${e.message}`);
    }
  }

  /**
   * モデル一覧のテーブル表示
   */
  private displayModelList(providers: any): void {
    console.log("\n🤖 利用可能なモデル一覧:\n");

    if (providers.antigravity) {
      console.log("【Antigravity】");
      const pad = (s: string, w: number) => (s || "").padEnd(w);

      console.log(`${pad("Label", 30)} │ ${pad("ID", 6)} │ 💎 │ ⭐ │ 🚫`);
      console.log("─".repeat(31) + "┼" + "─".repeat(8) + "┼────┼────┼────");

      for (const m of providers.antigravity) {
        const premStr = m.isPremium ? " ✓ " : "   ";
        const recStr = m.isRecommended ? " ✓ " : "   ";
        const disStr = m.disabled ? " ✗ " : "   ";
        console.log(`${pad(m.label, 30)} │ ${pad(String(m.id), 6)} │${premStr}│${recStr}│${disStr}`);
      }
    }

    if (providers.ollama) {
      console.log("\n【Ollama (Local)】");
      const names = providers.ollama.map((m: any) => typeof m === "string" ? m : (m.label || m.name));
      console.log("  " + names.join(", "));
    }
  }

  /**
   * 実行時の設定（プロバイダーやモデル）を解決する
   */
  private resolveSettings(options: AppOptions) {
    const config = loadConfig();
    const useLocal = options.useLocal !== undefined
      ? options.useLocal === "true"
      : config.defaultProvider === "ollama";

    const model = options.model || config.defaultModel;

    return { useLocal, model };
  }

  /**
   * システムコンテキストを準備する
   */
  private prepareContext(stdinText: string, toolUsage?: string) {
    const context = getSystemContext();
    context.stdin = stdinText || undefined;
    context.toolUsage = toolUsage;
    return context;
  }

  /**
   * ツールのヘルプ情報を取得する
   */
  private getToolUsage(tool: string): string | undefined {
    try {
      // 1. まずは man を試す
      try {
        return execSync(`PAGER=cat man ${tool} 2>/dev/null`, { encoding: "utf-8", timeout: 2000 });
      } catch {
        // failed
      }
      // 2. --help を試す
      try {
        return execSync(`${tool} --help 2>/dev/null`, { encoding: "utf-8", timeout: 2000 });
      } catch {
        // failed
      }
      // 3. -h を試す
      try {
        return execSync(`${tool} -h 2>/dev/null`, { encoding: "utf-8", timeout: 2000 });
      } catch {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * 生成結果に対するアクション（コピー、実行、対話メニュー）を制御する
   */
  private async handleGenerationResult(command: string, explanation: string | undefined, options: AppOptions): Promise<void> {
    if (options.copy) {
      this.copyToClipboard(command);
      return;
    }

    if (options.execute) {
      this.executeCommand(command);
      return;
    }

    // 対話モード
    this.ui.logSuccess(command);
    if (explanation) {
       this.ui.note(explanation, "解説");
    }

    const action = await this.ui.select({
      message: "どうしますか？",
      options: [
        { value: "copy", label: "📋 コピー (Copy to Clipboard)" },
        { value: "execute", label: "🚀 実行 (Execute in term)" },
        { value: "cancel", label: "❌ キャンセル (Cancel)" },
      ],
    });

    if (this.ui.isCancel(action) || action === "cancel") {
      this.ui.outro("終了しました。");
      return;
    }

    if (action === "copy") {
      this.copyToClipboard(command);
    } else if (action === "execute") {
      this.executeCommand(command);
    }
  }

  private copyToClipboard(command: string): void {
    clipboard.writeSync(command);
    this.ui.outro(`📋 コピーしました: ${command}`);
  }

  private executeCommand(command: string): void {
    this.ui.logMessage(`実行中: ${command}`);
    try {
      execSync(command, { stdio: "inherit" });
      this.ui.outro("✅ 実行成功！");
    } catch (execErr: any) {
      this.ui.logError("❌ コマンドがエラーで終了しました。");
      process.exit(1);
    }
  }
}
