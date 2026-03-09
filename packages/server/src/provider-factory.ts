import { AntigravityProvider } from "./providers/antigravity.js";
import { OllamaProvider } from "./providers/ollama.js";
import type { LLMProvider } from "./providers/base.js";

export class ProviderFactory {
  private static antigravity = new AntigravityProvider();
  private static ollama = new OllamaProvider();

  /**
   * リクエスト内容に基づいて適切なプロバイダーを返す
   */
  static getProvider(useLocal: boolean): LLMProvider {
    if (useLocal) {
      return this.ollama;
    }
    return this.antigravity;
  }
}
