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
          load(id) {
            // Prevent import analysis from running on HTML files
            if (id.endsWith('.html') || id.includes('.html?')) {
              // Return empty string to skip processing
              return '';
            }
          },
          resolveId(id) {
            // Don't resolve HTML files through this plugin
            if (id.endsWith('.html') || id.includes('.html?')) {
              return null;
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
