import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for API calls
  }
});
