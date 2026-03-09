import type { GenerateRequest } from "../../../client/src/core/api.js";

/**
 * AIに送信するプロンプトを構築するクラス
 * 全てのプロバイダーで共通のプロンプト構造を維持する
 */
export class PromptBuilder {
  /**
   * システムコンテキストを含む最終的なプロンプト文字列を生成する
   */
  static build(req: GenerateRequest): string {
    const context = req.context;

    const systemContext = [
      `ユーザーOS: ${context.os}`,
      `ユーザーShell: ${context.shell}`,
      `カレントディレクトリ: ${context.cwd}`,
      `パイプ入力: ${context.stdin ? `\n---\n${context.stdin}\n---` : 'なし'}`,
      `ツールヘルプ: ${context.toolUsage ? `\n---\n${context.toolUsage}\n---` : 'なし'}`
    ].join("\n");

    return `あなたは強力なCLIコマンド生成AIです。以下の環境における最適なシェルコマンドを生成してください。

【必須要件】
1. 実行可能なコマンドを \`\`\`bash と \`\`\` で囲って出力してください。
2. 可能な限りワンライナーで出力してください。
3. コマンドの動作についての簡潔な説明も含めてください。

【環境情報】
${systemContext}

【ユーザーの要求】
${req.prompt}`;
  }
}
