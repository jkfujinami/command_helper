import * as clack from "@clack/prompts";

/**
 * ターミナル上の対話的 UI を担当するクラス
 */
export class TerminalUI {
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
    return await clack.select(options as any);
  }

  /**
   * ユーザーにテキスト入力を求める
   */
  async text(options: { message: string }): Promise<string | symbol> {
    return await clack.text(options);
  }

  /**
   * キャンセル判定
   */
  isCancel(value: any): boolean {
    return clack.isCancel(value);
  }
}
