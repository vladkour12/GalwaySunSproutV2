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
          name: 'html-import-fix',
          enforce: 'pre',
          transformIndexHtml: {
            enforce: 'pre',
            transform(html, ctx) {
              // This ensures HTML is handled correctly
              return html;
            }
          },
          load(id) {
            // Prevent import analysis on HTML files
            if (id === path.resolve(__dirname, 'index.html') || id.endsWith('index.html')) {
              return null; // Let Vite handle it normally
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
      optimizeDeps: {
        exclude: ['manifest.json']
      }
    };
});
