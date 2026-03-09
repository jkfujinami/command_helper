import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface LLMProviderConfig {
  endpoint?: string;
  host?: string;
  model: string;
}

export interface AppConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: Record<string, LLMProviderConfig>;
}

export const DEFAULT_CONFIG: AppConfig = {
  defaultProvider: "antigravity",
  defaultModel: "gemini-1.5-pro",
  providers: {
    antigravity: {
      endpoint: "",
      model: "gemini-1.5-pro",
    },
    ollama: {
      host: "http://localhost:11434",
      model: "llama3:8b",
    },
  },
};

const CONFIG_DIR = path.join(os.homedir(), ".cmd-hlp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * ドット記法（"a.b.c"）でオブジェクトの値をセットする
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  const last = parts.pop()!;
  let current = obj;
  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }
  current[last] = value;
}

/**
 * ドット記法でオブジェクトから値を取得する
 */
export function getValueByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    // マージ（深い階層は不完全だが、最低限のトップレベルは維持）
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (error) {
    console.error("Warning: Failed to parse config file. Using default.", error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<AppConfig>): void {
  const current = loadConfig();
  const merged = { ...current, ...config };

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
}

/**
 * 特定のパスの設定を更新して保存する
 */
export function updateConfigValue(path: string, value: any): void {
  const current = loadConfig();

  // 型変換の試行（数値や真偽値など）
  let typedValue: any = value;
  if (value === "true") typedValue = true;
  else if (value === "false") typedValue = false;
  else if (!isNaN(Number(value)) && value !== "") typedValue = Number(value);

  setValueByPath(current, path, typedValue);

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2), "utf-8");
}
