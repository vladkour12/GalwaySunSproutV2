import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'skip-html-import-analysis',
          enforce: 'pre',
          resolveId(id) {
            // Skip import analysis for HTML files with query params (HMR)
            if (id.includes('.html?') || id.endsWith('.html')) {
              return null; // Let default HTML plugin handle it
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      assetsInclude: ['**/*.json'],
      // Workaround for Vite 6.x bug where import-analysis tries to parse HTML
      // Only include non-entry HTML files as assets
      build: {
        rollupOptions: {
          input: path.resolve(__dirname, 'index.html')
        }
      },
      optimizeDeps: {
        exclude: ['manifest.json']
      }
    };
});
