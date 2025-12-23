import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const port = parseInt(process.env.PORT || '3000', 10);
    
    // Build define object for all VITE_ prefixed variables
    const define: any = {};
    Object.keys(env).forEach(key => {
      if (key.startsWith('VITE_')) {
        define[`import.meta.env.${key}`] = JSON.stringify(env[key]);
      }
    });
    
    // Also explicitly define GEMINI API key since it might not have VITE_ prefix in env
    if (env.GEMINI_API_KEY) {
      define['import.meta.env.VITE_GEMINI_API_KEY'] = JSON.stringify(env.GEMINI_API_KEY);
    }
    
    return {
      server: {
        port: port,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define,
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      assetsInclude: ['**/*.json', '**/*.html'],
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
