import type { GenerateRequest, GenerateResponse } from "../../../client/src/core/api.js";
import type { LLMProvider, ModelInfo } from "./base.js";
import { loadConfig } from "../../../client/src/core/config.js";
import { PromptBuilder } from "../core/prompt-builder.js";

export class OllamaProvider implements LLMProvider {
  /**
   * 利用可能なモデル一覧を取得する
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const config = loadConfig();
      const host = config.providers.ollama?.host || "http://localhost:11434";

      const res = await fetch(`${host}/api/tags`);
      if (!res.ok) throw new Error(`Ollama status: ${res.status}`);

      const data = await res.json();
      const models: any[] = data.models || [];

      return models.map(m => ({
        label: m.name,
        name: m.name,
        id: m.name,
        type: "model",
        isPremium: false,
        isRecommended: false,
        disabled: false
      }));
    } catch (err: any) {
      console.error("[Ollama] Failed to fetch models:", err.message);
      return [];
    }
  }

  /**
   * プロンプトからコマンドを生成する
   */
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    try {
      const config = loadConfig();
      const host = config.providers.ollama?.host || "http://localhost:11434";
      const model = req.settings?.model || config.providers.ollama?.model || "llama3";

      const prompt = PromptBuilder.build(req);

      console.log(`[Ollama] Using Model: ${model} at ${host}`);

      const res = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama API returned ${res.status}`);
      }

      const result = await res.json();
      const fullText = result.response || "";

      const codeBlockMatch = fullText.match(/```(?:bash|sh|zsh)?\n([\s\S]*?)\n```/);
      let command = fullText.trim();

      if (codeBlockMatch && codeBlockMatch[1]) {
        command = codeBlockMatch[1].trim();
      } else {
        command = command.split("\n")[0].trim();
      }

      return {
        success: true,
        command,
        explanation: fullText,
      };

    } catch (error: any) {
      console.error("[Ollama] Error:", error.message);
      return {
        success: false,
        error: `Ollama Error: ${error.message}`,
      };
    }
  }
}
