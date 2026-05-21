import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/smoke/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      // Only measure coverage on pure, unit-testable lib modules.
      // External-service wrappers (email, paypal, push, rate-limit, redis)
      // are excluded because they require live infrastructure and are covered
      // by integration tests instead.
      include: [
        'lib/validation/**/*.ts',
        'lib/errors/**/*.ts',
        'lib/api-response/**/*.ts',
        'lib/retry.ts',
        'lib/tiers/**/*.ts',
      ],
      exclude: ['lib/**/*.d.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
})
