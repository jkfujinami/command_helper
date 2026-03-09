import type { GenerateRequest, GenerateResponse } from "../../../client/src/core/api";

/**
 * モデル情報を表す共通インターフェース
 */
export interface ModelInfo {
  label: string;
  name: string;
  id: string | number;
  type: "model" | "alias";
  isPremium: boolean;
  isRecommended: boolean;
  disabled: boolean;
}

/**
 * LLMプロバイダーが共通で実装すべきインターフェース
 */
export interface LLMProvider {
  /**
   * 利用可能なモデルの一覧を取得する
   */
  getModels(): Promise<ModelInfo[]>;

  /**
   * リクエストに基づいてコマンドを生成する
   */
  generate(req: GenerateRequest): Promise<GenerateResponse>;
}
