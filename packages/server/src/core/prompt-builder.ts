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
      `パイプ入力 (stdin): ${context.stdin ? `\n---\n${context.stdin}\n---` : 'なし'}`,
      `ツールヘルプ (man等): ${context.toolUsage ? `\n---\n${context.toolUsage}\n---` : 'なし'}`
    ].join("\n");

    return `あなたは強力なCLIコマンド生成AIです。
以下の環境情報を考慮し、ユーザーの要求を解決するための最適なシェルコマンドを生成してください。

【環境情報】
${systemContext}

【ユーザーの要求】
${req.prompt}

【厳守事項 - 違反した場合はエラーとなります】
1. **必ず実行可能なシェルコマンドを一つき、\`\`\`bash ... \`\`\` の形式で出力してください。**
2. **あなたはチャットアシスタントではありません。ユーザーへの丁寧な挨拶、同意、前置きは一切不要です。**
3. **「パイプ入力 (stdin)」の内容をそのまま回答に使用しないでください。**（例: 「ファイル名を教えて」に対し、stdinの内容からファイル名を探してリストアップすることは厳禁です。代わりに、それを行うためのコマンドを出力してください）。
4. **解説はコマンドの後ろに、必要最小限のみ記述してください。**
5. 指定された「ユーザーOS」で動作することを確認してください。
6. 回答の先頭は必ず \`\`\`bash で始めてください。
`;
  }
}
