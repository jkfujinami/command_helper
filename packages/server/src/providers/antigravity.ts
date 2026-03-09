import { AntigravityClient } from "antigravity-client";
import type { GenerateRequest, GenerateResponse } from "../../../client/src/core/api.js";
import type { LLMProvider, ModelInfo } from "./base.js";
import { PromptBuilder } from "../core/prompt-builder.js";

export class AntigravityProvider implements LLMProvider {
  private clientInstance: AntigravityClient | null = null;

  private async getClient(): Promise<AntigravityClient> {
    if (!this.clientInstance) {
      try {
        this.clientInstance = await AntigravityClient.connect({ autoDetect: true });
      } catch (e) {
        // 接続に失敗した場合のフォールバックとして独立プロセス起動を試みる
        this.clientInstance = await AntigravityClient.launch({
          workspacePath: process.cwd(),
        });
      }
    }
    return this.clientInstance;
  }

  /**
   * 利用可能なモデル一覧を取得する
   */
  async getModels(): Promise<ModelInfo[]> {
    const client = await this.getClient();
    const userStatus = await client.getUserStatus();
    const configs = userStatus.userStatus?.cascadeModelConfigData?.clientModelConfigs || [];

    const models: ModelInfo[] = [];

    for (const m of configs as any[]) {
      const choice = m.modelOrAlias?.choice;
      if (!choice) continue;

      models.push({
        label: m.label || "",
        name: m.label || "",
        id: choice.value,
        type: choice.case === "model" ? "model" : "alias",
        isPremium: !!m.isPremium,
        isRecommended: !!m.isRecommended,
        disabled: !!m.disabled,
      });
    }

    return models;
  }

  /**
   * プロンプトからコマンドを生成する
   */
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    try {
      const client = await this.getClient();
      const availableModels = await this.getModels();

      // ユーザー指定のモデル名（部分一致）からIDを探す
      const targetName = req.settings?.model?.toLowerCase() || "flash";

      let selectedModel: ModelInfo | undefined = availableModels.find(m =>
        m.label.toLowerCase().includes(targetName) && !m.disabled
      );

      // 見つからなければ推奨モデル or 最初のモデル
      if (!selectedModel) {
        selectedModel = availableModels.find(m => m.isRecommended && !m.disabled) ||
                        availableModels.find(m => !m.disabled);
      }

      const selectedModelId = selectedModel?.id as number;
      const selectedModelName = selectedModel?.label || "Unspecified";

      const prompt = PromptBuilder.build(req);

      console.log(`[Antigravity] Using Model: ${selectedModelName} (ID: ${selectedModelId})`);

      let fullText = "";
      try {
        fullText = await client.getModelResponse(prompt, selectedModelId);
      } catch (apiError: any) {
        console.error("[Antigravity] getModelResponse failed:", apiError);
        return {
          success: false,
          error: `Antigravity API Error: ${apiError.message}\nModel: ${selectedModelName} (ID: ${selectedModelId})`,
        };
      }

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
      console.error("[Antigravity] Unexpected error:", error);
      return {
        success: false,
        error: `予期せぬエラー: ${error.message}\n${error.stack}`,
      };
    }
  }
}
