import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vite';

// Absolute URLs are required for canonical links, Open Graph images and the
// sitemap — relative ones are ignored by crawlers and social scrapers. Set
// SITE_URL at build time once the real domain is known:
//
//   SITE_URL=https://steadyhand.example.com npm run build
//
const DEFAULT_SITE_URL = 'https://the-stack.workers.dev';
const SITE_URL = (process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '');

function seoPlugin(): Plugin {
  return {
    name: 'the-stack:seo',

    buildStart() {
      if (!process.env.SITE_URL) {
        this.warn(
          `SITE_URL is not set — canonical and Open Graph URLs will point at the ` +
            `placeholder ${DEFAULT_SITE_URL}. Set SITE_URL to the real origin before ` +
            `deploying, or crawlers will index the wrong host.`,
        );
      }
    },

    // 'pre' so the placeholder is resolved before Vite's own %ENV% pass sees it.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'),
      });

      // Single-page site: one entry, and no lastmod rather than a build
      // timestamp that would falsely signal a content change on every deploy.
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>monthly</changefreq>\n` +
          `    <priority>1.0</priority>\n  </url>\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
});
