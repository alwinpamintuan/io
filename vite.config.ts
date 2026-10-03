import { defineConfig } from 'vitest/config';
import { seoPlugin } from './scripts/seoPlugin.ts';

export default defineConfig({
  base: './',
  plugins: [seoPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
  },
});
