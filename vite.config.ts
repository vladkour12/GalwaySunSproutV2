import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy API routes to Vercel dev server (if running) or handle locally
        proxy: !isProduction ? {
          '/api': {
            target: process.env.VITE_API_URL || 'http://localhost:3001',
            changeOrigin: true,
            // If vercel dev is not running, this will fail - user should use vercel dev
            rewrite: (path) => path,
          }
        } : undefined,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
