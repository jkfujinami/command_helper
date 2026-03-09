import * as clack from "@clack/prompts";
import * as fs from "node:fs";
import * as tty from "node:tty";
import type { Readable, Writable } from "node:stream";

/**
 * ターミナル上の対話的 UI を担当するクラス
 * パイプ入力時でも対話メニューが動作するよう、/dev/tty からの入力ストリームを管理する
 */
export class TerminalUI {
  private ttyInput: Readable | undefined;

  /**
   * パイプ入力後に /dev/tty から TTY ストリームを復元する
   * clack の各関数に input オプションとして渡すことで対話を維持する
   */
  restoreTTY(): void {
    try {
      const fd = fs.openSync("/dev/tty", "r");
      this.ttyInput = new tty.ReadStream(fd);
    } catch {
      // TTY が取得できない環境（CI等）では何もしない
    }
  }

  /**
   * clack に渡す I/O オプションを生成する
   */
  private ioOpts(): { input?: Readable; output?: Writable } {
    if (this.ttyInput) {
      return { input: this.ttyInput } as any;
    }
    return {};
  }

  /**
   * 処理の開始を表示
   */
  intro(message: string = "🚀 cmd-hlp 起動！"): void {
    clack.intro(message);
  }

  /**
   * 処理の終了を表示
   */
  outro(message: string): void {
    clack.outro(message);
  }

  /**
   * スピナーを開始
   */
  createSpinner() {
    return clack.spinner();
  }

  /**
   * エラーを表示
   */
  logError(message: string): void {
    clack.log.error(message);
  }

  /**
   * 成功メッセージを表示
   */
  logSuccess(message: string): void {
    clack.log.success(message);
  }

  /**
   * 警告を表示
   */
  logWarn(message: string): void {
    clack.log.warn(message);
  }

  /**
   * 一般メッセージを表示
   */
  logMessage(message: string): void {
    clack.log.message(message);
  }

  /**
   * ノート（解説など）を表示
   */
  note(message: string, title?: string): void {
    clack.note(message, title);
  }

  /**
   * ユーザーへの選択肢を提示
   */
  async select<T>(options: {
    message: string,
    options: { value: T, label: string, hint?: string }[],
    initialValue?: T
  }): Promise<T | symbol> {
    return await clack.select({ ...options, ...this.ioOpts() } as any);
  }

  /**
   * ユーザーにテキスト入力を求める
   */
  async text(options: { message: string }): Promise<string | symbol> {
    return await clack.text({ ...options, ...this.ioOpts() } as any);
  }

  /**
   * キャンセル判定
   */
  isCancel(value: any): boolean {
    return clack.isCancel(value);
  }
}
