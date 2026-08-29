import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["production-worker/**", "node_modules/**"],
    coverage: { reporter: ["text", "html"] },
  },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
