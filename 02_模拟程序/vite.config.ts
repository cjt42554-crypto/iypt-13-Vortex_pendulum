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
    // CI's shared runner took 3x local wall time. Serialize CPU-bound references
    // there; only the wall-clock watchdog changes, never physical tolerances.
    maxWorkers: process.env.CI ? 1 : 4,
    testTimeout: process.env.CI ? 30_000 : 5_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/core/**/*.ts", "src/solvers/**/*.ts", "src/analysis/**/*.ts"],
    },
  },
});
