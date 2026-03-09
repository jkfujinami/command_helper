import type { GenerateRequest, GenerateResponse } from "./api.js";

/**
 * サーバー側 API との通信を担当するクラス
 */
export class BackendClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = "http://localhost:41234") {
    this.baseUrl = baseUrl;
  }

  /**
   * コマンド生成リクエストを送信する
   */
  async generateCommand(req: GenerateRequest): Promise<GenerateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to communicate with local server",
      };
    }
  }

  /**
   * 利用可能なモデル一覧を取得する
   */
  async getModels(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/models`);
    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status}`);
    }
    return await res.json();
  }
}
