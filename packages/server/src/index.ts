import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { ProviderFactory } from "./provider-factory.js";
// import { generateOllamaCommand } from "./providers/ollama.js";

const app = new Hono();

app.get("/api/models", async (c) => {
  try {
    const antigravityProvider = ProviderFactory.getProvider(false);
    const ollamaProvider = ProviderFactory.getProvider(true);

    const [antigravityModels, ollamaModels] = await Promise.all([
      antigravityProvider.getModels(),
      ollamaProvider.getModels()
    ]);

    return c.json({
      success: true,
      providers: {
        antigravity: antigravityModels,
        ollama: ollamaModels,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post("/api/generate", async (c) => {
  try {
    const body = await c.req.json();
    const useLocal = !!body.settings?.useLocal;

    const provider = ProviderFactory.getProvider(useLocal);
    const result = await provider.generate(body);

    return c.json(result);
  } catch (err: any) {
    console.error("生成エラー:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 41234,
});

console.log("Server is running on port 41234");
