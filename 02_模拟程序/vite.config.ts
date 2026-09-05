import { defineConfig } from "vite";

export default defineConfig({
  worker: {
    format: "es",
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "node",
    // Bound CPU contention when independent geometry/RK benchmarks run together.
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/core/**/*.ts", "src/solvers/**/*.ts", "src/analysis/**/*.ts"],
    },
  },
});
