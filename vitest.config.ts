import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './',
    logHeapUsage: true,
    exclude: ['node_modules', 'dist', 'examples', 'performance'],
    coverage: {
      include: ['src'],
      reportsDirectory: './coverage',
      provider: 'v8',
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
        statements: 60
      },
       // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
      reporter: ['text', 'json-summary', 'json'],
    }
  },
});
