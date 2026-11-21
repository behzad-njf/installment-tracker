import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pizomoney.behzaaad.ir',
  integrations: [sitemap()],
  trailingSlash: 'never',
  vite: {
    server: {
      proxy: {
        '/app': 'http://localhost:5173',
      },
    },
  },
});
