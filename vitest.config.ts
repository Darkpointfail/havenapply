import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import path from "path";

const env = loadEnv("", process.cwd(), "");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      ...env,
      DATABASE_URL:
        env.DATABASE_URL ||
        "postgresql://haven:haven@localhost:5432/havenapply?schema=public",
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
