import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * サーバーデーモンの管理を担当するクラス
 */
export class DaemonManager {
  private readonly serverEntryPoint: string;
  private readonly logDir: string;
  private readonly logFile: string;

  constructor() {
    // __dirname は packages/client/dist/core または packages/client/src/core
    // いずれの場合も 3つ上がれば packages/ フォルダ
    const packagesDir = path.resolve(__dirname, "../../..");
    this.serverEntryPoint = path.resolve(packagesDir, "server/src/index.ts");
    this.logDir = path.join(process.env.HOME || "", ".cmd-hlp");
    this.logFile = path.join(this.logDir, "server.log");
  }

  /**
   * サーバーが稼働中か確認し、稼働していなければ起動する
   */
  async ensureRunning(): Promise<void> {
    const isRunning = await this.checkConnection();
    if (isRunning) return;

    this.startServer();

    // 起動待機（最大5秒、1回/100ms）
    for (let i = 0; i < 50; i++) {
      if (await this.checkConnection()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error("ローカルサーバー(デーモン)の起動に失敗しました。");
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch("http://localhost:41234/api/models", { signal: AbortSignal.timeout(200) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private startServer(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    const out = fs.openSync(this.logFile, "a");
    const err = fs.openSync(this.logFile, "a");

    const child = spawn("npx", ["tsx", this.serverEntryPoint], {
      detached: true,
      stdio: ["ignore", out, err],
    });

    child.unref();
  }
}
