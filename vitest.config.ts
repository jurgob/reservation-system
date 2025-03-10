import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov', 'html'], 
      exclude: ["./src/index.ts", "vitest.config.ts"],
    },
  },
});